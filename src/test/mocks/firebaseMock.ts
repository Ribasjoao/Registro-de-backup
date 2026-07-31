import { vi } from 'vitest';

export const mockUser = {
  uid: 'test-user-123',
  email: 'operator@backup.com',
  displayName: 'Operador Teste',
  photoURL: null,
};

export const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(mockUser);
    return () => {};
  }),
};

export const mockDb = {};

export const mockFirestoreFunctions = {
  collection: vi.fn((db, path) => ({ type: 'collection', path })),
  doc: vi.fn((db, path, id) => ({ type: 'doc', path, id })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ xp: 100, level: 'Analista de Retenção & Storage', role: 'editor' }),
  }),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      {
        id: 'doc-1',
        data: () => ({ title: 'Backup Teste 1', client: 'Cliente Alfa', status: 'success', timestamp: '2026-07-31T00:00:00Z' }),
      },
    ],
  }),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  setDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  limit: vi.fn((val) => ({ limit: val })),
  onSnapshot: vi.fn((query, callback) => {
    callback({
      docs: [
        {
          id: 'task-1',
          data: () => ({
            id: 'task-1',
            title: 'Verificar Job Veeaam',
            completed: false,
            createdAt: '2026-07-31T10:00:00.000Z',
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
  handleFirestoreError: vi.fn(),
  OperationType: {
    READ: 'read',
    WRITE: 'write',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
  },
  getDocFromServer: vi.fn().mockResolvedValue({ exists: () => true }),
};

export const mockAuthFunctions = {
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(mockUser);
    return () => {};
  }),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: mockUser }),
};
