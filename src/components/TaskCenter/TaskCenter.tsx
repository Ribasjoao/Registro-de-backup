import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  List, 
  Calendar, 
  RefreshCw,
  Plus,
  Filter,
  Search,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task, TaskStatus, TaskType, TaskPriority } from '../../types';
import { TaskMyDay } from './TaskMyDay';
import { TaskKanban } from './TaskKanban';
import { TaskList } from './TaskList';
import { TaskAgenda } from './TaskAgenda';
import { TaskForm } from './TaskForm';

interface TaskCenterProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

export type TaskViewMode = 'dashboard' | 'kanban' | 'list' | 'agenda' | 'routines';

export function TaskCenter({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskCenterProps) {
  const [viewMode, setViewMode] = useState<TaskViewMode>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    client: 'all'
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.relatedClient?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || task.status === filters.status;
      const matchesType = filters.type === 'all' || task.type === filters.type;
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [tasks, searchTerm, filters]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleAddNew = (initialValues?: Partial<Task>) => {
    setEditingTask(initialValues as Task); // Temporary cast for simplified state
    setIsFormOpen(true);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Meu Dia', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban', icon: Kanban },
    { id: 'list', label: 'Lista', icon: List },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'routines', label: 'Rotinas', icon: RefreshCw },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black text-text-main tracking-tight">Central de Execução</h1>
          <p className="text-text-secondary mt-2 font-medium">Gestão operacional de backups e incidentes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-bg-card p-1 rounded-2xl border border-border-main shadow-sm">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id as TaskViewMode)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  viewMode === item.id 
                    ? "bg-brand text-white shadow-lg shadow-brand/20" 
                    : "text-text-secondary hover:text-text-main hover:bg-bg-main"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={() => handleAddNew()}
            className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {viewMode === 'dashboard' && (
          <TaskMyDay 
            tasks={tasks} 
            onUpdateTask={onUpdateTask} 
            onEditTask={handleEditTask}
            onAddNew={handleAddNew}
          />
        )}
        
        {viewMode !== 'dashboard' && (
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-bg-card p-3 rounded-2xl border border-border-main shadow-sm">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-bg-main/50 border border-border-main rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                <Filter className="w-3.5 h-3.5" />
                <span>FILTROS:</span>
                <select 
                  className="bg-bg-main border-none outline-none rounded-lg px-2 py-1 text-text-main cursor-pointer"
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="all">Tipos</option>
                  <option value="rotina">Rotina</option>
                  <option value="incidente">Incidente</option>
                  <option value="plano_de_acao">Plano de Ação</option>
                </select>
                <select 
                  className="bg-bg-main border-none outline-none rounded-lg px-2 py-1 text-text-main cursor-pointer"
                  value={filters.priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="all">Prioridade</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'kanban' && (
          <TaskKanban 
            tasks={filteredTasks} 
            onUpdateTask={onUpdateTask} 
            onEditTask={handleEditTask}
            onDeleteTask={onDeleteTask}
          />
        )}

        {viewMode === 'list' && (
          <TaskList 
            tasks={filteredTasks} 
            onUpdateTask={onUpdateTask} 
            onEditTask={handleEditTask}
          />
        )}

        {(viewMode === 'agenda' || viewMode === 'routines') && (
          <TaskAgenda 
            tasks={filteredTasks}
            viewMode={viewMode}
            onEditTask={handleEditTask}
            onUpdateTask={onUpdateTask}
          />
        )}
      </div>

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
      />
    </div>
  );
}
