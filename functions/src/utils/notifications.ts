import * as admin from 'firebase-admin';

export interface NotificationsConfig {
  activeChannel: 'email' | 'webhook' | 'both' | 'none';
  emails: string[];
  webhookUrls: string[];
  missingBackupCheckTime: string; // Ex: "08:00"
  complianceThreshold: number; // Ex: 80
}

export interface AlertPayload {
  type: 'MISSING_BACKUP' | 'BACKUP_FAILURE' | 'WEEKLY_COMPLIANCE' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, any>;
  recordId?: string;
  timestamp?: string;
}

export const DEFAULT_NOTIFICATIONS_CONFIG: NotificationsConfig = {
  activeChannel: 'both',
  emails: ['admin@empresa.com', 'soc@empresa.com'],
  webhookUrls: ['https://webhook.site/demo-backup-alerts'],
  missingBackupCheckTime: '08:00',
  complianceThreshold: 80
};

/**
 * Busca a configuração de notificações da collection `notifications_config` (doc: 'default' ou 'global')
 * com fallback para configurações padrão.
 */
export async function getNotificationsConfig(db: admin.firestore.Firestore): Promise<NotificationsConfig> {
  try {
    const docRef = db.collection('notifications_config').doc('default');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data() as Partial<NotificationsConfig>;
      return {
        activeChannel: data.activeChannel || DEFAULT_NOTIFICATIONS_CONFIG.activeChannel,
        emails: Array.isArray(data.emails) ? data.emails : DEFAULT_NOTIFICATIONS_CONFIG.emails,
        webhookUrls: Array.isArray(data.webhookUrls) ? data.webhookUrls : DEFAULT_NOTIFICATIONS_CONFIG.webhookUrls,
        missingBackupCheckTime: data.missingBackupCheckTime || DEFAULT_NOTIFICATIONS_CONFIG.missingBackupCheckTime,
        complianceThreshold: typeof data.complianceThreshold === 'number' ? data.complianceThreshold : DEFAULT_NOTIFICATIONS_CONFIG.complianceThreshold
      };
    }
  } catch (err) {
    console.warn('Não foi possível ler notifications_config/default, usando fallback:', err);
  }

  return DEFAULT_NOTIFICATIONS_CONFIG;
}

/**
 * Envia um alerta utilizando os canais configurados (email, webhook ou ambos).
 */
export async function sendNotification(
  db: admin.firestore.Firestore,
  payload: AlertPayload,
  configOverride?: NotificationsConfig
): Promise<{ emailSent: boolean; webhookSent: boolean }> {
  const config = configOverride || await getNotificationsConfig(db);
  const results = { emailSent: false, webhookSent: false };

  if (config.activeChannel === 'none') {
    console.log('Canais de notificação desativados (activeChannel = none).');
    return results;
  }

  const timestamp = payload.timestamp || new Date().toISOString();

  // 1. Canal Email (Trigger Email Extension)
  if (config.activeChannel === 'email' || config.activeChannel === 'both') {
    if (config.emails.length > 0) {
      try {
        await db.collection('mail').add({
          to: config.emails,
          message: {
            subject: `[ALERTA BACKUP - ${payload.severity.toUpperCase()}] ${payload.title}`,
            text: `${payload.title}\n\n${payload.message}\n\nDetalhes:\n${JSON.stringify(payload.details || {}, null, 2)}\n\nHorário: ${timestamp}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
                <h2 style="color: ${payload.severity === 'critical' ? '#e11d48' : '#f59e0b'}; margin-top: 0;">
                  ${payload.title}
                </h2>
                <p style="font-size: 15px; color: #334155; line-height: 1.6;">${payload.message}</p>
                ${payload.details ? `
                  <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 15px 0;">
                    <pre style="margin: 0;">${JSON.stringify(payload.details, null, 2)}</pre>
                  </div>
                ` : ''}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Sistema de Monitoramento Diário de Backups • ${timestamp}</p>
              </div>
            `
          },
          createdAt: timestamp
        });
        results.emailSent = true;
        console.log(`Email de alerta enfileirado na collection 'mail' para: ${config.emails.join(', ')}`);
      } catch (emailErr) {
        console.error('Erro ao registrar mensagem na collection mail:', emailErr);
      }
    }
  }

  // 2. Canal Webhook
  if (config.activeChannel === 'webhook' || config.activeChannel === 'both') {
    if (config.webhookUrls.length > 0) {
      const webhookBody = {
        event: payload.type,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        details: payload.details || {},
        recordId: payload.recordId || null,
        timestamp
      };

      for (const url of config.webhookUrls) {
        try {
          // Uso de fetch nativo do Node 20
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookBody)
          });
          if (res.ok) {
            results.webhookSent = true;
            console.log(`Webhook enviado com sucesso para ${url} (Status: ${res.status})`);
          } else {
            console.warn(`Webhook ${url} retornou HTTP ${res.status}`);
          }
        } catch (webhookErr) {
          console.error(`Erro ao disparar webhook para ${url}:`, webhookErr);
        }
      }
    }
  }

  // Registra notificação enviada na collection notifications
  try {
    await db.collection('notifications').add({
      payload,
      configUsed: {
        activeChannel: config.activeChannel,
        recipientCount: config.emails.length,
        webhookCount: config.webhookUrls.length
      },
      status: results,
      timestamp
    });
  } catch (dbErr) {
    console.error('Erro ao registrar histórico na collection notifications:', dbErr);
  }

  return results;
}
