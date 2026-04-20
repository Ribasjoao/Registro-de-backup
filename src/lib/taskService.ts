import { Task, TaskType, TaskStatus, TaskPriority, TaskSource, TaskRecurrence } from '../types';

export const TASK_TYPES: { value: TaskType; label: string; color: string }[] = [
  { value: 'rotina', label: 'Rotina', color: 'bg-slate-500' },
  { value: 'incidente', label: 'Incidente', color: 'bg-danger' },
  { value: 'plano_de_acao', label: 'Plano de Ação', color: 'bg-brand' },
  { value: 'follow_up', label: 'Follow-up', color: 'bg-warning' },
  { value: 'apresentacao', label: 'Apresentação', color: 'bg-indigo-600' },
  { value: 'melhoria', label: 'Melhoria', color: 'bg-success' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Entrada' },
  { value: 'today', label: 'Hoje' },
  { value: 'doing', label: 'Em Andamento' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'done', label: 'Concluído' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'text-slate-400' },
  { value: 'medium', label: 'Média', color: 'text-warning' },
  { value: 'high', label: 'Alta', color: 'text-orange-600' },
  { value: 'critical', label: 'Crítica', color: 'text-danger' },
];

export function getStatusLabel(status: TaskStatus) {
  return TASK_STATUSES.find(s => s.value === status)?.label || status;
}

export function getTypeLabel(type: TaskType) {
  return TASK_TYPES.find(t => t.value === type)?.label || type;
}

export function generateRecurrentTasks(existingTasks: Task[], userId: string): Partial<Task>[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const newTasks: Partial<Task>[] = [];

  // Filter tasks that have recurrence
  const recurrentTemplates = existingTasks.filter(t => t.recurrence && t.recurrence.type !== 'none' && t.source === 'manual');

  recurrentTemplates.forEach(template => {
    const lastGen = template.recurrence?.lastGenerated;
    if (lastGen === todayStr) return; // Already generated today

    let shouldGenerate = false;
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)

    switch (template.recurrence?.type) {
      case 'daily':
        shouldGenerate = true;
        break;
      case 'business':
        shouldGenerate = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;
      case 'fridays':
        shouldGenerate = dayOfWeek === 5;
        break;
      case 'weekly':
        // Generate every 7 days (simplified: check if lastGen was > 6 days ago or if it matches same weekday)
        const lastDate = lastGen ? new Date(lastGen) : null;
        if (!lastDate || (now.getTime() - lastDate.getTime()) >= 6 * 24 * 60 * 60 * 1000) {
          shouldGenerate = true;
        }
        break;
      case 'monthly':
        const lastMDate = lastGen ? new Date(lastGen) : null;
        if (!lastMDate || lastMDate.getMonth() !== now.getMonth()) {
          shouldGenerate = true;
        }
        break;
    }

    if (shouldGenerate) {
      newTasks.push({
        ...template,
        id: undefined,
        status: 'today',
        createdAt: now.toISOString(),
        completed: false,
        source: 'recurrent',
        recurrence: { ...template.recurrence, lastGenerated: todayStr },
        dueDate: `${todayStr}T09:00:00`
      } as any);
    }
  });

  return newTasks;
}

export function filterTasks(tasks: Task[], filters: any) {
  return tasks.filter(task => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.type && task.type !== filters.type) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.client && task.relatedClient !== filters.client) return false;
    if (filters.today && task.status !== 'today' && task.status !== 'doing') return false;
    return true;
  });
}
