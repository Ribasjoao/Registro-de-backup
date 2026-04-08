import React from 'react';
import { motion } from 'motion/react';
import { CloudCheck as CloudDone, LogIn } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

export function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center">
            <CloudDone className="w-10 h-10 text-brand" />
          </div>
        </div>
        
        <h1 className="font-heading text-3xl font-bold text-primary mb-2">Gate7</h1>
        <p className="text-muted mb-8">Gerenciamento profissional de backups e storage</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-brand hover:bg-brand-dark text-white py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95"
        >
          <LogIn className="w-5 h-5" />
          Entrar com Google
        </button>
        
        <p className="mt-8 text-xs text-muted">
          Acesso restrito a usuários autorizados.
        </p>
      </motion.div>
    </div>
  );
}
