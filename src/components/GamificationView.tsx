import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, TrendingUp, Medal, ShieldAlert, CheckCircle2, History, RefreshCw } from 'lucide-react';
import { AppUser, XPHistory, BackupRecord } from '../types';
import { calculateLevel, getLevelProgress, LEVELS } from '../lib/gamification';
import { collection, query, orderBy, onSnapshot, limit, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';
import { awardXP } from '../lib/xpService';

interface GamificationViewProps {
  currentUser: AppUser | null;
  users: AppUser[];
}

export function GamificationView({ currentUser, users }: GamificationViewProps) {
  const [history, setHistory] = useState<XPHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'xp_history'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as XPHistory));
      setHistory(data);
      setIsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'xp_history'));

    return () => unsubscribe();
  }, [currentUser]);

  const handleSyncXP = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      // Fetch all backups for the current user
      const q = query(collection(db, 'backups'), where('responsible', '==', currentUser.displayName || currentUser.email));
      const snapshot = await getDocs(q);
      const userBackups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BackupRecord));

      const now = new Date();
      let penaltyCount = 0;
      let hasFailedThisWeek = false;

      userBackups.forEach(backup => {
        // Parse backup timestamp (assuming DD/MM/YYYY HH:MM)
        const [datePart, timePart] = backup.timestamp.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = (timePart || '00:00').split(':');
        const backupDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
        
        const diffHours = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);

        // Check Penalty: Failed backup without analysis for > 24h
        if (backup.status === 'failed' && (!backup.technicalAnalysis || backup.technicalAnalysis.trim() === '') && diffHours > 24) {
          penaltyCount++;
        }

        // Check Weekly Bonus: Any failure in the last 7 days?
        if (backup.status === 'failed' && diffHours <= 24 * 7) {
          hasFailedThisWeek = true;
        }
      });

      // Apply Penalties (limit to 1 per sync to avoid spam, or apply all)
      if (penaltyCount > 0) {
        // Check if we already applied a penalty recently to avoid spamming
        const recentPenalty = history.find(h => h.reason.includes('Negligência') && (now.getTime() - new Date(h.timestamp).getTime()) < 24 * 60 * 60 * 1000);
        if (!recentPenalty) {
          await awardXP(currentUser.uid, -5, `Negligência: ${penaltyCount} backup(s) com falha sem análise por mais de 24h.`);
        }
      }

      // Apply Weekly Bonus
      const recentBonus = history.find(h => h.reason.includes('Semana Perfeita') && (now.getTime() - new Date(h.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000);
      if (!hasFailedThisWeek && userBackups.length > 0 && !recentBonus) {
        await awardXP(currentUser.uid, 50, 'Semana Perfeita: 100% de sucesso nos backups da semana!');
      }

    } catch (error) {
      console.error("Error syncing XP:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentUser) return null;

  const userXP = currentUser.xp || 0;
  const currentLevelName = calculateLevel(userXP);
  const { nextLevelXP, progress } = getLevelProgress(userXP);
  
  // Sort users by XP for leaderboard
  const leaderboard = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400'; // Gold
      case 1: return 'text-slate-400'; // Silver
      case 2: return 'text-amber-600'; // Bronze
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-main">Gamificação</h2>
        <button 
          onClick={handleSyncXP}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main rounded-lg text-sm font-medium text-text-main hover:bg-bg-main transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          Sincronizar Bônus/Penalidades
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Trophy className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Star className="w-8 h-8 text-brand" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-main">{currentUser.displayName || currentUser.email?.split('@')[0]}</h2>
                  <p className="text-brand font-medium text-lg">{currentLevelName}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-text-secondary">Progresso do Nível</span>
                  <span className="text-text-main">{userXP} / {nextLevelXP} XP</span>
                </div>
                <div className="h-4 bg-bg-main rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-brand rounded-full relative"
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </motion.div>
                </div>
                <p className="text-xs text-text-secondary text-right">
                  {nextLevelXP === userXP ? 'Nível Máximo Alcançado!' : `Faltam ${nextLevelXP - userXP} XP para o próximo nível`}
                </p>
              </div>
            </div>
          </div>

          {/* Como Ganhar XP */}
          <div className="card">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              Como Ganhar XP
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-bg-main border border-border-main">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text-main">Análise Rápida</span>
                  <span className="text-success font-bold">+10 XP</span>
                </div>
                <p className="text-sm text-text-secondary">Registrar análise técnica de falha no mesmo dia.</p>
              </div>
              <div className="p-4 rounded-lg bg-bg-main border border-border-main">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text-main">Salvador Crítico</span>
                  <span className="text-success font-bold">+20 XP</span>
                </div>
                <p className="text-sm text-text-secondary">Resolver falha em servidor Crítico.</p>
              </div>
              <div className="p-4 rounded-lg bg-bg-main border border-border-main">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text-main">Semana Perfeita</span>
                  <span className="text-success font-bold">+50 XP</span>
                </div>
                <p className="text-sm text-text-secondary">100% de sucesso nos seus backups na semana.</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-danger">Negligência</span>
                  <span className="text-danger font-bold">-5 XP</span>
                </div>
                <p className="text-sm text-danger/80">Falha sem análise por mais de 24h.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card flex flex-col h-full">
          <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking da Equipe
          </h3>
          <div className="space-y-4 flex-1">
            {leaderboard.map((user, index) => (
              <div 
                key={user.id} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-colors",
                  user.uid === currentUser.uid ? "bg-brand/5 border border-brand/20" : "hover:bg-bg-main"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {index < 3 ? (
                      <Medal className={cn("w-6 h-6", getMedalColor(index))} />
                    ) : (
                      <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-text-secondary">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-main text-sm">
                      {user.displayName || user.email.split('@')[0]}
                      {user.uid === currentUser.uid && " (Você)"}
                    </p>
                    <p className="text-xs text-text-secondary">{calculateLevel(user.xp || 0)}</p>
                  </div>
                </div>
                <div className="font-bold text-brand">{user.xp || 0} XP</div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="text-center text-text-secondary py-8 text-sm">
                Nenhum analista no ranking ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de Conquistas */}
      <div className="card">
        <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-brand" />
          Histórico de Conquistas
        </h3>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {history.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 rounded-lg bg-bg-main border border-border-main">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    record.amount > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>
                    {record.amount > 0 ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-text-main text-sm">{record.reason}</p>
                    <p className="text-xs text-text-secondary">{new Date(record.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className={cn(
                  "font-bold",
                  record.amount > 0 ? "text-success" : "text-danger"
                )}>
                  {record.amount > 0 ? '+' : ''}{record.amount} XP
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma conquista registrada ainda.</p>
            <p className="text-sm">Comece a analisar backups para ganhar XP!</p>
          </div>
        )}
      </div>
    </div>
  );
}
