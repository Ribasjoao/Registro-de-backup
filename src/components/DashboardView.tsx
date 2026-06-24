import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Shield, Database, TrendingUp, ArrowRight, AlertTriangle, CheckCircle2, Calendar, History, Download } from 'lucide-react';
import { BackupRecord, Client } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 16
    }
  }
};

interface DashboardViewProps {
  backups: BackupRecord[];
  clients?: Client[];
  isPresentationMode?: boolean;
  isLoading?: boolean;
}

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse p-4">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-8 w-60 bg-border-main/50 rounded-xl" />
        <div className="h-4 w-80 bg-border-main/30 rounded-lg" />
      </div>
      <div className="h-10 w-44 bg-border-main/40 rounded-xl" />
    </div>
    
    {/* KPI Skeleton Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-6 border border-border-main/60 rounded-3xl h-32 flex flex-col justify-between bg-bg-card/30">
          <div className="flex justify-between items-start">
            <div className="h-4 w-32 bg-border-main/50 rounded-md" />
            <div className="w-8 h-8 rounded-xl bg-border-main/40" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-20 bg-border-main/60 rounded-md" />
            <div className="h-3.5 w-48 bg-border-main/30 rounded-md" />
          </div>
        </div>
      ))}
    </div>

    {/* Section Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6 border border-border-main/60 rounded-3xl h-[400px] bg-bg-card/20" />
      <div className="card p-6 border border-border-main/60 rounded-3xl h-[400px] bg-bg-card/20" />
    </div>
  </div>
);

const EmptyDashboardState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-center card border border-dashed border-border-main/80 rounded-3xl bg-bg-card/35 min-h-[500px]">
    <div className="w-20 h-20 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand mb-6 animate-pulse">
      <Shield className="w-10 h-10 text-brand animate-bounce" />
    </div>
    <h3 className="font-heading text-xl font-bold text-text-main">Status da Infraestrutura: Nenhum Backup Registrado</h3>
    <p className="text-sm text-text-secondary mt-2 max-w-sm">
      Não detectamos nenhum registro de rotina nas bases de auditoria. Para iniciar o monitoramento, adicione o primeiro cliente ou registre um lote de backup.
    </p>
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      <div className="px-4 py-2 bg-brand/10 text-brand text-xs font-black uppercase tracking-wider rounded-xl border border-brand/25">
        1. Cadastre Clientes nas Configurações
      </div>
      <div className="px-4 py-2 bg-brand/10 text-brand text-xs font-black uppercase tracking-wider rounded-xl border border-brand/25">
        2. Clique em "Registrar Backup" no topo
      </div>
    </div>
  </div>
);

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: any;
  payload?: any;
}

// Glassmorphic interactive Tooltip matching dark/light templates
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const hasFullDayName = payload[0].payload && payload[0].payload.fullName;
    const title = hasFullDayName ? payload[0].payload.fullName : null;
    
    return (
      <div className="bg-bg-card/95 border border-border-main p-3.5 rounded-2xl shadow-xl backdrop-blur-md select-none text-xs min-w-[140px] animate-in fade-in duration-200">
        {title && <p className="font-extrabold text-text-main mb-2 pb-1 border-b border-border-main/40 uppercase tracking-wider">{title}</p>}
        <div className="space-y-1.5">
          {payload.map((item, index) => {
            const labelName = item.name;
            const itemColor = item.color || item.payload?.color;
            
            return (
              <div key={index} className="flex items-center justify-between gap-3 font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: itemColor }} />
                  <span className="text-text-secondary">{labelName}</span>
                </div>
                <span className="text-text-main font-black">
                  {item.value} <span className="text-[10px] text-text-secondary font-medium">vms</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView = React.memo(function DashboardView({ backups, clients, isPresentationMode = false, isLoading = false }: DashboardViewProps) {
  const navigate = useNavigate();
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (backups.length === 0) {
    return <EmptyDashboardState />;
  }
  const [filterType, setFilterType] = useState<'reuniao' | '7_dias' | '30_dias'>('reuniao');

  // Calculates the Friday-closing weekly cycle range
  // Saturday 00:00:00 to Friday 23:59:59
  const cycleRange = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, ..., 6 is Saturday
    const start = new Date(today);
    const end = new Date(today);

    if (currentDay === 6) { // Saturday
      // Starts today
      start.setHours(0, 0, 0, 0);
      // Ends next Friday
      end.setDate(today.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Starts last Saturday
      const diffToPrevSaturday = currentDay + 1;
      start.setDate(today.getDate() - diffToPrevSaturday);
      start.setHours(0, 0, 0, 0);

      // Ends this coming Friday
      const diffToFriday = 5 - currentDay;
      end.setDate(today.getDate() + diffToFriday);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, []);

  // Compute dynamic filter dates range based on selection
  const filterRange = useMemo(() => {
    const today = new Date();
    
    if (filterType === 'reuniao') {
      return cycleRange;
    } else if (filterType === '7_dias') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else { // 30_dias
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }, [filterType, cycleRange]);

  // Filter Backup records based on selection
  const filteredBackups = useMemo(() => {
    return backups.filter(b => {
      const bDate = new Date(b.timestamp);
      return bDate >= filterRange.start && bDate <= filterRange.end;
    });
  }, [backups, filterRange]);

  // KPI calculations
  const total = filteredBackups.length;
  const success = filteredBackups.filter(b => b.status === 'success').length;
  const warning = filteredBackups.filter(b => b.status === 'warning').length;
  const failed = filteredBackups.filter(b => b.status === 'failed').length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  // Fallback automatically if 'reuniao' filter is empty but we have backups in broader windows
  useEffect(() => {
    if (backups.length > 0 && filteredBackups.length === 0 && filterType === 'reuniao') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const has7DaysData = backups.some(b => {
        try {
          return new Date(b.timestamp) >= sevenDaysAgo;
        } catch (e) {
          return false;
        }
      });
      if (has7DaysData) {
        setFilterType('7_dias');
      } else {
        setFilterType('30_dias');
      }
    }
  }, [backups, filteredBackups.length, filterType]);

  // Pie (Donut) Chart Data
  const pieData = [
    { name: 'Sucesso', value: success, color: '#10B981' }, // Emerald GP05
    { name: 'Aviso', value: warning, color: '#F59E0B' },   // Amber GP05
    { name: 'Falha', value: failed, color: '#F43F5E' },    // Rose-Red GP05
  ];

  // Daily Trend Data grouped day by day, displaying weekdays beautifully
  const dailyTrendData = useMemo(() => {
    const data: any[] = [];
    const weekdaysName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekdaysShortName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    let current = new Date(filterRange.start);
    const end = new Date(filterRange.end);
    
    let count = 0;
    while (current <= end && count < 50) {
      count++;
      const isoDateStr = current.toISOString().split('T')[0];
      const dayName = weekdaysName[current.getDay()];
      const dayShortName = weekdaysShortName[current.getDay()];
      const dayLabel = `${dayName} (${current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;
      
      const dayBackups = filteredBackups.filter(b => {
        const bDate = new Date(b.timestamp);
        return bDate.toISOString().split('T')[0] === isoDateStr;
      });
      
      const daySuccess = dayBackups.filter(b => b.status === 'success').length;
      const dayWarning = dayBackups.filter(b => b.status === 'warning').length;
      const dayFailed = dayBackups.filter(b => b.status === 'failed').length;
      
      data.push({
        name: filterType === 'reuniao' || filterType === '7_dias' ? dayShortName : current.toLocaleDateString('pt-BR', { day: '2-digit' }),
        fullName: dayLabel,
        sucesso: daySuccess,
        alerta: dayWarning,
        falha: dayFailed,
        total: dayBackups.length
      });
      
      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [filterRange, filteredBackups, filterType]);

  // Sliced breakdown list of clients with failures
  const criticalClients = useMemo(() => {
    const clients: Record<string, { failed: number; total: number }> = {};
    filteredBackups.forEach(b => {
      if (!clients[b.client]) clients[b.client] = { failed: 0, total: 0 };
      clients[b.client].total++;
      if (b.status === 'failed' || b.status === 'warning') clients[b.client].failed++;
    });

    return Object.entries(clients)
      .filter(([_, data]) => data.failed > 0)
      .sort((a, b) => b[1].failed - a[1].failed)
      .slice(0, 4);
  }, [filteredBackups]);

  // Export report function prioritizing failures and alerts
  const handleExportReport = () => {
    const toastId = toast.loading('Gerando relatório de auditoria...');
    
    try {
      // Sort: failed, warning, success
      const sorted = [...filteredBackups].sort((a, b) => {
        const priorityOrder = { failed: 0, warning: 1, success: 2 };
        return priorityOrder[a.status] - priorityOrder[b.status];
      });

      // Assemble CSV Headers with UTF-8 BOM for Brazilian Excel compatibility
      let csvContent = '\uFEFF';
      
      // Header information
      csvContent += 'RELATÓRIO SEMANAL EXECUTIVO - REGISTRO DE BACKUP\n';
      csvContent += `Ciclo de Fechamento:;${filterType === 'reuniao' ? 'Semanal (Sáb-Sex)' : filterType === '7_dias' ? 'Últimos 7 Dias' : 'Últimos 30 Dias'}\n`;
      csvContent += `Intervalo das Datas:;${filterRange.start.toLocaleDateString('pt-BR')} até ${filterRange.end.toLocaleDateString('pt-BR')}\n`;
      csvContent += `Gerado por responsável em:;${new Date().toLocaleString('pt-BR')}\n\n`;
      
      // Metrics Overview
      csvContent += 'RESUMO DAS MÉTRICAS\n';
      csvContent += `Total de Backups Executados:;${total}\n`;
      csvContent += `Taxa de Sucesso (SLA):;${successRate}%\n`;
      csvContent += `Sucessos:;${success}\n`;
      csvContent += `Alertas/Avisos:;${warning}\n`;
      csvContent += `Falhas Críticas:;${failed}\n\n`;
      
      // Detail list header
      csvContent += 'DETALHADO DE ROTINAS DE BACKUP (ORDENADO POR STATUS DE GRAVIDADE)\n';
      csvContent += 'Status;Título do Backup;Cliente;Categoria;Tipo;Responsável;Análise Técnica/Plano de Ação;Data e Hora\n';
      
      sorted.forEach(record => {
        const statusTranslations = {
          success: 'Sucesso',
          warning: 'Aviso',
          failed: 'Falha'
        };
        const statusText = statusTranslations[record.status] || record.status;
        const formattedDate = new Date(record.timestamp).toLocaleString('pt-BR');
        
        // Combine technical analysis or action plan into notes for context
        const notesParts: string[] = [];
        if (record.technicalAnalysis) notesParts.push(`[Análise] ${record.technicalAnalysis}`);
        if (record.actionPlan) notesParts.push(`[Plano de Ação] ${record.actionPlan}`);
        const notesText = notesParts.length > 0 ? notesParts.join(' | ').replace(/[\r\n;"]+/g, ' ') : '-';
        
        const titleSafe = (record.title || '').replace(/[\r\n;"]+/g, ' ');
        const clientSafe = (record.client || '').replace(/[\r\n;"]+/g, ' ');
        const catSafe = (record.category || '').replace(/[\r\n;"]+/g, ' ');
        const typeSafe = (record.backupType || 'Nakivo').replace(/[\r\n;"]+/g, ' ');
        const respSafe = (record.responsible || '').replace(/[\r\n;"]+/g, ' ');

        csvContent += `"${statusText}";"${titleSafe}";"${clientSafe}";"${catSafe}";"${typeSafe}";"${respSafe}";"${notesText}";"${formattedDate}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fileDate = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `registro-de-backup-relatorio-executivo-${fileDate}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        toast.success('Relatório baixado com sucesso!', { id: toastId });
      }, 700);
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao gerar o relatório.', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. FILTER CONTROL HEADER WITH CYCLE RANGE DISPLAY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-card p-5 rounded-3xl border border-border-main shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/15 flex items-center justify-center text-brand">
            <Calendar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-main leading-tight font-heading">Painel de Auditoria</h1>
            <p className="text-xs text-text-secondary mt-0.5">Visão executiva otimizada para o fechamento semanal de sexta-feira</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle Selection Controls */}
          <div className="flex items-center gap-1 bg-bg-main p-1 rounded-xl border border-border-main">
            <button
              onClick={() => setFilterType('reuniao')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                filterType === 'reuniao'
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              Ciclo Sáb-Sex
            </button>
            <button
              onClick={() => setFilterType('7_dias')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                filterType === '7_dias'
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              7 Dias
            </button>
            <button
              onClick={() => setFilterType('30_dias')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                filterType === '30_dias'
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              30 Dias
            </button>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-bg-main border border-border-main flex items-center gap-2 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-success animate-ping" />
            <span className="text-[11px] font-black text-text-main uppercase tracking-wider">
              {filterRange.start.toLocaleDateString('pt-BR')} - {filterRange.end.toLocaleDateString('pt-BR')}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-text-main text-bg-main hover:bg-text-main/90 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Exportar dados para Excel (.csv)"
          >
            <Download className="w-4 h-4" />
            Exportar Relatório
          </motion.button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ willChange: "transform, opacity" }}
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300",
          isPresentationMode ? "gap-6 lg:gap-8 mb-4 scale-[1.01]" : "gap-4"
        )}
      >
        <KPICard 
          title="Taxa de Disponibilidade" 
          value={`${successRate}%`} 
          subtitle="Acumulado da semana"
          icon={<Shield className={cn("w-5 h-5", successRate >= 95 ? "text-success" : successRate >= 85 ? "text-warning" : "text-danger")} />}
          trend={`${successRate >= 95 ? 'Excelente' : successRate >= 85 ? 'Esperado' : 'Crítico'}`}
          trendUp={successRate >= 90}
          isPresentationMode={isPresentationMode}
        />
        <KPICard 
          title="Total de Backups" 
          value={total.toString()} 
          subtitle="Rotinas executadas"
          icon={<Database className="w-5 h-5 text-brand" />}
          isPresentationMode={isPresentationMode}
        />
        <KPICard 
          title="Falhas Críticas" 
          value={failed.toString()} 
          subtitle="Requerem ação urgente"
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          alert={failed > 0}
          isPresentationMode={isPresentationMode}
        />
        <KPICard 
          title="Alertas / Avisos" 
          value={warning.toString()} 
          subtitle="Verificações manuais necessárias"
          icon={<History className="w-5 h-5 text-warning" />}
          isPresentationMode={isPresentationMode}
        />
      </motion.div>

      {/* 3. CHART DUAL VIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Progress Bar Chart */}
        <div className="lg:col-span-2 card p-6 border border-border-main/60 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
            <div>
              <h2 className="font-heading text-lg font-bold text-text-main flex items-center gap-2">
                Volume de Backups Diários
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 uppercase tracking-widest">
                  {filterType === 'reuniao' ? 'Ciclo Semanal' : 'Histórico'}
                </span>
              </h2>
              <p className="text-xs text-text-secondary mt-1">Status acumulado por dia até o fechamento de sexta-feira</p>
            </div>
            
            <div className="flex items-center flex-wrap gap-3.5 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-success" />
                <span className="text-text-secondary">Sucesso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-warning" />
                <span className="text-text-secondary">Aviso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-danger" />
                <span className="text-text-secondary">Falha</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-main)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'var(--color-brand)', opacity: 0.04 }}
                />
                <Bar dataKey="sucesso" name="Sucesso" stackId="a" fill="#10B981" />
                <Bar dataKey="alerta" name="Alerta" stackId="a" fill="#F59E0B" />
                <Bar dataKey="falha" name="Falha" stackId="a" fill="#F43F5E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="card p-6 border border-border-main/60 shadow-md flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="font-heading text-lg font-bold text-text-main">Eficiência Global</h2>
            <p className="text-xs text-text-secondary mt-1">Divisão proporcional por status das rotinas de backup</p>
          </div>
          
          <div className="flex-1 min-h-[170px] relative mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={total > 0 ? pieData : [{ name: 'Sem Dados', value: 1, color: '#334155' }]}
                  innerRadius={62}
                  outerRadius={82}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading text-3xl font-extrabold text-text-main">{successRate}%</span>
              <span className="text-[9px] uppercase font-black text-text-secondary tracking-widest mt-0.5">SLA</span>
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            {total > 0 ? pieData.map((item) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-bg-main/30 border border-border-main/10 hover:bg-bg-main/60 hover:border-border-main/35 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-text-secondary">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text-main">
                    {item.value} <span className="text-[10px] font-medium text-text-secondary">vms</span>
                  </span>
                  <span className="text-text-secondary text-[11px] font-black text-right w-10">
                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-center text-xs text-text-secondary italic py-4">Sem informações no período atual.</p>
            )}
          </div>
        </div>

      </div>

      {/* 4. DETAIL METRIC LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Critical Clients Card */}
        <div className="card p-6 border border-border-main/60 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-text-main">Clientes com Instabilidade</h2>
              <p className="text-xs text-text-secondary mt-0.5">Auditados no ciclo selecionado</p>
            </div>
            <AlertTriangle className={cn("w-4.5 h-4.5 text-danger", failed > 0 && "animate-pulse")} />
          </div>

          <div className="space-y-4">
            {criticalClients.length > 0 ? criticalClients.map(([name, data]) => (
              <div key={name} className="p-4 rounded-2xl border border-border-main bg-bg-main/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger font-bold text-xs uppercase">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">{name}</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-semibold">Incidentes detectados</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-danger">
                    {data.failed} <span className="text-xs font-normal text-text-secondary">falhas</span>
                  </div>
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
                <p className="text-xs text-text-secondary mt-1">Nenhum cliente crítico detectado neste ciclo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights Activity */}
        <div className="card p-6 border border-border-main/60 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-text-main">Resumo da Atividade</h2>
              <p className="text-xs text-text-secondary mt-0.5">Rotinas relevantes do ciclo atual</p>
            </div>
            <Database className="w-4.5 h-4.5 text-text-secondary/70" />
          </div>

          <div className="space-y-4">
            {filteredBackups.length > 0 ? (
              filteredBackups.slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center gap-4 group cursor-pointer hover:translate-x-1 transition-all">
                  <div className={cn(
                    "w-2 h-10 rounded-full shrink-0",
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
                      {(() => {
                        const clientObj = clients?.find(c => c.name.toLowerCase() === b.client.toLowerCase());
                        return clientObj ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cliente/${clientObj.id}`);
                            }}
                            className="text-[10px] font-bold text-brand hover:underline uppercase tracking-wider cursor-pointer transition-colors text-left"
                          >
                            {b.client}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{b.client}</span>
                        );
                      })()}
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className="text-[10px] text-text-secondary font-semibold">{b.backupType || 'Nakivo'}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-text-secondary font-semibold uppercase tracking-widest py-12">
                Sem atividades registradas nesta janela.
              </p>
            )}
            
            <div className="border-t border-border-main/30 pt-4 mt-2">
              <div className="p-3 bg-bg-main/50 rounded-xl border border-border-main/40 text-[11px] text-text-secondary leading-relaxed font-semibold">
                📌 Reunião de Fechamento está agendada para toda sexta-feira. Certifique-se de consolidar os planos de ação para todas as falhas apresentadas.
              </div>
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
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
  isPresentationMode?: boolean;
}

const KPICard = React.memo(function KPICard({ title, value, subtitle, icon, trend, trendUp, alert, isPresentationMode }: KPICardProps) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ scale: isPresentationMode ? 1.04 : 1.03, y: -4, transition: { type: "spring", stiffness: 350, damping: 12 } }}
      whileTap={{ scale: 0.98 }}
      style={{ willChange: "transform, opacity" }}
      className={cn(
        "card transition-all duration-300 border-l-4 shadow-sm",
        alert ? "border-l-danger bg-danger/[0.02]" : "border-l-brand",
        isPresentationMode ? "p-6 md:p-8" : "p-5"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "font-black text-text-secondary uppercase tracking-widest transition-all duration-300",
          isPresentationMode ? "text-[11px] md:text-xs" : "text-[10px]"
        )}>{title}</span>
        <div className={cn(
          "rounded-xl bg-bg-card shadow-sm border border-border-main flex items-center justify-center transition-all duration-300",
          isPresentationMode ? "p-3" : "p-2"
        )}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className={cn(
            "font-black font-heading text-text-main leading-none transition-all duration-300",
            isPresentationMode ? "text-3xl md:text-5xl mb-2.5" : "text-2xl mb-1.5"
          )}>{value}</div>
          {subtitle && (
            <div className={cn(
              "text-text-secondary font-bold leading-tight transition-all duration-300",
              isPresentationMode ? "text-[11px] md:text-xs" : "text-[10px]"
            )}>{subtitle}</div>
          )}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 font-black px-2 py-0.5 rounded-lg uppercase tracking-wider transition-all duration-300",
            trendUp ? "text-success bg-success/10 border border-success/15" : "text-danger bg-danger/10 border border-danger/15",
            isPresentationMode ? "text-xs px-2.5 py-1" : "text-[9px]"
          )}>
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
});
