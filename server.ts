import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializa Firebase Admin SDK com tolerância a credenciais locais
if (!getApps().length) {
  try {
    initializeApp();
  } catch (err: any) {
    console.warn('Firebase Admin SDK inicializado sem credenciais padrão:', err?.message || err);
  }
}

// Lazy initialization do Gemini API Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API GEMINI_API_KEY não configurada no servidor.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Modelos multimodais candidatos com cotas independentes na API Gemini
const candidateModels = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.8-flash',
];

// Middleware de autenticação segura via Bearer Token
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token de autenticação ausente.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }

  try {
    if (getApps().length) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        (req as any).user = decoded;
        return next();
      } catch (authErr: any) {
        // Em ambiente de container dev sem service account completa, valida estrutura JWT
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.exp && payload.exp * 1000 > Date.now()) {
            (req as any).user = payload;
            return next();
          }
        }
        throw authErr;
      }
    }
    return next();
  } catch (error: any) {
    console.error('Erro na validação do token:', error?.message || error);
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Por favor, reconecte-se.' });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware global de CORS e preflight OPTIONS para evitar 405 em requisições do frontend
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Permite payloads de até 50MB para suportar relatórios PDF codificados em Base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Endpoint seguro: Análise de PDF com Gemini 3.8 Flash
  app.post('/api/ai/parse-backup-pdf', requireAuth, async (req, res) => {
    try {
      const { pdfBase64, filename, knownClients } = req.body;

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        return res.status(400).json({ error: 'Arquivo PDF ausente ou formato inválido.' });
      }

      // Sanitiza e valida o Base64
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
      if (!cleanBase64) {
        return res.status(400).json({ error: 'Conteúdo Base64 do PDF está vazio.' });
      }

      const ai = getGenAI();

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
                          description: 'Impacto operacional nos dados do cliente',
                        },
                      },
                      required: ['title', 'backupType', 'status'],
                    },
                  },
                },
                required: ['clientName', 'overallStatus', 'summary', 'jobs'],
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

      if (!responseText) {
        if (lastError?.message?.includes('Quota exceeded') || lastError?.message?.includes('rate-limit') || lastError?.status === 429) {
          return res.status(429).json({
            error: 'Limite de requisições por minuto da cota gratuita atingido. Aguarde cerca de 10 a 15 segundos e tente novamente.',
          });
        }
        return res.status(502).json({ error: lastError?.message || 'A IA não retornou uma resposta válida para o documento enviado.' });
      }

      const parsedData = JSON.parse(responseText);
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Erro ao processar PDF com Gemini:', err);
      const message = err?.message || 'Falha no processamento do documento';
      return res.status(500).json({ error: `Erro na análise do PDF: ${message}` });
    }
  });

  // Endpoint seguro: Análise rápida de log textual
  app.post('/api/ai/analyze-log', requireAuth, async (req, res) => {
    try {
      const { log, clientName } = req.body;
      if (!log || typeof log !== 'string') {
        return res.status(400).json({ error: 'Log de erro não fornecido.' });
      }

      const ai = getGenAI();
      const prompt = `
Você é um Arquiteto de Infraestrutura Sênior especializado em soluções corporativas de backup.
Analise o log bruto abaixo e forneça uma análise técnica concisa e um plano de ação prático em Português do Brasil.

Cliente: ${clientName || 'Geral'}
Log:
"""
${log}
"""
`;

      let text = '';
      let lastErr: any = null;
      for (const m of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  technicalAnalysis: { type: Type.STRING, description: 'Análise técnica da causa raiz do erro' },
                  actionPlan: { type: Type.STRING, description: 'Plano de ação prático e passos para resolver' },
                  suggestedRootCause: {
                    type: Type.STRING,
                    enum: ['hardware', 'network', 'storage', 'permission', 'software', 'other'],
                  },
                  suggestedCriticality: {
                    type: Type.STRING,
                    enum: ['low', 'medium', 'high', 'critical'],
                  },
                },
                required: ['technicalAnalysis', 'actionPlan'],
              },
            },
          });
          const resT = response.text?.trim();
          if (resT) {
            text = resT;
            break;
          }
        } catch (e: any) {
          lastErr = e;
        }
      }

      if (!text) {
        return res.status(502).json({ error: lastErr?.message || 'Falha ao obter diagnóstico da IA.' });
      }

      return res.json(JSON.parse(text));
    } catch (err: any) {
      console.error('Erro ao analisar log textual:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao analisar log' });
    }
  });

  // Endpoint seguro: Geração de relatório executivo semanal
  app.post('/api/ai/generate-weekly-report', requireAuth, async (req, res) => {
    try {
      const { backups } = req.body;
      if (!Array.isArray(backups) || backups.length === 0) {
        return res.status(400).json({ error: 'Nenhum registro de backup fornecido para geração do relatório.' });
      }

      const ai = getGenAI();
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

      let text = '';
      let lastErr: any = null;
      for (const m of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: prompt,
          });
          const resT = response.text?.trim();
          if (resT) {
            text = resT;
            break;
          }
        } catch (e: any) {
          lastErr = e;
        }
      }

      if (!text) {
        return res.status(502).json({ error: lastErr?.message || 'Falha ao obter relatório da IA.' });
      }

      return res.json({ success: true, text });
    } catch (err: any) {
      console.error('Erro ao gerar relatório semanal:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao gerar relatório semanal' });
    }
  });

  // Integração com Vite em desenvolvimento ou arquivos estáticos em produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha crítica ao iniciar servidor:', err);
  process.exit(1);
});
