/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
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
  LayoutList,
  Users,
  Clock
} from 'lucide-react';
import { cn } from './lib/utils';

import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { SettingsView } from './components/SettingsView';
import { DestinationsView } from './components/DestinationsView';
import { ReportsView } from './components/ReportsView';
import { TaskCenter } from './components/TaskCenter/TaskCenter';
import { WeeklyExecutiveView } from './components/WeeklyExecutiveView';
import { ClientsListView } from './components/ClientsListView';
import { ClientDashboardView } from './components/ClientDashboardView';
import { TimelineView } from './components/TimelineView';
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
import { useTasks } from './hooks/useTasks';
import { Client, BackupRecord, StorageDestination, BackupType, AppUser, Task, Activity } from './types';
import { logAction } from './services/auditService';

// Migrate old 'gate7_cache_*' keys to 'registro_backup_cache_*'
(() => {
  try {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gate7_cache_')) {
        keysToMigrate.push(key);
      }
    }
    keysToMigrate.forEach(key => {
      const val = localStorage.getItem(key);
      if (val !== null) {
        const newKey = key.replace('gate7_cache_', 'registro_backup_cache_');
        localStorage.setItem(newKey, val);
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error migrating cache keys:', e);
  }
})();

type View = 'dashboard' | 'records' | 'tasks' | 'destinations' | 'reports' | 'weekly' | 'settings' | 'timeline';

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
  const isSeedingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  const [loadedStates, setLoadedStates] = useState(() => {
    const hasBackups = !!localStorage.getItem('registro_backup_cache_backups');
    const hasClients = !!localStorage.getItem('registro_backup_cache_clients');
    const hasDestinations = !!localStorage.getItem('registro_backup_cache_destinations');
    const hasBackupTypes = !!localStorage.getItem('registro_backup_cache_backup_types');
    const hasUsers = !!localStorage.getItem('registro_backup_cache_users');
    const hasActivities = !!localStorage.getItem('registro_backup_cache_activities');
    
    return {
      backups: hasBackups,
      clients: hasClients,
      destinations: hasDestinations,
      backupTypes: hasBackupTypes,
      users: hasUsers,
      activities: hasActivities
    };
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_clients');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [backups, setBackups] = useState<BackupRecord[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_backups');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [destinations, setDestinations] = useState<StorageDestination[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_destinations');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [backupTypes, setBackupTypes] = useState<BackupType[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_backup_types');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_activities');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [lastViewedActivities, setLastViewedActivities] = useState<string>(() => {
    return localStorage.getItem('lastViewedActivities') || new Date(0).toISOString();
  });

  const markActivitiesAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastViewedActivities(now);
    localStorage.setItem('lastViewedActivities', now);
  }, []);

  const unreadActivitiesCount = useMemo(() => {
    return activities.filter(act => act.timestamp > lastViewedActivities).length;
  }, [activities, lastViewedActivities]);

  useEffect(() => {
    if (location.pathname === '/timeline') {
      markActivitiesAsRead();
    }
  }, [location.pathname, markActivitiesAsRead]);

  const {
    tasks,
    loading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    toggleImportant
  } = useTasks(user?.uid ?? undefined, user?.displayName || user?.email);
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const cached = localStorage.getItem('registro_backup_cache_users');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [editingBackup, setEditingBackup] = useState<BackupRecord | undefined>(undefined);

  const isLoadingData = !loadedStates.backups || !loadedStates.clients || !loadedStates.destinations || !loadedStates.backupTypes || !loadedStates.users || !loadedStates.activities || tasksLoading;
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
      // Auto redirect to dashboard in presentation mode
      navigate('/dashboard');
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
      localStorage.setItem('registro_backup_cache_backups', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, backups: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, backups: true }));
      handleFirestoreError(error, OperationType.LIST, 'backups');
    });

    // Listen to Clients
    const qClients = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
      localStorage.setItem('registro_backup_cache_clients', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, clients: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, clients: true }));
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    // Listen to Destinations
    const qDestinations = query(collection(db, 'destinations'), orderBy('name', 'asc'));
    const unsubscribeDestinations = onSnapshot(qDestinations, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageDestination));
      setDestinations(data);
      localStorage.setItem('registro_backup_cache_destinations', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, destinations: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, destinations: true }));
      handleFirestoreError(error, OperationType.LIST, 'destinations');
    });

    // Listen to Backup Types
    const qBackupTypes = query(collection(db, 'backup_types'), orderBy('name', 'asc'));
    const unsubscribeBackupTypes = onSnapshot(qBackupTypes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BackupType));
      setBackupTypes(data);
      localStorage.setItem('registro_backup_cache_backup_types', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, backupTypes: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, backupTypes: true }));
      handleFirestoreError(error, OperationType.LIST, 'backup_types');
    });

    // Listen to Users (For Leaderboard and Admin)
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      data.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      setUsers(data);
      localStorage.setItem('registro_backup_cache_users', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, users: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, users: true }));
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Listen to Activities
    const qActivities = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(200));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(data);
      localStorage.setItem('registro_backup_cache_activities', JSON.stringify(data));
      setLoadedStates(prev => ({ ...prev, activities: true }));
    }, (error) => {
      setLoadedStates(prev => ({ ...prev, activities: true }));
      handleFirestoreError(error, OperationType.LIST, 'activities');
    });

    return () => {
      unsubscribeUser();
      unsubscribeBackups();
      unsubscribeClients();
      unsubscribeDestinations();
      unsubscribeBackupTypes();
      unsubscribeUsers();
      unsubscribeActivities();
    };
  }, [user?.uid]);

  // Trigger seeding of clients and core data if empty
  useEffect(() => {
    if (loadedStates.clients && clients.length === 0) {
      import('./services/seedService').then(({ seedInitialDataIfEmpty }) => {
        seedInitialDataIfEmpty();
      });
    }
  }, [loadedStates.clients, clients.length]);

  // Trigger seeding of activities if empty
  useEffect(() => {
    if (loadedStates.backups && loadedStates.clients && loadedStates.users && loadedStates.activities) {
      if (activities.length === 0 && backups.length > 0 && !isSeedingRef.current) {
        isSeedingRef.current = true;
        import('./services/activityService').then(({ seedActivitiesIfEmpty }) => {
          seedActivitiesIfEmpty(backups, clients, users);
        });
      }
    }
  }, [loadedStates.backups, loadedStates.clients, loadedStates.users, loadedStates.activities, activities.length, backups, clients, users]);

  const addClient = async (name: string) => {
    if (!effectiveIsAdmin) return;
    const toastId = toast.loading('Adicionando cliente...');
    try {
      await addDoc(collection(db, 'clients'), {
        name,
        createdAt: new Date().toISOString(),
      });
      toast.success('Cliente adicionado com sucesso!', { id: toastId });
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'CREATE_CLIENT',
          `Adicionou o cliente "${name}"`
        );

        // Log real-time activity
        const { logNewClientActivity } = await import('./services/activityService');
        await logNewClientActivity(
          appUser?.displayName || user.displayName || user.email || 'Admin',
          appUser?.photoURL || user.photoURL || undefined,
          name
        );
      }
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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'UPDATE_CLIENT',
          `Atualizou as informações do cliente "${updatedClient.name}"`
        );
      }
    } catch (error) {
      toast.error('Erro ao atualizar cliente.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `clients/${updatedClient.id}`);
    }
  };

  const deleteClient = async (id: string) => {
    if (!effectiveIsAdmin) return;
    const client = clients.find(c => c.id === id);
    const clientName = client ? client.name : id;
    const toastId = toast.loading('Removendo cliente...');
    try {
      await deleteDoc(doc(db, 'clients', id));
      toast.success('Cliente removido com sucesso!', { id: toastId });
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'DELETE_CLIENT',
          `Excluiu o cliente "${clientName}"`
        );
      }
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
      
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          'CREATE_BACKUP',
          `Registrou backup "${backup.title}" para o cliente "${backup.client}" (${backup.status.toUpperCase()})`
        );

        // Log real-time activity
        const { logBackupAuditActivity } = await import('./services/activityService');
        await logBackupAuditActivity(
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          appUser?.photoURL || user.photoURL || undefined,
          backup.client,
          1,
          backup.status === 'success' ? 1 : 0,
          backup.status === 'warning' ? 1 : 0,
          backup.status === 'failed' ? 1 : 0
        );
      }

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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          'UPDATE_BACKUP',
          `Atualizou o registro de backup "${updatedBackup.title}" do cliente "${updatedBackup.client}"`
        );
      }
    } catch (error) {
      toast.error('Erro ao atualizar backup.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `backups/${updatedBackup.id}`);
    }
  };

  const deleteBackup = async (id: string) => {
    if (!effectiveIsEditor) return;
    const backup = backups.find(b => b.id === id);
    const backupTitle = backup ? backup.title : id;
    const toastId = toast.loading('Excluindo registro...');
    try {
      await deleteDoc(doc(db, 'backups', id));
      toast.success('Backup excluído com sucesso!', { id: toastId });
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          'DELETE_BACKUP',
          `Excluiu o registro de backup "${backupTitle}"`
        );
      }
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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          'UPDATE_DESTINATION',
          `Atualizou o destino de armazenamento "${updatedDest.name}"`
        );
      }
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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Usuário',
          'CREATE_DESTINATION',
          `Adicionou o destino de armazenamento "${destination.name}"`
        );
      }
    } catch (error) {
      toast.error('Erro ao adicionar destino.', { id: toastId });
      handleFirestoreError(error, OperationType.CREATE, 'destinations');
    }
  };

  const deleteDestination = async (id: string) => {
    if (!effectiveIsAdmin) return;
    const dest = destinations.find(d => d.id === id);
    const destName = dest ? dest.name : id;
    const toastId = toast.loading('Removendo destino...');
    try {
      await deleteDoc(doc(db, 'destinations', id));
      toast.success('Destino removido com sucesso!', { id: toastId });
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'DELETE_DESTINATION',
          `Excluiu o destino de armazenamento "${destName}"`
        );
      }
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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'UPDATE_USER_ROLE',
          `Alterou a permissão do usuário ID ${userId} para ${newRole.toUpperCase()}`
        );
      }
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
      if (user) {
        await logAction(
          user.uid,
          appUser?.displayName || user.displayName || user.email || 'Admin',
          'DELETE_USER',
          `Excluiu o cadastro do usuário ID ${userId}`
        );
      }
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

  const handleBackupSave = async (backupData: Partial<BackupRecord> | Partial<BackupRecord>[]) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (Array.isArray(backupData)) {
        // Batch validation registration
        const toastId = toast.loading(`Registrando ${backupData.length} backups...`);
        try {
          const promises = backupData.map(async (bk) => {
            const docRef = await addDoc(collection(db, 'backups'), bk);
            
            // Auto-task for failed backups
            if (bk.status === 'failed') {
              await addTask({
                title: `Tratar falha: ${bk.title}`,
                type: 'incidente',
                status: 'today',
                priority: 'critical',
                relatedBackupId: docRef.id,
                relatedClient: bk.client || '',
                relatedRecordTitle: bk.title || '',
                source: 'incident',
                notes: 'Gerada automaticamente por falha no backup.'
              });
            }
          });
          
          await Promise.all(promises);
          toast.success(`${backupData.length} backups registrados com sucesso!`, { id: toastId });
          
          if (user && backupData.length > 0) {
            await logAction(
              user.uid,
              appUser?.displayName || user.displayName || user.email || 'Usuário',
              'CREATE_BACKUP_BATCH',
              `Registrou lote de ${backupData.length} backups para o cliente "${backupData[0].client}"`
            );

            // Log real-time activity
            const { logBackupAuditActivity } = await import('./services/activityService');
            const total = backupData.length;
            const success = backupData.filter(b => b.status === 'success').length;
            const warning = backupData.filter(b => b.status === 'warning').length;
            const failed = backupData.filter(b => b.status === 'failed').length;
            const clientName = backupData[0]?.client || 'Geral';
            await logBackupAuditActivity(
              appUser?.displayName || user.displayName || user.email || 'Usuário',
              appUser?.photoURL || user.photoURL || undefined,
              clientName,
              total,
              success,
              warning,
              failed
            );
          }
        } catch (error) {
          toast.error('Erro ao registrar lote de backups.', { id: toastId });
          handleFirestoreError(error, OperationType.CREATE, 'backups_batch');
        }
      } else {
        // Individual update or single save
        const isNew = !('id' in backupData && backupData.id);
        if (!isNew) {
          await updateBackup(backupData as BackupRecord);
        } else {
          await addBackup(backupData as Omit<BackupRecord, 'id'>);
        }
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

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'weekly', label: 'Resumo Semanal', icon: Presentation, path: '/semanal' },
    { id: 'timeline', label: 'Atividades', icon: Clock, path: '/timeline' },
  ];

  const managementNavItems = [
    { id: 'records', label: 'Registros', icon: ListTodo, path: '/registros' },
    { id: 'clients', label: 'Clientes', icon: Users, path: '/clientes' },
    { id: 'tasks', label: 'Tarefas', icon: LayoutList, path: '/tarefas' },
    { id: 'destinations', label: 'Destinos', icon: Database, path: '/destinos' },
    { id: 'reports', label: 'Relatórios IA', icon: Sparkles, path: '/relatorios' },
    ...(effectiveIsAdmin ? [{ id: 'settings', label: 'Configurações', icon: Settings, path: '/configuracoes' }] : []),
  ];

  const navItems = [...mainNavItems, ...managementNavItems];

  return (
    <div className={cn(
      "flex h-screen overflow-hidden premium-bg-layout transition-colors duration-300",
      isPresentationMode && "presentation-mode"
    )}>

      {isPresentationMode && (
        <PresentationCarousel backups={backups} onClose={togglePresentationMode} />
      )}

      {/* Sidebar with layout animation */}
      <AnimatePresence mode="wait">
        {!isPresentationMode && (
          <motion.aside 
            initial={{ width: 0, opacity: 0, x: -250 }}
            animate={{ width: 250, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -250 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-[250px] sidebar flex-shrink-0 flex flex-col h-full hidden md:flex overflow-hidden bg-[#070512] border-r border-[#231C42]"
          >
            {/* Header / Brand */}
            <div className="h-20 flex items-center px-6 border-b border-[#231C42] shrink-0 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6B42F2] to-[#8B5CF6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(107,66,242,0.5)]">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-base tracking-tight text-white leading-tight">Registro Backup</span>
                  <span className="text-[10px] text-[#928EA8] font-medium tracking-wider uppercase">Sistemas & Audit</span>
                </div>
              </div>
            </div>
            
            {/* Nav Menu */}
            <nav className="flex-1 py-5 px-3.5 space-y-6 overflow-y-auto custom-fine-scrollbar">
              {/* Group 1: Principal */}
              <div>
                <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-[#928EA8]/70 uppercase">
                  Principal
                </p>
                <div className="space-y-1">
                  {mainNavItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.id === 'dashboard' && location.pathname === '/');
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm",
                          isActive 
                            ? "bg-gradient-to-r from-[#6B42F2] to-[#8B5CF6] text-white font-bold shadow-[0_4px_20px_rgba(107,66,242,0.45)]" 
                            : "text-[#928EA8] hover:bg-[#130F26] hover:text-white"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#928EA8]")} />
                        <span className="flex-grow text-left">{item.label}</span>
                        {item.id === 'timeline' && unreadActivitiesCount > 0 && (
                          <span className="bg-[#FF2A85] text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                            {unreadActivitiesCount}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Gestão */}
              <div>
                <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-[#928EA8]/70 uppercase">
                  Gestão & Auditoria
                </p>
                <div className="space-y-1">
                  {managementNavItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm",
                          isActive 
                            ? "bg-gradient-to-r from-[#6B42F2] to-[#8B5CF6] text-white font-bold shadow-[0_4px_20px_rgba(107,66,242,0.45)]" 
                            : "text-[#928EA8] hover:bg-[#130F26] hover:text-white"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#928EA8]")} />
                        <span className="flex-grow text-left">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {/* Support Box Widget */}
            <div className="px-3.5 pb-3 shrink-0">
              <div className="bg-[#130F26] border border-[#231C42] rounded-2xl p-3.5 text-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#6B42F2]" /> Precisa de Suporte?
                  </span>
                </div>
                <p className="text-[11px] text-[#928EA8] leading-tight">
                  Contate nossos especialistas de infraestrutura em caso de emergência.
                </p>
                <button 
                  onClick={() => toast.success("Central de Suporte Notificada! Em breve entraremos em contato.")}
                  className="mt-3 w-full bg-[#201844] hover:bg-[#6B42F2] text-white font-extrabold py-2 px-3 rounded-xl transition-all text-xs border border-[#322860] hover:border-[#6B42F2] shadow-sm cursor-pointer"
                >
                  Contatar Suporte
                </button>
              </div>
            </div>

            {/* User Profile Bar */}
            <div className="p-3.5 border-t border-[#231C42] shrink-0">
              <div className="bg-[#130F26] border border-[#231C42] rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6B42F2] to-[#8B5CF6] flex items-center justify-center text-xs font-black text-white overflow-hidden shrink-0">
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
                    <span className="text-xs font-bold text-white truncate">{user.displayName || 'Operador'}</span>
                    <span className="text-[10px] text-[#928EA8] truncate">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Sair do sistema"
                  className="p-1.5 text-[#928EA8] hover:text-white hover:bg-[#201844] rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Exit Presentation Mode Floating Glassmorphic Control */}
        <AnimatePresence>
          {isPresentationMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="fixed bottom-8 right-8 z-50 pointer-events-auto"
            >
              <button 
                onClick={togglePresentationMode}
                className="flex items-center gap-3 px-6 py-4 bg-[#130F26]/90 hover:bg-[#6B42F2] hover:text-white text-white rounded-2xl backdrop-blur-xl border border-[#231C42] transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group cursor-pointer font-black text-xs uppercase tracking-wider focus:outline-none"
                title="Sair do Modo de Reunião (ESC)"
              >
                <X className="w-5 h-5 group-hover:rotate-95 transition-transform duration-300" />
                <span>Sair do Modo Reunião</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header with layout animation */}
        <AnimatePresence mode="wait">
          {!isPresentationMode && (
            <motion.header 
              initial={{ height: 0, opacity: 0, y: -80 }}
              animate={{ height: 80, opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -80 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="h-20 bg-[#0A0718]/80 backdrop-blur-md border-b border-[#231C42] flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <h1 className="font-heading text-xl font-black text-white tracking-tight">
                  {location.pathname.startsWith('/cliente/') 
                    ? 'Dashboard do Cliente' 
                    : (navItems.find(i => i.path === location.pathname || (i.id === 'dashboard' && location.pathname === '/'))?.label || 'Dashboard')}
                </h1>
                <div className="hidden lg:flex items-center gap-2 bg-[#130F26] border border-[#231C42] text-[11px] font-mono text-[#928EA8] px-3 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span>ID do Sistema: <strong className="text-white">RB0000488</strong></span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  onClick={togglePresentationMode}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#928EA8] hover:text-white bg-[#130F26] hover:bg-[#201844] transition-all rounded-xl font-bold text-xs border border-[#231C42] hover:border-[#6B42F2] cursor-pointer"
                  title="Iniciar Reunião de Diretoria"
                >
                  <Presentation className="w-4 h-4 text-[#6B42F2]" />
                  <span className="hidden sm:inline">Modo Reunião</span>
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  onClick={toggleDarkMode}
                  className="p-2.5 bg-[#130F26] border border-[#231C42] text-[#928EA8] hover:text-white hover:border-[#6B42F2] transition-colors rounded-xl cursor-pointer"
                  title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#6B42F2]" />}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="relative p-2.5 bg-[#130F26] border border-[#231C42] text-[#928EA8] hover:text-white hover:border-[#6B42F2] transition-colors rounded-xl cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadActivitiesCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF2A85] rounded-full ring-2 ring-[#0A0718]"></span>
                  )}
                </motion.button>

                {effectiveIsEditor && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#6B42F2] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#9333EA] text-white rounded-xl active:scale-95 flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_4px_20px_rgba(107,66,242,0.4)] transition-all select-none"
                  >
                    <Plus className="w-4 h-4 font-black" />
                    Registrar Backup
                  </button>
                )}
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Scrollable Content */}
        <div className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          isPresentationMode ? "p-6 md:p-12 lg:p-16 bg-bg-main" : "p-4 md:p-8"
        )}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
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
                <Route path="/dashboard" element={<DashboardView backups={backups} clients={clients} isPresentationMode={isPresentationMode} isLoading={isLoadingData} />} />
                <Route path="/semanal" element={<WeeklyExecutiveView backups={backups} tasks={tasks} isLoading={isLoadingData} />} />
                <Route path="/timeline" element={
                  <TimelineView 
                    activities={activities} 
                    clients={clients} 
                    onMarkAsRead={markActivitiesAsRead} 
                    isLoading={isLoadingData} 
                  />
                } />
                <Route path="/registros" element={<RecordsView backups={backups} clients={clients} onEdit={effectiveIsEditor ? openEditBackup : undefined} onDelete={effectiveIsEditor ? deleteBackup : undefined} isLoading={isLoadingData} />} />
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
                <Route path="/clientes" element={<ClientsListView clients={clients} backups={backups} isLoading={isLoadingData} />} />
                <Route path="/cliente/:clientId" element={<ClientDashboardView clients={clients} backups={backups} isLoading={isLoadingData} />} />
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
                      isLoading={isLoadingData}
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
          backups={backups}
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

