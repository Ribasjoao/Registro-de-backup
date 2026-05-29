import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message }: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-bg-card rounded-xl shadow-2xl overflow-hidden border border-border-main"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main">
              <h2 className="font-heading text-lg font-bold text-text-main flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-lg hover:bg-bg-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-text-secondary text-sm leading-relaxed">{message}</p>
            </div>

            <div className="px-6 py-4 bg-bg-main/50 border-t border-border-main flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 border border-border-main rounded-lg text-sm font-semibold text-text-main hover:bg-bg-main transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-danger hover:bg-danger-dark text-white rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-sm"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
