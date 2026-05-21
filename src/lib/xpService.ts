import { db, doc, getDoc, updateDoc, addDoc, collection, handleFirestoreError, OperationType } from '../firebase';

export const LEVEL_RANGES = [
  { minXp: 0, level: 'Padawan do Backup' },
  { minXp: 100, level: 'Operador de Guardas' },
  { minXp: 300, level: 'Especialista em Recuperação' },
  { minXp: 600, level: 'Arquiteto da Resiliência' },
  { minXp: 1000, level: 'Mestre do Backup' }
];

export function getLevelForXP(xp: number): string {
  let level = 'Padawan do Backup';
  for (const range of LEVEL_RANGES) {
    if (xp >= range.minXp) {
      level = range.level;
    }
  }
  return level;
}

export async function awardXP(userId: string, amount: number, reason: string): Promise<void> {
  if (!userId || amount === 0) return;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentXp = userData.xp || 0;
      const newXp = Math.max(0, currentXp + amount);
      const newLevel = getLevelForXP(newXp);
      
      await updateDoc(userRef, {
        xp: newXp,
        level: newLevel
      });
      
      // Add record to xp_history
      await addDoc(collection(db, 'xp_history'), {
        userId,
        amount,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in awardXP:', error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/xp`);
    } catch {
      // Don't crash UI if XP tracking fails
    }
  }
}
