import * as admin from 'firebase-admin';
import { sendNotification, getNotificationsConfig, AlertPayload, NotificationsConfig } from './notifications';
import { logAction } from './logger';

/**
 * Calcula a conformidade de backups nos últimos N dias.
 * Retorna o número de dias com pelo menos 1 backup registrado,
 * o total de dias checados, a porcentagem de conformidade e a lista de datas faltantes.
 */
export function calculateCompliance(
  backups: Array<{ timestamp: string; status?: string }>,
  totalDays: number = 7,
  referenceDate: Date = new Date()
): {
  daysWithBackupCount: number;
  totalDays: number;
  complianceRate: number; // 0 a 100
  missingDates: string[];
  daysWithSuccessCount: number;
} {
  const missingDates: string[] = [];
  let daysWithBackupCount = 0;
  let daysWithSuccessCount = 0;

  // Normalizar datas baseadas na timezone local / YYYY-MM-DD
  for (let i = 1; i <= totalDays; i++) {
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() - i);
    const dateStr = targetDate.toISOString().split('T')[0];

    const dayBackups = backups.filter(b => {
      if (!b.timestamp) return false;
      return b.timestamp.split('T')[0] === dateStr;
    });

    if (dayBackups.length > 0) {
      daysWithBackupCount++;
      const hasSuccess = dayBackups.some(b => b.status === 'success');
      if (hasSuccess) {
        daysWithSuccessCount++;
      }
    } else {
      missingDates.push(dateStr);
    }
  }

  const complianceRate = totalDays > 0 ? Math.round((daysWithBackupCount / totalDays) * 100) : 0;

  return {
    daysWithBackupCount,
    totalDays,
    complianceRate,
    missingDates,
    daysWithSuccessCount
  };
}

/**
 * 3.1 — Alerta de Registro Ausente
 * Cron: diariamente às 08:00 (America/Sao_Paulo)
 * Verifica se existe registro de backup para o dia anterior.
 */
export async function processMissingBackupCheck(
  db: admin.firestore.Firestore,
  referenceDate: Date = new Date(),
  configOverride?: NotificationsConfig
): Promise<{ missing: boolean; alerted: boolean; recordCount: number }> {
  const config = configOverride || await getNotificationsConfig(db);

  // Calcula a data do dia anterior em YYYY-MM-DD
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDateStr = yesterday.toISOString().split('T')[0];

  // Busca backups do dia anterior
  const snapshot = await db.collection('backups').get();
  const allBackups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const yesterdayBackups = allBackups.filter(b => {
    return b.timestamp && b.timestamp.split('T')[0] === targetDateStr;
  });

  const recordCount = yesterdayBackups.length;

  if (recordCount === 0) {
    // NENHUM REGISTRO DE BACKUP NO DIA ANTERIOR -> Dispara Alerta
    const payload: AlertPayload = {
      type: 'MISSING_BACKUP',
      title: '⚠️ Alerta de Backup Ausente',
      message: `Nenhum registro de backup foi efetuado na data de ontem (${targetDateStr}). Ações de verificação urgente requeridas.`,
      severity: 'critical',
      details: {
        targetDate: targetDateStr,
        checkTime: new Date().toISOString(),
        missingBackupCheckTime: config.missingBackupCheckTime
      }
    };

    await sendNotification(db, payload, config);

    await logAction(db, {
      userId: 'system-cron',
      userName: 'Robô de Monitoramento (Cron 08:00)',
      action: 'ALERT_MISSING_BACKUP',
      collection: 'backups',
      docId: `missing-${targetDateStr}`,
      details: `Disparou alerta: nenhum backup registrado na data ${targetDateStr}.`
    });

    return { missing: true, alerted: true, recordCount: 0 };
  } else {
    // EXISTE REGISTRO -> Log silencioso de auditoria
    const hasSuccess = yesterdayBackups.some(b => b.status === 'success');
    await logAction(db, {
      userId: 'system-cron',
      userName: 'Robô de Monitoramento (Cron 08:00)',
      action: 'CHECK_BACKUP_EXISTS',
      collection: 'backups',
      docId: `check-${targetDateStr}`,
      details: `Checagem diária OK: ${recordCount} registro(s) encontrado(s) para ${targetDateStr} (Sucesso: ${hasSuccess ? 'Sim' : 'Não'}).`
    });

    return { missing: false, alerted: false, recordCount };
  }
}

/**
 * 3.2 — Alerta de Falha de Backup
 * Trigger: onCreate na collection `backups`
 */
export async function processBackupFailureAlert(
  db: admin.firestore.Firestore,
  backupId: string,
  backupData: any,
  configOverride?: NotificationsConfig
): Promise<boolean> {
  const status = backupData?.status;
  const isFailure = status === 'failed' || status === 'warning' || status === 'falha' || status === 'incompleto';

  if (!isFailure) {
    return false;
  }

  const config = configOverride || await getNotificationsConfig(db);

  const clientName = backupData.client || 'Cliente Não Informado';
  const backupType = backupData.backupType || backupData.category || 'Local/Cloud';
  const title = backupData.title || 'Rotina de Backup';
  const obs = backupData.technicalAnalysis || backupData.actionPlan || backupData.notes || 'Sem observações técnicas.';
  const timestamp = backupData.timestamp || new Date().toISOString();

  const payload: AlertPayload = {
    type: 'BACKUP_FAILURE',
    title: `🚨 Falha Crítica de Backup: ${clientName}`,
    message: `O backup "${title}" do cliente "${clientName}" registrou o status [${status.toUpperCase()}].`,
    severity: status === 'failed' || status === 'falha' ? 'critical' : 'warning',
    recordId: backupId,
    timestamp,
    details: {
      backupId,
      cliente: clientName,
      tipoBackup: backupType,
      titulo: title,
      status: status,
      responsavel: backupData.responsible || 'Não informado',
      observacoes: obs,
      dataExecucao: timestamp,
      linkRegistro: `https://app.backup.local/registros?id=${backupId}`
    }
  };

  await sendNotification(db, payload, config);

  await logAction(db, {
    userId: backupData.userId || 'system',
    userName: backupData.responsible || 'Técnico de Backup',
    action: 'ALERT_BACKUP_FAILURE',
    collection: 'backups',
    docId: backupId,
    details: `Disparou alerta imediato de falha/aviso para backup ID ${backupId} (${clientName} - ${status.toUpperCase()}).`
  });

  return true;
}

/**
 * 3.3 — Relatório de Conformidade Semanal
 * Cron: toda segunda-feira às 09:00
 */
export async function processWeeklyComplianceReport(
  db: admin.firestore.Firestore,
  referenceDate: Date = new Date(),
  configOverride?: NotificationsConfig
): Promise<{ complianceRate: number; alerted: boolean }> {
  const config = configOverride || await getNotificationsConfig(db);

  const snapshot = await db.collection('backups').get();
  const allBackups = snapshot.docs.map(doc => doc.data() as any);

  const stats = calculateCompliance(allBackups, 7, referenceDate);
  const threshold = config.complianceThreshold ?? 80;

  if (stats.complianceRate < threshold) {
    // Conformidade abaixo da meta (80%) -> Disparar Relatório Detalhado
    const payload: AlertPayload = {
      type: 'WEEKLY_COMPLIANCE',
      title: '📊 Relatório Semanal de Conformidade de Backups — Abaixo do SLA',
      message: `A conformidade dos últimos 7 dias atingiu ${stats.complianceRate}%, estando abaixo do limite mínimo configurado de ${threshold}%.`,
      severity: 'warning',
      details: {
        taxaConformidade: `${stats.complianceRate}%`,
        limiteMinimo: `${threshold}%`,
        diasComBackup: `${stats.daysWithBackupCount} / 7 dias`,
        diasAusentes: stats.missingDates.length > 0 ? stats.missingDates.join(', ') : 'Nenhum',
        dataRelatorio: new Date().toISOString()
      }
    };

    await sendNotification(db, payload, config);

    await logAction(db, {
      userId: 'system-cron',
      userName: 'Robô de Relatório Semanal (Cron Seg 09:00)',
      action: 'ALERT_WEEKLY_COMPLIANCE',
      collection: 'backups',
      docId: `weekly-${new Date().toISOString().split('T')[0]}`,
      details: `Disparou relatório semanal: Conformidade (${stats.complianceRate}%) abaixo do limiar (${threshold}%).`
    });

    return { complianceRate: stats.complianceRate, alerted: true };
  } else {
    // Conformidade OK -> Log silencioso
    await logAction(db, {
      userId: 'system-cron',
      userName: 'Robô de Relatório Semanal (Cron Seg 09:00)',
      action: 'CHECK_WEEKLY_COMPLIANCE_OK',
      collection: 'backups',
      docId: `weekly-${new Date().toISOString().split('T')[0]}`,
      details: `Relatório Semanal OK: Conformidade em ${stats.complianceRate}% (${stats.daysWithBackupCount}/7 dias). Limiar = ${threshold}%.`
    });

    return { complianceRate: stats.complianceRate, alerted: false };
  }
}
