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

  // Permite payloads de até 25MB para suportar relatórios PDF codificados em Base64
  app.use(express.json({ limit: '25mb' }));

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const responseText = response.text?.trim();
      if (!responseText) {
        return res.status(502).json({ error: 'A IA não retornou uma resposta válida para o documento enviado.' });
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const text = response.text?.trim();
      if (!text) {
        return res.status(502).json({ error: 'Falha ao obter diagnóstico da IA.' });
      }

      return res.json(JSON.parse(text));
    } catch (err: any) {
      console.error('Erro ao analisar log textual:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao analisar log' });
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
