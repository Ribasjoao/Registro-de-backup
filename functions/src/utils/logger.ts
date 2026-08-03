import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

export interface AuditLogParams {
  userId: string;
  userName?: string;
  action: string;
  collection: string;
  docId: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string;
  details?: string;
}

export interface StructuredAuditLog extends AuditLogParams {
  id?: string;
  timestamp: string;
}

/**
 * Registra logs estruturados de auditoria na collection `audit_logs`
 * e envia log estruturado em JSON para o Cloud Logging.
 */
export async function logAction(
  db: Firestore,
  params: AuditLogParams
): Promise<string> {
  const timestamp = new Date().toISOString();

  const logPayload: StructuredAuditLog = {
    userId: params.userId || 'system',
    userName: params.userName || 'Sistema Automático',
    action: params.action,
    collection: params.collection,
    docId: params.docId,
    timestamp,
    ...(params.before ? { before: params.before } : {}),
    ...(params.after ? { after: params.after } : {}),
    ...(params.ip ? { ip: params.ip } : {}),
    ...(params.details ? { details: params.details } : {})
  };

  // Structured stdout logging for GCP Cloud Logging
  console.log(JSON.stringify({
    severity: 'INFO',
    type: 'AUDIT_LOG',
    ...logPayload
  }));

  try {
    const docRef = await db.collection('audit_logs').add(logPayload);
    return docRef.id;
  } catch (error) {
    console.error('Falha ao gravar log estruturado em audit_logs:', error);
    throw error;
  }
}
