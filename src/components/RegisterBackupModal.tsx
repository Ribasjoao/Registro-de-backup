import React, { useState, useEffect } from 'react';
import { Modal } from './UI';
import { AlertCircle, CheckCircle2, FileText, ClipboardList, User, Calendar as CalendarIcon, Building2, Database } from 'lucide-react';
import { Client, BackupRecord, BackupStatus, BackupType } from '../types';

interface RegisterBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  backupTypes: BackupType[];
  onSave: (backup: Partial<BackupRecord>) => void;
  isSaving?: boolean;
  initialData?: BackupRecord;
  defaultResponsible?: string;
}

export function RegisterBackupModal({ isOpen, onClose, clients, backupTypes, onSave, isSaving, initialData, defaultResponsible }: RegisterBackupModalProps) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [node, setNode] = useState('');
  const [backupType, setBackupType] = useState('');
  const [technicalAnalysis, setTechnicalAnalysis] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [status, setStatus] = useState<BackupStatus>('success');
  const [size, setSize] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClient(initialData.client || '');
      setNode(initialData.node || '');
      setBackupType(initialData.backupType || '');
      setTechnicalAnalysis(initialData.technicalAnalysis || '');
      setActionPlan(initialData.actionPlan || '');
      setStatus(initialData.status || 'success');
      setSize(initialData.size || '');
      setTimestamp(initialData.timestamp || new Date().toISOString());
    } else {
      setTitle('');
      setClient('');
      setNode('');
      setBackupType('');
      setTechnicalAnalysis('');
      setActionPlan('');
      setStatus('success');
      setSize('');
      setTimestamp(new Date().toISOString());
    }
  }, [initialData, isOpen]);

  const handleSave = () => {
    if (!title || !client) {
      setError('Título e Cliente são obrigatórios.');
      return;
    }
    
    const backupData: Partial<BackupRecord> = {
      ...(initialData && { id: initialData.id }),
      title,
      client,
      node,
      backupType,
      technicalAnalysis,
      actionPlan,
      status,
      size,
      timestamp,
      responsible: initialData?.responsible || defaultResponsible || 'João Santos',
      category: initialData?.category || 'Rotina',
    };

    onSave(backupData);
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Registro de Backup" : "Registrar Novo Backup"}>
      <div className="space-y-5">
        {/* Category Tag */}
        <div className="flex">
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-brand-light text-brand text-xs font-bold border border-brand/10">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {initialData?.category || 'Rotina'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Building2 className="w-4 h-4 text-muted" />
              Cliente
            </label>
            <select 
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Node / Servidor */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Database className="w-4 h-4 text-muted" />
              Node / Servidor
            </label>
            <input
              type="text"
              value={node}
              onChange={(e) => setNode(e.target.value)}
              placeholder="Ex: SRV-APP-01"
              className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
            />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <FileText className="w-4 h-4 text-muted" />
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Validação Diária"
              className={`w-full h-10 px-3 rounded-lg border ${error && !title ? 'border-danger' : 'border-border-main'} bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all`}
            />
          </div>

          {/* Tamanho */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <FileText className="w-4 h-4 text-muted" />
              Tamanho (Opcional)
            </label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Ex: 10 GB, 500 MB"
              className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
            />
          </div>

          {/* Tipo de Backup */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Database className="w-4 h-4 text-muted" />
              Tipo de Backup
            </label>
            <select 
              value={backupType}
              onChange={(e) => setBackupType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
            >
              <option value="">Selecione o tipo...</option>
              {backupTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}

        {/* Análise Técnica */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
            <ClipboardList className="w-4 h-4 text-muted" />
            Análise Técnica
          </label>
          <textarea
            rows={4}
            value={technicalAnalysis}
            onChange={(e) => setTechnicalAnalysis(e.target.value)}
            placeholder="Descreva os cenários observados na janela de execução..."
            className="w-full p-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none transition-all"
          />
        </div>

        {/* Plano de Ação */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
            <ClipboardList className="w-4 h-4 text-muted" />
            Plano de Ação
          </label>
          <textarea
            rows={2}
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            placeholder="Insira o valor aqui"
            className="w-full p-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none transition-all"
          />
        </div>

        {/* Data e Responsável */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <CalendarIcon className="w-4 h-4 text-muted" />
              Data da Auditoria
            </label>
            <input
              type="text"
              value={new Date(timestamp).toLocaleString('pt-BR')}
              className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-main text-text-main text-sm outline-none cursor-not-allowed"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <User className="w-4 h-4 text-muted" />
              Responsável
            </label>
            <div className="h-10 px-3 flex items-center rounded-lg bg-bg-main border border-border-main text-sm font-medium text-text-main">
              {initialData?.responsible || defaultResponsible || 'João Santos'}
            </div>
          </div>
        </div>

        {/* Status Selector */}
        <div className="pt-2">
          <label className="text-sm font-semibold text-text-main block mb-3">Status Final</label>
          <div className="flex gap-3">
            {(['success', 'warning', 'failed'] as BackupStatus[]).map((s) => (
              <label key={s} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all flex-1 ${status === s ? 'border-brand bg-brand/10' : 'border-border-main hover:bg-bg-main'}`}>
                <input 
                  type="radio" 
                  name="status" 
                  className="w-4 h-4 text-brand focus:ring-brand" 
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-text-main">
                  {s === 'success' ? 'Sucesso' : s === 'warning' ? 'Aviso' : 'Falha'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border-main">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-main rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Salvando...' : initialData ? 'Atualizar Registro' : 'Salvar Registro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
