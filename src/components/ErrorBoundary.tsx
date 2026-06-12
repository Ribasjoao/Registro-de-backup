import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, ShieldAlert, Sparkles, HardDrive } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

// Global auto-reload listener helper for uncaught chunk errors in dynamic modules
if (typeof window !== 'undefined') {
  const isChunkMessage = (msg: string): boolean => {
    const lowercaseMsg = (msg || '').toLowerCase();
    return [
      'failed to fetch dynamically imported module',
      'chunkloaderror',
      'error loading dynamically imported module',
      'loading chunk',
      'dynamic import'
    ].some(str => lowercaseMsg.includes(str));
  };

  const attemptAutoReload = (typeLabel: string) => {
    const hasReloadedKey = 'chunk-error-reloaded-cache';
    const now = Date.now();
    const lastReloadStamp = sessionStorage.getItem(hasReloadedKey);

    if (!lastReloadStamp || now - parseInt(lastReloadStamp, 10) > 10000) {
      sessionStorage.setItem(hasReloadedKey, now.toString());
      console.warn(`[Auto-Reload] ${typeLabel} detected. Reloading page automatically...`);
      window.location.reload();
    } else {
      console.error(`[Auto-Reload] ${typeLabel} detected but already reloaded in the last 10s. Showing fallback UI.`);
    }
  };

  const globalErrorListener = (event: ErrorEvent) => {
    const message = event.message || (event.error && event.error.message) || '';
    if (isChunkMessage(message)) {
      attemptAutoReload('Global chunk error');
    }
  };

  const globalRejectionListener = (event: PromiseRejectionEvent) => {
    const message = (event.reason && event.reason.message) || (event.reason && event.reason.toString()) || '';
    if (isChunkMessage(message)) {
      attemptAutoReload('Global chunk rejection');
    }
  };

  window.addEventListener('error', globalErrorListener);
  window.addEventListener('unhandledrejection', globalRejectionListener);
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const message = error?.message || '';
    const name = error?.name || '';
    const stack = error?.stack || '';
    
    const isChunk = [
      'failed to fetch dynamically imported module',
      'chunkloaderror',
      'error loading dynamically imported module',
      'loading chunk',
      'dynamic import'
    ].some(str => 
      message.toLowerCase().includes(str) || 
      name.toLowerCase().includes(str) ||
      stack.toLowerCase().includes(str)
    );

    return { 
      hasError: true, 
      error, 
      isChunkError: isChunk 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.state.isChunkError) {
      const hasReloadedKey = 'chunk-error-reloaded-cache';
      const now = Date.now();
      const lastReloadStamp = sessionStorage.getItem(hasReloadedKey);

      if (!lastReloadStamp || now - parseInt(lastReloadStamp, 10) > 10000) {
        sessionStorage.setItem(hasReloadedKey, now.toString());
        console.warn('[ErrorBoundary] Chunk load error caught. Proceeding to auto-reload...');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, isChunkError: false });
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      // Clear session storage flag to allow immediate reload if needed
      sessionStorage.removeItem('chunk-error-reloaded-cache');
      
      // Attempt to clean up cached application paths/states
      if (typeof window !== 'undefined' && window.caches) {
        window.caches.keys().then((names) => {
          names.forEach((name) => {
            window.caches.delete(name);
          });
        });
      }
    } catch (e) {
      console.error('Error clearing caches:', e);
    }
    
    this.setState({ hasError: false, error: null, isChunkError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado na execução do sistema.';
      const rawError = this.state.error;

      if (rawError?.message) {
        try {
          const parsed = JSON.parse(rawError.message);
          if (parsed && parsed.error) {
            errorMessage = `Erro no Firestore: ${parsed.error}`;
          } else {
            errorMessage = rawError.message;
          }
        } catch (e) {
          errorMessage = rawError.message;
        }
      }

      const isChunk = this.state.isChunkError;

      return (
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-bg-main overflow-hidden premium-bg-layout select-none">
          {/* Neon/Ambient Blur Orbs for Premium Glassmorphism Look */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand/10 dark:bg-brand/15 rounded-full filter blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-danger/5 dark:bg-brand-dark/10 rounded-full filter blur-[120px] pointer-events-none animate-pulse" />

          {/* Premium Glassmorphism Container */}
          <div className="relative max-w-lg w-full p-8 md:p-10 rounded-3xl backdrop-blur-xl border border-white/20 dark:border-white/5 bg-white/75 dark:bg-bg-card/45 shadow-2xl z-10 transition-all duration-300">
            
            {/* Top Indicator */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand/50 via-danger/50 to-brand/50" />

            <div className="text-center">
              {/* Dynamic Animated Warning Icon Container */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-danger/10 dark:bg-danger/20 border border-danger/20 dark:border-danger/30 text-danger relative group">
                <AlertTriangle className="w-10 h-10 animate-bounce" />
                <div className="absolute inset-0 rounded-2xl bg-danger/15 scale-110 animate-ping -z-10 opacity-30" />
              </div>

              {/* Header Title */}
              <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tight text-text-main">
                {isChunk ? 'Atualização Detectada' : 'Ops! Algo deu errado'}
              </h1>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                Gate7 Shield • Modo de Recuperação
              </p>

              {/* Minimalist Divider Line */}
              <div className="h-[1px] w-20 mx-auto my-6 bg-gradient-to-r from-transparent via-border-main to-transparent" />

              {/* Explanatory Message context-aware */}
              <p className="text-sm font-medium text-text-main leading-relaxed px-2">
                {isChunk ? (
                  'Uma nova versão do Gate7 foi implantada! Para garantir a segurança e integridade das conexões de infraestrutura, os arquivos do sistema precisam ser sincronizados.'
                ) : (
                  'Ocorreu uma falha inesperada durante a renderização de um componente operacional do Gate7.'
                )}
              </p>

              {/* Glassy Error Log Box */}
              <div className="p-4 my-6 rounded-2xl border border-border-main/50 bg-bg-main/40 dark:bg-slate-900/40 text-xs font-mono text-text-secondary select-text overflow-x-auto max-h-36 custom-fine-scrollbar text-center relative group">
                <span className="absolute top-2 right-3 text-[10px] font-bold text-brand uppercase tracking-wider opacity-60">LOG</span>
                <p className="break-all whitespace-pre-wrap">{errorMessage}</p>
                {isChunk && (
                  <p className="text-[11px] text-brand/80 font-bold mt-2">
                    Erro de carregamento de bloco de deploy (ChunkLoadError).
                  </p>
                )}
              </div>

              {/* Action Buttons Stack */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  id="error-boundary-reload-btn"
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-brand hover:bg-brand-dark hover:scale-[1.01] active:scale-[0.99] text-white rounded-2xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-brand/20 transition-all duration-300 cursor-pointer"
                >
                  <RefreshCcw className="w-4 h-4 animate-spin-slow" />
                  Recarregar Aplicativo
                </button>

                {isChunk && (
                  <button
                    type="button"
                    id="error-boundary-hard-reload-btn"
                    onClick={this.handleHardReset}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border-main hover:bg-bg-main/60 hover:scale-[1.01] active:scale-[0.99] text-text-secondary hover:text-text-main rounded-2xl font-semibold text-xs transition-all duration-300 cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5 mr-1" />
                    Forçar Limpeza de Cache & Atualizar
                  </button>
                )}
              </div>

              {/* Brand Footer */}
              <p className="text-[10px] text-text-secondary/60 mt-8 font-mono tracking-widest flex items-center justify-center gap-1 select-none">
                <Sparkles className="w-3 h-3 text-brand" /> GATE7 ENGINEERING SYSTEM
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
