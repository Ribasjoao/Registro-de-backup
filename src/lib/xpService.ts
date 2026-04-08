import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { calculateLevel } from './gamification';

export async function awardXP(userId: string, amount: number, reason: string) {
  if (!userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentXP = userData.xp || 0;
      const newXP = Math.max(0, currentXP + amount); // Prevent negative total XP
      const newLevel = calculateLevel(newXP);

      // Update user XP and Level
      await updateDoc(userRef, {
        xp: newXP,
        level: newLevel
      });

      // Add history record
      await addDoc(collection(db, 'xp_history'), {
        userId,
        amount,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error awarding XP:", error);
    // We don't throw here to avoid breaking the main flow (like saving a backup)
  }
}
