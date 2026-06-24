import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Search, ChevronRight, Calendar, Activity, CheckCircle2, AlertTriangle, XCircle, Plus, LayoutDashboard, Database } from 'lucide-react';
import { Client, BackupRecord } from '../types';
import { cn } from '../lib/utils';

interface ClientsListViewProps {
  clients: Client[];
  backups: BackupRecord[];
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
  }
};

export const ClientsListView = React.memo(function ClientsListView({ clients, backups, isLoading = false }: ClientsListViewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const clientStats = useMemo(() => {
    return clients.map(client => {
      const clientBackups = backups.filter(b => b.client.toLowerCase() === client.name.toLowerCase());
      
      // Extract unique jobs (by title)
      const uniqueJobNames = new Set<string>();
      clientBackups.forEach(b => {
        if (b.title) uniqueJobNames.add(b.title.trim().toLowerCase());
      });
      const totalJobs = uniqueJobNames.size;
      
      const successCount = clientBackups.filter(b => b.status === 'success').length;
      const successRate = clientBackups.length > 0 ? Math.round((successCount / clientBackups.length) * 100) : 100;
      
      const lastAudit = clientBackups.length > 0 
        ? [...clientBackups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        : null;

      return {
        ...client,
        totalAudits: clientBackups.length,
        totalJobs,
        successRate,
        lastAudit
      };
    });
  }, [clients, backups]);

  const filteredClients = useMemo(() => {
    return clientStats.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clientStats, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-8 w-48 bg-border-main/50 rounded-xl" />
            <div className="h-4 w-72 bg-border-main/30 rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-full md:w-80 bg-border-main/30 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-border-main/20 rounded-2xl border border-border-main/45" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Search Input and Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-bg-card/25 p-4 rounded-2xl border border-border-main/40 backdrop-blur-sm">
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border-main/60 bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary font-semibold">
          <Users className="w-4 h-4 text-brand" />
          <span>Exibindo {filteredClients.length} de {clients.length} clientes cadastrados</span>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center card border border-dashed border-border-main/80 rounded-3xl bg-bg-card/35 min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand mb-4">
            <Users className="w-8 h-8 text-brand animate-pulse" />
          </div>
          <h3 className="font-heading text-lg font-bold text-text-main">Nenhum cliente encontrado</h3>
          <p className="text-sm text-text-secondary mt-1.5 max-w-sm">
            Não há clientes correspondentes à busca "{searchTerm}".
          </p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredClients.map((client) => {
            const successColor = client.successRate >= 90 
              ? 'text-green-500' 
              : client.successRate >= 70 
                ? 'text-amber-500' 
                : 'text-red-500';

            const badgeBg = client.successRate >= 90 
              ? 'bg-green-500/10 border-green-500/20' 
              : client.successRate >= 70 
                ? 'bg-amber-500/10 border-amber-500/20' 
                : 'bg-red-500/10 border-red-500/20';

            return (
              <motion.div
                key={client.id}
                variants={cardVariants}
                onClick={() => navigate(`/cliente/${client.id}`)}
                className="card group cursor-pointer border border-border-main/60 bg-bg-card/30 hover:bg-bg-card/50 hover:border-brand/40 hover:shadow-[0_12px_30px_rgba(124,58,237,0.06)] rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <h3 className="font-heading text-base font-bold text-text-main group-hover:text-brand transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-[10px] text-text-secondary flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        Cadastrado em: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className={cn("px-2 py-1 rounded-lg text-xs font-black border tracking-wider", badgeBg, successColor)}>
                      {client.successRate}%
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2.5 bg-bg-main/40 border border-border-main/30 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-wider text-text-secondary opacity-60">Auditorias</p>
                      <p className="text-sm font-bold text-text-main mt-0.5">{client.totalAudits}</p>
                    </div>
                    <div className="p-2.5 bg-bg-main/40 border border-border-main/30 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-wider text-text-secondary opacity-60">Jobs Ativos</p>
                      <p className="text-sm font-bold text-text-main mt-0.5">{client.totalJobs}</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer Status & Action */}
                <div className="border-t border-border-main/30 pt-3 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    {client.lastAudit ? (
                      <>
                        <span className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          client.lastAudit.status === 'success' 
                            ? 'bg-green-500' 
                            : client.lastAudit.status === 'warning' 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                        )} />
                        Último status: {
                          client.lastAudit.status === 'success' ? 'Sucesso' : client.lastAudit.status === 'warning' ? 'Aviso' : 'Falha'
                        }
                      </>
                    ) : (
                      'Nenhum backup registrado'
                    )}
                  </span>
                  <span className="text-brand flex items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    Acessar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
});
