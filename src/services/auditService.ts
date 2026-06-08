import { db, collection, addDoc, handleFirestoreError, OperationType } from '../firebase';

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export async function logAction(
  userId: string,
  userName: string,
  action: string,
  details: string
): Promise<void> {
  if (!userId) return;
  try {
    const logData: AuditLog = {
      userId,
      userName: userName || 'Técnico Desconhecido',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'audit_logs'), logData);
  } catch (error) {
    console.error('Error logging audit action:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, 'audit_logs');
    } catch {
      // Don't crash UI if logging fails
    }
  }
}
