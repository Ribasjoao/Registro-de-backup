import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  CartesianGrid, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ArrowLeft, 
  Building2, 
  Database, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  User, 
  Server,
  Cloud,
  FileText
} from 'lucide-react';
import { Client, BackupRecord } from '../types';
import { StatusBadge } from './UI';
import { cn } from '../lib/utils';

interface ClientDashboardViewProps {
  clients: Client[];
  backups: BackupRecord[];
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
  }
};

export const ClientDashboardView = React.memo(function ClientDashboardView({ clients, backups, isLoading = false }: ClientDashboardViewProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // Find the selected client
  const client = useMemo(() => {
    return clients.find(c => c.id === clientId);
  }, [clients, clientId]);

  // If client is not found but there are backups, maybe search by name or slug
  const clientName = client ? client.name : '';

  const clientBackups = useMemo(() => {
    if (!clientName) return [];
    return backups.filter(b => b.client.toLowerCase() === clientName.toLowerCase());
  }, [backups, clientName]);

  // Extract jobs from backup history
  const clientJobs = useMemo(() => {
    if (clientBackups.length === 0) return [];

    const jobMap = new Map<string, {
      title: string;
      backupType: 'LOCAL' | 'CLOUD';
      createdAt: string;
      records: BackupRecord[];
    }>();

    // Group backups by job title
    clientBackups.forEach(b => {
      const title = b.title || 'Job Sem Nome';
      const typeStr = b.backupType?.toUpperCase() || 'LOCAL';
      const bType = (typeStr.includes('CLOUD') || typeStr.includes('NUVEM')) ? 'CLOUD' : 'LOCAL';
      
      const existing = jobMap.get(title.toLowerCase());
      if (existing) {
        existing.records.push(b);
        // Take earliest date as creation date
        if (new Date(b.timestamp).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = b.timestamp;
        }
      } else {
        jobMap.set(title.toLowerCase(), {
          title,
          backupType: bType,
          createdAt: b.timestamp,
          records: [b]
        });
      }
    });

    return Array.from(jobMap.values()).map(job => {
      // Sort records for this job newest first to get last status
      const sortedRecords = [...job.records].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastRecord = sortedRecords[0];

      return {
        title: job.title,
        backupType: job.backupType,
        createdAt: job.createdAt,
        lastStatus: lastRecord ? lastRecord.status : 'success' as const,
        lastRecordDate: lastRecord ? lastRecord.timestamp : ''
      };
    });
  }, [clientBackups]);

  // Overall success rate
  const successRate = useMemo(() => {
    if (clientBackups.length === 0) return 100;
    const successCount = clientBackups.filter(b => b.status === 'success').length;
    return Math.round((successCount / clientBackups.length) * 100);
  }, [clientBackups]);

  // Latest 30 days success trend chart data
  const trendData = useMemo(() => {
    const dataList = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const dateKey = d.toISOString().split('T')[0];

      const dayBackups = clientBackups.filter(b => b.timestamp.startsWith(dateKey));

      let rate = -1; // -1 indicates no backups on this day
      if (dayBackups.length > 0) {
        const success = dayBackups.filter(b => b.status === 'success').length;
        rate = Math.round((success / dayBackups.length) * 100);
      }

      dataList.push({
        date: dateStr,
        rate
      });
    }

    // Interpolate missing points to keep line continuous
    let lastKnownRate = 100;
    const firstKnown = dataList.find(item => item.rate !== -1);
    if (firstKnown) {
      lastKnownRate = firstKnown.rate;
    }

    return dataList.map(item => {
      if (item.rate === -1) {
        return {
          date: item.date,
          'Taxa de Sucesso': lastKnownRate
        };
      } else {
        lastKnownRate = item.rate;
        return {
          date: item.date,
          'Taxa de Sucesso': item.rate
        };
      }
    });
  }, [clientBackups]);

  // Sort history newest first
  const sortedAudits = useMemo(() => {
    return [...clientBackups].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [clientBackups]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-8 w-48 bg-border-main/50 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-border-main/20 rounded-2xl border border-border-main/45" />
          <div className="h-28 bg-border-main/20 rounded-2xl border border-border-main/45" />
          <div className="h-28 bg-border-main/20 rounded-2xl border border-border-main/45" />
        </div>
        <div className="h-64 bg-border-main/20 rounded-2xl border border-border-main/45" />
      </div>
    );
  }

  if (!client && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card border border-dashed border-border-main/80 rounded-3xl bg-bg-card/35 min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-danger/5 border border-danger/10 flex items-center justify-center text-danger mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="font-heading text-lg font-bold text-text-main">Cliente não encontrado</h3>
        <p className="text-sm text-text-secondary mt-1.5 max-w-sm">
          O cliente solicitado não pôde ser localizado em nossa base ativa de dados.
        </p>
        <button 
          onClick={() => navigate('/clientes')}
          className="mt-6 px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-dark transition-all"
        >
          Voltar para Clientes
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-1"
    >
      {/* Dynamic Client Header */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-bg-card/25 p-6 rounded-2xl border border-border-main/40 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-text-main">{clientName}</h2>
            <p className="text-xs text-text-secondary font-medium">Dashboard consolidado do cliente corporativo</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => navigate('/clientes')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border-main/60 bg-bg-card text-text-main text-xs font-bold hover:bg-bg-main transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar a Clientes
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-all shadow-md cursor-pointer"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </motion.div>

      {/* Metrics Cards row */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Total Jobs */}
        <div className="card p-5 border border-border-main/50 bg-bg-card/30 flex items-center gap-4 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Jobs Ativos</p>
            <p className="text-2xl font-bold text-text-main mt-0.5">{clientJobs.length}</p>
            <p className="text-[10px] text-text-secondary font-medium">Modelagem de backups</p>
          </div>
        </div>

        {/* Total Audits */}
        <div className="card p-5 border border-border-main/50 bg-bg-card/30 flex items-center gap-4 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Auditorias Realizadas</p>
            <p className="text-2xl font-bold text-text-main mt-0.5">{clientBackups.length}</p>
            <p className="text-[10px] text-text-secondary font-medium">Pontos de verificação totais</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="card p-5 border border-border-main/50 bg-bg-card/30 flex items-center gap-4 rounded-2xl">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
            successRate >= 90 
              ? "bg-green-500/10 border-green-500/20 text-green-400" 
              : successRate >= 70 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-text-main mt-0.5">{successRate}%</p>
            <p className="text-[10px] text-text-secondary font-medium">Balanço do período de atividade</p>
          </div>
        </div>
      </motion.div>

      {/* Trend Success Chart (Full Width) */}
      <motion.div 
        variants={itemVariants}
        className="card p-6 border border-border-main/55 bg-bg-card/25 rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-main/20">
          <div>
            <h3 className="font-heading text-sm font-bold text-text-main">Gráfico de Tendência de Sucesso</h3>
            <p className="text-[11px] text-text-secondary font-medium">Histórico percentual diário consolidado nos últimos 30 dias</p>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={10} 
                fontWeight="bold"
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                fontWeight="bold"
                tickLine={false} 
                axisLine={false} 
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <ChartTooltip 
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '12px',
                  color: '#f4f4f5',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="Taxa de Sucesso" 
                stroke="#7c3aed" 
                strokeWidth={3} 
                dot={{ r: 4, stroke: '#18181b', strokeWidth: 2, fill: '#7c3aed' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Dual Column Layout: Jobs list and History table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Jobs list column (4 cols) */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-5 card p-5 border border-border-main/50 bg-bg-card/25 rounded-2xl space-y-4"
        >
          <div>
            <h3 className="font-heading text-sm font-bold text-text-main">Mapeamento de Jobs ({clientJobs.length})</h3>
            <p className="text-[11px] text-text-secondary font-medium">Disposições de backup ativas do cliente</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {clientJobs.length === 0 ? (
              <p className="text-center text-xs text-text-secondary font-semibold uppercase tracking-widest py-12 border border-dashed border-border-main/50 rounded-xl bg-bg-main/30">
                Nenhum job mapeado
              </p>
            ) : (
              clientJobs.map((job, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 bg-bg-card/40 border border-border-main/40 rounded-xl hover:border-brand/30 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-bg-main flex items-center justify-center shrink-0">
                      {job.backupType === 'CLOUD' ? (
                        <Cloud className="w-5 h-5 text-brand" />
                      ) : (
                        <Server className="w-5 h-5 text-text-secondary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-main truncate">{job.title}</p>
                      <p className="text-[10px] text-text-secondary font-medium">
                        Ambiente: <span className={cn(
                          "font-bold uppercase",
                          job.backupType === 'CLOUD' ? "text-brand" : "text-text-secondary"
                        )}>{job.backupType}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="flex items-center justify-end">
                      <StatusBadge status={job.lastStatus} />
                    </div>
                    <p className="text-[9px] text-text-muted font-bold">
                      Criado em: {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* History table column (7 cols) */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-7 card p-5 border border-border-main/50 bg-bg-card/25 rounded-2xl space-y-4 flex flex-col"
        >
          <div>
            <h3 className="font-heading text-sm font-bold text-text-main">Histórico de Auditoria</h3>
            <p className="text-[11px] text-text-secondary font-medium">Lista cronológica das atividades do cliente</p>
          </div>

          <div className="flex-1 overflow-x-auto border border-border-main/50 rounded-xl overflow-hidden bg-bg-card/10">
            <div className="max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-main border-b border-border-main text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Título</th>
                    <th className="py-3 px-4">Job</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main/30 text-xs">
                  {sortedAudits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-secondary font-bold uppercase tracking-widest bg-bg-main/15">
                        Nenhuma auditoria realizada
                      </td>
                    </tr>
                  ) : (
                    sortedAudits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-bg-main/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-text-secondary font-medium">
                          {new Date(audit.timestamp).toLocaleDateString('pt-BR')} {new Date(audit.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-text-main">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-light text-brand text-[9px] font-bold border border-brand/5">
                            <FileText className="w-2.5 h-2.5 mr-1" />
                            {audit.category || 'Rotina'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-text-main max-w-[120px] truncate" title={audit.title}>
                          {audit.title}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={audit.status} />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-text-secondary font-semibold">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-main text-text-main border border-border-main/50">
                            <User className="w-3 h-3 mr-1" />
                            {audit.responsible}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});
