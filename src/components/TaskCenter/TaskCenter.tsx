import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Star, 
  Crown, 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles, 
  User, 
  Calendar, 
  Tag, 
  Check, 
  Flame, 
  Award,
  ChevronDown, 
  ChevronUp, 
  Info,
  Edit,
  Zap,
  Search,
  X as CloseIcon,
  LayoutGrid,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../../lib/utils';
import { Task, TaskType, TaskStatus, TaskPriority } from '../../types';
import { TaskForm } from './TaskForm';
import { TaskItem } from './TaskItem';
import { TaskKanban } from './TaskKanban';
import { TaskList } from './TaskList';
import { TaskAgenda } from './TaskAgenda';
import { CardSwipe } from './CardSwipe';

interface TaskCenterProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  defaultOwner: string;
}

export function TaskCenter({ tasks, onAddTask, onUpdateTask, onDeleteTask, defaultOwner }: TaskCenterProps) {
  // Simple view variables
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDoneHistory, setShowDoneHistory] = useState(false);
  
  // Navigation & Filtering States
  const [viewMode, setViewMode] = useState<'foco' | 'kanban' | 'lista' | 'agenda' | 'swipe'>('foco');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'important'>('all');

  // Fast Inline Adder State
  const [newTitle, setNewTitle] = useState('');
  const [isGolden, setIsGolden] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [duration, setDuration] = useState<number | ''>('');
  const [relatedClient, setRelatedClient] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('rotina');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [showAdvancedCreator, setShowAdvancedCreator] = useState(false);

  // Focus timers state (stored by taskId: seconds)
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>({});

  // Central Dynamic Search and Quick Filter
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Text Search matching
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch = query === '' || 
        task.title.toLowerCase().includes(query) || 
        (task.description && task.description.toLowerCase().includes(query)) || 
        (task.relatedClient && task.relatedClient.toLowerCase().includes(query)) ||
        (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      // 2. Quick filters
      if (statusFilter === 'pending') {
        return task.status !== 'done' && !task.completed;
      }
      if (statusFilter === 'completed') {
        return task.status === 'done' || task.completed;
      }
      if (statusFilter === 'important') {
        return task.important || task.isGolden;
      }

      return true; // 'all'
    });
  }, [tasks, searchTerm, statusFilter]);

  // Filter out tasks relative to search/filter limits
  const pendingTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.status !== 'done' && !t.completed)
      .sort((a, b) => {
        // Golden tasks first, then by date created
        if (a.isGolden && !b.isGolden) return -1;
        if (!a.isGolden && b.isGolden) return 1;
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
  }, [filteredTasks]);

  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter(t => t.status === 'done' || t.completed)
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [filteredTasks]);

  // Handle active focus tasks
  const activeFocusTasks = useMemo(() => {
    return pendingTasks.filter(t => t.status === 'doing');
  }, [pendingTasks]);

  // Synchronize focus timers when tasks load/change to status 'doing'
  useEffect(() => {
    const updatedTimers = { ...timers };
    pendingTasks.forEach(task => {
      if (task.status === 'doing' && task.duration && task.duration > 0) {
        if (updatedTimers[task.id] === undefined) {
          updatedTimers[task.id] = task.duration * 60;
        }
      }
    });
    setTimers(updatedTimers);
  }, [pendingTasks]);

  // Active timer ticks
  useEffect(() => {
    const activeTasks = pendingTasks.filter(t => t.status === 'doing' && runningTimers[t.id]);
    if (activeTasks.length === 0) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        let stateChanged = false;

        activeTasks.forEach(task => {
          if (next[task.id] !== undefined && next[task.id] > 0) {
            next[task.id] -= 1;
            stateChanged = true;
          } else if (next[task.id] === 0) {
            // Timer finished
            setRunningTimers(prevRunning => ({ ...prevRunning, [task.id]: false }));
          }
        });

        return stateChanged ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingTasks, runningTimers]);

  // Handle rapid task addition
  const handleFastAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const taskData: Partial<Task> = {
      title: newTitle.trim(),
      description: '',
      completed: false,
      status: 'inbox',
      type: taskType,
      priority: taskPriority,
      important: isImportant,
      isGolden: isGolden,
      duration: duration || 0,
      relatedClient: relatedClient.trim() || '',
      source: 'manual',
      owner: defaultOwner
    };

    onAddTask(taskData);

    // Reset clean fields
    setNewTitle('');
    setIsGolden(false);
    setIsImportant(false);
    setDuration('');
    setRelatedClient('');
    setTaskType('rotina');
    setTaskPriority('medium');
    setShowAdvancedCreator(false);

    // Short success vibe
    try {
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 }
      });
    } catch {}
  };

  // Toggle complete with clean fireworks confetti
  const handleToggleComplete = (task: Task) => {
    const nextCompleted = !task.completed;
    
    if (nextCompleted) {
      try {
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.5 }
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }
    }

    onUpdateTask(task.id, {
      completed: nextCompleted,
      status: nextCompleted ? 'done' : 'today'
    });
  };

  // Format countdown clock
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-500 pb-16">
      
      {/* Top Title/Intro Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-main/50 pb-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-text-main tracking-tight">Registro de Backup & Tarefas</h1>
          <p className="text-xs text-text-secondary mt-1 font-semibold uppercase tracking-wider">
            Consulte e organize suas pendências de infraestrutura de forma ágil e acumule XP
          </p>
        </div>
        
        {/* Simple XP reference legends for quick view */}
        <div className="flex flex-wrap items-center gap-3 bg-bg-card/50 border border-border-main p-2 rounded-2xl">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-extrabold uppercase tracking-widest">
            <Crown className="w-3.5 h-3.5 fill-orange-500" /> Ouro +50 XP
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 text-purple-500 text-[10px] font-extrabold uppercase tracking-widest">
            <Star className="w-3.5 h-3.5 fill-purple-500" /> Star +25 XP
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 text-teal-500 text-[10px] font-extrabold uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" /> Foco +15 XP
          </div>
        </div>
      </div>

      {/* 1. FAST INLINE TASK ADDER ROW (The "Lugar para Anotar Tarefa") */}
      <form onSubmit={handleFastAdd} className="bg-bg-card border border-border-main rounded-3xl p-5 shadow-sm transition-all focus-within:border-brand/50">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-lg bg-brand/10 text-brand">
              <Plus className="w-5 h-5 font-black" />
            </div>
            <input
              type="text"
              placeholder="O que precisa ser feito hoje? Digite aqui e aperte Enter..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-bg-main border border-border-main rounded-2xl pl-12 pr-4 py-3.5 font-sans font-bold text-sm text-text-main placeholder:text-text-secondary/40 outline-none focus:border-brand/80 focus:ring-1 focus:ring-brand/30 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedCreator(!showAdvancedCreator)}
              className={cn(
                "p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                showAdvancedCreator 
                  ? "bg-brand/15 border-brand/30 text-brand" 
                  : "bg-bg-main border-border-main text-text-secondary hover:text-text-main"
              )}
            >
              Opções
              {showAdvancedCreator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="flex-1 md:flex-none justify-center px-6 py-3.5 rounded-2xl bg-brand hover:bg-brand-dark disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md select-none active:scale-95 flex items-center gap-2"
            >
              Anotar
            </button>
          </div>
        </div>

        {/* Advanced Options Bar (Slide Down) */}
        {showAdvancedCreator && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border-main/50 animate-in slide-in-from-top duration-300">
            
            {/* Golden task selector */}
            <button
              type="button"
              onClick={() => {
                setIsGolden(!isGolden);
                if (!isGolden) setIsImportant(false);
              }}
              className={cn(
                "p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer select-none",
                isGolden
                  ? "border-amber-400 bg-amber-500/10 text-amber-500 shadow-md"
                  : "border-border-main bg-bg-main/50 text-text-secondary hover:border-amber-400/50 hover:text-amber-500"
              )}
            >
              <Crown className={cn("w-4 h-4", isGolden && "fill-amber-500 animate-pulse")} />
              👑 Tarefa de Ouro
            </button>

            {/* Important task selector */}
            <button
              type="button"
              onClick={() => {
                setIsImportant(!isImportant);
                if (!isImportant) setIsGolden(false);
              }}
              className={cn(
                "p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer select-none",
                isImportant
                  ? "border-purple-400 bg-purple-500/10 text-purple-500 shadow-md"
                  : "border-border-main bg-bg-main/50 text-text-secondary hover:border-purple-400/50 hover:text-purple-500"
              )}
            >
              <Star className={cn("w-4 h-4", isImportant && "fill-purple-500")} />
              ⭐ Importante
            </button>

            {/* Duration / Focus Timer minutes */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="number"
                placeholder="Foco (minutos)"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))}
                className="w-full bg-bg-main border border-border-main rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-text-main outline-none focus:border-brand"
              />
            </div>

            {/* Related Contract / Client */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Cliente (opcional)"
                value={relatedClient}
                onChange={(e) => setRelatedClient(e.target.value)}
                className="w-full bg-bg-main border border-border-main rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-text-main outline-none focus:border-brand"
              />
            </div>

            {/* Type selector */}
            <div>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full bg-bg-main border border-border-main rounded-xl p-3 text-xs font-bold text-text-main outline-none focus:border-brand cursor-pointer"
              >
                <option value="rotina">📅 Rotina</option>
                <option value="incidente">🚨 Incidente</option>
                <option value="plano_de_acao">⚔️ Plano de Ação</option>
                <option value="melhoria">💡 Melhoria</option>
                <option value="follow_up">📞 Follow-Up</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {/* 2. NAVIGATION AND SEARCH/FILTER CONTROLS BAR */}
      <div className="bg-bg-card border border-border-main rounded-3xl p-5 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-main/50 pb-4">
          <button
            type="button"
            onClick={() => setViewMode('foco')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95",
              viewMode === 'foco'
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "bg-bg-main/50 hover:bg-bg-main text-text-secondary hover:text-text-main border border-border-main/40"
            )}
          >
            <Zap className="w-4 h-4" />
            Painel Operacional
          </button>
          
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95",
              viewMode === 'kanban'
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "bg-bg-main/50 hover:bg-bg-main text-text-secondary hover:text-text-main border border-border-main/40"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Quadro Kanban
          </button>

          <button
            type="button"
            onClick={() => setViewMode('lista')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95",
              viewMode === 'lista'
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "bg-bg-main/50 hover:bg-bg-main text-text-secondary hover:text-text-main border border-border-main/40"
            )}
          >
            <Layers className="w-4 h-4" />
            Lista & Agrupamentos
          </button>

          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95",
              viewMode === 'agenda'
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "bg-bg-main/50 hover:bg-bg-main text-text-secondary hover:text-text-main border border-border-main/40"
            )}
          >
            <Calendar className="w-4 h-4" />
            Agenda Semanal
          </button>

          <button
            type="button"
            onClick={() => setViewMode('swipe')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95",
              viewMode === 'swipe'
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "bg-bg-main/50 hover:bg-bg-main text-text-secondary hover:text-text-main border border-border-main/40"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Swipe de Cartões
          </button>
        </div>

        {/* Search & Filter Buttons Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
            <input
              type="text"
              placeholder="Pesquise por autor, título, descrição, cliente ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-main border border-border-main rounded-2xl pl-11 pr-10 py-3 text-xs font-semibold text-text-main placeholder:text-text-secondary/40 outline-none focus:border-brand/70 focus:ring-1 focus:ring-brand/20 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-secondary hover:text-text-main hover:bg-bg-main/80 transition-colors"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black text-text-secondary uppercase mr-2 tracking-wider">Filtro rápido:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95",
                statusFilter === 'all'
                  ? "bg-brand/10 text-brand border border-brand/25"
                  : "bg-bg-main border border-border-main text-text-secondary hover:text-text-main"
              )}
            >
              Todas
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95",
                statusFilter === 'pending'
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-450 border border-orange-500/25"
                  : "bg-bg-main border border-border-main text-text-secondary hover:text-text-main"
              )}
            >
              Pendentes
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95",
                statusFilter === 'completed'
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25"
                  : "bg-bg-main border border-border-main text-text-secondary hover:text-text-main"
              )}
            >
              Concluídas
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('important')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5",
                statusFilter === 'important'
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25"
                  : "bg-bg-main border border-border-main text-text-secondary hover:text-text-main"
              )}
            >
              <Star className="w-3.5 h-3.5 fill-purple-500/10 text-purple-500" />
              Importantes
            </button>
          </div>
        </div>
      </div>

      {/* 3. CONDITIONAL RENDER ACCORDING TO VIEW MODE */}
      <div className="min-h-[400px]">
        {viewMode === 'foco' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
            
            {/* LEFT COLUMN: ACTIVE TASKS (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-black text-text-main flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand" />
                  Filtradas no Painel ({pendingTasks.length})
                </h2>
              </div>

              {pendingTasks.length > 0 ? (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-fine-scrollbar pb-6">
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdateTask={onUpdateTask}
                      onEditTask={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-card/50 border border-border-main rounded-3xl">
                  <div className="p-3 bg-brand/10 border border-brand/20 text-brand rounded-2xl mb-4">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-black text-sm text-text-main">Vazio ou Reduzido!</h3>
                  <p className="text-text-secondary text-xs mt-1 max-w-[280px]">
                    Nenhuma tarefa operacional pendente que corresponda aos filtros e busca ativos.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: FOCUSED WORK POMODORO / ACTIVE TIMERS (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-lg font-heading font-black text-text-main flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                Trabalho Focado & Cronômetro
              </h2>

              {activeFocusTasks.length > 0 ? (
                <div className="space-y-4">
                  {activeFocusTasks.map(task => {
                    const secondsLeft = timers[task.id] ?? 0;
                    const isTimerRunning = runningTimers[task.id] ?? false;
                    
                    // Calculate percentage
                    const totalSecs = (task.duration || 1) * 60;
                    const pctLeft = (secondsLeft / totalSecs) * 100;

                    return (
                      <div 
                        key={task.id}
                        className="p-6 bg-gradient-to-b from-amber-500/[0.05] to-transparent border border-amber-500/25 rounded-3xl shadow-[0_8px_30px_rgba(245,158,11,0.04)] space-y-5"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
                            Modo Foco Em Andamento
                          </div>
                          <h3 className="font-heading font-black text-base text-text-main mt-1 tracking-tight truncate">
                            {task.title}
                          </h3>
                          {task.relatedClient && (
                            <span className="text-[9px] font-black text-brand tracking-wider uppercase mt-1 inline-block">
                              {task.relatedClient}
                            </span>
                          )}
                        </div>

                        {/* Numeric Big Countdown */}
                        <div className="flex flex-col items-center justify-center py-4 bg-bg-main/40 rounded-2xl border border-border-main">
                          <span className="font-mono text-4xl font-extrabold tracking-wider text-amber-600 dark:text-amber-400 animate-pulse">
                            {formatTime(secondsLeft)}
                          </span>
                          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-1">
                            Tempo de Foco Restante
                          </p>
                        </div>

                        {/* Progress indicator bar */}
                        <div className="h-1.5 w-full bg-border-main rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-1000"
                            style={{ width: `${pctLeft}%` }}
                          />
                        </div>

                        {/* Focus Controllers Row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {/* Play/Pause Button */}
                            <button
                              type="button"
                              onClick={() => setRunningTimers(prev => ({ ...prev, [task.id]: !isTimerRunning }))}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90",
                                isTimerRunning 
                                  ? "bg-slate-700 hover:bg-slate-600 text-white" 
                                  : "bg-amber-500 hover:bg-amber-600 text-white"
                              )}
                            >
                              {isTimerRunning ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white" />}
                            </button>

                            {/* Reset duration */}
                            <button
                              type="button"
                              onClick={() => setTimers(prev => ({ ...prev, [task.id]: (task.duration || 0) * 60 }))}
                              className="w-10 h-10 rounded-xl bg-bg-main hover:bg-bg-main/80 border border-border-main flex items-center justify-center transition-all cursor-pointer text-text-secondary font-bold active:scale-90"
                              title="Recomeçar tempo"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>

                          {/* CONCLUDE COMPLETED DIRECTLY button */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className="flex-1 max-w-[200px] bg-brand hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Concluir Foco
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Focus Helper Legend Box */
                <div className="p-6 bg-bg-card/50 border border-border-main rounded-3xl text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-xs text-text-main uppercase tracking-wider">Aumente sua produtividade</h3>
                    <p className="text-text-secondary text-xs max-w-[300px] mx-auto leading-relaxed">
                      Adicione uma duração em minutos a qualquer tarefa e mude o status para em andamento para focar nela com um cronômetro regressivo profissional.
                    </p>
                  </div>
                  
                  <div className="bg-bg-main/50 p-3 rounded-xl border border-border-main text-left text-[11px] space-y-1.5 font-medium text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shrink-0"></span>
                      Garante bônus extra de de <strong className="text-text-main font-bold">+15 XP</strong> se focar por mais de 60 minutos.
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0"></span>
                      Mantém você focado na atividade do momento.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="bg-bg-card border border-border-main rounded-3xl p-6 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-border-main/50 pb-4 mb-6">
              <LayoutGrid className="w-5 h-5 text-brand" />
              <div>
                <h2 className="text-lg font-heading font-black text-text-main tracking-tight uppercase">Quadro Kanban Operacional</h2>
                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest">Organize e monitore seus fluxos de trabalho com drag & drop</p>
              </div>
            </div>
            
            <TaskKanban 
              tasks={filteredTasks} 
              onUpdateTask={onUpdateTask} 
              onEditTask={(task) => { setEditingTask(task); setIsFormOpen(true); }}
              onDeleteTask={onDeleteTask}
            />
          </div>
        )}

        {viewMode === 'lista' && (
          <div className="animate-in fade-in duration-300">
            <TaskList 
              tasks={filteredTasks} 
              onUpdateTask={onUpdateTask} 
              onEditTask={(task) => { setEditingTask(task); setIsFormOpen(true); }}
            />
          </div>
        )}

        {viewMode === 'agenda' && (
          <div className="animate-in fade-in duration-300">
            <TaskAgenda 
              tasks={filteredTasks} 
              viewMode="agenda"
              onUpdateTask={onUpdateTask} 
              onEditTask={(task) => { setEditingTask(task); setIsFormOpen(true); }}
            />
          </div>
        )}

        {viewMode === 'swipe' && (
          <div className="animate-in fade-in duration-300">
            <CardSwipe 
              tasks={filteredTasks} 
              onUpdateTask={onUpdateTask} 
              onEditTask={(task) => { setEditingTask(task); setIsFormOpen(true); }}
              onAddNew={() => setIsFormOpen(true)}
            />
          </div>
        )}
      </div>

      {/* 4. COMPLETED HISTORIC ACCORDION */}
      <div className="bg-bg-card border border-border-main rounded-3xl overflow-hidden mt-4">
        <button
          type="button"
          onClick={() => setShowDoneHistory(!showDoneHistory)}
          className="w-full flex items-center justify-between p-5 bg-bg-main/30 font-heading font-black text-sm text-text-main cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-500" />
            <span>Histórico de Tarefas Concluídas ({completedTasks.length})</span>
          </div>
          {showDoneHistory ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
        </button>

        {showDoneHistory && (
          <div className="p-5 border-t border-border-main/50 space-y-3 max-h-[300px] overflow-y-auto custom-fine-scrollbar animate-in slide-in-from-bottom duration-300">
            {completedTasks.length > 0 ? (
              completedTasks.map(task => {
                // Calculate simulated base XP earned
                let baseXP = 10;
                if (task.isGolden) baseXP = 50;
                else if (task.important) baseXP = 25;
                if (task.duration && task.duration > 60) baseXP += 15;

                return (
                   <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border border-border-main/40 bg-bg-main/10 rounded-xl group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task)}
                        className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 cursor-pointer"
                        title="Reabrir tarefa"
                      >
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </button>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-text-secondary line-through block truncate max-w-sm sm:max-w-md">
                          {task.title}
                        </span>
                        <span className="text-[8px] font-bold text-text-secondary uppercase">
                          {task.type.replace('_', ' ')} • Realizado
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* XP Reward feedback */}
                      <span className="text-[10px] font-black text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/15 uppercase tracking-wider">
                        +{baseXP} XP
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-danger rounded-lg transition-opacity cursor-pointer"
                        title="Deletar histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs font-semibold text-text-secondary py-6 uppercase tracking-widest">
                Nenhuma tarefa operacional concluída ativa sob os filtros atuais.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Task Details Modal (TaskForm) for deep revisions */}
      <TaskForm 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(undefined);
        }}
        onSave={(data) => {
          if (editingTask?.id) {
            onUpdateTask(editingTask.id, data);
          } else {
            onAddTask(data);
          }
          setIsFormOpen(false);
          setEditingTask(undefined);
        }}
        initialData={editingTask}
        defaultOwner={defaultOwner}
      />
    </div>
  );
}
