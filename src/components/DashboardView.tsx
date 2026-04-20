import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { Shield, Database, History, TrendingUp, ArrowRight, AlertTriangle, CheckCircle2, MoreVertical, Calendar } from 'lucide-react';
import { StatusBadge } from './UI';
import { BackupRecord } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface DashboardViewProps {
  backups: BackupRecord[];
}

export function DashboardView({ backups }: DashboardViewProps) {
  // Filter backups for last 7 days
  const last7DaysBackups = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return backups.filter(b => {
      const backupDate = new Date(b.timestamp);
      return backupDate >= sevenDaysAgo;
    });
  }, [backups]);

  // General Metrics
  const total = last7DaysBackups.length;
  const success = last7DaysBackups.filter(b => b.status === 'success').length;
  const warning = last7DaysBackups.filter(b => b.status === 'warning').length;
  const failed = last7DaysBackups.filter(b => b.status === 'failed').length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  // Pie Chart Data
  const pieData = [
    { name: 'Sucesso', value: success, color: 'var(--color-success)' },
    { name: 'Aviso', value: warning, color: 'var(--color-warning)' },
    { name: 'Falha', value: failed, color: 'var(--color-danger)' },
  ];

  // Daily Trend Data (Last 7 Days)
  const trendData = useMemo(() => {
    const data: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const isoDateStr = date.toISOString().split('T')[0];
      
      const dayBackups = last7DaysBackups.filter(b => b.timestamp.includes(isoDateStr));
      const daySuccess = dayBackups.filter(b => b.status === 'success').length;
      const rate = dayBackups.length > 0 ? Math.round((daySuccess / dayBackups.length) * 100) : 100;
      
      data.push({
        name: dateStr,
        rate: rate,
        count: dayBackups.length
      });
    }
    return data;
  }, [last7DaysBackups]);

  // Clients with Issues
  const criticalClients = useMemo(() => {
    const clients: Record<string, { failed: number, total: number }> = {};
    last7DaysBackups.forEach(b => {
      if (!clients[b.client]) clients[b.client] = { failed: 0, total: 0 };
      clients[b.client].total++;
      if (b.status === 'failed' || b.status === 'warning') clients[b.client].failed++;
    });

    return Object.entries(clients)
      .filter(([_, data]) => data.failed > 0)
      .sort((a, b) => b[1].failed - a[1].failed)
      .slice(0, 4);
  }, [last7DaysBackups]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-card p-4 rounded-2xl border border-border-main shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-main leading-tight">Painel de Auditoria</h1>
            <p className="text-xs text-text-secondary">Visão executiva baseada nos dados dos últimos 7 dias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-bg-main border border-border-main flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-xs font-bold text-text-main uppercase tracking-wider">
              {new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} - {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Taxa de Disponibilidade" 
          value={`${successRate}%`} 
          icon={<Shield className={cn("w-5 h-5", successRate > 90 ? "text-success" : successRate > 70 ? "text-warning" : "text-danger")} />}
          trend={`${successRate >= 95 ? '+2.5%' : '-1.2%'}`}
          trendUp={successRate >= 95}
        />
        <KPICard 
          title="Controle Semanal" 
          value={total.toString()} 
          subtitle="Rotinas executadas"
          icon={<History className="w-5 h-5 text-brand" />}
        />
        <KPICard 
          title="Incidentes Críticos" 
          value={failed.toString()} 
          subtitle="Ações necessárias"
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          alert={failed > 0}
        />
        <KPICard 
          title="Avisos do Sistema" 
          value={warning.toString()} 
          subtitle="Verificações pendentes"
          icon={<TrendingUp className="w-5 h-5 text-warning" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-lg font-bold text-text-main flex items-center gap-2">
              Tendência de Saúde
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-bg-main text-text-secondary border border-border-main">7 Dias</span>
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 ha-2 rounded-full bg-brand" />
                <span className="text-text-secondary">Percentual de Sucesso</span>
              </div>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-main)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  hide={true} 
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-bg-card)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border-main)', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
                    fontSize: '12px',
                    color: 'var(--color-text-main)'
                  }}
                  itemStyle={{ color: 'var(--color-brand)' }}
                  cursor={{ stroke: 'var(--color-brand)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="var(--color-brand)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card p-6 flex flex-col">
          <h2 className="font-heading text-lg font-bold text-text-main mb-6">Eficiência Global</h2>
          <div className="flex-1 min-h-[180px] relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? pieData : [{ name: 'Sem Dados', value: 1, color: '#F1F5F9' }]}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading text-3xl font-bold text-text-main">{successRate}%</span>
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mt-0.5">Health</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {total > 0 && pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-bg-main transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-text-secondary">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text-main">{item.value} <span className="text-[10px] font-normal text-text-secondary">vms</span></span>
                  <span className="text-text-secondary w-8 text-right italic font-medium">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Clients Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-lg font-bold text-text-main">Clientes com Instabilidade</h2>
            <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
          </div>
          <div className="space-y-4">
            {criticalClients.length > 0 ? criticalClients.map(([name, data]) => (
              <div key={name} className="p-4 rounded-xl border border-border-main bg-bg-main/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger font-bold text-xs">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">{name}</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Incidentes detectados esta semana</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-danger">{data.failed} <span className="text-xs font-normal text-text-secondary">falhas</span></div>
                  <div className="w-24 h-1.5 bg-border-main rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-danger rounded-full" style={{ width: `${(data.failed / data.total) * 100}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-text-main uppercase tracking-wider">Perímetro Seguro</p>
                <p className="text-xs text-text-secondary mt-1">Nenhum cliente crítico detectado nos últimos 7 dias.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-lg font-bold text-text-main">Resumo da Atividade</h2>
            <MoreVertical className="w-4 h-4 text-text-secondary" />
          </div>
          <div className="space-y-4">
            {last7DaysBackups.length > 0 ? (
              last7DaysBackups.slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-all">
                  <div className={cn(
                    "w-2 h-10 rounded-full",
                    b.status === 'success' ? 'bg-success/20' : b.status === 'warning' ? 'bg-warning/20' : 'bg-danger/20'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-text-main truncate">{b.title}</h4>
                      <span className="text-[10px] text-text-secondary font-medium whitespace-nowrap">
                        {new Date(b.timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{b.client}</span>
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className="text-[10px] text-text-secondary">{b.backupType || 'Nakivo'}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-text-secondary italic py-12">Sem atividades recentes nos últimos 7 dias.</p>
            )}
            
            <button className="w-full mt-4 py-3 rounded-xl border border-dashed border-border-main text-xs font-bold text-text-secondary hover:border-brand hover:text-brand transition-all">
              Ver Histórico Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
}

function KPICard({ title, value, subtitle, icon, trend, trendUp, alert }: KPICardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "card p-5 border-l-4",
        alert ? "border-l-danger bg-danger/5" : "border-l-brand"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{title}</span>
        <div className="p-2 rounded-lg bg-bg-card shadow-sm border border-border-main">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold font-heading text-text-main leading-none mb-1">{value}</div>
          {subtitle && <div className="text-[10px] text-text-secondary font-medium">{subtitle}</div>}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            trendUp ? "text-success bg-success/10" : "text-danger bg-danger/10"
          )}>
            {trendUp ? <ArrowUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ArrowUp(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
    </svg>
  );
}
