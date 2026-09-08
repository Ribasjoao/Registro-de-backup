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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
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
    return res.status(500).json({ error: err?.message || 'Erro ao processar análise do log' });
  }
}
