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
 * Envia um PDF de relatório de backup para a rota segura do servidor backend,
 * onde o Gemini 3.8 Flash analisa e extrai todos os erros e metadados.
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

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Falha no servidor (Código ${response.status}) ao analisar o PDF.`);
  }

  const resJson = await response.json();
  if (!resJson.success || !resJson.data) {
    throw new Error(resJson.error || "O Gemini não conseguiu estruturar os dados do PDF.");
  }

  return resJson.data as ParsedBackupReport;
}

export async function generateWeeklyReport(backups: BackupRecord[]): Promise<string> {
  try {
    // Invocando a Cloud Function de forma segura
    const generateReportFn = httpsCallable(functions, "generateWeeklyReport");
    
    console.log("Chamando Cloud Function 'generateWeeklyReport' com", backups.length, "backups");
    
    const result = await generateReportFn({ backups });
    const data = result.data as { text: string };

    if (!data.text) {
      return "O serviço de IA não retornou um texto válido.";
    }

    return data.text;
  } catch (error: any) {
    console.error("Erro ao chamar Cloud Function:", error);
    
    // Tratamento de erros específicos do Firebase Functions
    if (error.code === "unauthenticated") {
      return "Erro: Você precisa estar logado para realizar esta ação.";
    }
    if (error.code === "permission-denied") {
      return "Erro: Você não tem permissão para gerar relatórios.";
    }
    
    return `Erro ao conectar com o serviço de IA: ${error.message || "Erro desconhecido"}`;
  }
}

export async function analyzeBackupLog(log: string, clientName: string): Promise<{ technicalAnalysis: string; actionPlan: string } | string> {
  try {
    const analyzeLogFn = httpsCallable(functions, "analyzeBackupLog");
    
    console.log("Chamando Cloud Function 'analyzeBackupLog' para o cliente", clientName);
    
    const result = await analyzeLogFn({ log, clientName });
    const data = result.data as { text: string };

    if (!data.text) {
      return "O serviço de IA não retornou uma análise válida.";
    }

    // A IA retorna um texto em Markdown com as duas seções.
    // Vamos tentar separar as seções se possível, ou retornar o texto completo para ser processado.
    // Para simplificar e seguir o pedido de preencher os dois campos, vamos assumir que a IA 
    // segue a estrutura solicitada.
    
    const text = data.text;
    const sections = text.split(/2\.\s+\*\*Plano de Ação\*\*/i);
    
    let technicalAnalysis = text;
    let actionPlan = "";

    if (sections.length === 2) {
      technicalAnalysis = sections[0].replace(/1\.\s+\*\*Análise Técnica\*\*/i, "").trim();
      actionPlan = sections[1].trim();
    }

    return { technicalAnalysis, actionPlan };
  } catch (error: any) {
    console.error("Erro ao chamar Cloud Function (Análise de Log):", error);
    
    if (error.code === "unauthenticated") {
      return "Erro: Você precisa estar logado para realizar esta ação.";
    }
    
    return `Erro ao analisar log com IA: ${error.message || "Erro desconhecido"}`;
  }
}
