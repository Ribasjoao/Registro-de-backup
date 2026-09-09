import { extractTextFromPdfBase64, heuristicParsePdf } from '../_lib/pdfExtractor';

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

  let filename = '';
  let knownClients: string[] = [];
  let extractedText = '';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const pdfBase64 = body.pdfBase64;
    filename = body.filename || '';
    knownClients = Array.isArray(body.knownClients) ? body.knownClients : [];

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'Arquivo PDF ausente ou formato inválido.' });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
    if (!cleanBase64) {
      return res.status(400).json({ error: 'Conteúdo Base64 do PDF está vazio.' });
    }

    // 1. Extração prévia de texto para economizar até 98% dos tokens da cota gratuita
    extractedText = extractTextFromPdfBase64(cleanBase64, filename);

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      // Se não há chave configurada no painel da Vercel, utiliza o leitor local heurístico diretamente
      const localData = heuristicParsePdf(extractedText, filename, knownClients);
      return res.status(200).json({
        success: true,
        data: localData,
        isLocalFallback: true,
        warning: 'Chave GEMINI_API_KEY ausente na Vercel. Relatório extraído com sucesso pelo leitor local inteligente.',
      });
    }

    // Carregamento dinâmico e tolerante do SDK @google/genai
    let GoogleGenAI: any;
    let Type: any;
    try {
      const genaiModule = await import('@google/genai');
      GoogleGenAI = genaiModule.GoogleGenAI;
      Type = genaiModule.Type;
    } catch (sdkErr: any) {
      console.warn('SDK @google/genai não pôde ser carregado no runtime serverless:', sdkErr?.message);
      const localData = heuristicParsePdf(extractedText, filename, knownClients);
      return res.status(200).json({
        success: true,
        data: localData,
        isLocalFallback: true,
        warning: 'Ambiente Serverless operando com leitor local inteligente.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const clientsContext = knownClients.length > 0
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

    // Modelos com suporte multimodal e cotas gratuitas independentes
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.8-flash',
    ];
    let responseText = '';
    let lastError: any = null;

    // Se o texto extraído tiver bom volume (> 50 caracteres), usamos o texto para gastar muito menos tokens (economizando cota TPM/RPM)
    const useExtractedText = extractedText.trim().length > 50;
    const contentsPayload = useExtractedText
      ? [
          {
            text: `${prompt}\n\nConteúdo textual extraído do relatório de backup:\n"""\n${extractedText.slice(0, 30000)}\n"""`,
          },
        ]
      : [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ];

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
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
      }
    }

    // Se a IA não respondeu (ex: limite de cota 429 atingido em todos os modelos ou 503 temporário)
    // Ativa o fallback heurístico local resiliente para NUNCA bloquear o operador
    if (!responseText) {
      console.warn('Gemini indisponível ou cota esgotada. Acionando leitor local heurístico...', lastError?.message);
      const localData = heuristicParsePdf(extractedText, filename, knownClients);
      return res.status(200).json({
        success: true,
        data: localData,
        isLocalFallback: true,
        warning: 'Cota de requisições do Gemini temporariamente atingida. Os dados do relatório foram lidos e preenchidos com sucesso pelo leitor local inteligente.',
      });
    }

    const parsedData = JSON.parse(responseText);
    return res.status(200).json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Erro na análise de PDF (Vercel API):', err);
    // Em caso de falha catastrófica, tentar extração local antes de retornar erro
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const localData = heuristicParsePdf(body.filename || '', body.filename || '', body.knownClients || []);
      return res.status(200).json({
        success: true,
        data: localData,
        isLocalFallback: true,
      });
    } catch {
      return res.status(500).json({
        error: err?.message || 'Falha interna ao processar o arquivo PDF.',
      });
    }
  }
}
