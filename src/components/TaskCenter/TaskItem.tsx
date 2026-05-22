import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Link as LinkIcon, 
  CheckCircle2, 
  Circle,
  MoreVertical,
  Calendar,
  User,
  Tags,
  RefreshCw,
  Crown,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task } from '../../types';
import { TASK_TYPES, TASK_PRIORITIES } from '../../lib/taskService';

interface TaskItemProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  compact?: boolean;
}

export function TaskItem({ task, onUpdateTask, onEditTask, compact = false }: TaskItemProps) {
  const type = TASK_TYPES.find(t => t.value === task.type);
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority);
  
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  // Pomodoro Focus Mode Local Timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (task.status === 'doing' && task.duration && task.duration > 0) {
      if (secondsLeft === null) {
        setSecondsLeft(task.duration * 60);
        setIsTimerRunning(true);
      }
    } else {
      setSecondsLeft(null);
      setIsTimerRunning(false);
    }
  }, [task.status, task.duration]);

  useEffect(() => {
    if (!isTimerRunning || secondsLeft === null || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={cn(
        "group relative bg-bg-card border border-border-main rounded-xl p-4 hover:shadow-lg hover:border-brand/30 transition-all cursor-pointer",
        task.isGolden && "border-amber-400 dark:border-amber-400/50 bg-amber-500/[0.04] dark:bg-amber-400/[0.02] hover:border-amber-400 hover:shadow-amber-500/5",
        task.status === 'done' && "opacity-60",
        task.status === 'blocked' && "border-danger/30 bg-danger/[0.02]",
        task.status === 'waiting' && "border-warning/30 bg-warning/[0.02]"
      )}
      onClick={() => onEditTask(task)}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Status & Priority WITH Golden Task Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask(task.id, { status: task.status === 'done' ? 'inbox' : 'done' });
              }}
              className="mt-1 flex-shrink-0 text-text-secondary hover:text-brand transition-colors"
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="w-5 h-5 text-success fill-success/10" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-bold text-text-main line-clamp-2 leading-snug",
                task.status === 'done' && "line-through text-text-secondary"
              )}>
                {task.title}
              </h3>
              {task.relatedClient && (
                <p className="text-[10px] font-black text-brand uppercase tracking-tighter mt-0.5">
                  {task.relatedClient}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask(task.id, { isGolden: !task.isGolden });
              }}
              className={cn(
                "p-1 rounded hover:bg-bg-main transition-colors",
                task.isGolden ? "text-amber-500" : "text-text-secondary opacity-30 group-hover:opacity-100"
              )}
              title={task.isGolden ? "Remover destaque de Tarefa de Ouro" : "Marcar como Tarefa de Ouro"}
            >
              <Crown className={cn("w-4 h-4", task.isGolden && "fill-amber-500 text-amber-500 animate-pulse")} />
            </button>
            <div className={cn("text-[10px] font-black uppercase tracking-widest", priority?.color)}>
              {priority?.label}
            </div>
          </div>
        </div>

        {/* Focus Mode Countdown Display */}
        {task.status === 'doing' && task.duration && task.duration > 0 && secondsLeft !== null && (
          <div 
            className="mt-1 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 rounded-lg px-3 py-2 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-white" />}
              </button>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                {formatTime(secondsLeft)}
              </span>
            </div>
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" /> Modo Foco
            </span>
          </div>
        )}

        {/* Info Rows */}
        {!compact && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {task.type && (
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full", type?.color)} />
                <span className="text-[10px] font-bold text-text-secondary uppercase">{type?.label}</span>
              </div>
            )}
            
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] font-bold",
                isOverdue ? "text-danger" : "text-text-secondary"
              )}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
            )}

            {task.relatedBackupId && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand">
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">Incident Linked</span>
              </div>
            )}

            {task.owner && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary">
                <User className="w-3.5 h-3.5" />
                <span>{task.owner}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer: Tags & Indicators */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1">
            {task.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-bg-main border border-border-main text-[9px] font-bold text-text-secondary uppercase">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {task.status === 'blocked' && (
              <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
            )}
            {task.recurrence?.type !== 'none' && (
              <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
            )}
            {task.checklist && task.checklist.length > 0 && (
              <div className="text-[9px] font-black text-text-secondary bg-bg-main px-1 rounded border border-border-main">
                {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
