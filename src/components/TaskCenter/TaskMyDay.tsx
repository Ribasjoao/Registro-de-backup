import React, { useMemo } from 'react';
import { 
  AlertCircle, 
  Clock, 
  Zap, 
  ShieldAlert, 
  PauseCircle, 
  CheckCircle2,
  CalendarDays,
  Presentation,
  Flag,
  Inbox
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';

interface TaskMyDayProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onAddNew: (initialValues?: Partial<Task>) => void;
}

export function TaskMyDay({ tasks, onUpdateTask, onEditTask, onAddNew }: TaskMyDayProps) {
  const now = new Date();
  const isFriday = now.getDay() === 5;

  const sections = useMemo(() => {
    const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now);
    const critical = tasks.filter(t => t.status !== 'done' && t.priority === 'critical');
    const today = tasks.filter(t => t.status === 'today' || t.status === 'doing');
    const blocked = tasks.filter(t => t.status === 'blocked');
    const waiting = tasks.filter(t => t.status === 'waiting');
    const followup = tasks.filter(t => t.status !== 'done' && t.type === 'follow_up');
    const presentation = tasks.filter(t => t.type === 'apresentacao' || t.tags?.includes('apresentação'));
    const inbox = tasks.filter(t => t.status === 'inbox');

    return { overdue, critical, today, blocked, waiting, followup, presentation, inbox };
  }, [tasks]);

  const hasUrgent = sections.overdue.length > 0 || sections.critical.length > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Alerts & Operational Queue */}
      <div className="xl:col-span-8 space-y-8">
        
        {/* Urgent Panel */}
        {hasUrgent && (
          <section className="bg-danger/5 border border-danger/20 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShieldAlert className="w-6 h-6 text-danger" />
              <h2 className="text-lg font-black text-danger uppercase tracking-tighter">Prioridade Imediata</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...sections.overdue, ...sections.critical].slice(0, 4).map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdateTask={onUpdateTask} 
                  onEditTask={onEditTask} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Queue */}
        <section className="bg-bg-card border border-border-main rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-bold text-text-main">Fila do Dia</h2>
            </div>
            <button 
              onClick={() => onAddNew({ status: 'today' })}
              className="text-xs font-bold text-brand hover:underline"
            >
              + Adicionar Item Hoje
            </button>
          </div>

          <div className="space-y-4">
            {sections.today.length > 0 ? sections.today.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onUpdateTask={onUpdateTask} 
                onEditTask={onEditTask} 
              />
            )) : (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-success/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-text-main uppercase">Tudo limpo por aqui!</p>
                <p className="text-xs text-text-secondary mt-1">Nenhuma tarefa ativa na fila de hoje.</p>
              </div>
            )}
          </div>
        </section>

        {/* Caixa de Entrada (Inbox) */}
        {sections.inbox.length > 0 && (
          <section className="bg-bg-card border border-border-main rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Inbox className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h2 className="text-xl font-bold text-text-main">Caixa de Entrada (Inbox)</h2>
              </div>
              <span className="text-xs text-indigo-500 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl uppercase tracking-widest">
                {sections.inbox.length} {sections.inbox.length === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.inbox.map(task => (
                <div key={task.id} className="relative group">
                  <TaskItem 
                    task={task} 
                    onUpdateTask={onUpdateTask} 
                    onEditTask={onEditTask} 
                    compact
                  />
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateTask(task.id, { status: 'today' });
                      }}
                      className="px-2.5 py-1.5 text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                      title="Mover tarefa para a fila de hoje"
                    >
                      Mover p/ Hoje
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Incidents & Follow-ups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card p-6 border-t-4 border-t-warning">
            <h3 className="text-xs font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              Follow-ups Pendentes
            </h3>
            <div className="space-y-3">
              {sections.followup.slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} onUpdateTask={onUpdateTask} onEditTask={onEditTask} compact />
              ))}
              {sections.followup.length === 0 && <p className="text-[10px] italic text-text-secondary">Nenhum follow-up registrado.</p>}
            </div>
          </section>

          <section className="card p-6 border-t-4 border-t-brand">
            <h3 className="text-xs font-black text-text-main uppercase tracking-widest mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-brand" />
              Planos de Ação
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => t.type === 'plano_de_acao' && t.status !== 'done').slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} onUpdateTask={onUpdateTask} onEditTask={onEditTask} compact />
              ))}
              {tasks.filter(t => t.type === 'plano_de_acao' && t.status !== 'done').length === 0 && <p className="text-[10px] italic text-text-secondary">Nenhum plano de ação ativo.</p>}
            </div>
          </section>
        </div>
      </div>

      {/* Right Column: Status Summary & Presentation Prep */}
      <div className="xl:col-span-4 space-y-6">
        {/* Presentation Card */}
        <section className={cn(
          "bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden",
          !isFriday && "opacity-90"
        )}>
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-3 mb-6">
            <Presentation className="w-6 h-6" />
            <div>
              <h2 className="text-base font-black uppercase tracking-tighter">Resumo de Sexta</h2>
              <p className="text-[10px] opacity-70 font-medium">Itens para a diretoria</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {sections.presentation.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-xs font-bold bg-white/10 p-2 rounded-lg border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                <span className="truncate">{task.title}</span>
              </div>
            ))}
            {sections.presentation.length === 0 && (
              <p className="text-[10px] italic opacity-60 text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                Nenhuma tarefa marcada para apresentação.
              </p>
            )}
          </div>

          <button 
            onClick={() => onAddNew({ type: 'apresentacao' })}
            className="w-full py-3 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Adicionar ao Resumo
          </button>
        </section>

        {/* Blocked Items */}
        <section className="bg-bg-card border border-border-main rounded-3xl p-6">
          <h3 className="text-xs font-black text-text-main uppercase tracking-widest mb-6 flex items-center gap-2">
            <PauseCircle className="w-4 h-4 text-danger" />
            Bloqueados / Aguardando
          </h3>
          <div className="space-y-4">
            {[...sections.blocked, ...sections.waiting].map(task => (
              <TaskItem key={task.id} task={task} onUpdateTask={onUpdateTask} onEditTask={onEditTask} compact />
            ))}
            {sections.blocked.length === 0 && sections.waiting.length === 0 && (
              <p className="text-xs text-text-secondary italic text-center py-4">Nenhum item bloqueado.</p>
            )}
          </div>
        </section>

        {/* Operational Stats Widget */}
        <section className="card p-6 bg-slate-950 text-white">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="w-4 h-4 text-brand-dark" />
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Status da Semana</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-black">{tasks.filter(t => t.status === 'done').length}</div>
              <div className="text-[9px] font-bold opacity-40 uppercase">Concluídas</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-danger">{sections.overdue.length}</div>
              <div className="text-[9px] font-bold opacity-40 uppercase">Atrasadas</div>
            </div>
            <div className="space-y-1 border-t border-white/10 pt-3">
              <div className="text-2xl font-black text-warning">{sections.waiting.length}</div>
              <div className="text-[9px] font-bold opacity-40 uppercase">Pendências</div>
            </div>
            <div className="space-y-1 border-t border-white/10 pt-3">
              <div className="text-2xl font-black text-brand-dark">{tasks.filter(t => t.type === 'incidente' && t.status !== 'done').length}</div>
              <div className="text-[9px] font-bold opacity-40 uppercase">Incidentes</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
