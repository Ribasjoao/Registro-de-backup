import React, { useState, useMemo } from 'react';
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
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task, TaskStatus } from '../../types';
import { TaskItem } from './TaskItem';
import { SortableTask } from './SortableTask';
import { TASK_STATUSES } from '../../lib/taskService';

interface TaskKanbanProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

function DroppableColumn({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex flex-col bg-bg-card/40 border border-border-main/50 rounded-3xl p-4 transition-all duration-300 max-h-[66vh] h-[66vh] w-[290px] md:w-[320px] shrink-0 gap-3 select-none",
        isOver && "bg-brand/[0.04] border-brand/35 ring-1 ring-brand/10 shadow-inner"
      )}
    >
      {/* Column Inner Header */}
      <div className="flex items-center justify-between border-b border-border-main/40 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
            {title}
          </h3>
          <span className="text-[9px] font-bold bg-bg-main border border-border-main text-text-secondary px-2 py-0.5 rounded-full shrink-0">
            {count}
          </span>
        </div>
        <button className="p-1 hover:bg-bg-main rounded text-text-secondary opacity-60 hover:opacity-100 transition-all cursor-pointer">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Internal scroll wrapper with custom smooth scrollbar */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-fine-scrollbar min-h-0 pb-2">
        {children}
      </div>
    </div>
  );
}

export function TaskKanban({ tasks, onUpdateTask, onEditTask, onDeleteTask }: TaskKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      inbox: [], today: [], doing: [], waiting: [], blocked: [], done: []
    };
    tasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
      else map.inbox.push(t);
    });
    return map;
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

    // Check if over a column or another task
    const targetStatus = TASK_STATUSES.some(s => s.value === overId) 
      ? overId as TaskStatus 
      : tasks.find(t => t.id === overId)?.status;

    if (targetStatus && activeTask.status !== targetStatus) {
      onUpdateTask(activeTask.id, { 
        status: targetStatus,
        completed: targetStatus === 'done'
      });

      if (targetStatus === 'done') {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 }
          });
        } catch (e) {
          console.error("Confetti error:", e);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 custom-fine-scrollbar animate-in fade-in duration-300">
        {TASK_STATUSES.map(status => {
          const colTasks = tasksByStatus[status.value as TaskStatus];
          return (
            <DroppableColumn 
              key={status.value} 
              id={status.value} 
              title={status.label}
              count={colTasks.length}
            >
              <SortableContext 
                id={status.value}
                items={colTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3 min-h-[120px] pb-6">
                  {colTasks.map(task => (
                    <SortableTask 
                      key={task.id} 
                      task={task} 
                      onUpdateTask={onUpdateTask} 
                      onEditTask={onEditTask}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border-main/40 rounded-2xl opacity-40 select-none">
                      <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Vazio</span>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-85 scale-105 rotate-1 shadow-2xl">
            <TaskItem 
              task={tasks.find(t => t.id === activeId)!} 
              onUpdateTask={() => {}} 
              onEditTask={() => {}} 
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
