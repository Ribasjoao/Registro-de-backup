import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';

interface SortableTaskProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
}

export function SortableTask({ task, onUpdateTask, onEditTask }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="outline-none active:cursor-grabbing"
    >
      <TaskItem 
        task={task} 
        onUpdateTask={onUpdateTask} 
        onEditTask={onEditTask} 
        compact 
      />
    </div>
  );
}
