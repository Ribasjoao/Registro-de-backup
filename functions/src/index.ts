import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { logAction } from "./utils/logger";
import {
  processMissingBackupCheck,
  processBackupFailureAlert,
  processWeeklyComplianceReport
} from "./utils/alerts";

// Inicializa Firebase Admin SDK se ainda não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 2. Triggers de Firestore & Logging Estruturado de Auditoria
 */

// Trigger ao criar novo registro de backup
export const onBackupCreated = functions.firestore
  .document("backups/{backupId}")
  .onCreate(async (snapshot, context) => {
    const backupId = context.params.backupId;
    const data = snapshot.data();

    // 1. Log Estruturado de Criação
    await logAction(db, {
      userId: data?.userId || "system",
      userName: data?.responsible || data?.userName || "Operador",
      action: "CREATE_BACKUP",
      collection: "backups",
      docId: backupId,
      after: data,
      details: `Registro de backup criado para cliente "${data?.client || 'N/A'}" com status [${data?.status?.toUpperCase() || 'N/A'}].`
    });

    // 2. Alerta imediato de falha/aviso
    await processBackupFailureAlert(db, backupId, data);
  });

// Trigger ao atualizar registro de backup
export const onBackupUpdated = functions.firestore
  .document("backups/{backupId}")
  .onUpdate(async (change, context) => {
    const backupId = context.params.backupId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    await logAction(db, {
      userId: afterData?.userId || "system",
      userName: afterData?.responsible || "Operador",
      action: "UPDATE_BACKUP",
      collection: "backups",
      docId: backupId,
      before: beforeData,
      after: afterData,
      details: `Registro de backup ID ${backupId} atualizado.`
    });
  });

// Trigger ao excluir registro de backup
export const onBackupDeleted = functions.firestore
  .document("backups/{backupId}")
  .onDelete(async (snapshot, context) => {
    const backupId = context.params.backupId;
    const beforeData = snapshot.data();

    await logAction(db, {
      userId: "system",
      userName: "Operador/Admin",
      action: "DELETE_BACKUP",
      collection: "backups",
      docId: backupId,
      before: beforeData,
      details: `Registro de backup ID ${backupId} excluído do sistema.`
    });
  });

/**
 * 3.1 — Alerta de Registro Ausente (Cron Diário às 08:00 BRT)
 */
export const checkMissingBackup = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    console.log("Iniciando verificação agendada de backup ausente (Cron 08:00)...");
    const result = await processMissingBackupCheck(db);
    console.log("Resultado da verificação de backup ausente:", result);
  });

/**
 * 3.3 — Relatório de Conformidade Semanal (Cron Toda Segunda às 09:00 BRT)
 */
export const checkWeeklyCompliance = functions.pubsub
  .schedule("0 9 * * 1")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    console.log("Iniciando geração de Relatório de Conformidade Semanal (Cron Seg 09:00)...");
    const result = await processWeeklyComplianceReport(db);
    console.log("Resultado da verificação de conformidade semanal:", result);
  });

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
