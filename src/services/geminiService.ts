import { functions, httpsCallable } from "../firebase";
import { BackupRecord } from "../types";

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
