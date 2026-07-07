import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Task, TaskStatus } from '../types';
import { generateRecurrentTasks } from '../lib/taskService';
import { useGamification } from './useGamification';
import { toast } from 'react-hot-toast';
import { logAction } from '../services/auditService';

export function useTasks(userId: string | undefined, userDisplayName?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { awardXP } = useGamification();
  const generatingTemplatesRef = useRef<Set<string>>(new Set());

  // Reset generatingTemplatesRef when user changes
  useEffect(() => {
    generatingTemplatesRef.current = new Set();
  }, [userId]);

  // Listen to Tasks
  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Load initial tasks from cache if present
    try {
      const cached = localStorage.getItem(`registro_backup_cache_tasks_${userId}`);
      if (cached) {
        setTasks(JSON.parse(cached));
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch {
      setLoading(true);
    }

    const qTasks = query(collection(db, 'tasks'), where('userId', '==', userId));
    const unsubscribeTasks = onSnapshot(
      qTasks,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Task));
        // Sort using ISO 8601 strings
        data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setTasks(data);
        localStorage.setItem(`registro_backup_cache_tasks_${userId}`, JSON.stringify(data));
        setLoading(false);
      },
      (error) => {
        console.error('Firestore Tasks Listener Error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribeTasks();
  }, [userId]);

  // Recurrency Generation
  useEffect(() => {
    if (!userId || tasks.length === 0) return;

    const newRecurrent = generateRecurrentTasks(tasks, userId);
    if (newRecurrent.length > 0) {
      newRecurrent.forEach(async (t) => {
        // Find existing manual template to update lastGenerated date
        const template = tasks.find(
          (exist) =>
            exist.title === t.title &&
            exist.recurrence?.type === t.recurrence?.type &&
            exist.source === 'manual'
        );
        
        if (template && !generatingTemplatesRef.current.has(template.id)) {
          generatingTemplatesRef.current.add(template.id);
          try {
            const todayStr = new Date().toISOString().split('T')[0];
            await updateDoc(doc(db, 'tasks', template.id), {
              'recurrence.lastGenerated': todayStr,
              updatedAt: new Date().toISOString()
            });
            
            // Create the new task instance
            const { id, ...newTaskData } = t as any;
            await addDoc(collection(db, 'tasks'), {
              ...newTaskData,
              userId
            });
          } catch (err) {
            console.error('Error generating recurrent task instance:', err);
            generatingTemplatesRef.current.delete(template.id);
          }
        }
      });
    }
  }, [userId, tasks]);

  const addTask = useCallback(async (taskData: Partial<Task>) => {
    if (!userId) return;
    const isQuiet = taskData.source === 'incident' || taskData.source === 'recurrent';
    const toastId = !isQuiet ? toast.loading('Criando tarefa...') : undefined;
    try {
      const finalTask = {
        title: taskData.title || 'Nova Tarefa',
        description: taskData.description || '',
        completed: false,
        status: taskData.status || 'inbox',
        type: taskData.type || 'rotina',
        priority: taskData.priority || 'medium',
        source: taskData.source || 'manual',
        owner: taskData.owner || userDisplayName || 'Técnico',
        userId: userId,
        createdAt: new Date().toISOString(),
        dueDate: taskData.dueDate || '',
        tags: taskData.tags || [],
        duration: taskData.duration || 0,
        relatedBackupId: taskData.relatedBackupId || '',
        relatedClient: taskData.relatedClient || '',
        relatedRecordTitle: taskData.relatedRecordTitle || '',
        recurrence: taskData.recurrence || { type: 'none' },
        checklist: taskData.checklist || [],
        notes: taskData.notes || '',
        isGolden: taskData.isGolden || false,
        important: taskData.important || false
      };
      await addDoc(collection(db, 'tasks'), finalTask);
      if (toastId) toast.success('Tarefa criada com sucesso!', { id: toastId });
      
      // Audit log creation
      await logAction(
        userId,
        userDisplayName || 'Técnico',
        'CREATE_TASK',
        `Criou a tarefa: "${finalTask.title}"`
      );
    } catch (error) {
      if (toastId) toast.error('Erro ao criar tarefa.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  }, [userId, userDisplayName]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const { id: _, ...cleanUpdates } = updates;

      // Ensure status and completed stay in sync
      if (cleanUpdates.status === 'done') {
        cleanUpdates.completed = true;
      } else if (cleanUpdates.status !== undefined) {
        cleanUpdates.completed = false;
      } else if (cleanUpdates.completed === true) {
        cleanUpdates.status = 'done';
      } else if (cleanUpdates.completed === false) {
        if (task.status === 'done') {
          cleanUpdates.status = 'inbox';
        }
      }

      const isFinishing = (cleanUpdates.completed === true && !task.completed) || 
                          (cleanUpdates.status === 'done' && task.status !== 'done');

      let loadingText = 'Salvando alterações...';
      let successText = 'Tarefa atualizada!';
      if (isFinishing) {
        loadingText = 'Concluindo tarefa...';
        successText = 'Tarefa concluída! Parabéns!';
      } else if (cleanUpdates.isGolden !== undefined) {
        loadingText = cleanUpdates.isGolden ? 'Destacando Golden Task...' : 'Removendo destaque...';
        successText = cleanUpdates.isGolden ? 'Tarefa de Ouro ativada! 👑' : 'Tarefa normalizada!';
      }

      const toastId = toast.loading(loadingText);

      await updateDoc(doc(db, 'tasks', id), { ...cleanUpdates, updatedAt: new Date().toISOString() });
      toast.success(successText, { id: toastId });

      // Audit trail logging
      if (userId) {
        if (isFinishing) {
          await logAction(
            userId,
            userDisplayName || 'Técnico',
            'COMPLETE_TASK',
            `Concluiu a tarefa: "${task.title}"`
          );
        } else {
          await logAction(
            userId,
            userDisplayName || 'Técnico',
            'UPDATE_TASK',
            `Atualizou a tarefa: "${task.title}"`
          );
        }
      }

      if (isFinishing && userId) {
        let xpAwarded = 10;
        let reason = `Concluiu a tarefa: ${task.title}`;

        const isGolden = cleanUpdates.isGolden !== undefined ? cleanUpdates.isGolden : task.isGolden;
        const important = cleanUpdates.important !== undefined ? cleanUpdates.important : task.important;
        const duration = cleanUpdates.duration !== undefined ? cleanUpdates.duration : task.duration;

        if (isGolden) {
          xpAwarded = 50;
          reason = `Concluiu a Tarefa de Ouro: ${task.title}`;
        } else if (important) {
          xpAwarded = 25;
          reason = `Concluiu a tarefa importante: ${task.title}`;
        }

        if (duration && duration > 60) {
          xpAwarded += 15;
          reason += ' (Bônus de foco/duração)';
        }

        await awardXP(userId, xpAwarded, reason);
        toast.success(`+${xpAwarded} XP conquistados!`);

        // Log real-time activity for resolved failure/critical tasks
        if (task.priority === 'critical' || task.type === 'incidente') {
          try {
            const { logResolvedFailureActivity } = await import('../services/activityService');
            // Calculate SLA time
            const slaMs = new Date().getTime() - new Date(task.createdAt).getTime();
            const hours = Math.floor(slaMs / 3600000);
            const mins = Math.floor((slaMs % 3600000) / 60000);
            const slaText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            
            await logResolvedFailureActivity(
              userDisplayName || 'Técnico',
              undefined,
              task.relatedClient || 'Geral',
              task.title,
              slaText
            );
          } catch (actErr) {
            console.error('Error logging resolved activity:', actErr);
          }
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  }, [userId, tasks, awardXP, userDisplayName]);

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    await updateTask(id, { 
      completed,
      status: completed ? 'done' : 'doing'
    });
  }, [updateTask]);

  const toggleImportant = useCallback(async (id: string, important: boolean) => {
    const task = tasks.find(t => t.id === id);
    const title = task ? task.title : id;
    const toastId = toast.loading(important ? 'Adicionando estrela...' : 'Removendo estrela...');
    try {
      await updateDoc(doc(db, 'tasks', id), { important });
      toast.success(important ? 'Tarefa marcada como importante!' : 'Tarefa normalizada!', { id: toastId });
      
      if (userId) {
        await logAction(
          userId,
          userDisplayName || 'Técnico',
          'UPDATE_TASK',
          `Marcou a tarefa "${title}" como importante: ${important ? 'Sim' : 'Não'}`
        );
      }
    } catch (error) {
      toast.error('Erro ao atualizar prioridade.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  }, [userId, userDisplayName, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    const title = task ? task.title : id;
    const toastId = toast.loading('Excluindo tarefa...');
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Tarefa excluída!', { id: toastId });
      
      if (userId) {
        await logAction(
          userId,
          userDisplayName || 'Técnico',
          'DELETE_TASK',
          `Excluiu a tarefa: "${title}"`
        );
      }
    } catch (error) {
      toast.error('Erro ao excluir tarefa.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  }, [userId, userDisplayName, tasks]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleTask,
    toggleImportant,
    deleteTask
  };
}
