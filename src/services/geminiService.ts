import { GoogleGenAI } from "@google/genai";
import { BackupRecord } from "../types";

export async function generateWeeklyReport(backups: BackupRecord[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });

  const recentBackups = backups.filter(b => {
    // Basic filtering for last 7 days (assuming timestamp is in some sort of date format)
    // For now, let's just take the last 50 records to provide context
    return true; 
  }).slice(0, 50);

  const prompt = `
    Como um especialista em infraestrutura de TI e backup, analise os seguintes registros de backup da última semana e gere um relatório executivo detalhado em Markdown.
    
    O relatório deve conter:
    1. **Resumo de Performance**: Uma visão geral do sucesso vs falhas.
    2. **Incidentes Críticos**: Liste os backups que falharam e suas possíveis causas (com base na análise técnica fornecida).
    3. **Padrões e Tendências**: Identifique se algum cliente ou nó específico está apresentando falhas recorrentes.
    4. **Pontos de Melhoria**: Sugestões acionáveis para evitar falhas futuras.
    5. **Conclusão**: Uma nota final sobre a saúde da infraestrutura.

    Dados dos Backups:
    ${JSON.stringify(recentBackups, null, 2)}

    Responda em Português do Brasil. Use um tom profissional e direto.
  `;

  try {
    // Try to get the key from various possible locations (platform injection or build-time)
    const apiKey = (window as any).process?.env?.GEMINI_API_KEY || 
                   (window as any).process?.env?.API_KEY || 
                   process.env.GEMINI_API_KEY || 
                   "";
    
    // Debugging (safe)
    console.log("AI Service - API Key Status:", {
      configured: !!apiKey,
      length: apiKey?.length,
      isPlaceholder: apiKey === "MY_GEMINI_API_KEY" || apiKey === "YOUR_GEMINI_API_KEY" || apiKey === "undefined",
      valuePrefix: apiKey ? `${apiKey.substring(0, 3)}...` : 'none',
      source: (window as any).process?.env?.GEMINI_API_KEY ? 'window.process.env.GEMINI_API_KEY' : 
              (window as any).process?.env?.API_KEY ? 'window.process.env.API_KEY' : 'process.env.GEMINI_API_KEY'
    });

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "YOUR_GEMINI_API_KEY" || apiKey === "undefined" || apiKey.length < 10) {
      return "Erro: Chave de API não configurada ou inválida. Por favor, clique em 'Configurar API Key' ou configure a GEMINI_API_KEY no painel de Secrets.";
    }

    const ai = new GoogleGenAI({ apiKey });
    console.log("Generating report with", recentBackups.length, "backups using gemini-3-flash-preview");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    console.log("Gemini response received:", response);
    
    if (!response.text) {
      console.warn("Gemini response text is empty");
      return "O serviço de IA não retornou um texto válido.";
    }

    return response.text;
  } catch (error) {
    console.error("Error generating report:", error);
    if (error instanceof Error) {
      return `Erro ao conectar com o serviço de IA: ${error.message}`;
    }
    return "Erro ao conectar com o serviço de IA. Verifique se a chave de API está configurada.";
  }
}
