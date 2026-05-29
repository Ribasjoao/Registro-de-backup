import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CloudCheck as CloudDone, 
  LogIn, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper function to normalize username into a internal gate7 email
  const getNormalizedEmail = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // If it doesn't contain '@', treat it as a local username under gate7.com
    if (!trimmed.includes('@')) {
      return `${trimmed.toLowerCase()}@gate7.com`;
    }
    return trimmed;
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Houve um erro no login com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = getNormalizedEmail(emailOrUsername);
    if (!normalizedEmail) {
      setError('Por favor, digite seu usuário ou email.');
      return;
    }

    if (!password) {
      setError('Por favor, informe a senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (isRegister && !displayName.trim()) {
      setError('Por favor, digite seu nome de exibição.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Create user
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        
        // Add display name
        await updateProfile(credential.user, {
          displayName: displayName.trim()
        });
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
    } catch (err: any) {
      console.error('Credentials auth error details:', err);
      let message = 'Ocorreu um erro ao processar. Tente novamente.';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Usuário/Email ou senha inválidos. Verifique os dados inseridos.';
      } else if (err.code === 'auth/invalid-credential') {
        message = 'Usuário/E-mail ou senha incorretos. Se você usou o Google Login anteriormente ou ainda não registrou esta credencial, use a aba "Cadastrar" ou clique em "Acessar com sua Conta Google" abaixo.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este nome de usuário ou e-mail já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha informada é muito fraca. Mínimo de 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de usuário ou e-mail inválido.';
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-card p-8 rounded-2xl shadow-xl max-w-md w-full border border-border-main"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center shadow-inner">
            <CloudDone className="w-10 h-10 text-brand" />
          </div>
        </div>
        
        <h1 className="font-heading text-3xl font-bold text-text-main mb-1 text-center">Gate7</h1>
        <p className="text-text-secondary text-sm mb-6 text-center">Gestão de Infraestrutura & Auditorias</p>

        {/* Tab switch */}
        <div className="grid grid-cols-2 bg-bg-main p-1 rounded-xl mb-6 border border-border-main/50">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              !isRegister 
                ? 'bg-bg-card text-brand shadow-sm font-black' 
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              isRegister 
                ? 'bg-bg-card text-brand shadow-sm font-black' 
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsAuth} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isRegister && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-11 px-3.5 rounded-xl border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all shadow-inner placeholder:text-text-secondary/40"
                  required={isRegister}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand" />
              Usuário ou E-mail
            </label>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder={isRegister ? "Ex: joao.ribas ou seu e-mail" : "Seu usuário ou e-mail de acesso"}
              className="w-full h-11 px-3.5 rounded-xl border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all shadow-inner placeholder:text-text-secondary/40"
              required
            />
            <span className="text-[9px] text-text-secondary flex items-center gap-1 mt-1 opacity-80">
              <HelpCircle className="w-3 h-3 text-brand shrink-0" />
              Você pode entrar ou cadastrar-se usando apenas um apelido (ex: <span className="font-semibold text-text-main">joao.ribas</span>)
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand" />
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all shadow-inner placeholder:text-text-secondary/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-text-secondary hover:text-text-main transition-colors select-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Feedback error alert banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-bold leading-tight"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                Cadastrar Conta
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar na Conta
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-main/50"></div>
          </div>
          <span className="relative bg-bg-card px-4 text-[10px] font-black uppercase tracking-wider text-text-secondary">ou se preferir</span>
        </div>

        {/* Google sign in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-2.5 bg-bg-main hover:bg-bg-main/60 border border-border-main text-text-main rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.882-6.437-6.437 0-3.555 2.882-6.437 6.437-6.437 1.483 0 2.845.511 3.931 1.353l3.05-3.05C18.91 1.83 15.753.8 12.24.8 6.059.8 1.05 5.808 1.05 12s5.008 11.2 11.19 11.2c5.804 0 10.963-4.114 10.963-11.2 0-.687-.061-1.352-.172-1.714H12.24z"
            />
          </svg>
          Acessar com sua Conta Google
        </button>

        <p className="mt-6 text-[10px] text-text-secondary text-center leading-relaxed">
          {isRegister ? 'Ao cadastrar-se, seu perfil será sincronizado automaticamente.' : 'Área reservada para técnicos e administradores autorizados.'}
        </p>
      </motion.div>
    </div>
  );
}
