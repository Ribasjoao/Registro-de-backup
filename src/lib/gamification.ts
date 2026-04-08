import { AppUser } from '../types';

export const LEVELS = [
  { name: 'Padawan do Backup', minXP: 0, maxXP: 100 },
  { name: 'Guardião dos Dados', minXP: 101, maxXP: 300 },
  { name: 'Mestre da Restauração', minXP: 301, maxXP: 600 },
  { name: 'Lenda do Disaster Recovery', minXP: 601, maxXP: Infinity },
];

export function calculateLevel(xp: number): string {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i].name;
    }
  }
  return LEVELS[0].name;
}

export function getLevelProgress(xp: number) {
  const currentLevelIndex = LEVELS.findIndex(l => xp >= l.minXP && xp <= l.maxXP);
  if (currentLevelIndex === -1 || currentLevelIndex === LEVELS.length - 1) {
    return { currentXP: xp, nextLevelXP: xp, progress: 100 }; // Max level
  }
  
  const currentLevel = LEVELS[currentLevelIndex];
  const nextLevel = LEVELS[currentLevelIndex + 1];
  
  const xpInCurrentLevel = xp - currentLevel.minXP;
  const xpNeededForNext = nextLevel.minXP - currentLevel.minXP;
  const progress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100));
  
  return {
    currentXP: xp,
    nextLevelXP: nextLevel.minXP,
    progress
  };
}
