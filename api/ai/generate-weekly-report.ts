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
    const { backups } = body;

    if (!Array.isArray(backups) || backups.length === 0) {
      return res.status(400).json({ error: 'Nenhum registro de backup fornecido para geração do relatório.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
Você é um Especialista Sênior em Gestão de Continuidade de Negócios e Infraestrutura de TI.
Gere um relatório executivo semanal de backup consolidado, profissional e analítico com base nos seguintes dados de execução:

Dados brutos (${backups.length} registros analisados):
${JSON.stringify(backups.slice(0, 100), null, 2)}

O relatório deve conter:
1. Resumo Executivo: Visão geral da saúde dos backups, taxa de conformidade e riscos imediatos.
2. Análise de Falhas e Incidentes Críticos: Destaque os jobs que falharam ou apresentaram avisos recorrentes.
3. Avaliação de Capacidade e Armazenamento: Tendências observadas e pontos de atenção.
4. Plano de Ação Recomendado: Lista de prioridades técnicas para a próxima semana.

Formato: Retorne um texto estruturado em Markdown elegante e profissional em Português do Brasil.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) {
      return res.status(502).json({ error: 'Falha ao obter relatório da IA.' });
    }

    return res.status(200).json({ success: true, text });
  } catch (err: any) {
    console.error('Erro ao gerar relatório semanal (Vercel API):', err);
    return res.status(500).json({ error: err?.message || 'Erro ao gerar relatório semanal' });
  }
}
