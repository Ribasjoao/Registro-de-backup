import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Star, 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  LayoutList,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Inbox,
  Play,
  CheckCircle2,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task } from '../types';

interface TodoViewProps {
  tasks: Task[];
  onAddTask: (title: string, important?: boolean, tags?: string[], dueDate?: string, status?: Task['status'], duration?: number) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onToggleImportant: (id: string, important: boolean) => void;
  onDeleteTask: (id: string) => void;
}

// --- Components ---

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DroppableColumn({ id, children, className }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        className,
        isOver && "bg-brand/5 ring-2 ring-brand/20 ring-inset"
      )}
    >
      {children}
    </div>
  );
}

interface SortableTaskProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string, important: boolean) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

function SortableTask({ task, onDelete, onToggleImportant, onToggleTask, onUpdateTask }: SortableTaskProps & { onToggleTask: (id: string, completed: boolean) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'Task',
      task,
    }
  });

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (task.status === 'doing' && task.duration && task.duration > 0) {
      setTimeLeft(task.duration * 60);
    } else {
      setTimeLeft(null);
    }
  }, [task.status, task.duration]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const isDoing = task.status === 'doing';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-bg-card border border-border-main rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand/30 transition-all",
        task.completed && "opacity-60 grayscale-[0.5]",
        isDragging && "cursor-grabbing shadow-2xl border-brand",
        task.isGolden && "border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10",
        isDoing && "scale-[1.02] border-brand shadow-lg ring-2 ring-brand/10 animate-pulse-subtle"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTask(task.id, !task.completed);
            }}
            className={cn(
              "mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
              task.completed ? "bg-green-500 border-green-500 text-white" : "border-border-main hover:border-brand"
            )}
          >
            {task.completed && <Check className="w-3 h-3" />}
          </button>
          
          <div className="flex-1 min-w-0 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <p className={cn(
              "text-sm font-semibold text-text-main leading-tight break-words",
              task.completed && "line-through text-text-secondary",
              task.isGolden && "text-yellow-600 dark:text-yellow-400"
            )}>
              {task.isGolden && "✨ "}{task.title}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask(task.id, { isGolden: !task.isGolden });
              }}
              className={cn(
                "p-1 rounded-md transition-colors",
                task.isGolden ? "text-yellow-500 bg-yellow-500/10" : "text-text-secondary hover:bg-bg-main"
              )}
              title="Tarefa de Ouro"
            >
              <Target className={cn("w-3.5 h-3.5", task.isGolden && "fill-yellow-500")} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleImportant(task.id, !task.important);
              }}
              className={cn(
                "p-1 rounded-md transition-colors",
                task.important ? "text-amber-500 bg-amber-500/10" : "text-text-secondary hover:bg-bg-main"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", task.important && "fill-amber-500")} />
            </button>
          </div>
        </div>

        {isDoing && timeLeft !== null && (
          <div className="flex items-center gap-2 py-1 px-2 bg-brand/10 rounded-lg border border-brand/20">
            <Clock className="w-3 h-3 text-brand animate-pulse" />
            <span className="text-xs font-mono font-bold text-brand">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex flex-wrap gap-1">
            {task.tags?.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded-md bg-brand/5 text-brand text-[9px] font-bold border border-brand/10 uppercase">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {task.duration && (
              <span className="text-[9px] font-bold text-text-secondary bg-bg-main px-1.5 py-0.5 rounded border border-border-main">
                {task.duration}m
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-danger transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main View ---

export function TodoView({ tasks, onAddTask, onUpdateTask, onToggleTask, onToggleImportant, onDeleteTask }: TodoViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState<Task['status'] | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: { id: Task['status']; title: string; icon: any; color: string }[] = [
    { id: 'inbox', title: 'INBOX', icon: Inbox, color: 'text-text-secondary' },
    { id: 'doing', title: 'FAZENDO', icon: Play, color: 'text-brand' },
    { id: 'done', title: 'FEITO', icon: CheckCircle2, color: 'text-success' },
  ];

  const tasksByStatus = useMemo(() => {
    return {
      inbox: tasks.filter(t => t.status === 'inbox' || !t.status),
      doing: tasks.filter(t => t.status === 'doing'),
      done: tasks.filter(t => t.status === 'done'),
    };
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const isColumn = ['inbox', 'doing', 'done'].includes(overId);
    let newStatus: Task['status'] | null = null;

    if (isColumn) {
      newStatus = overId as Task['status'];
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && activeTask.status !== newStatus) {
      // Dopamine Effect: Confetti on completion
      if (newStatus === 'done') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }

      onUpdateTask(activeTask.id, { 
        status: newStatus,
        completed: newStatus === 'done'
      });
    }
  };

  const handleQuickAdd = (status: Task['status']) => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), false, [], undefined, status);
      setNewTaskTitle('');
      setShowAddInput(null);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading font-black text-text-main tracking-tight">Projetos</h1>
          <p className="text-text-secondary mt-2 font-medium">Arraste tarefas para organizar e agendar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAgenda(!showAgenda)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border",
              showAgenda 
                ? "bg-brand text-white border-brand shadow-lg" 
                : "bg-bg-card text-text-secondary border-border-main hover:border-brand hover:text-brand"
            )}
          >
            {showAgenda ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAgenda ? "Ocultar Agenda" : "Mostrar Agenda"}
          </button>
          <button className="p-2 text-text-secondary hover:text-brand transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* --- Kanban Section --- */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg-main/50 p-4 rounded-3xl border border-border-main transition-all duration-500",
            showAgenda ? "xl:col-span-5" : "xl:col-span-12"
          )}>
            {columns.map(col => (
              <DroppableColumn key={col.id} id={col.id} className="flex flex-col gap-4 min-h-[500px]">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-black tracking-widest uppercase", col.color)}>
                      {col.title}
                    </span>
                    <span className="text-[10px] font-bold bg-bg-card border border-border-main px-1.5 py-0.5 rounded-full text-text-secondary">
                      {tasksByStatus[col.id].length}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowAddInput(col.id)}
                    className="p-1 text-text-secondary hover:text-brand transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <SortableContext 
                  id={col.id}
                  items={tasksByStatus[col.id].map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3 flex-1">
                    {showAddInput === col.id && (
                      <div className="bg-bg-card border-2 border-brand rounded-xl p-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                        <input
                          autoFocus
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickAdd(col.id);
                            if (e.key === 'Escape') setShowAddInput(null);
                          }}
                          placeholder="Nova tarefa..."
                          className="w-full bg-transparent text-sm text-text-main outline-none p-1"
                        />
                        <div className="flex justify-end gap-1 mt-2">
                          <button onClick={() => setShowAddInput(null)} className="p-1 text-text-secondary hover:text-danger"><X className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleQuickAdd(col.id)} className="p-1 text-brand hover:text-brand-dark"><Check className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}

                    {tasksByStatus[col.id].map(task => (
                      <SortableTask 
                        key={task.id} 
                        task={task} 
                        onDelete={onDeleteTask}
                        onToggleImportant={onToggleImportant}
                        onToggleTask={onToggleTask}
                        onUpdateTask={onUpdateTask}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>

          {/* --- Weekly Schedule Section --- */}
          {showAgenda && (
            <div className="xl:col-span-7 bg-bg-card border border-border-main rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-500">
              <div className="p-6 border-b border-border-main flex items-center justify-between bg-bg-main/30">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-brand" />
                  <h2 className="font-heading font-bold text-text-main uppercase tracking-wider text-sm">Agenda Semanal</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-bg-main rounded-lg border border-border-main p-1">
                    <button className="p-1 text-text-secondary hover:text-text-main"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-bold px-3 text-text-main">Abril, 2026</span>
                    <button className="p-1 text-text-secondary hover:text-text-main"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Days Header */}
                  <div className="grid grid-cols-8 border-b border-border-main">
                    <div className="p-4 border-r border-border-main"></div>
                    {['SEGUNDA 6', 'TERÇA 7', 'QUARTA 8', 'QUINTA 9', 'SEXTA 10', 'SÁBADO 11', 'DOMINGO 12'].map((day, idx) => (
                      <div key={day} className={cn(
                        "p-4 text-center border-r border-border-main last:border-r-0",
                        idx === 1 && "bg-brand/5"
                      )}>
                        <span className={cn(
                          "text-[10px] font-black tracking-widest",
                          idx === 1 ? "text-brand" : "text-text-secondary"
                        )}>
                          {day}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Time Grid */}
                  <div className="relative h-[600px] overflow-y-auto">
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(hour => (
                      <div key={hour} className="grid grid-cols-8 border-b border-border-main/30 h-20 group">
                        <div className="p-2 text-right border-r border-border-main bg-bg-main/30">
                          <span className="text-[10px] font-bold text-text-secondary">{hour}:00</span>
                        </div>
                        {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
                          <div 
                            key={dayIdx} 
                            className={cn(
                              "relative border-r border-border-main/30 last:border-r-0 hover:bg-brand/5 transition-colors cursor-pointer",
                              dayIdx === 1 && "bg-brand/[0.02]"
                            )}
                          >
                            {/* Render tasks scheduled for this time/day */}
                            {tasks.filter(t => {
                              if (!t.dueDate) return false;
                              const d = new Date(t.dueDate);
                              return d.getHours() === hour && (d.getDay() === (dayIdx + 1) % 7);
                            }).map(t => (
                              <div key={t.id} className="absolute inset-1 bg-brand/20 border-l-4 border-brand rounded-md p-1 overflow-hidden">
                                <p className="text-[9px] font-bold text-brand truncate">{t.title}</p>
                                <p className="text-[8px] text-brand/70">{t.duration}m</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeTask ? (
            <div className="bg-bg-card border-2 border-brand rounded-xl p-3 shadow-2xl scale-105 rotate-2">
              <p className="text-sm font-bold text-text-main">{activeTask.title}</p>
              <div className="flex gap-1 mt-2">
                {activeTask.tags?.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded-md bg-brand/10 text-brand text-[9px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
