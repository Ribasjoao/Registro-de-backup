import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chave da API Gemini não configurada no servidor Vercel. Configure GEMINI_API_KEY nas variáveis de ambiente.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { log, clientName } = body;

    if (!log || typeof log !== 'string') {
      return res.status(400).json({ error: 'Log de erro ausente ou inválido.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
Você é um Arquiteto de Infraestrutura Sênior especializado em soluções de backup (Nakivo, Veeam, Bacula, Acronis, etc.).
Analise o log de erro abaixo do cliente "${clientName || 'Geral'}" e forneça um diagnóstico técnico objetivo e um plano de ação direto.

Log bruto:
"""
${log.slice(0, 15000)}
"""

Formate sua resposta EXATAMENTE com as duas seções abaixo em Português do Brasil:

1. **Análise Técnica**
[Seu diagnóstico técnico claro, explicando o erro e a causa raiz identificada]

2. **Plano de Ação**
[Passos práticos, comandos recomendados e procedimentos para resolver a falha]
`;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.8-flash',
    ];

    let text = '';
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        text = response.text?.trim() || '';
        if (text) break;
      } catch (mErr: any) {
        console.warn(`Tentativa de análise com ${modelName} falhou:`, mErr?.message || mErr);
      }
    }

    if (!text) {
      // Fallback heurístico em caso de esgotamento de cotas
      let technicalAnalysis = 'Ocorrência identificada durante a rotina de execução do backup.';
      let actionPlan = 'Verificar os registros de log do serviço de backup e validar o status dos agentes.';

      if (/disk full|espaço|space|storage|capacity|sem espa[cç]o/i.test(log)) {
        technicalAnalysis = 'Falha crítica por esgotamento de espaço no volume de destino ou storage.';
        actionPlan = 'Executar limpeza de backups expirados, avaliar políticas de retenção (GFS) e liberar espaço no disco/storage.';
      } else if (/vss|snapshot|shadow copy/i.test(log)) {
        technicalAnalysis = 'Erro de criação ou congelamento de snapshot via VSS (Volume Shadow Copy Service).';
        actionPlan = 'Executar "vssadmin list writers" para verificar provedores com erro e reiniciar o serviço VSS.';
      } else if (/network|timeout|connection|unreachable|socket|rede/i.test(log)) {
        technicalAnalysis = 'Instabilidade ou timeout de comunicação na rede com o repositório ou máquina de destino.';
        actionPlan = 'Checar latência de rede, regras de firewall nas portas do agente de backup e rota entre servidores.';
      } else if (/access denied|permission|credential|auth|senha/i.test(log)) {
        technicalAnalysis = 'Falha de autenticação ou credencial sem permissão de leitura/escrita no recurso.';
        actionPlan = 'Revisar a conta de serviço configurada para o job e atualizar as credenciais no painel de backup.';
      }

      return res.status(200).json({
        success: true,
        text: `1. **Análise Técnica**\n${technicalAnalysis}\n\n2. **Plano de Ação**\n${actionPlan}`,
        technicalAnalysis,
        actionPlan,
        isLocalFallback: true,
      });
    }

    const sections = text.split(/2\.\s+\*\*Plano de Ação\*\*/i);

    let technicalAnalysis = text;
    let actionPlan = '';

    if (sections.length === 2) {
      technicalAnalysis = sections[0].replace(/1\.\s+\*\*Análise Técnica\*\*/i, '').trim();
      actionPlan = sections[1].trim();
    }

    return res.status(200).json({
      success: true,
      text,
      technicalAnalysis,
      actionPlan,
    });
  } catch (err: any) {
    console.error('Erro na análise de log (Vercel API):', err);
    return res.status(200).json({
      success: true,
      technicalAnalysis: 'Ocorrência identificada no log de backup.',
      actionPlan: 'Verificar status do agente de backup e conferir logs do sistema.',
      isLocalFallback: true,
    });
  }
}
