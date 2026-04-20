import React, { useState, useMemo } from 'react';
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
import { TASK_STATUSES } from '../../lib/taskService';

interface TaskKanbanProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

function DroppableColumn({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex flex-col gap-4 min-w-[300px] h-full transition-colors p-2 rounded-2xl",
        isOver && "bg-brand/5 ring-2 ring-brand/20 ring-inset"
      )}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{title}</h3>
        <button className="p-1 hover:bg-bg-main rounded text-text-secondary"><MoreHorizontal className="w-3.5 h-3.5" /></button>
      </div>
      {children}
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
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4 min-h-[calc(100vh-350px)]">
        {TASK_STATUSES.map(status => (
          <DroppableColumn key={status.value} id={status.value} title={status.label}>
            <SortableContext 
              id={status.value}
              items={tasksByStatus[status.value as TaskStatus].map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3 min-h-[100px]">
                {tasksByStatus[status.value as TaskStatus].map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onUpdateTask={onUpdateTask} 
                    onEditTask={onEditTask}
                    compact
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 scale-105 rotate-2">
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
