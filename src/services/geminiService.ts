import { functions, httpsCallable, auth } from "../firebase";
import { BackupRecord } from "../types";

export interface ParsedJobItem {
  title: string;
  backupType: 'LOCAL' | 'CLOUD';
  status: 'success' | 'warning' | 'failed';
  technicalAnalysis?: string;
  actionPlan?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  rootCause?: 'hardware' | 'network' | 'storage' | 'permission' | 'software' | 'other';
  impact?: 'low' | 'medium' | 'high';
}

export interface ParsedBackupReport {
  clientName: string;
  backupDate: string;
  overallStatus: 'success' | 'warning' | 'failed';
  summary: string;
  jobs: ParsedJobItem[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Envia um PDF de relatório de backup para a rota segura do servidor backend (Vite / Express / Vercel Serverless),
 * ou para o Firebase Cloud Functions / client fallback onde o Gemini analisa e extrai metadados e erros.
 */
export async function parseBackupPdf(
  file: File,
  knownClients: string[] = []
): Promise<ParsedBackupReport> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Você precisa estar autenticado no sistema para analisar relatórios com IA.");
  }

  const token = await currentUser.getIdToken();
  const pdfBase64 = await fileToBase64(file);

  // 1. Tentativa primária: Servidor local / Vercel Serverless Function (/api/ai/parse-backup-pdf)
  try {
    const response = await fetch("/api/ai/parse-backup-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pdfBase64,
        filename: file.name,
        knownClients,
      }),
    });

    if (response.ok) {
      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        return resJson.data as ParsedBackupReport;
      }
    } else if (response.status !== 404 && response.status !== 405) {
      // Erro real retornado pelo backend (ex: erro de formato ou chave de API)
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Falha no servidor (Código ${response.status}) ao analisar o PDF.`);
    }
  } catch (apiErr: any) {
    // Se o erro já é uma mensagem explicativa de negócio, repassa a menos que seja 404/405/Network
    if (apiErr.message && !apiErr.message.includes("404") && !apiErr.message.includes("405") && !apiErr.message.includes("Failed to fetch")) {
      throw apiErr;
    }
    console.warn("Tentativa de API /api/ai/parse-backup-pdf falhou, verificando fallbacks alternativos...", apiErr);
  }

  // 2. Fallback Secundário: Firebase Cloud Functions (se disponível no ambiente)
  try {
    const parseFn = httpsCallable(functions, "parseBackupPdf");
    const result = await parseFn({ pdfBase64, filename: file.name, knownClients });
    const data = result.data as { success: boolean; data: ParsedBackupReport };
    if (data?.data) {
      return data.data;
    }
  } catch (fnErr: any) {
    console.warn("Fallback de Firebase Cloud Function não disponível:", fnErr?.message);
  }

  // 3. Fallback Terciário: Chave de API Gemini direta no cliente (caso configurada em VITE_GEMINI_API_KEY no Vercel)
  const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (clientKey) {
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
      const ai = new GoogleGenAI({ apiKey: clientKey });

      const clientsContext = Array.isArray(knownClients) && knownClients.length > 0
        ? `Clientes já cadastrados no sistema para referência: ${knownClients.join(', ')}.\nSe o relatório pertencer a um destes clientes, use exatamente a grafia existente.`
        : '';

      const prompt = `
Você é um Arquiteto Sênior de Infraestrutura de TI e Especialista em Sistemas de Backup.
Analise atentamente o relatório em PDF anexado (nome do arquivo: "${file.name}").

${clientsContext}

Sua missão:
1. Extrair os metadados do backup (nome do cliente/empresa, data/hora da execução e status geral).
2. Identificar todos os jobs/tarefas executados contidos no documento.
3. Para cada job com aviso ("warning") ou falha ("failed"), extraia o código de erro exato, faça uma análise técnica detalhada da causa raiz e forneça um plano de ação prático e resolutivo.
4. Sugira a criticidade (low, medium, high, critical) e o impacto operacional (low, medium, high).

Retorne os dados em formato JSON estrito. Todos os textos em Português do Brasil.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              backupDate: { type: Type.STRING },
              overallStatus: { type: Type.STRING, enum: ["success", "warning", "failed"] },
              summary: { type: Type.STRING },
              jobs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    backupType: { type: Type.STRING, enum: ["LOCAL", "CLOUD"] },
                    status: { type: Type.STRING, enum: ["success", "warning", "failed"] },
                    technicalAnalysis: { type: Type.STRING },
                    actionPlan: { type: Type.STRING },
                    criticality: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                    rootCause: { type: Type.STRING, enum: ["hardware", "network", "storage", "permission", "software", "other"] },
                    impact: { type: Type.STRING, enum: ["low", "medium", "high"] },
                  },
                  required: ["title", "backupType", "status"],
                },
              },
            },
            required: ["clientName", "backupDate", "overallStatus", "summary", "jobs"],
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text) as ParsedBackupReport;
      }
    } catch (clientErr: any) {
      console.error("Falha no processamento direto com VITE_GEMINI_API_KEY:", clientErr);
    }
  }

  throw new Error(
    "Não foi possível processar o PDF com a IA. Se a aplicação está rodando na Vercel: adicione a variável de ambiente GEMINI_API_KEY (ou VITE_GEMINI_API_KEY) no painel da Vercel (Settings > Environment Variables) e faça um Redeploy do projeto para ativar a rota da IA."
  );
}

export async function generateWeeklyReport(backups: BackupRecord[]): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : '';

    const response = await fetch('/api/ai/generate-weekly-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ backups }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text) {
        return data.text;
      }
    }

    // Fallback para Cloud Function se disponível
    const generateReportFn = httpsCallable(functions, 'generateWeeklyReport');
    const result = await generateReportFn({ backups });
    const data = result.data as { text: string };
    return data.text || 'O serviço de IA não retornou um texto válido.';
  } catch (error: any) {
    console.error('Erro ao gerar relatório semanal:', error);
    return `Erro ao conectar com o serviço de IA: ${error?.message || 'Erro desconhecido'}`;
  }
}

export async function analyzeBackupLog(
  log: string,
  clientName: string
): Promise<{ technicalAnalysis: string; actionPlan: string } | string> {
  try {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : '';

    const response = await fetch('/api/ai/analyze-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ log, clientName }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.technicalAnalysis && data.actionPlan) {
        return {
          technicalAnalysis: data.technicalAnalysis,
          actionPlan: data.actionPlan,
        };
      }
    }

    // Fallback para Cloud Function se disponível
    const analyzeLogFn = httpsCallable(functions, 'analyzeBackupLog');
    const result = await analyzeLogFn({ log, clientName });
    const data = result.data as { text: string };
    if (!data.text) {
      return 'O serviço de IA não retornou uma análise válida.';
    }

    const text = data.text;
    const sections = text.split(/2\.\s+\*\*Plano de Ação\*\*/i);
    let technicalAnalysis = text;
    let actionPlan = '';
    if (sections.length === 2) {
      technicalAnalysis = sections[0].replace(/1\.\s+\*\*Análise Técnica\*\*/i, '').trim();
      actionPlan = sections[1].trim();
    }
    return { technicalAnalysis, actionPlan };
  } catch (error: any) {
    console.error('Erro ao analisar log com IA:', error);
    return `Erro ao analisar log com IA: ${error?.message || 'Erro desconhecido'}`;
  }
}
