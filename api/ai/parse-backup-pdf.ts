import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS Headers
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
        error: 'Chave da API Gemini não configurada no servidor Vercel. Configure GEMINI_API_KEY nas variáveis de ambiente do seu projeto Vercel.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { pdfBase64, filename, knownClients } = body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'Arquivo PDF ausente ou formato inválido.' });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
    if (!cleanBase64) {
      return res.status(400).json({ error: 'Conteúdo Base64 do PDF está vazio.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const clientsContext = Array.isArray(knownClients) && knownClients.length > 0
      ? `Clientes já cadastrados no sistema para referência: ${knownClients.join(', ')}.\nSe o relatório pertencer a um destes clientes, use exatamente a grafia existente.`
      : '';

    const prompt = `
Você é um Arquiteto Sênior de Infraestrutura de TI e Especialista em Sistemas de Backup (Veeam, Bacula, Nakivo, Acronis, Windows Server Backup, etc.).
Analise atentamente o relatório em PDF anexado (nome do arquivo: "${filename || 'relatorio.pdf'}").

${clientsContext}

Sua missão:
1. Extrair os metadados do backup (nome do cliente/empresa, data/hora da execução e status geral).
2. Identificar todos os jobs/tarefas executados contidos no documento.
3. Para cada job com aviso ("warning") ou falha ("failed"), extraia o código de erro exato, faça uma análise técnica detalhada da causa raiz e forneça um plano de ação prático e resolutivo (ex: comandos PowerShell/bash, reparo de snapshots VSS, limpeza de disco, verificação de rotas/portas, permissões SMB/NFS).
4. Sugira a criticidade (low, medium, high, critical) e o impacto operacional (low, medium, high).

Retorne os dados em formato JSON estrito conforme o schema definido. Todos os textos em Português do Brasil.
`;

    // Modelos com suporte multimodal a documentos PDF
    // gemini-3.8-flash possui cota separada de gemini-flash-latest e gemini-3.1-pro-preview
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                clientName: {
                  type: Type.STRING,
                  description: 'Nome da empresa, cliente ou servidor identificado no relatório',
                },
                backupDate: {
                  type: Type.STRING,
                  description: 'Data do backup identificada no relatório no formato ISO (YYYY-MM-DDTHH:mm:ss) ou YYYY-MM-DD',
                },
                overallStatus: {
                  type: Type.STRING,
                  enum: ['success', 'warning', 'failed'],
                  description: 'Status consolidado do backup (failed se houve erros críticos, warning se houve alertas, success se tudo OK)',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Breve resumo executivo em 1 ou 2 frases sobre o resultado do backup',
                },
                jobs: {
                  type: Type.ARRAY,
                  description: 'Lista de tarefas ou jobs identificados no relatório',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: {
                        type: Type.STRING,
                        description: 'Nome da tarefa ou VM/servidor de backup (ex: Backup VM-DC01, Arquivos Financeiro)',
                      },
                      backupType: {
                        type: Type.STRING,
                        enum: ['LOCAL', 'CLOUD'],
                        description: 'Destino do backup (LOCAL ou CLOUD)',
                      },
                      status: {
                        type: Type.STRING,
                        enum: ['success', 'warning', 'failed'],
                        description: 'Status deste job específico',
                      },
                      technicalAnalysis: {
                        type: Type.STRING,
                        description: 'Diagnóstico técnico da falha/erro ou confirmação de sucesso com detalhes',
                      },
                      actionPlan: {
                        type: Type.STRING,
                        description: 'Passos recomendados para resolução imediata do erro (se aplicável)',
                      },
                      criticality: {
                        type: Type.STRING,
                        enum: ['low', 'medium', 'high', 'critical'],
                        description: 'Gravidade do incidente',
                      },
                      rootCause: {
                        type: Type.STRING,
                        enum: ['hardware', 'network', 'storage', 'permission', 'software', 'other'],
                        description: 'Categoria da causa raiz identificada',
                      },
                      impact: {
                        type: Type.STRING,
                        enum: ['low', 'medium', 'high'],
                        description: 'Nível de impacto operacional estimado',
                      },
                    },
                    required: ['title', 'backupType', 'status'],
                  },
                },
              },
              required: ['clientName', 'backupDate', 'overallStatus', 'summary', 'jobs'],
            },
          },
        });

        const text = response.text?.trim();
        if (text) {
          responseText = text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com modelo ${modelName} retornou erro:`, err?.message || err);
        // Se o erro for temporário de carga (503 / UNAVAILABLE) ou limite de requisições por minuto da cota gratuita (429 / RESOURCE_EXHAUSTED), tenta o próximo modelo que tem pool de cota separado
        const isQuotaOrUnavailable = 
          err?.status === 503 || 
          err?.status === 429 ||
          err?.message?.includes('503') || 
          err?.message?.includes('429') || 
          err?.message?.includes('Quota exceeded') ||
          err?.message?.includes('rate-limit') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('high demand') || 
          err?.message?.includes('UNAVAILABLE');

        if (!isQuotaOrUnavailable) {
          throw err;
        }
      }
    }

    if (!responseText) {
      if (lastError?.message?.includes('Quota exceeded') || lastError?.message?.includes('rate-limit') || lastError?.status === 429) {
        return res.status(429).json({
          error: 'Limite de requisições por minuto da cota gratuita atingido. Aguarde cerca de 10 a 15 segundos e reenvie.',
        });
      }
      if (lastError?.message?.includes('high demand') || lastError?.status === 503) {
        return res.status(503).json({
          error: 'Os servidores da Google API estão com alta demanda temporária neste momento. Por favor, aguarde alguns instantes e tente novamente.',
        });
      }
      return res.status(502).json({ error: lastError?.message || 'Resposta vazia do modelo Gemini.' });
    }

    const parsedData = JSON.parse(responseText);
    return res.status(200).json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Erro na análise de PDF (Vercel API):', err);
    return res.status(500).json({
      error: err?.message || 'Falha interna ao processar o arquivo PDF com a IA.',
    });
  }
}
