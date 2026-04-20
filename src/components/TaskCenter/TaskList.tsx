import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task, TaskType } from '../../types';
import { TaskItem } from './TaskItem';
import { TASK_TYPES } from '../../lib/taskService';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
}

export function TaskList({ tasks, onUpdateTask, onEditTask }: TaskListProps) {
  const [groupBy, setGroupBy] = useState<'type' | 'client' | 'priority' | 'status'>('type');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'rotina': true,
    'incidente': true,
    'plano_de_acao': true,
  });

  const groups = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const gKey = groupBy === 'type' ? (task.type || 'outros') : 
                   groupBy === 'client' ? (task.relatedClient || 'Sem Cliente') :
                   groupBy === 'priority' ? task.priority :
                   task.status;
      
      if (!grouped[gKey]) grouped[gKey] = [];
      grouped[gKey].push(task);
    });
    
    return grouped;
  }, [tasks, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 bg-bg-card border border-border-main rounded-3xl p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-main pb-6">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold text-text-main">Visualização em Lista</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-text-secondary uppercase">Agrupar por:</span>
          <select 
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="bg-bg-main border border-border-main rounded-xl px-4 py-2 text-xs font-bold text-text-main hover:border-brand outline-none transition-all"
          >
            <option value="type">Tipo</option>
            <option value="client">Cliente</option>
            <option value="priority">Prioridade</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([key, groupTasks]) => {
          const typeInfo = TASK_TYPES.find(t => t.value === key);
          const label = typeInfo ? typeInfo.label : key.charAt(0).toUpperCase() + key.slice(1);
          const isExpanded = expandedGroups[key] !== false;

          return (
            <div key={key} className="space-y-3">
              <button 
                onClick={() => toggleGroup(key)}
                className="flex items-center gap-2 group w-full text-left"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                <span className="text-xs font-black uppercase tracking-widest text-text-secondary group-hover:text-brand transition-colors">
                  {label}
                </span>
                <span className="text-[10px] font-bold bg-bg-main px-2 py-0.5 rounded-full text-text-secondary border border-border-main">
                  {groupTasks.length}
                </span>
                <div className="flex-1 h-[1px] bg-border-main/50" />
              </button>

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 pl-6 animate-in slide-in-from-left-2 duration-300">
                  {groupTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onUpdateTask={onUpdateTask} 
                      onEditTask={onEditTask}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-text-secondary font-medium">Nenhuma tarefa encontrada com os filtros atuais.</p>
          </div>
        )}
      </div>
    </div>
  );
}
