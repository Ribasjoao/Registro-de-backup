/**
 * Utilitários autônomos para extração de texto e parsing heurístico de relatórios de backup em PDF.
 * Este arquivo NÃO possui nenhuma dependência de bibliotecas de cliente (Firebase, UI, etc.),
 * garantindo compatibilidade total com o runtime Serverless da Vercel e Node.js.
 */

export interface ParsedJobItem {
  title: string;
  backupType: 'LOCAL' | 'CLOUD';
  status: 'success' | 'warning' | 'failed';
  technicalAnalysis?: string;
  actionPlan?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  rootCause?: 'hardware' | 'network' | 'storage' | 'credential' | 'service' | 'software' | 'other';
  impact?: 'low' | 'medium' | 'high';
}

export interface ParsedBackupReport {
  clientName: string;
  backupDate: string;
  overallStatus: 'success' | 'warning' | 'failed';
  summary: string;
  jobs: ParsedJobItem[];
  isLocalFallback?: boolean;
  warning?: string;
}

function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function extractTextFromPdfBase64(pdfBase64: string, filename?: string): string {
  try {
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
    let text = '';

    if (typeof Buffer !== 'undefined') {
      try {
        const rawBuffer = Buffer.from(cleanBase64, 'base64');
        const content = rawBuffer.toString('binary');

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
                const streamText = textMatches
                  .map(m => m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
                  .join(' ');
                text += ' ' + streamText;
              }
            } catch {
              // Stream não comprimido com FlateDecode, ignorar
            }
          }
        }

        const plainMatches = content.match(/\((.*?)\)\s*T[jJ]/g);
        if (plainMatches) {
          const plainText = plainMatches
            .map(m => m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
            .join(' ');
          text += ' ' + plainText;
        }
      } catch (nodeErr) {
        console.warn('Erro ao decodificar buffer PDF no backend:', nodeErr);
      }
    }

    if (!text || text.length < 20) {
      try {
        const binaryStr = atob(cleanBase64.slice(0, 100000));
        const rawMatches = binaryStr.match(/[A-Za-z0-9\s:_\-./\\()]{4,}/g);
        if (rawMatches) {
          text = rawMatches.join(' ');
        }
      } catch {
        // atob indisponível ou falhou
      }
    }

    if (filename) {
      text = `[Arquivo: ${filename}] ` + text;
    }

    return text.trim();
  } catch (err) {
    console.error('Falha geral na extração textual do PDF:', err);
    return filename ? `[Arquivo: ${filename}]` : '';
  }
}

export function heuristicParsePdf(
  rawText: string,
  filename = '',
  knownClients: string[] = []
): ParsedBackupReport {
  const text = (rawText || '') + ' ' + (filename || '');
  const normText = normalizeString(text);

  // 1. Identificar Cliente
  let clientName = '';
  if (Array.isArray(knownClients) && knownClients.length > 0) {
    const matched = knownClients.find(c => {
      const normClient = normalizeString(c);
      return normClient.length >= 3 && (normText.includes(normClient) || normalizeString(filename).includes(normClient));
    });
    if (matched) {
      clientName = matched;
    }
  }

  if (!clientName && filename) {
    const cleanFn = filename
      .replace(/\.pdf$/i, '')
      .replace(/^(relatorio|report|backup|status)[-_ ]*/i, '')
      .replace(/[-_]/g, ' ')
      .trim();
    if (cleanFn.length >= 3) {
      clientName = cleanFn.slice(0, 40);
    }
  }

  if (!clientName) {
    const clientMatch = text.match(/(?:cliente|empresa|customer|client|organization):\s*([^\r\n,;]+)/i);
    if (clientMatch && clientMatch[1]) {
      clientName = clientMatch[1].trim().slice(0, 40);
    } else {
      clientName = 'Cliente Identificado no Relatório';
    }
  }

  // 2. Data do Backup
  let backupDate = new Date().toISOString();
  const dateMatch = text.match(/(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})/);
  if (dateMatch) {
    const rawDate = dateMatch[1].replace(/[/.]/g, '-');
    const parts = rawDate.split('-');
    if (parts[0].length === 4) {
      backupDate = `${parts[0]}-${parts[1]}-${parts[2]}T12:00:00.000Z`;
    } else if (parts[2]?.length === 4) {
      backupDate = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`;
    }
  }

  // 3. Status Geral
  const hasFailed = /fail|falh|error|erro|critical|incomplet/i.test(text);
  const hasWarning = /warn|alert|aten[cç][aã]o|degrad/i.test(text);
  let overallStatus: 'success' | 'warning' | 'failed' = 'success';
  if (hasFailed) overallStatus = 'failed';
  else if (hasWarning) overallStatus = 'warning';

  // 4. Detecção de Jobs e Diagnóstico Técnico
  const detectedJobs: ParsedJobItem[] = [];
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const jobCandidates = lines.filter(l =>
    /(job|tarefa|vm|server|backup|volume|banco|database|srv|dc\d|sql)/i.test(l) &&
    l.length < 120 &&
    l.length > 5
  );

  let detectedRootCause: 'hardware' | 'network' | 'storage' | 'credential' | 'service' | 'software' | 'other' = 'software';
  let technicalDetail = 'Execução finalizada com ocorrências identificadas no log.';
  let actionPlanDetail = 'Verificar logs do agente de backup e conectividade dos serviços.';

  if (/disk full|espaço|space|storage|capacity|sem espa[cç]o|quota/i.test(text)) {
    detectedRootCause = 'storage';
    technicalDetail = 'Capacidade de armazenamento insuficiente ou disco de destino lotado durante a gravação.';
    actionPlanDetail = 'Realizar limpeza de backups antigos, liberar espaço em disco, ajustar retenção (GVS) ou expandir volume de storage/LUN.';
  } else if (/vss|snapshot|shadow copy|volume shadow/i.test(text)) {
    detectedRootCause = 'service';
    technicalDetail = 'Falha no provedor de Volume Shadow Copy (VSS Snapshot) durante o congelamento dos volumes.';
    actionPlanDetail = 'Verificar provedores VSS (vssadmin list providers/writers) e reiniciar serviços correspondentes.';
  } else if (/network|timeout|connection|unreachable|socket|rede/i.test(text)) {
    detectedRootCause = 'network';
    technicalDetail = 'Timeout ou interrupção na comunicação de rede com o repositório ou agente.';
    actionPlanDetail = 'Testar latência, rotas de rede, regras de firewall e estabilidade do link.';
  } else if (/access denied|permission|credential|auth|senha|unauthorized/i.test(text)) {
    detectedRootCause = 'credential';
    technicalDetail = 'Falha de autenticação ou permissão negada para acessar o repositório ou recurso de origem.';
    actionPlanDetail = 'Atualizar as credenciais da conta de serviço com privilégios adequados de leitura e gravação.';
  }

  if (jobCandidates.length > 0) {
    for (const candidate of jobCandidates.slice(0, 8)) {
      const cleanTitle = candidate
        .replace(/^(job|tarefa|name|vm):\s*/i, '')
        .replace(/[^\w\s\-./]/g, '')
        .trim();

      if (cleanTitle.length >= 3) {
        const isJobFailed = /fail|falh|error|erro/i.test(candidate) || (overallStatus === 'failed' && detectedJobs.length === 0);
        const isJobWarning = !isJobFailed && /warn|alert|aten[cç]/i.test(candidate);
        const status = isJobFailed ? 'failed' : isJobWarning ? 'warning' : 'success';

        detectedJobs.push({
          title: cleanTitle.slice(0, 60),
          backupType: /cloud|s3|azure|wasabi|nuvem/i.test(candidate) ? 'CLOUD' : 'LOCAL',
          status,
          technicalAnalysis: status !== 'success' ? technicalDetail : 'Backup processado e validado com integridade.',
          actionPlan: status !== 'success' ? actionPlanDetail : 'Manter rotina e monitorar taxa de crescimento dos dados.',
          criticality: isJobFailed ? 'high' : isJobWarning ? 'medium' : 'low',
          rootCause: status !== 'success' ? detectedRootCause : 'other',
          impact: isJobFailed ? 'high' : 'low',
        });
      }
    }
  }

  if (detectedJobs.length === 0) {
    detectedJobs.push({
      title: filename ? `Backup - ${filename.replace(/\.pdf$/i, '').slice(0, 40)}` : 'Backup Rotina Principal',
      backupType: 'LOCAL',
      status: overallStatus,
      technicalAnalysis: overallStatus !== 'success' ? technicalDetail : 'Backup processado e validado com sucesso.',
      actionPlan: overallStatus !== 'success' ? actionPlanDetail : 'Manter rotina padrão.',
      criticality: overallStatus === 'failed' ? 'high' : overallStatus === 'warning' ? 'medium' : 'low',
      rootCause: overallStatus !== 'success' ? detectedRootCause : 'other',
      impact: overallStatus === 'failed' ? 'high' : 'low',
    });
  }

  const failedCount = detectedJobs.filter(j => j.status === 'failed').length;
  const warningCount = detectedJobs.filter(j => j.status === 'warning').length;
  const successCount = detectedJobs.filter(j => j.status === 'success').length;

  let summary = `Relatório de backup referente a ${clientName}: `;
  if (failedCount > 0) {
    summary += `${failedCount} job(s) com falha crítica identificado(s). Recomendada intervenção técnica.`;
  } else if (warningCount > 0) {
    summary += `${warningCount} job(s) com alertas operacionais. Necessita verificação.`;
  } else {
    summary += `Todos os ${successCount} job(s) foram concluídos com 100% de sucesso e integridade.`;
  }

  return {
    clientName,
    backupDate,
    overallStatus,
    summary,
    jobs: detectedJobs,
    isLocalFallback: true,
  };
}
