import { db, collection, addDoc, handleFirestoreError, OperationType } from '../firebase';
import { getDocs, query, limit } from 'firebase/firestore';
import { Activity, BackupRecord, Client, AppUser } from '../types';

export async function logActivity(activityData: Omit<Activity, 'id'>): Promise<void> {
  try {
    const finalData = {
      ...activityData,
      timestamp: activityData.timestamp || new Date().toISOString()
    };
    await addDoc(collection(db, 'activities'), finalData);
  } catch (error) {
    console.error('Error logging activity:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, 'activities');
    } catch {
      // Don't crash UI if activity logging fails
    }
  }
}

export async function logBackupAuditActivity(
  userName: string,
  userPhoto: string | undefined,
  clientName: string,
  totalJobs: number,
  success: number,
  warning: number,
  failed: number
): Promise<void> {
  const status = failed > 0 ? 'failed' : warning > 0 ? 'warning' : 'success';
  const actionText = 'registrou auditoria';
  const details = `Registrada auditoria com ${totalJobs} jobs (${success} com sucesso, ${warning} avisos, ${failed} falhas)`;
  
  await logActivity({
    userName,
    userPhoto,
    action: actionText,
    details,
    clientName,
    status,
    metadata: {
      totalJobs,
      success,
      warning,
      failed
    },
    timestamp: new Date().toISOString()
  });
}

export async function logResolvedFailureActivity(
  userName: string,
  userPhoto: string | undefined,
  clientName: string,
  taskTitle: string,
  slaTime?: string
): Promise<void> {
  await logActivity({
    userName,
    userPhoto,
    action: 'resolveu falha crítica',
    details: `Falha resolvida para o cliente ${clientName}: "${taskTitle}"`,
    clientName,
    status: 'success',
    metadata: {
      slaTime
    },
    timestamp: new Date().toISOString()
  });
}

export async function logNewClientActivity(
  userName: string,
  userPhoto: string | undefined,
  clientName: string,
  clientId?: string
): Promise<void> {
  await logActivity({
    userName,
    userPhoto,
    action: 'cadastrou novo cliente',
    details: `Cliente "${clientName}" cadastrado no sistema`,
    clientName,
    clientId,
    status: 'info',
    timestamp: new Date().toISOString()
  });
}

export async function logNewTeamMemberActivity(
  userName: string,
  userPhoto: string | undefined,
  newMemberName: string
): Promise<void> {
  await logActivity({
    userName,
    userPhoto,
    action: 'adicionou integrante',
    details: `Novo integrante "${newMemberName}" adicionado à equipe`,
    status: 'info',
    timestamp: new Date().toISOString()
  });
}

export async function logMilestoneActivity(
  milestoneDays: number,
  details: string
): Promise<void> {
  await logActivity({
    userName: 'Sistema Gate7',
    action: 'marco do sistema',
    details,
    status: 'success',
    metadata: {
      milestoneDays
    },
    timestamp: new Date().toISOString()
  });
}

export async function seedActivitiesIfEmpty(
  existingBackups: BackupRecord[],
  existingClients: Client[],
  existingUsers: AppUser[]
): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'activities'), limit(1)));
    if (!snap.empty) return; // Already seeded or has data

    console.log('Seeding initial activities...');
    // Seed Clients
    for (const cl of existingClients.slice(0, 5)) {
      await logNewClientActivity(
        'Sistema Gate7',
        undefined,
        cl.name,
        cl.id
      );
    }

    // Seed Backups
    for (const bk of existingBackups.slice(0, 10)) {
      const successCount = bk.status === 'success' ? 1 : 0;
      const warningCount = bk.status === 'warning' ? 1 : 0;
      const failedCount = bk.status === 'failed' ? 1 : 0;
      await logBackupAuditActivity(
        bk.responsible || 'Operador',
        undefined,
        bk.client || 'Geral',
        1,
        successCount,
        warningCount,
        failedCount
      );
    }

    // Seed Milestone
    await logMilestoneActivity(
      7,
      'Marco alcançado: 7 dias sem falhas críticas no sistema!'
    );

    console.log('Activities seeded successfully!');
  } catch (error) {
    console.error('Error seeding activities:', error);
  }
}
