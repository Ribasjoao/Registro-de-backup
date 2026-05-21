/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Moon,
  Sun,
  Trophy,
  Presentation,
  X,
  LayoutList
} from 'lucide-react';
import { cn } from './lib/utils';
import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { SettingsView } from './components/SettingsView';
import { DestinationsView } from './components/DestinationsView';
import { ReportsView } from './components/ReportsView';
import { TaskCenter } from './components/TaskCenter/TaskCenter';
import { WeeklyExecutiveView } from './components/WeeklyExecutiveView';
import { PresentationCarousel } from './components/PresentationCarousel';
import { RegisterBackupModal } from './components/RegisterBackupModal';
import { Login } from './components/Login';
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
  const [currentView, setCurrentView] = useState<View>('dashboard');
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
        // Check for custom claims (RBAC)
        const tokenResult = await getIdTokenResult(currentUser);
        const roleFromClaim = tokenResult.claims.role as string || 'viewer';
        const isAdminUser = roleFromClaim === 'admin';
        const isEditorUser = roleFromClaim === 'editor' || isAdminUser;

        setIsAdmin(isAdminUser);
        setIsEditor(isEditorUser);

        // Sync user profile to Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          let role = roleFromClaim;
          if (userSnap.exists()) {
            // If the document has a different role, we might want to sync it, 
            // but the claim is the source of truth for security rules.
            role = userSnap.data().role || role;
          }

          const userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            role: role,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          };

          if (!userSnap.exists()) {
            await setDoc(userRef, userData);
            setAppUser({ id: currentUser.uid, ...userData } as AppUser);
          } else {
            if (roleFromClaim === 'admin' && userSnap.data().role !== 'admin') {
              // Ensure the admin claim always has admin role in Firestore
              await updateDoc(userRef, { role: 'admin', displayName: currentUser.displayName, photoURL: currentUser.photoURL });
              role = 'admin';
            } else {
              // Update display name and photo if they changed
              await updateDoc(userRef, { displayName: currentUser.displayName, photoURL: currentUser.photoURL });
            }
            setAppUser({ id: currentUser.uid, ...userSnap.data(), ...userData, role } as AppUser);
          }

          setIsAdmin(role === 'admin');
          setIsEditor(role === 'admin' || role === 'editor');
        } catch (error) {
          console.error('Error syncing user profile:', error);
          // Fallback to claims if Firestore fails
          setIsAdmin(isAdminUser);
          setIsEditor(isEditorUser);
          setAppUser({
            id: currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: roleFromClaim as 'admin' | 'editor' | 'viewer',
            displayName: currentUser.displayName || undefined,
            photoURL: currentUser.photoURL || undefined
          });
        }
      } else {
        setIsAdmin(false);
        setIsEditor(false);
        setAppUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && tasks.length > 0) {
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
    }
  }, [user, tasks.length]);

  useEffect(() => {
    if (!user) return;

    // Listen to current user document for real-time XP updates
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setAppUser({ id: doc.id, ...doc.data() } as AppUser);
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
      // Don't throw here to keep the listener alive if possible
    });

    // Listen to Users (For Leaderboard and Admin)
    const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
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
  }, [user]);

  const addClient = async (name: string) => {
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'clients'), {
        name,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const updateClient = async (updatedClient: Client) => {
    if (!isAdmin) return;
    try {
      const { id, ...data } = updatedClient;
      await updateDoc(doc(db, 'clients', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${updatedClient.id}`);
    }
  };

  const deleteClient = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const addBackup = async (backup: Omit<BackupRecord, 'id'>) => {
    if (!isEditor) return;
    try {
      const docRef = await addDoc(collection(db, 'backups'), backup);
      
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
      handleFirestoreError(error, OperationType.CREATE, 'backups');
    }
  };

  const updateBackup = async (updatedBackup: BackupRecord) => {
    if (!isEditor) return;
    try {
      const { id, ...data } = updatedBackup;
      await updateDoc(doc(db, 'backups', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `backups/${updatedBackup.id}`);
    }
  };

  const updateDestination = async (updatedDest: StorageDestination) => {
    if (!isEditor) return;
    try {
      const { id, ...data } = updatedDest;
      await updateDoc(doc(db, 'destinations', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `destinations/${updatedDest.id}`);
    }
  };

  const addDestination = async (destination: Omit<StorageDestination, 'id'>) => {
    if (!isEditor) return;
    try {
      await addDoc(collection(db, 'destinations'), destination);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'destinations');
    }
  };

  const deleteDestination = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'destinations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `destinations/${id}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addBackupType = async (name: string) => {
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'backup_types'), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'backup_types');
    }
  };

  const updateBackupType = async (updatedType: BackupType) => {
    if (!isAdmin) return;
    try {
      const { id, ...data } = updatedType;
      await updateDoc(doc(db, 'backup_types', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `backup_types/${updatedType.id}`);
    }
  };

  const deleteBackupType = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'backup_types', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `backup_types/${id}`);
    }
  };

  const addTask = async (taskData: Partial<Task>) => {
    if (!user) return;
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { 
        completed,
        status: completed ? 'done' : 'doing'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const toggleImportant = async (id: string, important: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { important });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
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
    try {
      if (resetType === 'personal') {
        // 1. Apagar tarefas pessoais do usuário
        const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const tasksSnapshot = await getDocs(qTasks);
        const taskDeletePromises = tasksSnapshot.docs.map(docRef => deleteDoc(doc(db, 'tasks', docRef.id)));
        await Promise.all(taskDeletePromises);
      } else if (resetType === 'system' && isAdmin && systemOptions) {
        const { deleteBackups, deleteClients, deleteDestinations, clientNameFilter } = systemOptions;

        // 1. Apagar backups registrados (com ou sem filtro por cliente)
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

        // 2. Apagar todos os clientes se configurado
        if (deleteClients) {
          const clientsSnapshot = await getDocs(collection(db, 'clients'));
          const clientDeletePromises = clientsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'clients', docRef.id)));
          await Promise.all(clientDeletePromises);
        }

        // 3. Apagar todas as destinos de armazenamento configurados se selecionado
        if (deleteDestinations) {
          const destinationsSnapshot = await getDocs(collection(db, 'destinations'));
          const destDeletePromises = destinationsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'destinations', docRef.id)));
          await Promise.all(destDeletePromises);
        }
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      handleFirestoreError(error, OperationType.DELETE, `reset/${resetType}`);
    }
  };

  const openEditBackup = (backup: BackupRecord) => {
    if (!isEditor) return;
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'weekly', label: 'Resumo Semanal', icon: Presentation },
    { id: 'records', label: 'Registros', icon: ListTodo },
    { id: 'tasks', label: 'Tarefas', icon: LayoutList },
    { id: 'destinations', label: 'Destinos', icon: Database },
    { id: 'reports', label: 'Relatórios IA', icon: Sparkles },
    ...(isAdmin ? [{ id: 'settings', label: 'Configurações', icon: Settings }] : []),
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView backups={backups} />;
      case 'weekly':
        return <WeeklyExecutiveView backups={backups} tasks={tasks} />;
      case 'records':
        return <RecordsView backups={backups} onEdit={isEditor ? openEditBackup : undefined} />;
      case 'tasks':
        return (
          <TaskCenter 
            tasks={tasks} 
            onAddTask={addTask} 
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask} 
            defaultOwner={user?.displayName || user?.email || 'Operador'}
          />
        );
      case 'destinations':
        return <DestinationsView destinations={destinations} clients={clients} onUpdate={isEditor ? updateDestination : async () => {}} onAdd={isEditor ? addDestination : async () => {}} onDelete={isAdmin ? deleteDestination : () => {}} isAdmin={isEditor} />;
      case 'reports':
        return <ReportsView backups={backups} />;
      case 'settings':
        return (
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
            backupTypes={backupTypes}
            onAddBackupType={addBackupType}
            onUpdateBackupType={updateBackupType}
            onDeleteBackupType={deleteBackupType}
            isAdmin={isAdmin}
            onResetData={handleResetData}
          />
        );
      default:
        return <DashboardView backups={backups} />;
    }
  };

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
              <CloudDone className="w-6 h-6 text-brand" />
              <span className="font-heading font-bold text-lg tracking-tight text-text-main">Dashboard</span>
            </div>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-l-4",
                  currentView === item.id 
                    ? "bg-brand/10 text-brand border-brand font-semibold" 
                    : "text-text-secondary hover:bg-bg-main hover:text-text-main border-transparent font-medium"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border-main">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="User" /> : user.email?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-text-main truncate">{user.displayName || 'Usuário'}</span>
                  <span className="text-xs text-brand truncate flex items-center gap-1 uppercase tracking-wider font-semibold">
                    {appUser?.role === 'admin' ? 'Administrador' : appUser?.role === 'editor' ? 'Editor' : 'Visualizador'}
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
                {navItems.find(i => i.id === currentView)?.label}
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
              {isEditor && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Registrar Backup
                </button>
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
            key={currentView + (isPresentationMode ? '-presentation' : '')}
            initial={{ opacity: 0, scale: isPresentationMode ? 0.95 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "mx-auto",
              isPresentationMode ? "w-full h-full max-w-none" : "max-w-[1440px]"
            )}
          >
            {renderView()}
          </motion.div>
        </div>
      </main>

      {isEditor && (
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
    </div>
  );
}

