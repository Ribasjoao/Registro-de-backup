import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Link as LinkIcon, 
  CheckCircle2, 
  Circle,
  Calendar,
  User,
  Tags,
  RefreshCw,
  Crown,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Edit,
  Star
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
  const [isExpanded, setIsExpanded] = useState(false);
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

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={cn(
        "group relative bg-bg-card border rounded-2xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer select-none",
        task.isGolden 
          ? "border-amber-400 bg-amber-500/[0.03] dark:bg-amber-400/[0.01] hover:shadow-amber-500/5 hover:border-amber-400" 
          : "border-border-main hover:border-brand/40",
        task.status === 'done' && "opacity-60",
        task.status === 'blocked' && "border-danger/30 bg-danger/[0.02]",
        task.status === 'waiting' && "border-warning/30 bg-warning/[0.02]"
      )}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-3">
        {/* Top title and status checkbox */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask(task.id, { status: task.status === 'done' ? 'inbox' : 'done' });
              }}
              className="mt-0.5 flex-shrink-0 text-text-secondary hover:text-brand transition-colors cursor-pointer"
            >
              {task.status === 'done' ? (
                <CheckCircle2 className="w-5 h-5 text-success fill-success/10" />
              ) : (
                <Circle className="w-5 h-5 text-text-secondary/40" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-bold text-text-main line-clamp-2 leading-snug tracking-tight",
                task.status === 'done' && "line-through text-text-secondary"
              )}>
                {task.title}
              </h3>
              {task.relatedClient && (
                <span className="text-[9px] font-black tracking-tight text-brand uppercase bg-brand/5 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {task.relatedClient}
                </span>
              )}
            </div>
          </div>

          {/* Right quick flags (Golden Task etc.) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {task.isGolden && (
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20 animate-pulse" />
            )}
            {task.important && (
              <Star className="w-4 h-4 text-purple-500 fill-purple-500/20" />
            )}
            <div className="p-0.5 text-text-secondary/40 hover:text-text-main rounded-md transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Minimal Subrow: Priority & Due Date (and Focus display) */}
        <div className="flex items-center justify-between text-[11px] text-text-secondary font-semibold shrink-0">
          <div className="flex items-center gap-2">
            {priority && (
              <span className={cn("font-black uppercase tracking-widest", priority.color)}>
                {priority.label}
              </span>
            )}
            {task.type && (
              <span className="bg-bg-main px-1.5 py-0.5 rounded text-[9px] font-bold text-text-secondary uppercase">
                {type?.label || task.type}
              </span>
            )}
          </div>

          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1.5 font-bold text-xs",
              isOverdue ? "text-danger" : "text-text-secondary"
            )}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            </div>
          )}
        </div>

        {/* Focus Mode Countdown Display (Only if current task status is 'doing') */}
        {task.status === 'doing' && task.duration && task.duration > 0 && secondsLeft !== null && (
          <div 
            className="flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 rounded-xl px-3 py-2 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
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

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div 
            className="mt-2 pt-3 border-t border-border-main/50 space-y-3.5 animate-in slide-in-from-top-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {task.description && (
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Descrição</span>
                <p className="text-text-main text-xs font-semibold leading-relaxed bg-bg-main/30 p-2.5 rounded-xl border border-border-main/20">
                  {task.description}
                </p>
              </div>
            )}

            {/* Checklist inside */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="space-y-2 bg-bg-main/30 p-3 rounded-2xl border border-border-main/20">
                <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Checklist de Passos</span>
                <div className="space-y-1.5">
                  {task.checklist.map((item) => (
                    <label 
                      key={item.id} 
                      className="flex items-center gap-2.5 font-bold cursor-pointer hover:text-text-main text-xs text-text-secondary select-none"
                    >
                      <input 
                        type="checkbox" 
                        checked={item.completed}
                        onChange={() => {
                          const updated = task.checklist?.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
                          onUpdateTask(task.id, { checklist: updated });
                        }}
                        className="rounded accent-brand cursor-pointer h-4 w-4 shrink-0 transition-all border-border-main"
                      />
                      <span className={cn(item.completed && "line-through text-text-secondary/65 font-medium")}>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags list */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-bg-main border border-border-main text-text-secondary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Expanded footer links / detailed operations */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-main/30 pt-3 text-[10px] text-text-secondary font-bold">
              <div className="flex flex-wrap items-center gap-2">
                {task.owner && (
                  <span className="flex items-center gap-1 bg-bg-main px-2 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5" /> {task.owner}
                  </span>
                )}
                {task.duration ? (
                  <span className="flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" /> Est. {task.duration}m
                  </span>
                ) : null}
              </div>

              {/* Edit Modal Launcher button */}
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="py-1.5 px-3 rounded-xl bg-brand/10 text-brand border border-brand/20 hover:bg-brand hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Editar Detalhes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
