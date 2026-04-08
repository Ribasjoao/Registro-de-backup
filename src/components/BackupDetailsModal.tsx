import React from 'react';
import { X, Calendar, User, Building2, CheckCircle2, AlertTriangle, XCircle, FileText, ClipboardList, Database, HardDrive } from 'lucide-react';
import { BackupRecord } from '../types';
import { StatusBadge } from './UI';
import { cn } from '../lib/utils';

interface BackupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backup: BackupRecord | null;
}

export function BackupDetailsModal({ isOpen, onClose, backup }: BackupDetailsModalProps) {
  if (!isOpen || !backup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-border-main">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-main flex items-center justify-between bg-bg-main/50">
          <div className="flex items-center gap-3">
            <StatusBadge status={backup.status} />
            <h2 className="font-heading text-lg font-bold text-text-main truncate max-w-[400px]">
              {backup.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-main rounded-full transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-semibold text-text-main">{backup.client}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Data da Auditoria</p>
                  <p className="text-sm font-semibold text-text-main">{backup.timestamp}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Responsável</p>
                  <p className="text-sm font-semibold text-text-main">{backup.responsible}</p>
                </div>
              </div>

              {backup.node && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Node / Servidor</p>
                    <p className="text-sm font-semibold text-text-main">{backup.node}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tipo de Backup</p>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-1",
                    backup.backupType?.toLowerCase().includes('cloud') || backup.backupType?.toLowerCase().includes('nuvem')
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-bg-main text-text-secondary border-border-main"
                  )}>
                    {backup.backupType || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tamanho</p>
                  <p className="text-sm font-semibold text-text-main">{backup.size || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-bg-main rounded-lg text-text-secondary">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Categoria</p>
                  <p className="text-sm font-semibold text-text-main">{backup.category}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand">
              <ClipboardList className="w-5 h-5" />
              <h3 className="font-heading font-bold text-text-main">Análise Técnica</h3>
            </div>
            <div className="bg-bg-main rounded-xl p-4 border border-border-main min-h-[100px]">
              {backup.technicalAnalysis ? (
                <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">
                  {backup.technicalAnalysis}
                </p>
              ) : (
                <p className="text-sm text-text-secondary italic">Nenhuma análise técnica registrada.</p>
              )}
            </div>
          </div>

          {/* Action Plan */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-heading font-bold text-text-main">Plano de Ação</h3>
            </div>
            <div className="bg-brand/5 rounded-xl p-4 border border-brand/10 min-h-[100px]">
              {backup.actionPlan ? (
                <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">
                  {backup.actionPlan}
                </p>
              ) : (
                <p className="text-sm text-text-secondary italic">Nenhum plano de ação registrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-main bg-bg-main/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-all shadow-sm active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
