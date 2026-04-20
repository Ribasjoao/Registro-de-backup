import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  LayoutGrid,
  RefreshCw,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';

interface TaskAgendaProps {
  tasks: Task[];
  viewMode: 'agenda' | 'routines';
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function TaskAgenda({ tasks, viewMode, onEditTask, onUpdateTask }: TaskAgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    // Adjust to Monday
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }, [weekDays]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      map[dateStr] = tasks.filter(t => {
        if (viewMode === 'routines') return t.type === 'rotina';
        if (!t.dueDate) return false;
        return t.dueDate.startsWith(dateStr);
      });
    });
    return map;
  }, [tasks, weekDays, viewMode]);

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(next);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-bg-card border border-border-main rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dynamic Header */}
      <div className="p-6 border-b border-border-main flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-main/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-xl">
            {viewMode === 'agenda' ? <CalendarIcon className="w-5 h-5 text-brand" /> : <RefreshCw className="w-5 h-5 text-brand" />}
          </div>
          <div>
            <h2 className="font-heading font-black text-text-main uppercase tracking-widest text-sm">
              {viewMode === 'agenda' ? 'Agenda de Execução' : 'Plano de Rotinas'}
            </h2>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter">
              {viewMode === 'agenda' ? 'Compromissos e Prazos' : 'Fluxo Recorrente Semanal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-bg-card rounded-xl border border-border-main p-1 shadow-sm">
            <button onClick={() => navigateWeek(-1)} className="p-1.5 text-text-secondary hover:text-brand hover:bg-bg-main rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black px-4 text-text-main min-w-[180px] text-center">
              {weekLabel}
            </span>
            <button onClick={() => navigateWeek(1)} className="p-1.5 text-text-secondary hover:text-brand hover:bg-bg-main rounded-lg transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-bg-card border border-border-main rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-brand hover:border-brand transition-all"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 border-b border-border-main">
        {weekDays.map((day, idx) => {
          const dateStr = day.toISOString().split('T')[0];
          const dayTasks = tasksByDay[dateStr] || [];
          const active = isToday(day);

          return (
            <div key={dateStr} className={cn(
              "flex flex-col min-h-[400px] border-r border-border-main last:border-r-0",
              active && "bg-brand/[0.03] ring-1 ring-brand/20 ring-inset"
            )}>
              {/* Day Header */}
              <div className={cn(
                "p-4 border-b border-border-main flex flex-col items-center gap-1",
                active && "bg-brand/5 border-b-brand/30"
              )}>
                <span className={cn(
                  "text-[10px] font-black tracking-widest uppercase",
                  active ? "text-brand" : "text-text-secondary"
                )}>
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                </span>
                <span className={cn(
                  "text-2xl font-black leading-none",
                  active ? "text-brand" : "text-text-main"
                )}>
                  {day.getDate()}
                </span>
              </div>

              {/* Day Content */}
              <div className="flex-1 p-3 space-y-3">
                {dayTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onEditTask={onEditTask} 
                    onUpdateTask={onUpdateTask}
                    compact 
                  />
                ))}
                
                {dayTasks.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-12 grayscale">
                    <Clock className="w-8 h-8 mb-2" />
                    <span className="text-[10px] font-black uppercase">Vazio</span>
                  </div>
                )}
              </div>

              {/* Day Footer */}
              <div className="p-3 border-t border-border-main/30 flex justify-center">
                <button 
                  onClick={() => onEditTask({ dueDate: `${dateStr}T09:00:00` } as Task)}
                  className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/5 rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
