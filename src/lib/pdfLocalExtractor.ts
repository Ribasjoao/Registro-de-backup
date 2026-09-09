import { ParsedBackupReport, ParsedJobItem } from '../services/geminiService';

/**
 * Normaliza string removendo acentos e caracteres especiais para matching tolerante
 */
function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extrai texto legível de um PDF codificado em Base64, suportando descompressão FlateDecode
 * em ambientes Node.js ou extração de strings limpas no navegador.
 */
export function extractTextFromPdfBase64(pdfBase64: string, filename?: string): string {
  try {
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
    let text = '';

    // Se estiver em ambiente Node.js com Buffer e zlib
    if (typeof Buffer !== 'undefined') {
      try {
        const rawBuffer = Buffer.from(cleanBase64, 'base64');
        const content = rawBuffer.toString('binary');

        // Tentar descompressão de streams FlateDecode
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zlib = typeof require !== 'undefined' ? require('zlib') : null;
        if (zlib && zlib.inflateSync) {
          const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
          let match;
          while ((match = streamRegex.exec(content)) !== null) {
            try {
              const streamBytes = Buffer.from(match[1], 'binary');
              const decompressed = zlib.inflateSync(streamBytes).toString('utf-8');
              const textMatches = decompressed.match(/\((.*?)\)\s*T[jJ]/g);
              if (textMatches) {
                text += ' ' + textMatches.map((m: string) => m.replace(/^[(\s]+|[)\sTjJ]+$/g, '')).join(' ');
              } else {
                const readable = decompressed.replace(/[^\x20-\x7E\n\r\t\u00C0-\u00FF]/g, ' ');
                if (readable.trim().length > 10) text += ' ' + readable;
              }
            } catch {
              // Stream pode não ser flate ou estar truncado
            }
          }
        }

        if (!text.trim()) {
          text = content.replace(/[^\x20-\x7E\n\r\t\u00C0-\u00FF]/g, ' ');
        }
      } catch {
        // Fallback básico
      }
    }

    // Se estiver no browser ou se o texto estiver vazio
    if (!text.trim() && typeof atob !== 'undefined') {
      try {
        const binary = atob(cleanBase64.slice(0, 100000));
        text = binary.replace(/[^\x20-\x7E\n\r\t\u00C0-\u00FF]/g, ' ');
      } catch {
        // Ignora
      }
    }

    return (text + ' ' + (filename || '')).replace(/\s+/g, ' ').trim();
  } catch {
    return filename || '';
  }
}

/**
 * Parser heurístico resiliente para relatórios de backup.
 * Atuando como fallback caso a cota do Gemini API esteja esgotada (429) ou indisponível (503).
 */
export function heuristicParsePdf(
  rawText: string,
  filename: string,
  knownClients: string[] = []
): ParsedBackupReport {
  const text = rawText || filename || '';
  const textLower = text.toLowerCase();
  const normText = normalizeString(text);

  // 1. Identificar Cliente
  let clientName = '';
  // Tentar match exato/normalizado com clientes cadastrados (no texto ou no nome do arquivo)
  if (Array.isArray(knownClients) && knownClients.length > 0) {
    const matched = knownClients.find(c => {
      const normClient = normalizeString(c);
      return normClient.length >= 3 && (normText.includes(normClient) || normalizeString(filename).includes(normClient));
    });
    if (matched) {
      clientName = matched;
    }
  }

  // Se não encontrou, buscar por rótulos comuns em relatórios (Cliente, Server, Host, Organization)
  if (!clientName) {
    const labelMatch = text.match(/(?:Cliente|Client|Empresa|Host|Server|Servidor|Organization|Job Name|Computador)[:\s]+([A-Za-z0-9À-ÿ\s._-]{3,35})/i);
    if (labelMatch && labelMatch[1] && !/backup|veeam|relat|status/i.test(labelMatch[1])) {
      clientName = labelMatch[1].trim();
    }
  }

  // Fallback: extrair do nome do arquivo
  if (!clientName && filename) {
    const cleanFile = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    const parts = cleanFile.split(/\s+/).filter(p => p.length > 2 && !/backup|relat|veeam|report|log|diario|status/i.test(p));
    if (parts.length > 0) {
      clientName = parts.slice(0, 3).join(' ');
    }
  }

  if (!clientName) {
    clientName = 'Servidor de Backup';
  }

  // 2. Identificar Data
  let backupDate = new Date().toISOString();
  // Busca datas no formato ISO ou DD/MM/YYYY ou YYYY-MM-DD
  const dateMatch = text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)/) ||
                    text.match(/(\d{2}[-/.]\d{2}[-/.]\d{4}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)/);

  if (dateMatch && dateMatch[1]) {
    try {
      let rawDateStr = dateMatch[1].replace(/\//g, '-');
      // Se estiver no formato DD-MM-YYYY, converter para YYYY-MM-DD
      const parts = rawDateStr.split('-');
      if (parts[0].length === 2 && parts[2]?.length === 4) {
        rawDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const d = new Date(rawDateStr);
      if (!isNaN(d.getTime())) {
        backupDate = d.toISOString();
      }
    } catch {
      // Mantém a data atual
    }
  }

  // 3. Status Consolidado
  const hasFailed = /failed|falha|error|erro|critical|incompleto|abortado|interrompido/i.test(text);
  const hasWarning = /warning|aviso|alerta|parcial|aten[cç][aã]o/i.test(text);
  const overallStatus: 'success' | 'warning' | 'failed' = hasFailed ? 'failed' : (hasWarning ? 'warning' : 'success');

  // 4. Identificar Jobs
  const jobs: ParsedJobItem[] = [];

  // Padrões de causas raiz conhecidas
  let detectedRootCause: 'network' | 'storage' | 'credential' | 'service' | 'window' | 'human' | 'other' = 'other';
  let technicalDetail = '';
  let actionPlanDetail = '';

  if (/disk full|espaço|space|storage|capacity|sem espa[cç]o|quota/i.test(text)) {
    detectedRootCause = 'storage';
    technicalDetail = 'Capacidade de armazenamento insuficiente ou disco de destino lotado durante a gravação.';
    actionPlanDetail = 'Realizar limpeza de backups antigos, liberar espaço em disco, ajustar retenção (GVS) ou expandir volume de storage/LUN.';
  } else if (/vss|snapshot|shadow copy|volume shadow/i.test(text)) {
    detectedRootCause = 'service';
    technicalDetail = 'Falha no provedor de Volume Shadow Copy (VSS Snapshot) durante o congelamento dos volumes.';
    actionPlanDetail = 'Reiniciar serviços VSS (vssadmin list writers), reiniciar serviço Volume Shadow Copy e verificar espaço de shadow storage.';
  } else if (/network|timeout|conex[aã]o|unreachable|socket|disconnect|timed out/i.test(text)) {
    detectedRootCause = 'network';
    technicalDetail = 'Perda de conectividade ou latência excessiva no link de dados entre o agente e o repositório.';
    actionPlanDetail = 'Verificar estabilidade de rede, rotas estáticas, portas do agente (ex: 2500-5000) e integridade de switches.';
  } else if (/permission|access denied|acesso negado|unauthorized|credential|login/i.test(text)) {
    detectedRootCause = 'credential';
    technicalDetail = 'Permissões insuficientes ou credenciais de serviço expiradas para acessar o storage/VM.';
    actionPlanDetail = 'Validar credenciais da conta de serviço, privilégios de Administrador Local e permissões SMB/NFS no destino.';
  } else if (overallStatus === 'failed') {
    technicalDetail = 'Falha na execução reportada no documento de backup.';
    actionPlanDetail = 'Consultar o console de gerenciamento do backup, inspecionar logs detalhados do agente e reexecutar a tarefa.';
  } else {
    technicalDetail = 'Execução concluída e verificada com êxito conforme os registros do relatório.';
    actionPlanDetail = 'Manter rotina padrão de monitoramento e validação periódica de restore.';
  }

  // Tentar encontrar nomes de tarefas ou VMs
  const jobMatches = text.match(/(?:Job|Task|Tarefa|VM|Backup de|Servidor)[:\s]+([A-Za-z0-9À-ÿ\s._-]{3,35})/gi);
  if (jobMatches && jobMatches.length > 0) {
    const uniqueJobNames = Array.from(new Set(jobMatches.map(j => j.replace(/^(Job|Task|Tarefa|VM|Backup de|Servidor)[:\s]+/i, '').trim())))
      .filter(name => name.length >= 3 && !/success|failed|warning|completed/i.test(name))
      .slice(0, 5);

    uniqueJobNames.forEach((name, idx) => {
      const isFailedJob = overallStatus === 'failed' && idx === 0;
      jobs.push({
        title: name,
        backupType: /cloud|s3|azure|wasabi|aws/i.test(text) ? 'CLOUD' : 'LOCAL',
        status: isFailedJob ? 'failed' : (overallStatus === 'warning' && idx === 0 ? 'warning' : 'success'),
        technicalAnalysis: isFailedJob ? technicalDetail : 'Job finalizado sem erros impeditivos.',
        actionPlan: isFailedJob ? actionPlanDetail : 'Nenhuma ação corretiva imediata necessária.',
        criticality: isFailedJob ? 'high' : 'medium',
        rootCause: isFailedJob ? detectedRootCause : 'other',
        impact: isFailedJob ? 'high' : 'low'
      });
    });
  }

  // Se nenhum job nomeado foi identificado, criar o job principal correspondente
  if (jobs.length === 0) {
    const cleanBaseName = filename ? filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Rotina Principal de Backup';
    jobs.push({
      title: cleanBaseName,
      backupType: /cloud|s3|azure|wasabi|aws/i.test(text) ? 'CLOUD' : 'LOCAL',
      status: overallStatus,
      technicalAnalysis: technicalDetail,
      actionPlan: actionPlanDetail,
      criticality: overallStatus === 'failed' ? 'high' : (overallStatus === 'warning' ? 'medium' : 'low'),
      rootCause: detectedRootCause,
      impact: overallStatus === 'failed' ? 'high' : 'low'
    });
  }

  const summary = overallStatus === 'failed'
    ? `Relatório processado via leitor local inteligente. Identificado status de FALHA para ${clientName}. ${technicalDetail}`
    : (overallStatus === 'warning'
      ? `Relatório processado via leitor local inteligente. Identificado status de ALERTA para ${clientName}. Verifique os avisos registrados.`
      : `Relatório processado via leitor local inteligente. Todos os ${jobs.length} jobs foram concluídos com SUCESSO para ${clientName}.`);

  return {
    clientName,
    backupDate,
    overallStatus,
    summary,
    jobs,
    isLocalFallback: true
  };
}
