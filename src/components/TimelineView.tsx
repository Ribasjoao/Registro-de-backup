import React, { useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  Wifi, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  UserPlus, 
  PlusCircle, 
  Award, 
  Activity, 
  ChevronRight, 
  User, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Activity as ActivityType, Client } from '../types';
import { motion } from 'motion/react';

interface TimelineViewProps {
  activities: ActivityType[];
  clients: Client[];
  onMarkAsRead: () => void;
  isLoading?: boolean;
}

// Relative time formatter
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'algum tempo atrás';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'agora mesmo';
    }
    if (diffMins < 60) {
      return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    }
    if (diffHours < 24) {
      return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }
    if (diffDays === 1) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `ontem às ${hours}:${minutes}`;
    }
    if (diffDays < 7) {
      return `há ${diffDays} dias`;
    }

    // Format fallback
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'algum tempo atrás';
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20
    }
  }
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  activities,
  clients,
  onMarkAsRead,
  isLoading = false
}) => {
  const navigate = useNavigate();

  // Match client name to find client ID for linking
  const getClientLink = (clientName?: string) => {
    if (!clientName) return null;
    const matched = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    return matched ? `/cliente/${matched.id}` : null;
  };

  // Icon mapping depending on activity action/type
  const getActivityIcon = (action: string, status: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('auditoria') || actionLower.includes('backup')) {
      if (status === 'failed') return <XCircle className="w-5 h-5 text-danger" />;
      if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-warning" />;
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    }
    
    if (actionLower.includes('falha') || actionLower.includes('incidente') || actionLower.includes('resolveu')) {
      return <ShieldCheck className="w-5 h-5 text-success" />;
    }
    
    if (actionLower.includes('cliente')) {
      return <PlusCircle className="w-5 h-5 text-brand-dark" />;
    }
    
    if (actionLower.includes('integrante') || actionLower.includes('equipe') || actionLower.includes('adicionou')) {
      return <UserPlus className="w-5 h-5 text-blue-400" />;
    }
    
    if (actionLower.includes('marco') || actionLower.includes('sistema') || actionLower.includes('dias sem')) {
      return <Award className="w-5 h-5 text-amber-500 animate-pulse" />;
    }
    
    return <Activity className="w-5 h-5 text-text-secondary" />;
  };

  // Left border mapping based on status
  const getStatusBorderClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-l-4 border-l-success';
      case 'warning':
        return 'border-l-4 border-l-warning';
      case 'failed':
        return 'border-l-4 border-l-danger';
      case 'info':
      default:
        return 'border-l-4 border-l-brand';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-success/15 text-success rounded-full border border-success/20 uppercase tracking-wide">
            Sucesso
          </span>
        );
      case 'warning':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-warning/15 text-warning rounded-full border border-warning/20 uppercase tracking-wide">
            Aviso
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-danger/15 text-danger rounded-full border border-danger/20 uppercase tracking-wide">
            Falha
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-brand-light text-brand rounded-full border border-brand/20 uppercase tracking-wide">
            Info
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-border-main/50 rounded-xl animate-pulse" />
          <div className="h-6 w-24 bg-border-main/40 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-28 border border-border-main/50 rounded-2xl animate-pulse flex items-center p-6 space-x-4">
              <div className="w-12 h-12 rounded-full bg-border-main/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-border-main/50 rounded" />
                <div className="h-3 w-1/2 bg-border-main/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-2">
      {/* Header with Live Indicator */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <Clock className="w-7 h-7 text-brand" /> Timeline de Atividades
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Feed operacional cronológico em tempo real do Registro de Backup.
          </p>
        </div>

        {/* Live Pulse Badge */}
        <div className="flex items-center self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            AO VIVO
          </span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center card border border-dashed border-border-main/60 rounded-3xl bg-bg-card/35 min-h-[400px]">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand mb-4">
            <Activity className="w-8 h-8 text-brand animate-pulse" />
          </div>
          <h3 className="font-heading text-lg font-bold text-text-main">Nenhuma atividade registrada</h3>
          <p className="text-sm text-text-secondary mt-2 max-w-md">
            As ações tomadas no sistema (cadastro de backups, conclusão de incidentes, novos clientes e marcos) aparecerão cronologicamente aqui.
          </p>
        </div>
      ) : (
        /* Vertical Scroll Container with Max Height */
        <div className="max-h-[78vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {activities.map((activity) => {
              const clientUrl = getClientLink(activity.clientName);
              const initials = activity.userName
                ? activity.userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                : 'OP';

              return (
                <motion.div
                  key={activity.id}
                  variants={cardVariants}
                  className={`card p-4 sm:p-5 flex gap-4 bg-bg-card/45 backdrop-blur-md rounded-2xl transition-all duration-300 border border-border-main/30 ${getStatusBorderClass(activity.status)}`}
                >
                  {/* User Photo or Initials */}
                  <div className="flex-shrink-0">
                    {activity.userPhoto ? (
                      <img 
                        src={activity.userPhoto} 
                        alt={activity.userName} 
                        className="w-10 h-10 rounded-full border border-border-main shadow object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-xs border border-brand/20">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Activity Details Card body */}
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text-main text-sm sm:text-base">
                          {activity.userName || 'Sistema Registro de Backup'}
                        </span>
                        <span className="text-xs sm:text-sm text-text-secondary font-medium">
                          {activity.action}
                        </span>
                      </div>
                      
                      {/* Timestamp relative and absolute tooltip */}
                      <span className="text-xs text-text-secondary flex items-center gap-1" title={new Date(activity.timestamp).toLocaleString('pt-BR')}>
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>

                    {/* Details content */}
                    <p className="text-xs sm:text-sm text-text-main font-normal mt-1.5 leading-relaxed">
                      {activity.details}
                    </p>

                    {/* Extra Metadata / Jobs progress visualization */}
                    {activity.metadata && (activity.metadata.totalJobs !== undefined) && (
                      <div className="mt-3 bg-bg-main/50 border border-border-main/20 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-semibold text-text-secondary">
                          <span>Jobs: {activity.metadata.totalJobs} total</span>
                          <span className="flex gap-2">
                            <span className="text-success">{activity.metadata.success || 0} OK</span>
                            <span className="text-warning">{activity.metadata.warning || 0} Avisos</span>
                            <span className="text-danger">{activity.metadata.failed || 0} Falhas</span>
                          </span>
                        </div>
                        {/* Miniature status bar */}
                        <div className="h-1.5 w-full bg-border-main/40 rounded-full flex overflow-hidden">
                          {activity.metadata.success && activity.metadata.success > 0 && (
                            <div 
                              className="h-full bg-success" 
                              style={{ width: `${(activity.metadata.success / activity.metadata.totalJobs) * 100}%` }} 
                            />
                          )}
                          {activity.metadata.warning && activity.metadata.warning > 0 && (
                            <div 
                              className="h-full bg-warning" 
                              style={{ width: `${(activity.metadata.warning / activity.metadata.totalJobs) * 100}%` }} 
                            />
                          )}
                          {activity.metadata.failed && activity.metadata.failed > 0 && (
                            <div 
                              className="h-full bg-danger" 
                              style={{ width: `${(activity.metadata.failed / activity.metadata.totalJobs) * 100}%` }} 
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* SLA resolution details */}
                    {activity.metadata && activity.metadata.slaTime && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 py-1 px-2.5 rounded-lg border border-success/10 self-start w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolvido dentro do SLA de atendimento ({activity.metadata.slaTime})
                      </div>
                    )}

                    {/* Action footer & Links */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-main/15 pt-2.5">
                      {getStatusBadge(activity.status)}

                      {/* Client Quick Link */}
                      {activity.clientName && (
                        clientUrl ? (
                          <Link 
                            to={clientUrl}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark hover:underline transition-colors"
                          >
                            Dashboard: {activity.clientName}
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-text-secondary font-semibold bg-border-main/20 px-2 py-0.5 rounded-md">
                            Cliente: {activity.clientName}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Icon of Action category */}
                  <div className="flex-shrink-0 self-start bg-border-main/30 w-9 h-9 rounded-xl flex items-center justify-center border border-border-main/20">
                    {getActivityIcon(activity.action, activity.status)}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
};
