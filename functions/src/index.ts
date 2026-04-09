import * as functions from "firebase-functions";
import { GoogleGenAI } from "@google/genai";

// A chave da API deve ser configurada no Firebase Secrets
// firebase functions:secrets:set GEMINI_API_KEY=sua_chave_aqui

export const generateWeeklyReport = functions.https.onCall(async (data, context) => {
  // 1. Verificação de Autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário deve estar autenticado para gerar relatórios."
    );
  }

  const { backups } = data;

  if (!backups || !Array.isArray(backups)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Dados de backup inválidos ou ausentes."
    );
  }

  // 2. Acesso seguro à chave de API (via Secrets)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Configuração do servidor incompleta (API Key ausente)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Como um especialista em infraestrutura de TI e backup, analise os seguintes registros de backup da última semana e gere um relatório executivo detalhado em Markdown.
    
    O relatório deve conter:
    1. **Resumo de Performance**: Uma visão geral do sucesso vs falhas.
    2. **Incidentes Críticos**: Liste os backups que falharam e suas possíveis causas (com base na análise técnica fornecida).
    3. **Padrões e Tendências**: Identifique se algum cliente ou nó específico está apresentando falhas recorrentes.
    4. **Pontos de Melhoria**: Sugestões acionáveis para evitar falhas futuras.
    5. **Conclusão**: Uma nota final sobre a saúde da infraestrutura.

    Dados dos Backups:
    ${JSON.stringify(backups.slice(0, 50), null, 2)}

    Responda em Português do Brasil. Use um tom profissional e direto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const text = response.text;

    return { text };
  } catch (error) {
    console.error("Erro no Gemini:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao processar a requisição com o Gemini."
    );
  }
});

export const analyzeBackupLog = functions.https.onCall(async (data, context) => {
  // 1. Verificação de Autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "O usuário deve estar autenticado para analisar logs."
    );
  }

  const { log, clientName } = data;

  if (!log) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O log de erro é obrigatório."
    );
  }

  // 2. Acesso seguro à chave de API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Configuração do servidor incompleta (API Key ausente)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Você é um Arquiteto de Infraestrutura Sênior especializado em soluções de backup (Nakivo, Veeam, etc).
    Sua tarefa é analisar o log de erro bruto abaixo e fornecer um diagnóstico preciso.

    Cliente: ${clientName || 'Não informado'}
    Log de Erro:
    """
    ${log}
    """

    Instruções de Resposta:
    Retorne a resposta em Português do Brasil, estruturada em duas partes claras:
    1. **Análise Técnica**: Identifique a causa raiz do problema de forma técnica e concisa.
    2. **Plano de Ação**: Forneça passos práticos e imediatos para resolver o problema (ex: comandos PowerShell, ajustes de permissão, verificação de serviços VSS, limpeza de snapshot, etc).

    Formate a saída em Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const text = response.text;

    return { text };
  } catch (error) {
    console.error("Erro no Gemini (Análise de Log):", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao processar a análise do log com o Gemini."
    );
  }
});
