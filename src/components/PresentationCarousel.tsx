import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  TrendingUp,
  Activity,
  Server,
  Wrench,
  BarChart3,
  LayoutDashboard,
  AlertCircle
} from 'lucide-react';
import { BackupRecord } from '../types';
import { cn } from '../lib/utils';

interface PresentationCarouselProps {
  backups: BackupRecord[];
  onClose: () => void;
}

type SlideView = 'dashboard' | 'failures';

export function PresentationCarousel({ backups, onClose }: PresentationCarouselProps) {
  const [currentView, setCurrentView] = useState<SlideView>('dashboard');

  // 1. Filter backups from the last 7 days
  const last7DaysBackups = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return backups.filter(b => {
      try {
        const backupDate = new Date(b.timestamp);
        return backupDate >= sevenDaysAgo;
      } catch (e) {
        return false;
      }
    });
  }, [backups]);

  // 2. KPI Calculations (Last 7 Days)
  const stats = useMemo(() => {
    const total = last7DaysBackups.length;
    const success = last7DaysBackups.filter(b => b.status === 'success').length;
    const failures = last7DaysBackups.filter(b => b.status === 'failed').length;
    const warnings = last7DaysBackups.filter(b => b.status === 'warning').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return { total, success, failures, warnings, successRate };
  }, [last7DaysBackups]);

  // 3. Top 3 Problematic Servers (Wall of Shame)
  const topProblematic = useMemo(() => {
    const serverCounts: Record<string, number> = {};
    last7DaysBackups.forEach(b => {
      if (b.status === 'failed' || b.status === 'warning') {
        serverCounts[b.client] = (serverCounts[b.client] || 0) + 1;
      }
    });

    return Object.entries(serverCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [last7DaysBackups]);

  // 4. Failure Details (Focus on Solution)
  const failureDetails = useMemo(() => {
    return last7DaysBackups
      .filter(b => b.status === 'failed' || b.status === 'warning')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [last7DaysBackups]);

  const toggleView = () => {
    setCurrentView(prev => prev === 'dashboard' ? 'failures' : 'dashboard');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-[110] h-24 flex items-center justify-between px-12 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand/10 rounded-xl border border-brand/20">
            <BarChart3 className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black tracking-tight text-white uppercase">Relatório Executivo</h1>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Últimos 7 Dias • Gate7 Infrastructure</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                currentView === 'dashboard' ? "bg-brand text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Visão Geral
            </button>
            <button 
              onClick={() => setCurrentView('failures')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                currentView === 'failures' ? "bg-danger text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <AlertCircle className="w-4 h-4" />
              Análise de Falhas
            </button>
          </nav>

          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-[105] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="p-12 max-w-7xl mx-auto w-full space-y-12"
            >
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="w-32 h-32" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Total de Backups</p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-heading font-black text-white">{stats.total}</span>
                    <span className="text-brand font-bold text-xl flex items-center gap-1">
                      <TrendingUp className="w-5 h-5" />
                      Semana
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck className="w-32 h-32" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Taxa de Sucesso</p>
                  <div className="flex items-baseline gap-4">
                    <span className={cn(
                      "text-8xl font-heading font-black",
                      stats.successRate >= 95 ? "text-success" : stats.successRate >= 80 ? "text-warning" : "text-danger"
                    )}>
                      {stats.successRate}%
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertTriangle className="w-32 h-32" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Falhas Críticas</p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-heading font-black text-danger">{stats.failures}</span>
                    <span className="text-slate-500 font-bold text-xl">Incidentes</span>
                  </div>
                </div>
              </div>

              {/* Problematic Servers & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
                    <Server className="w-6 h-6 text-brand" />
                    Top 3 Servidores Problemáticos
                  </h3>
                  <div className="space-y-4">
                    {topProblematic.length > 0 ? topProblematic.map((server, idx) => (
                      <div key={server.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-6">
                          <span className="text-4xl font-heading font-black text-white/10 group-hover:text-brand/20 transition-colors">0{idx + 1}</span>
                          <div>
                            <p className="text-xl font-bold text-white">{server.name}</p>
                            <p className="text-sm text-slate-400">Incidentes registrados na semana</p>
                          </div>
                        </div>
                        <div className="px-6 py-2 bg-danger/10 border border-danger/20 rounded-xl">
                          <span className="text-2xl font-heading font-black text-danger">{server.count}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="bg-success/5 border border-success/20 rounded-2xl p-12 text-center space-y-4">
                        <ShieldCheck className="w-16 h-16 text-success mx-auto" />
                        <p className="text-xl font-bold text-success">Nenhum servidor crítico detectado!</p>
                        <p className="text-slate-400">Todos os sistemas operando dentro da normalidade.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-brand/5 border border-brand/20 rounded-3xl p-10 space-y-8">
                  <h3 className="text-2xl font-heading font-bold text-white">Resumo Executivo</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-brand" />
                      </div>
                      <p className="text-lg text-slate-300 leading-relaxed">
                        A infraestrutura processou <span className="text-white font-bold">{stats.total}</span> backups nos últimos 7 dias, mantendo uma taxa de disponibilidade de <span className="text-white font-bold">{stats.successRate}%</span>.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-danger" />
                      </div>
                      <p className="text-lg text-slate-300 leading-relaxed">
                        Identificamos <span className="text-white font-bold">{stats.failures}</span> falhas críticas que exigiram intervenção técnica imediata.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="failures"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="p-12 max-w-7xl mx-auto w-full space-y-12"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-heading font-black text-white flex items-center gap-4">
                  <Wrench className="w-8 h-8 text-danger" />
                  Análise Técnica e Soluções
                </h3>
                <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-slate-400">
                  {failureDetails.length} Incidentes Listados
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {failureDetails.length > 0 ? failureDetails.map((backup) => (
                  <div key={backup.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-danger/30 transition-all">
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            backup.status === 'failed' ? "bg-danger" : "bg-warning"
                          )} />
                          <span className="text-xl font-bold text-white">{backup.client}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Serviço / Categoria</p>
                          <p className="text-sm text-slate-300">{backup.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data do Incidente</p>
                          <p className="text-sm text-slate-300">{new Date(backup.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>

                      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
                          <p className="text-xs font-bold text-danger uppercase tracking-widest mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            Motivo da Falha
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed italic">
                            "{backup.title}"
                          </p>
                        </div>
                        <div className="bg-brand/5 rounded-2xl p-6 border border-brand/10">
                          <p className="text-xs font-bold text-brand uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Wrench className="w-3 h-3" />
                            Análise e Correção
                          </p>
                          <p className="text-sm text-slate-200 leading-relaxed">
                            {backup.technicalAnalysis || "Análise técnica pendente de registro."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-success/5 border border-success/20 rounded-3xl p-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-12 h-12 text-success" />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <h4 className="text-2xl font-bold text-white">Sem falhas para reportar!</h4>
                      <p className="text-slate-400">Não houve incidentes críticos nos últimos 7 dias. A infraestrutura está operando com 100% de integridade.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Navigation Controls */}
      <footer className="relative z-[110] h-20 flex items-center justify-center px-12 border-t border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={cn(
              "p-2 rounded-full transition-all",
              currentView === 'dashboard' ? "bg-brand text-white scale-125 shadow-lg shadow-brand/20" : "bg-white/5 text-slate-500 hover:text-white"
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <div className={cn("w-12 h-1.5 rounded-full transition-all", currentView === 'dashboard' ? "bg-brand" : "bg-white/10")} />
            <div className={cn("w-12 h-1.5 rounded-full transition-all", currentView === 'failures' ? "bg-danger" : "bg-white/10")} />
          </div>
          <button 
            onClick={() => setCurrentView('failures')}
            className={cn(
              "p-2 rounded-full transition-all",
              currentView === 'failures' ? "bg-danger text-white scale-125 shadow-lg shadow-danger/20" : "bg-white/5 text-slate-500 hover:text-white"
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}
