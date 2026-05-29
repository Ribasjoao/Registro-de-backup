import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/75"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-bg-card rounded-xl shadow-2xl overflow-hidden border border-border-main"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main">
              <h2 className="font-heading text-xl font-bold text-text-main">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-lg hover:bg-bg-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };

  const icons = {
    success: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />,
    failed: <X className="w-3.5 h-3.5 mr-1.5" />,
  };

  const labels = {
    success: "Sucesso",
    warning: "Aviso",
    failed: "Falha",
  };

  const s = status as keyof typeof styles;

  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm", 
      styles[s]
    )}>
      {icons[s]}
      {labels[s]}
    </span>
  );
}
