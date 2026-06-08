import { useCallback } from 'react';
import { awardXP as awardXPService, getLevelForXP, LEVEL_RANGES } from '../lib/xpService';

/**
 * Custom Hook for Gamification and XP mechanics.
 * Isolates XP-awarding functions and Level boundaries.
 */
export function useGamification() {
  /**
   * Awards XP to the given user and dynamically recalculates and updates level if required.
   */
  const awardXP = useCallback(async (userId: string, amount: number, reason: string): Promise<void> => {
    return await awardXPService(userId, amount, reason);
  }, []);

  /**
   * Retrieves Level Range object or visual string for a specific amount of XP.
   */
  const getLevelInfo = useCallback((xp: number): string => {
    return getLevelForXP(xp);
  }, []);

  return {
    awardXP,
    getLevelInfo,
    LEVEL_RANGES,
  };
}
