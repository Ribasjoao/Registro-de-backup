/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { awardXP } from './lib/xpService';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Database, 
  Settings, 
  Plus, 
  Bell, 
  CloudCheck as CloudDone,
  LogOut,
  ShieldCheck,
  Sparkles,
  Palette,
  Moon,
  Sun,
  Trophy,
  Presentation,
  X,
  LayoutList
} from 'lucide-react';
import { cn } from './lib/utils';

// Lazy load views for improved performance (code splitting)
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const RecordsView = lazy(() => import('./components/RecordsView').then(m => ({ default: m.RecordsView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const DestinationsView = lazy(() => import('./components/DestinationsView').then(m => ({ default: m.DestinationsView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const TaskCenter = lazy(() => import('./components/TaskCenter/TaskCenter').then(m => ({ default: m.TaskCenter })));
const WeeklyExecutiveView = lazy(() => import('./components/WeeklyExecutiveView').then(m => ({ default: m.WeeklyExecutiveView })));
import { PresentationCarousel } from './components/PresentationCarousel';
import { RegisterBackupModal } from './components/RegisterBackupModal';
import { LiquidMetalButton } from './components/LiquidMetal';
import { Login } from './components/Login';
import { DotMatrixLoader } from './components/DotMatrixLoader';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  limit,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  doc, 
  setDoc, 
  getDoc,
  getIdTokenResult,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';
import { generateRecurrentTasks } from './lib/taskService';
import { Client, BackupRecord, StorageDestination, BackupType, AppUser, Task } from './types';

type View = 'dashboard' | 'records' | 'tasks' | 'destinations' | 'reports' | 'weekly' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const isRootUser = user?.email === 'joaoribasdossantos@gmail.com';
  const displayRole = isRootUser ? 'admin' : (appUser?.role || 'viewer');

  const effectiveIsAdmin = isRootUser || isAdmin;
  const effectiveIsEditor = isRootUser || isEditor;

  const hasGeneratedToday = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [destinations, setDestinations] = useState<StorageDestination[]>([]);
  const [backupTypes, setBackupTypes] = useState<BackupType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editingBackup, setEditingBackup] = useState<BackupRecord | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const togglePresentationMode = () => {
    if (!isPresentationMode) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
      setIsPresentationMode(true);
      // Presentation mode looks better in dark mode
      if (!isDarkMode) setIsDarkMode(true);
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsPresentationMode(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsPresentationMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isRoot = currentUser.email === 'joaoribasdossantos@gmail.com';
        
        // Immediate synchronous state bypass
        if (isRoot) {
          setIsAdmin(true);
          setIsEditor(true);
          setAppUser({
            id: currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email || 'joaoribasdossantos@gmail.com',
            role: 'admin',
            displayName: currentUser.displayName || 'João Ribas',
            photoURL: currentUser.photoURL || undefined,
            xp: 1000,
            level: 'SysAdmin Root'
          });
        }

        // Check for custom claims (RBAC)
        const tokenResult = await getIdTokenResult(currentUser);
        const roleFromClaim = tokenResult.claims.role as string || (isRoot ? 'admin' : 'viewer');
        const isAdminUser = roleFromClaim === 'admin' || isRoot;
        const isEditorUser = roleFromClaim === 'editor' || isAdminUser;

        setIsAdmin(isAdminUser);
        setIsEditor(isEditorUser);

        // Sync user profile to Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          let role = isRoot ? 'admin' : roleFromClaim;
          if (userSnap.exists()) {
            role = isRoot ? 'admin' : (userSnap.data().role || role);
          }

          const userData = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: role,
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || ''
          };

          if (!userSnap.exists()) {
            const newUserData = {
              ...userData,
              xp: 0,
              level: 'Operador de Snapshot L1'
            };
            await setDoc(userRef, newUserData);
            setAppUser({ id: currentUser.uid, ...newUserData } as AppUser);
          } else {
            const existingData = userSnap.data();
            const updates: any = {
              email: currentUser.email || existingData.email || '',
              displayName: currentUser.displayName || existingData.displayName || '',
              photoURL: currentUser.photoURL || existingData.photoURL || ''
            };

            if (isRoot && existingData.role !== 'admin') {
              updates.role = 'admin';
            } else if (roleFromClaim === 'admin' && existingData.role !== 'admin') {
              updates.role = 'admin';
            }

            await updateDoc(userRef, updates);
            setAppUser({ id: currentUser.uid, ...existingData, ...updates, role: updates.role || existingData.role || role } as AppUser);
          }

          const finalRole = isRoot ? 'admin' : (userSnap.exists() ? (userSnap.data().role || role) : role);
          setIsAdmin(isRoot || finalRole === 'admin');
          setIsEditor(isRoot || finalRole === 'admin' || finalRole === 'editor');
        } catch (error) {
          console.warn('Error syncing user profile (using offline fallback):', error);
          setIsAdmin(isRoot || isAdminUser);
          setIsEditor(isRoot || isEditorUser);
          setAppUser({
            id: currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: isRoot ? 'admin' : (roleFromClaim as any),
            displayName: currentUser.displayName || undefined,
            photoURL: currentUser.photoURL || undefined
          });
        }
      } else {
        setIsAdmin(false);
        setIsEditor(false);
        setAppUser(null);
        hasGeneratedToday.current = false;
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || tasks.length === 0 || hasGeneratedToday.current) return;

    hasGeneratedToday.current = true;
    const newRecurrent = generateRecurrentTasks(tasks, user.uid);
    if (newRecurrent.length > 0) {
      newRecurrent.forEach(async (t) => {
        // Identify the original template to update its lastGenerated
        const template = tasks.find(exist => exist.title === t.title && exist.recurrence?.type === t.recurrence?.type && exist.source === 'manual');
        if (template) {
          await updateTask(template.id, { 
            recurrence: { ...template.recurrence!, lastGenerated: new Date().toISOString().split('T')[0] } 
          });
          await addTask(t);
        }
      });
    }
  }, [user, tasks.length]);

  useEffect(() => {
    if (!user) return;

    // Listen to current user document for real-time XP updates
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const isRoot = user.email === 'joaoribasdossantos@gmail.com';
        const data = snapshot.data();
        setAppUser({ 
          id: snapshot.id, 
          ...data,
          role: isRoot ? 'admin' : (data?.role || 'viewer')
        } as AppUser);
      }
    });

    // Listen to Backups
    const qBackups = query(collection(db, 'backups'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeBackups = onSnapshot(qBackups, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BackupRecord));
      setBackups(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'backups'));

    // Listen to Clients
    const qClients = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    // Listen to Destinations
    const qDestinations = query(collection(db, 'destinations'), orderBy('name', 'asc'));
    const unsubscribeDestinations = onSnapshot(qDestinations, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageDestination));
      setDestinations(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'destinations'));

    // Listen to Backup Types
    const qBackupTypes = query(collection(db, 'backup_types'), orderBy('name', 'asc'));
    const unsubscribeBackupTypes = onSnapshot(qBackupTypes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BackupType));
      setBackupTypes(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'backup_types'));

    // Listen to Tasks
    const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      // Radical simplification of client-side sorting using ISO 8601 strings
      data.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      
      setTasks(data);
    }, (error) => {
      console.error("Firestore Tasks Listener Error:", error);
    });

    // Listen to Users (For Leaderboard and Admin)
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      data.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      setUsers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    return () => {
      unsubscribeUser();
      unsubscribeBackups();
      unsubscribeClients();
      unsubscribeDestinations();
      unsubscribeBackupTypes();
      unsubscribeTasks();
      unsubscribeUsers();
    };
  }, [user?.uid]);

  const addClient = async (name: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Adicionando cliente...');
    try {
      await addDoc(collection(db, 'clients'), {
        name,
        createdAt: new Date().toISOString(),
      });
      toast.success('Cliente adicionado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao adicionar cliente.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const updateClient = async (updatedClient: Client) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Atualizando cliente...');
    try {
      const { id, ...data } = updatedClient;
      await updateDoc(doc(db, 'clients', id), data);
      toast.success('Cliente atualizado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar cliente.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `clients/${updatedClient.id}`);
    }
  };

  const deleteClient = async (id: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Removendo cliente...');
    try {
      await deleteDoc(doc(db, 'clients', id));
      toast.success('Cliente removido com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao remover cliente.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const addBackup = async (backup: Omit<BackupRecord, 'id'>) => {
    if (!effectiveIsEditor) return;
    const toastId = toast.loading('Registrando backup...');
    try {
      const docRef = await addDoc(collection(db, 'backups'), backup);
      toast.success('Backup registrado com sucesso!', { id: toastId });
      
      // Auto-task for failed backups
      if (backup.status === 'failed') {
        await addTask({
          title: `Tratar falha: ${backup.title}`,
          type: 'incidente',
          status: 'today',
          priority: 'critical',
          relatedBackupId: docRef.id,
          relatedClient: backup.client,
          relatedRecordTitle: backup.title,
          source: 'incident',
          notes: 'Gerada automaticamente por falha no backup.'
        });
      }
    } catch (error) {
      toast.error('Erro ao registrar backup.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'backups');
    }
  };

  const updateBackup = async (updatedBackup: BackupRecord) => {
    if (!effectiveIsEditor) return;
    const toastId = toast.loading('Atualizando registro...');
    try {
      const { id, ...data } = updatedBackup;
      await updateDoc(doc(db, 'backups', id), data);
      toast.success('Backup atualizado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar backup.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `backups/${updatedBackup.id}`);
    }
  };

  const deleteBackup = async (id: string) => {
    if (!effectiveIsEditor) return;
    const toastId = toast.loading('Excluindo registro...');
    try {
      await deleteDoc(doc(db, 'backups', id));
      toast.success('Backup excluído com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao excluir backup.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `backups/${id}`);
    }
  };

  const updateDestination = async (updatedDest: StorageDestination) => {
    if (!effectiveIsEditor) return;
    const toastId = toast.loading('Salvando destino...');
    try {
      const { id, ...data } = updatedDest;
      await updateDoc(doc(db, 'destinations', id), data);
      toast.success('Destino atualizado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar destino.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `destinations/${updatedDest.id}`);
    }
  };

  const addDestination = async (destination: Omit<StorageDestination, 'id'>) => {
    if (!effectiveIsEditor) return;
    const toastId = toast.loading('Adicionando destino...');
    try {
      await addDoc(collection(db, 'destinations'), destination);
      toast.success('Destino adicionado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao adicionar destino.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'destinations');
    }
  };

  const deleteDestination = async (id: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Removendo destino...');
    try {
      await deleteDoc(doc(db, 'destinations', id));
      toast.success('Destino removido com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao remover destino.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `destinations/${id}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Atualizando permissão...');
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('Perfil de usuário atualizado!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar perfil.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Excluindo usuário...');
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Usuário excluído com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao excluir usuário.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const addBackupType = async (name: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Salvando categoria...');
    try {
      await addDoc(collection(db, 'backup_types'), { name });
      toast.success('Categoria adicionada!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao criar categoria.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'backup_types');
    }
  };

  const updateBackupType = async (updatedType: BackupType) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Salvando categoria...');
    try {
      const { id, ...data } = updatedType;
      await updateDoc(doc(db, 'backup_types', id), data);
      toast.success('Categoria atualizada!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar categoria.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `backup_types/${updatedType.id}`);
    }
  };

  const deleteBackupType = async (id: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Excluindo categoria...');
    try {
      await deleteDoc(doc(db, 'backup_types', id));
      toast.success('Categoria removida!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao remover categoria.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `backup_types/${id}`);
    }
  };

  const addTask = async (taskData: Partial<Task>) => {
    if (!user) return;
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
        owner: taskData.owner || user.displayName || 'Técnico',
        userId: user.uid,
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
      };
      await addDoc(collection(db, 'tasks'), finalTask);
      if (toastId) toast.success('Tarefa criada com sucesso!', { id: toastId });
    } catch (error) {
      if (toastId) toast.error('Erro ao criar tarefa.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
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

      if (isFinishing && user) {
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

        await awardXP(user.uid, xpAwarded, reason);
        toast.success(`+${xpAwarded} XP conquistados!`);
      }
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    await updateTask(id, { 
      completed,
      status: completed ? 'done' : 'doing'
    });
  };

  const toggleImportant = async (id: string, important: boolean) => {
    const toastId = toast.loading(important ? 'Adicionando estrela...' : 'Removendo estrela...');
    try {
      await updateDoc(doc(db, 'tasks', id), { important });
      toast.success(important ? 'Tarefa marcada como importante!' : 'Tarefa normalizada!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao atualizar prioridade.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    const toastId = toast.loading('Excluindo tarefa...');
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Tarefa excluída!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao excluir tarefa.', { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleResetData = async (
    resetType: 'personal' | 'system',
    systemOptions?: {
      deleteBackups: boolean;
      deleteClients: boolean;
      deleteDestinations: boolean;
      clientNameFilter?: string;
    }
  ) => {
    if (!user) return;
    const toastId = toast.loading(resetType === 'personal' ? 'Redefinindo dados pessoais...' : 'Limpando dados do sistema...');
    try {
      if (resetType === 'personal') {
        const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const tasksSnapshot = await getDocs(qTasks);
        const taskDeletePromises = tasksSnapshot.docs.map(docRef => deleteDoc(doc(db, 'tasks', docRef.id)));
        await Promise.all(taskDeletePromises);
        toast.success('Dados pessoais redefinidos com sucesso!', { id: toastId });
      } else if (resetType === 'system' && effectiveIsAdmin && systemOptions) {
        const { deleteBackups, deleteClients, deleteDestinations, clientNameFilter } = systemOptions;

        if (deleteBackups) {
          let backupsSnapshot;
          if (clientNameFilter && clientNameFilter !== 'all') {
            const q = query(collection(db, 'backups'), where('client', '==', clientNameFilter));
            backupsSnapshot = await getDocs(q);
          } else {
            backupsSnapshot = await getDocs(collection(db, 'backups'));
          }
          const backupDeletePromises = backupsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'backups', docRef.id)));
          await Promise.all(backupDeletePromises);
        }

        if (deleteClients) {
          const clientsSnapshot = await getDocs(collection(db, 'clients'));
          const clientDeletePromises = clientsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'clients', docRef.id)));
          await Promise.all(clientDeletePromises);
        }

        if (deleteDestinations) {
          const destinationsSnapshot = await getDocs(collection(db, 'destinations'));
          const destDeletePromises = destinationsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'destinations', docRef.id)));
          await Promise.all(destDeletePromises);
        }
        toast.success('Dados do sistema redefinidos com sucesso!', { id: toastId });
      }
    } catch (error) {
      toast.error('Erro ao redefinir dados.', { id: toastId });
      console.error('Error resetting data:', error);
      handleFirestoreError(error, OperationType.DELETE, `reset/${resetType}`);
    }
  };

  const openEditBackup = (backup: BackupRecord) => {
    if (!effectiveIsEditor) return;
    setEditingBackup(backup);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBackup(undefined);
  };

  const handleBackupSave = async (backupData: Partial<BackupRecord>) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const isNew = !('id' in backupData && backupData.id);

      // Save Backup
      if (!isNew) {
        await updateBackup(backupData as BackupRecord);
      } else {
        await addBackup(backupData as Omit<BackupRecord, 'id'>);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving backup:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen bg-bg-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'weekly', label: 'Resumo Semanal', icon: Presentation, path: '/semanal' },
    { id: 'records', label: 'Registros', icon: ListTodo, path: '/registros' },
    { id: 'tasks', label: 'Tarefas', icon: LayoutList, path: '/tarefas' },
    { id: 'destinations', label: 'Destinos', icon: Database, path: '/destinos' },
    { id: 'reports', label: 'Relatórios IA', icon: Sparkles, path: '/relatorios' },
    ...(effectiveIsAdmin ? [{ id: 'settings', label: 'Configurações', icon: Settings, path: '/configuracoes' }] : []),
  ];

  return (
    <div className={cn(
      "flex h-screen overflow-hidden bg-bg-main transition-colors duration-300",
      isPresentationMode && "presentation-mode"
    )}>
      {isPresentationMode && (
        <PresentationCarousel 
          backups={backups} 
          onClose={togglePresentationMode} 
        />
      )}

      {/* Sidebar */}
      {!isPresentationMode && (
        <aside className="w-[240px] sidebar flex-shrink-0 flex flex-col h-full hidden md:flex">
          <div className="h-20 flex items-center px-6 border-b border-border-main">
            <div className="flex items-center gap-3">
              <DotMatrixLoader pattern="dynamic" color="petal-shimmer" size="logo" />
              <span className="font-heading font-bold text-lg tracking-tight text-text-main">Dashboard</span>
            </div>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.id === 'dashboard' && location.pathname === '/');
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-4",
                    isActive 
                      ? "bg-brand/10 text-brand border-brand font-semibold" 
                      : "text-text-secondary hover:bg-bg-main hover:text-text-main border-transparent font-medium"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border-main">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-sm font-bold text-white overflow-hidden select-none">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />
                  ) : (
                    (user.displayName 
                      ? user.displayName.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2)
                      : user.email?.substring(0, 2) || 'OP'
                    ).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-text-main truncate">{user.displayName || 'Usuário'}</span>
                  <span className="text-xs text-brand truncate flex items-center gap-1 uppercase tracking-wider font-semibold">
                    {displayRole === 'admin' ? 'Administrador' : displayRole === 'editor' ? 'Editor' : 'Visualizador'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-main hover:text-text-main transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Exit Presentation Mode Button (Floating) */}
        {isPresentationMode && (
          <button 
            onClick={togglePresentationMode}
            className="absolute top-8 right-8 z-50 p-3 bg-bg-card/50 hover:bg-bg-card text-text-main rounded-full backdrop-blur-md border border-border-main transition-all shadow-xl group"
            title="Sair do Modo Apresentação"
          >
            <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Header */}
        {!isPresentationMode && (
          <header className="h-20 bg-bg-card border-b border-border-main flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-main">
                {navItems.find(i => i.path === location.pathname || (i.id === 'dashboard' && location.pathname === '/'))?.label || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePresentationMode}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-brand transition-all rounded-lg hover:bg-brand/5 font-medium border border-transparent hover:border-brand/20"
                title="Iniciar Reunião de Diretoria"
              >
                <Presentation className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Iniciar Reunião</span>
              </button>
              
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-full hover:bg-bg-main"
                title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className="relative p-2 text-text-secondary hover:text-text-main transition-colors rounded-full hover:bg-bg-main">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-bg-card"></span>
              </button>
              {effectiveIsEditor && (
                <LiquidMetalButton 
                  onClick={() => setIsModalOpen(true)}
                  preset="holo"
                  className="px-5 py-2.5 rounded-lg active:scale-95 flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer shadow-md select-none"
                >
                  <Plus className="w-5 h-5 font-black" />
                  Registrar Backup
                </LiquidMetalButton>
              )}
            </div>
          </header>
        )}

        {/* Scrollable Content */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          isPresentationMode ? "p-0 flex items-center justify-center" : "p-4 md:p-8"
        )}>
          <motion.div
            key={location.pathname + (isPresentationMode ? '-presentation' : '')}
            initial={{ opacity: 0, scale: isPresentationMode ? 0.95 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "mx-auto",
              isPresentationMode ? "w-full h-full max-w-none" : "max-w-[1440px]"
            )}
          >
            <Suspense fallback={
              <div className="h-[60vh] w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardView backups={backups} />} />
                <Route path="/semanal" element={<WeeklyExecutiveView backups={backups} tasks={tasks} />} />
                <Route path="/registros" element={<RecordsView backups={backups} onEdit={effectiveIsEditor ? openEditBackup : undefined} onDelete={effectiveIsEditor ? deleteBackup : undefined} />} />
                <Route path="/tarefas" element={
                  <TaskCenter 
                    tasks={tasks} 
                    onAddTask={addTask} 
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask} 
                    defaultOwner={user?.displayName || user?.email || 'Operador'}
                  />
                } />
                <Route path="/destinos" element={<DestinationsView destinations={destinations} clients={clients} onUpdate={effectiveIsEditor ? updateDestination : async () => {}} onAdd={effectiveIsEditor ? addDestination : async () => {}} onDelete={effectiveIsAdmin ? deleteDestination : () => {}} isAdmin={effectiveIsEditor} />} />
                <Route path="/relatorios" element={<ReportsView backups={backups} />} />
                {effectiveIsAdmin && (
                  <Route path="/configuracoes" element={
                    <SettingsView 
                      clients={clients} 
                      onAddClient={addClient} 
                      onUpdateClient={updateClient} 
                      onDeleteClient={deleteClient} 
                      destinations={destinations} 
                      onUpdateDestination={updateDestination} 
                      onAddDestination={addDestination} 
                      onDeleteDestination={deleteDestination}
                      users={users}
                      onUpdateUserRole={updateUserRole}
                      onDeleteUser={deleteUser}
                      currentUserId={user?.uid}
                      backupTypes={backupTypes}
                      onAddBackupType={addBackupType}
                      onUpdateBackupType={updateBackupType}
                      onDeleteBackupType={deleteBackupType}
                      isAdmin={effectiveIsAdmin}
                      onResetData={handleResetData}
                    />
                  } />
                )}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </div>
      </main>

      {effectiveIsEditor && (
        <RegisterBackupModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          clients={clients}
          backupTypes={backupTypes}
          onSave={handleBackupSave}
          isSaving={isSaving}
          initialData={editingBackup}
          defaultResponsible={user.displayName || user.email || undefined}
        />
      )}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-main)',
            border: '1px solid var(--color-border-main)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--color-bg-card)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-bg-card)',
            },
          },
        }}
      />
    </div>
  );
}

