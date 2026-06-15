import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  ChevronRight, 
  Presentation,
  Filter,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { BackupRecord, Task, BackupStatus, Criticality } from '../types';
import { cn } from '../lib/utils';
import { StatusBadge } from './UI';

interface WeeklyExecutiveViewProps {
  backups: BackupRecord[];
  tasks: Task[];
}

export const WeeklyExecutiveView = React.memo(function WeeklyExecutiveView({ backups, tasks }: WeeklyExecutiveViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filter, setFilter] = useState<{
    week: 'current' | 'previous';
    onlyIssues: boolean;
    client: string;
  }>({
    week: 'current',
    onlyIssues: false,
    client: 'all',
  });

  // Date Logic
  const dates = useMemo(() => {
    const now = new Date();
    const currentFriday = new Date(now);
    currentFriday.setDate(now.getDate() + (5 - now.getDay())); // Next/Current Friday
    
    const startOfCurrentWeek = new Date(currentFriday);
    startOfCurrentWeek.setDate(currentFriday.getDate() - 6);
    
    const endOfPreviousWeek = new Date(startOfCurrentWeek);
    endOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 1);
    
    const startOfPreviousWeek = new Date(endOfPreviousWeek);
    startOfPreviousWeek.setDate(endOfPreviousWeek.getDate() - 6);

    return {
      current: { start: startOfCurrentWeek, end: currentFriday },
      previous: { start: startOfPreviousWeek, end: endOfPreviousWeek }
    };
  }, []);

  const selectedPeriod = dates[filter.week];

  // Filtering function
  const filterByDate = (list: BackupRecord[], period: { start: Date, end: Date }) => {
    return list.filter(item => {
      const d = new Date(item.timestamp);
      return d >= period.start && d <= period.end;
    });
  };

  // Data for current and previous weeks
  const currentWeekData = useMemo(() => filterByDate(backups, dates.current), [backups, dates.current]);
  const previousWeekData = useMemo(() => filterByDate(backups, dates.previous), [backups, dates.previous]);

  const displayData = useMemo(() => {
    let data = filter.week === 'current' ? currentWeekData : previousWeekData;
    if (filter.onlyIssues) {
      data = data.filter(b => b.status !== 'success');
    }
    if (filter.client !== 'all') {
      data = data.filter(b => b.client === filter.client);
    }
    return data;
  }, [filter, currentWeekData, previousWeekData]);

  // Block 1: Executive Summary
  const summary = useMemo(() => {
    const total = displayData.length;
    const success = displayData.filter(b => b.status === 'success').length;
    const failure = displayData.filter(b => b.status === 'failed').length;
    const warning = displayData.filter(b => b.status === 'warning').length;
    const critical = displayData.filter(b => b.criticality === 'critical').length;
    
    const resolved = displayData.filter(b => b.treatmentStatus === 'resolved').length;
    const open = displayData.filter(b => b.status !== 'success' && b.treatmentStatus !== 'resolved').length;
    
    return {
      total,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      failure,
      warning,
      critical,
      resolved,
      open,
    };
  }, [displayData]);

  // Block 2: Top Incidents
  const topIncidents = useMemo(() => {
    const issues = displayData.filter(b => b.status !== 'success');
    const priorityMap: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return [...issues].sort((a, b) => {
      const pA = priorityMap[a.criticality || 'low'];
      const pB = priorityMap[b.criticality || 'low'];
      if (pA !== pB) return pB - pA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }).slice(0, 5);
  }, [displayData]);

  // Block 4: Trend
  const previousSummary = useMemo(() => {
    const total = previousWeekData.length;
    const success = previousWeekData.filter(b => b.status === 'success').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { successRate, failures: previousWeekData.filter(b => b.status === 'failed').length };
  }, [previousWeekData]);

  const trends = {
    successRateDiff: summary.successRate - previousSummary.successRate,
    failuresDiff: summary.failure - previousSummary.failures,
  };

  // Block 5: Next Actions
  const plannedActions = useMemo(() => {
    return tasks.filter(t => !t.completed).slice(0, 4);
  }, [tasks]);

  const clients = useMemo(() => {
    const set = new Set(backups.map(b => b.client));
    return ['all', ...Array.from(set)];
  }, [backups]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={cn(
      "space-y-8 animate-in fade-in duration-700",
      isFullscreen && "fixed inset-0 z-[100] bg-bg-main overflow-y-auto p-12"
    )}>
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
              <Presentation className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-text-main tracking-tight">Status Report Semanal</h1>
              <p className="text-sm font-medium text-text-secondary uppercase tracking-widest">
                Gerenciamento de Riscos e Disponibilidade
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-bg-card p-2 rounded-2xl border border-border-main shadow-sm">
          <div className="flex bg-bg-main rounded-xl p-1">
            <button 
              onClick={() => setFilter(f => ({ ...f, week: 'current' }))}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                filter.week === 'current' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary"
              )}
            >
              Semana Atual
            </button>
            <button 
              onClick={() => setFilter(f => ({ ...f, week: 'previous' }))}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                filter.week === 'previous' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary"
              )}
            >
              Anterior
            </button>
          </div>

          <div className="h-6 w-px bg-border-main mx-1" />

          <select 
            value={filter.client}
            onChange={(e) => setFilter(f => ({ ...f, client: e.target.value }))}
            className="bg-transparent text-xs font-bold text-text-main outline-none px-2 cursor-pointer"
          >
            <option value="all">Todos Clientes</option>
            {clients.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-brand text-white rounded-xl hover:bg-brand-dark transition-all transform hover:scale-105"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Block 1: Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Taxa de Sucesso" 
          value={`${summary.successRate}%`} 
          desc="Objetivo: 99%"
          icon={<ShieldCheck className="w-6 h-6" />}
          variant={summary.successRate >= 95 ? 'success' : 'warning'}
          trend={trends.successRateDiff}
        />
        <KPICard 
          title="Incidentes Críticos" 
          value={summary.critical.toString()} 
          desc="Alto impacto imediato"
          icon={<AlertTriangle className="w-6 h-6" />}
          variant={summary.critical > 0 ? 'danger' : 'success'}
        />
        <KPICard 
          title="Ações Resolvidas" 
          value={`${summary.resolved}/${summary.failure + summary.warning}`} 
          desc="Taxa de recuperação"
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="info"
        />
        <KPICard 
          title="Pendências Abertas" 
          value={summary.open.toString()} 
          desc="Em fila de tratamento"
          icon={<Clock className="w-6 h-6" />}
          variant={summary.open > 5 ? 'warning' : 'info'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Block 2: Top Incidents */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-bg-card rounded-3xl border border-border-main p-8 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-brand" />
                <h2 className="text-xl font-bold text-text-main">Principais Ocorrências</h2>
              </div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-bg-main px-3 py-1 rounded-full">
                Top 5 - Priorizadas por Impacto
              </div>
            </div>

            <div className="space-y-4">
              {topIncidents.length > 0 ? topIncidents.map((incident, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={incident.id} 
                  className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-bg-main/30 border border-border-main hover:border-brand/30 transition-all group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0",
                    incident.criticality === 'critical' ? 'bg-danger/10 text-danger' : 
                    incident.criticality === 'high' ? 'bg-orange-500/10 text-orange-500' : 'bg-warning/10 text-warning'
                  )}>
                    {incident.criticality === 'critical' ? '!!' : '!'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-brand uppercase tracking-tighter">{incident.client}</span>
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className="text-[10px] text-text-secondary italic uppercase">{incident.timestamp.split(' ')[0]}</span>
                    </div>
                    <h3 className="text-base font-bold text-text-main truncate group-hover:text-brand transition-colors">
                      {incident.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-1 italic">
                      Causa: {incident.rootCause || 'Em investigação'} • Impacto: {incident.impact || 'Médio'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      incident.treatmentStatus === 'resolved' ? 'bg-success/10 text-success' : 'bg-brand/10 text-brand'
                    )}>
                      {incident.treatmentStatus === 'resolved' ? 'Resolvido' : incident.treatmentStatus === 'mitigated' ? 'Mitigado' : 'Em Tratamento'}
                    </div>
                    <div className="text-[10px] text-text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Prazo: {incident.actionDeadline ? new Date(incident.actionDeadline).toLocaleDateString('pt-BR') : 'ASAP'}
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                  <ShieldCheck className="w-12 h-12 text-success mb-3" />
                  <p className="text-sm font-bold text-text-main uppercase">Sem Incidentes Relevantes</p>
                  <p className="text-xs text-text-secondary">Todos os sistemas operando dentro da normalidade.</p>
                </div>
              )}
            </div>
          </section>

          {/* Block 3 & 4 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Block 3: Metrics */}
            <div className="card p-6 border-t-4 border-t-brand">
              <h3 className="text-sm font-bold text-text-main mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Activity className="w-4 h-4 text-brand" />
                Saúde Operacional
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-2xl font-black text-text-main">{summary.failure + summary.warning}</div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Alertas</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-black text-success">
                    {summary.failure + summary.warning > 0 ? Math.round((summary.resolved / (summary.failure + summary.warning)) * 100) : 100}%
                  </div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Resolvido</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-black text-text-main">22h</div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">MTR Médio</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-black text-text-main">{summary.open}</div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Carry Over</div>
                </div>
              </div>
            </div>

            {/* Block 4: Trend */}
            <div className="card p-6 border-t-4 border-t-brand">
              <h3 className="text-sm font-bold text-text-main mb-6 flex items-center gap-2 uppercase tracking-tight">
                <TrendingUp className="w-4 h-4 text-brand" />
                Comparativo x Anterior
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">Taxa de Sucesso</span>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    trends.successRateDiff >= 0 ? "text-success" : "text-danger"
                  )}>
                    {trends.successRateDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trends.successRateDiff)}%
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">Volume de Falhas</span>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    trends.failuresDiff <= 0 ? "text-success" : "text-danger"
                  )}>
                    {trends.failuresDiff <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(trends.failuresDiff)}
                  </div>
                </div>
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Padrão Recorrente</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-bg-main text-[10px] font-medium border border-border-main">Rede VSS</span>
                    <span className="px-2 py-0.5 rounded bg-bg-main text-[10px] font-medium border border-border-main">Janela Pequena</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: Visual Distribution & Next Actions */}
        <div className="space-y-6">
          {/* Distribution Chart */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-text-main mb-6 uppercase tracking-tight">Distribuição por Causa</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(backups.reduce((acc, curr) => {
                  if (curr.status !== 'success' && curr.rootCause) {
                    acc[curr.rootCause] = (acc[curr.rootCause] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-main)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-bg-card)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--color-border-main)', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      color: 'var(--color-text-main)'
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(backups.reduce((acc, curr) => {
                      if (curr.status !== 'success' && curr.rootCause) {
                        acc[curr.rootCause] = (acc[curr.rootCause] || 0) + 1;
                      }
                      return acc;
                    }, {} as Record<string, number>)).map((entry, index) => (
                      <Cell key={index} fill={index % 2 === 0 ? 'var(--color-brand)' : 'var(--color-text-secondary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Block 5: Next Actions */}
          <div className="card p-6 bg-brand/5 border-brand/20">
            <h3 className="text-sm font-bold text-brand mb-6 flex items-center gap-2 uppercase tracking-tight">
              <CheckCircle2 className="w-4 h-4" />
              Próximas Iniciativas
            </h3>
            <div className="space-y-4">
              {plannedActions.length > 0 ? plannedActions.map((task) => (
                <div key={task.id} className="p-4 rounded-2xl bg-bg-card border border-brand/20 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-3 h-3 text-brand" />
                  </div>
                  <h4 className="text-xs font-bold text-text-main mb-1 pr-4">{task.title}</h4>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-[10px] font-bold text-brand uppercase">
                        JS
                      </div>
                      <span className="text-[10px] font-medium text-text-secondary tracking-tight">João Santos</span>
                    </div>
                    <span className="text-[10px] font-black text-brand-dark uppercase">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'ASAP'}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-center text-xs text-text-secondary italic py-6">Sem ações pendentes registradas.</p>
              )}
              
              <button 
                onClick={() => {}}
                className="w-full py-3 rounded-2xl bg-brand text-white text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
              >
                Planejar Nova Ação
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

interface KPICardProps {
  title: string;
  value: string;
  desc: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'info';
  trend?: number;
}

const KPICard = React.memo(function KPICard({ title, value, desc, icon, variant, trend }: KPICardProps) {
  const colors = {
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    danger: 'text-danger bg-danger/10 border-danger/20',
    info: 'text-brand bg-brand/10 border-brand/20',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      style={{ willChange: "transform, opacity" }}
      className="card p-6 bg-bg-card border border-border-main relative overflow-hidden group shadow-sm"
    >
      <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-5 group-hover:scale-125 transition-transform", colors[variant].split(' ')[1])} />
      
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl flex items-center justify-center", colors[variant])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full",
            trend >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-3xl font-black text-text-main tracking-tighter">{value}</div>
        <div className="text-[10px] font-bold text-text-main uppercase tracking-widest">{title}</div>
        <div className="text-[10px] text-text-secondary italic font-medium">{desc}</div>
      </div>
    </motion.div>
  );
});
