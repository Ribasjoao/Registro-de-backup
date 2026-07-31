import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../../hooks/useTasks';
import { useGamification } from '../../hooks/useGamification';
import { useUsers } from '../../hooks/useUsers';

// Use vi.hoisted for variables referenced in vi.mock factories
const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    uid: 'test-user-123',
    email: 'operator@backup.com',
    displayName: 'Operador Teste',
    photoURL: null,
  },
}));

// Mock Firebase
vi.mock('../../firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'admin-123',
      displayName: 'Admin User',
      email: 'admin@backup.com',
    },
  },
  firebaseConfig: {},
  doc: vi.fn((db, path, id) => ({ path, id })),
  collection: vi.fn((db, path) => ({ path })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ xp: 100, level: 'Analista de Retenção & Storage', role: 'editor' }),
  }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn().mockResolvedValue({ id: 'audit-new-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  setDoc: vi.fn().mockResolvedValue(undefined),
  handleFirestoreError: vi.fn(),
  OperationType: { WRITE: 'write', UPDATE: 'update', DELETE: 'delete' },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, path) => ({ path })),
  doc: vi.fn((db, path, id) => ({ path, id })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  addDoc: vi.fn().mockResolvedValue({ id: 'task-new-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((q, callback) => {
    callback({
      docs: [
        {
          id: 'task-1',
          data: () => ({
            title: 'Audit Rotina Veeam',
            completed: false,
            createdAt: '2026-07-31T00:00:00Z',
            userId: 'test-user-123',
            status: 'today',
            type: 'rotina',
            priority: 'high',
            owner: 'Operador Teste',
          }),
        },
      ],
    });
    return () => {};
  }),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  deleteApp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: { uid: 'new-user-456' },
  }),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: {
      uid: 'test-user-123',
      email: 'operator@backup.com',
      displayName: 'Operador Teste',
    },
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({
      uid: 'test-user-123',
      email: 'operator@backup.com',
      displayName: 'Operador Teste',
    });
    return () => {};
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast-123'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('3.2 Custom Hooks - useTasks (CRUD de Tarefas / Auditorias)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar e listar tarefas para um usuário autenticado', async () => {
    const { result } = renderHook(() => useTasks(mockUser.uid, mockUser.displayName));

    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Audit Rotina Veeam');
  });

  it('deve adicionar uma nova tarefa chamando o Firestore com os dados corretos', async () => {
    const { result } = renderHook(() => useTasks(mockUser.uid, mockUser.displayName));

    await act(async () => {
      await result.current.addTask({
        title: 'Nova Tarefa de Retenção',
        type: 'rotina',
        priority: 'medium',
      });
    });

    const { addDoc } = await import('firebase/firestore');
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Nova Tarefa de Retenção',
        type: 'rotina',
        priority: 'medium',
        userId: mockUser.uid,
      })
    );
  });

  it('deve alternar status de conclusão e importância de uma tarefa', async () => {
    const { result } = renderHook(() => useTasks(mockUser.uid, mockUser.displayName));

    await act(async () => {
      await result.current.toggleTask('task-1', true);
    });

    const { updateDoc } = await import('firebase/firestore');
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        completed: true,
        status: 'done',
      })
    );

    await act(async () => {
      await result.current.toggleImportant('task-1', true);
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        important: true,
      })
    );
  });

  it('deve excluir uma tarefa no Firestore', async () => {
    const { result } = renderHook(() => useTasks(mockUser.uid, mockUser.displayName));

    await act(async () => {
      await result.current.deleteTask('task-1');
    });

    const { deleteDoc } = await import('firebase/firestore');
    expect(deleteDoc).toHaveBeenCalled();
  });
});

describe('3.2 Custom Hooks - useGamification', () => {
  it('deve conceder XP e retornar nível correspondente', () => {
    const { result } = renderHook(() => useGamification());

    expect(typeof result.current.awardXP).toBe('function');
    expect(typeof result.current.getLevelInfo).toBe('function');

    expect(result.current.getLevelInfo(0)).toBe('Operador de Snapshot L1');
    expect(result.current.getLevelInfo(350)).toBe('Engenheiro de Disaster Recovery');
  });
});

describe('3.2 Custom Hooks - useUsers / Autenticação (Gestão de Usuários)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar um novo usuário com credenciais e papel válidos', async () => {
    const { result } = renderHook(() => useUsers());

    let newUser: any;
    await act(async () => {
      newUser = await result.current.createUser('Carlos Silva', 'carlos@backup.com', 'senha123', 'editor');
    });

    expect(newUser).not.toBeNull();
    expect(newUser.id).toBe('new-user-456');
    expect(newUser.displayName).toBe('Carlos Silva');
    expect(newUser.role).toBe('editor');
  });

  it('deve lidar com falhas de criação de usuário capturando o erro', async () => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    (createUserWithEmailAndPassword as any).mockRejectedValueOnce(new Error('Email em uso'));

    const { result } = renderHook(() => useUsers());

    let newUser: any;
    await act(async () => {
      newUser = await result.current.createUser('Carlos Silva', 'carlos@backup.com', 'senha123', 'editor');
    });

    expect(newUser).toBeNull();
    expect(result.current.error).toBe('Email em uso');
  });
});
