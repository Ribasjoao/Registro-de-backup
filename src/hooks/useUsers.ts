import { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig, handleFirestoreError, OperationType } from '../firebase';
import { AppUser } from '../types';
import { toast } from 'react-hot-toast';
import { logAction } from '../services/auditService';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export function useUsers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (name: string, email: string, password: string, role: 'admin' | 'editor' | 'viewer'): Promise<AppUser | null> => {
    setLoading(true);
    setError(null);
    const toastId = toast.loading('Criando usuário...');

    let tempApp;
    try {
      // 1. Initialize temporary secondary app to avoid logging out the current admin
      const secAppName = `secondary-app-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, secAppName);
      const tempAuth = getAuth(tempApp);

      // 2. Create the user inside secondary auth
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUid = userCredential.user.uid;

      // 3. Update the displayName in the secondary user auth instance
      await updateProfile(userCredential.user, { displayName: name });

      // 4. Safely delete the secondary application
      await deleteApp(tempApp);
      tempApp = null;

      // 5. Write profile metadata to main Firestore database under the 'users' collection
      const userDocRef = doc(db, 'users', newUid);
      const userProfile = {
        uid: newUid,
        email,
        displayName: name,
        role,
        xp: 0,
        level: role === 'admin' ? 'Coordenador de Backup L1' : 'Operador de Snapshot L1',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, userProfile);

      // Audit Log creation
      const currentAdmin = auth.currentUser;
      if (currentAdmin) {
        await logAction(
          currentAdmin.uid,
          currentAdmin.displayName || currentAdmin.email || 'Admin',
          'CREATE_USER',
          `Criou o usuário: "${name}" (${email}) com o perfil ${role.toUpperCase()}`
        );
      }

      toast.success('Usuário criado com sucesso!', { id: toastId });
      return { id: newUid, ...userProfile } as AppUser;

    } catch (err: any) {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {
          console.error("Erro ao deletar app secundário residual:", e);
        }
      }
      const errorMessage = err?.message || 'Erro desconhecido ao criar usuário';
      setError(errorMessage);
      toast.error(`Erro ao criar usuário: ${errorMessage}`, { id: toastId });
      console.error('Erro na criação de usuário:', err);
      // Ensure we log correctly if firestore related
      if (err?.code && err.code.includes('permission')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    loading,
    error
  };
}
