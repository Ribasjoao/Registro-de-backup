import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Transition,
} from 'motion/react';
import { 
  Crown, 
  Clock, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  User, 
  Sparkles, 
  Flame, 
  Circle, 
  Calendar,
  AlertTriangle,
  Plus,
  BookOpen,
  Brain,
  Target,
  Wrench,
  Footprints
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../../lib/utils';
import { Task, TaskPriority, TaskType, TaskStatus } from '../../types';

interface CardSwipeProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onAddNew: (initialValues?: Partial<Task>) => void;
}

const ITEM_WIDTH = 320;
const GAP = 16;
const CONTAINER_WIDTH = ITEM_WIDTH + GAP;
const DRAG_BUFFER = 50;
const VELOCITY_THRESHOLD = 500;

const SPRING_OPTIONS: Transition = {
  type: 'spring',
  stiffness: 330,
  damping: 30,
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'rotina':
      return BookOpen;
    case 'incidente':
      return Brain;
    case 'plano_de_acao':
      return Target;
    case 'follow_up':
      return Footprints;
    case 'melhoria':
      return Wrench;
    case 'apresentacao':
      return Sparkles;
    default:
      return BookOpen;
  }
};

const getPriorityLabel = (p: string) => {
  switch (p) {
    case 'critical': return 'Crítico';
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
    default: return p;
  }
};

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'medium': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'low': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
  }
};

interface CarouselCardProps {
  task: Task;
  index: number;
  x: ReturnType<typeof useMotionValue<number>>;
  itemCount: number;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
}

const CarouselCard: React.FC<CarouselCardProps> = ({
  task,
  index,
  x,
  itemCount,
  onUpdateTask,
  onEditTask,
}) => {
  const nextIndex = Math.min(index + 1, itemCount - 1);
  const prevIndex = Math.max(index - 1, 0);

  const range = [
    (-100 * (index + 1) * CONTAINER_WIDTH) / 100,
    (-100 * index * CONTAINER_WIDTH) / 100,
    (-100 * (index - 1) * CONTAINER_WIDTH) / 100,
  ];
  const outputRange = [nextIndex ? 90 : 90, 0, prevIndex ? -90 : -90];

  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  // Focus mode / Pomodoro timers standard setup
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

  const IconComponent = getIconForType(task.type);

  // Trigger confetti and update to 'done' status
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(task.id, { completed: true, status: 'done' });
    
    // Blast confetti!
    try {
      confetti({
        particleCount: 150,
        spread: 85,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.warn('Confetti error: ', err);
    }
  };

  const handleToggleGolden = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(task.id, { isGolden: !task.isGolden });
  };

  const handleToggleFocusedMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'doing' ? 'today' : 'doing';
    onUpdateTask(task.id, { status: newStatus });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <motion.div
      style={{
        width: ITEM_WIDTH,
        height: 450,
        rotateY,
        flexShrink: 0,
      }}
      transition={SPRING_OPTIONS}
      className={cn(
        "relative flex flex-col justify-between rounded-[32px] border-[1.6px] p-7 transition-all bg-bg-card active:cursor-grabbing select-none cursor-grab",
        task.isGolden 
          ? "border-amber-400 shadow-[0_8px_30px_rgba(245,158,11,0.15)] ring-1 ring-amber-400 bg-gradient-to-b from-amber-500/[0.04] to-transparent" 
          : "border-border-main hover:border-brand/40 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
      )}
      onClick={() => onEditTask(task)}
    >
      <div>
        {/* Top bar with icon and special actions */}
        <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[20px] border-[1.6px] transition-colors shadow-sm",
            task.isGolden 
              ? "border-amber-400 bg-amber-500/10 text-amber-500" 
              : "border-border-main bg-bg-main text-brand"
          )}>
            <IconComponent
              className="w-7 h-7"
              strokeWidth={1.8}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Golden task button */}
            <button
              onClick={handleToggleGolden}
              className={cn(
                "p-2 rounded-xl border transition-all cursor-pointer",
                task.isGolden 
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-500" 
                  : "border-border-main bg-bg-main text-text-secondary opacity-50 hover:opacity-100 hover:text-amber-500"
              )}
              title={task.isGolden ? "Remover status de Ouro" : "Marcar como Tarefa de Ouro!"}
            >
              <Crown className={cn("w-4 h-4", task.isGolden && "fill-amber-500 animate-pulse")} />
            </button>
          </div>
        </div>

        {/* Client & Golden badge */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {task.relatedClient && (
            <span className="text-[10px] font-black tracking-widest text-brand uppercase bg-brand/5 px-2 py-0.5 rounded-md">
              {task.relatedClient}
            </span>
          )}
          {task.isGolden && (
            <span className="flex items-center gap-1 text-[9px] font-extrabold tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md uppercase">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" /> Tarefa de Ouro (+50 XP)
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={cn(
          "text-xl font-black font-heading text-text-main leading-tight mb-2 tracking-tight line-clamp-2",
          task.isGolden && "text-amber-500 dark:text-amber-400"
        )}>
          {task.title}
        </h2>

        {/* Description */}
        <p className="text-text-secondary text-xs leading-relaxed font-medium mb-3 line-clamp-3">
          {task.description || "Nenhuma descrição informada para esta tarefa."}
        </p>

        {/* Priority & Type tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
            getPriorityColor(task.priority)
          )}>
            {getPriorityLabel(task.priority)}
          </span>
          <span className="text-[9px] font-bold text-text-secondary uppercase bg-bg-main border border-border-main px-2 py-0.5 rounded-full">
            {task.type.replace('_', ' ')}
          </span>
          {task.duration && (
            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> {task.duration} min
            </span>
          )}
        </div>

        {/* Pomodoro Timer if active ('doing') */}
        {task.status === 'doing' && task.duration && task.duration > 0 && secondsLeft !== null && (
          <div 
            className="flex items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-2.5 text-xs select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center cursor-pointer"
              >
                {isTimerRunning ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white" />}
              </button>
              <span className="font-mono font-black text-lg text-amber-600 dark:text-amber-400 animate-pulse tracking-wide">
                {formatTime(secondsLeft)}
              </span>
            </div>
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Flame className="w-4-h-4 text-amber-500 fill-amber-500 animate-bounce" /> Modo Foco Ativo
            </span>
          </div>
        )}
      </div>

      {/* Action buttons footer */}
      <div className="flex gap-2 items-center w-full pt-4 mt-auto border-t border-border-main/50" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleToggleFocusedMode}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs tracking-tight transition-all active:scale-95 cursor-pointer border",
            task.status === 'doing'
              ? "bg-bg-main text-text-secondary border-border-main hover:text-text-main"
              : "bg-teal-500 hover:bg-teal-600 text-white border-transparent"
          )}
        >
          {task.status === 'doing' ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pausar Foco
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" /> Iniciar Foco
            </>
          )}
        </button>

        <button
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20 text-white py-3 rounded-2xl font-black text-xs tracking-tight transition-all active:scale-95 cursor-pointer border border-transparent shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
        </button>
      </div>
    </motion.div>
  );
};

export const CardSwipe: React.FC<CardSwipeProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onAddNew,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'doing' | 'today' | 'inbox'>('all');

  const x = useMotionValue(0);

  // Filter Tasks down to outstanding (not completed) that match status filters
  const activeTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'done') return false;
      if (selectedStatus === 'all') return true;
      return t.status === selectedStatus;
    });
  }, [tasks, selectedStatus]);

  // Reset index if tasks list updates/refilters to prevent out of bounds
  useEffect(() => {
    setCurrentIndex(prev => {
      if (activeTasks.length === 0) return 0;
      return Math.min(prev, activeTasks.length - 1);
    });
  }, [activeTasks.length]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.min(prev + 1, activeTasks.length - 1));
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, activeTasks.length - 1));
  };

  const prevCard = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const leftConstraint = -((ITEM_WIDTH + GAP) * (activeTasks.length - 1));

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto py-6">
      
      {/* Visual Controls/Filters on the upper panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full h-auto bg-bg-card border border-border-main rounded-2xl p-4 mb-8 gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-text-secondary uppercase select-none tracking-widest">Aba:</span>
          <div className="flex bg-bg-main p-0.5 rounded-lg border border-border-main">
            {(['all', 'doing', 'today'] as const).map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "px-3 py-1 text-[10px] uppercase font-black tracking-wider transition-all rounded cursor-pointer",
                  selectedStatus === status 
                    ? "bg-brand text-white shadow-sm" 
                    : "text-text-secondary hover:text-text-main"
                )}
              >
                {status === 'all' ? 'Abertas' : status === 'doing' ? 'Foco' : 'Hoje'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-right flex items-center gap-3">
          <div className="text-xs font-bold text-text-secondary">
            {activeTasks.length > 0 ? (
              <span>Card <strong className="text-text-main font-black">{currentIndex + 1}</strong> de <strong className="text-text-main font-black">{activeTasks.length}</strong></span>
            ) : (
              <span>0 Tarefas encontradas</span>
            )}
          </div>
          
          <button
            onClick={() => onAddNew({ status: selectedStatus !== 'all' ? selectedStatus : 'today' })}
            className="flex items-center justify-center gap-1 text-[10px] font-black text-brand uppercase bg-brand/5 border border-brand/10 hover:bg-brand/10 px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
      </div>

      {activeTasks.length > 0 ? (
        <div className="flex flex-col items-center justify-center w-full">
          {/* Main 3D Card Stage area */}
          <div className="relative flex items-center justify-center w-full">
            
            {/* Desktop Left navigation arrow */}
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className={cn(
                "hidden sm:flex absolute -left-16 z-20 items-center justify-center w-11 h-11 rounded-full border border-border-main bg-bg-card hover:border-brand/40 shadow-md text-text-secondary hover:text-brand cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              )}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Slider window */}
            <div
              className="relative overflow-visible"
              style={{ width: ITEM_WIDTH, height: 460 }}
            >
              <motion.div
                className="flex"
                drag="x"
                dragConstraints={{ left: leftConstraint, right: 0 }}
                style={{
                  gap: GAP,
                  perspective: 1000,
                  perspectiveOrigin: `${currentIndex * ITEM_WIDTH + ITEM_WIDTH / 2}px center`,
                  x,
                }}
                onDragEnd={handleDragEnd}
                animate={{ x: -(currentIndex * CONTAINER_WIDTH) }}
                transition={SPRING_OPTIONS}
              >
                {activeTasks.map((task, index) => (
                  <CarouselCard
                    key={task.id}
                    task={task}
                    index={index}
                    x={x}
                    itemCount={activeTasks.length}
                    onUpdateTask={onUpdateTask}
                    onEditTask={onEditTask}
                  />
                ))}
              </motion.div>
            </div>

            {/* Desktop Right navigation arrow */}
            <button
              onClick={nextCard}
              disabled={currentIndex === activeTasks.length - 1}
              className={cn(
                "hidden sm:flex absolute -right-16 z-20 items-center justify-center w-11 h-11 rounded-full border border-border-main bg-bg-card hover:border-brand/40 shadow-md text-text-secondary hover:text-brand cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              )}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Dots controller indicator */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-2 max-w-full">
            {activeTasks.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 cursor-pointer rounded-full transition-all duration-300',
                  currentIndex === i 
                    ? 'w-6 bg-brand' 
                    : 'w-2 bg-text-secondary/20 hover:bg-text-secondary/40'
                )}
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
          
          <p className="mt-4 text-[10px] text-text-secondary text-center uppercase tracking-widest select-none">
            Dica: use cliques rápidos ou arraste e solte lateralmente para navegar!
          </p>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-10 bg-bg-card rounded-3xl border border-border-main w-full max-w-md shadow-md animate-in fade-in duration-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 text-brand mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-black text-lg text-text-main tracking-tight">Tudo resolvido!</h3>
          <p className="text-text-secondary text-xs mt-2 max-w-[280px]">
            Nenhuma tarefa pendente nesta visualização. Seus backups e replicação estão totalmente saudáveis.
          </p>
          <button
            onClick={() => onAddNew({ status: selectedStatus !== 'all' ? selectedStatus : 'today' })}
            className="mt-6 flex items-center gap-2 bg-brand text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl hover:scale-105 transition-all shadow shadow-brand/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4.5 h-4.5" /> Criar nova tarefa
          </button>
        </div>
      )}
    </div>
  );
};

export default CardSwipe;
