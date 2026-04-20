import React, { useState, useEffect } from 'react';
import { Modal } from './UI';
import { AlertCircle, CheckCircle2, FileText, ClipboardList, User, Calendar as CalendarIcon, Building2, Database, Sparkles, Loader2, ShieldAlert, History, UserCheck, Timer, Repeat } from 'lucide-react';
import { Client, BackupRecord, BackupStatus, BackupType, Criticality, RootCause, Impact, TreatmentStatus } from '../types';
import { analyzeBackupLog } from '../services/geminiService';

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
  const [backupType, setBackupType] = useState('');
  const [technicalAnalysis, setTechnicalAnalysis] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [status, setStatus] = useState<BackupStatus>('success');
  const [timestamp, setTimestamp] = useState('');
  const [error, setError] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Executive fields
  const [criticality, setCriticality] = useState<Criticality>('medium');
  const [rootCause, setRootCause] = useState<RootCause>('other');
  const [impact, setImpact] = useState<Impact>('medium');
  const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>('pending');
  const [responsibleTreatment, setResponsibleTreatment] = useState('');
  const [actionDeadline, setActionDeadline] = useState('');
  const [recurrence, setRecurrence] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClient(initialData.client || '');
      setBackupType(initialData.backupType || '');
      setTechnicalAnalysis(initialData.technicalAnalysis || '');
      setActionPlan(initialData.actionPlan || '');
      setStatus(initialData.status || 'success');
      setTimestamp(initialData.timestamp || new Date().toISOString());
      setRawLog('');
      
      setCriticality(initialData.criticality || 'medium');
      setRootCause(initialData.rootCause || 'other');
      setImpact(initialData.impact || 'medium');
      setTreatmentStatus(initialData.treatmentStatus || 'pending');
      setResponsibleTreatment(initialData.responsibleTreatment || '');
      setActionDeadline(initialData.actionDeadline || '');
      setRecurrence(initialData.recurrence || false);
    } else {
      setTitle('');
      setClient('');
      setBackupType('');
      setTechnicalAnalysis('');
      setActionPlan('');
      setStatus('success');
      setTimestamp(new Date().toISOString());
      setRawLog('');
      
      setCriticality('medium');
      setRootCause('other');
      setImpact('medium');
      setTreatmentStatus('pending');
      setResponsibleTreatment('');
      setActionDeadline('');
      setRecurrence(false);
    }
  }, [initialData, isOpen]);

  const handleAIAnalysis = async () => {
    if (!rawLog.trim()) {
      setError('Por favor, cole o log de erro para analisar.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await analyzeBackupLog(rawLog, client);
      
      if (typeof result === 'string') {
        setError(result);
      } else {
        setTechnicalAnalysis(result.technicalAnalysis);
        setActionPlan(result.actionPlan);
      }
    } catch (err: any) {
      setError('Falha ao conectar com o serviço de IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!title || !client) {
      setError('Título e Cliente são obrigatórios.');
      return;
    }
    
    const backupData: Partial<BackupRecord> = {
      ...(initialData && { id: initialData.id }),
      title,
      client,
      backupType,
      technicalAnalysis,
      actionPlan,
      status,
      timestamp,
      responsible: initialData?.responsible || defaultResponsible || 'João Santos',
      category: initialData?.category || 'Rotina',
      
      // Executive fields
      criticality,
      rootCause,
      impact,
      treatmentStatus,
      responsibleTreatment,
      actionDeadline,
      recurrence,
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

        {/* Executive Presentation Fields (Visible for issues) */}
        {(status === 'failed' || status === 'warning') && (
          <div className="space-y-4 p-5 bg-bg-main rounded-2xl border border-border-main animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              Detalhamento Executivo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Criticidade */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  Criticidade
                </label>
                <select 
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value as Criticality)}
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

              {/* Impacto */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  Impacto
                </label>
                <select 
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as Impact)}
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="low">Baixo</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </div>

              {/* Causa Raiz */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  <History className="w-3.5 h-3.5" />
                  Causa Raiz
                </label>
                <select 
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value as RootCause)}
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="network">Rede</option>
                  <option value="storage">Armazenamento</option>
                  <option value="credential">Credencial</option>
                  <option value="service">Serviço</option>
                  <option value="window">Janela</option>
                  <option value="human">Humano</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Status do Tratamento */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  Status do Tratamento
                </label>
                <select 
                  value={treatmentStatus}
                  onChange={(e) => setTreatmentStatus(e.target.value as TreatmentStatus)}
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                >
                  <option value="pending">Pendente</option>
                  <option value="analyzing">Em Análise</option>
                  <option value="mitigated">Mitigado</option>
                  <option value="resolved">Resolvido</option>
                </select>
              </div>

              {/* Responsável pelo Tratamento */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  <UserCheck className="w-3.5 h-3.5" />
                  Resp. Tratamento
                </label>
                <input
                  type="text"
                  value={responsibleTreatment}
                  onChange={(e) => setResponsibleTreatment(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              {/* Prazo da Ação */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-text-main">
                  <Timer className="w-3.5 h-3.5" />
                  Prazo da Ação
                </label>
                <input
                  type="date"
                  value={actionDeadline}
                  onChange={(e) => setActionDeadline(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border-main bg-bg-card text-xs text-text-main focus:ring-1 focus:ring-brand outline-none"
                />
              </div>
            </div>

            {/* Recorrência */}
            <div className="flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={recurrence}
                  onChange={(e) => setRecurrence(e.target.checked)}
                />
                <div className="w-9 h-5 bg-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                <span className="ml-3 text-xs font-bold text-text-main flex items-center gap-2">
                  <Repeat className="w-3.5 h-3.5 text-text-secondary" />
                  Problema Recorrente?
                </span>
              </label>
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        {(status === 'failed' || status === 'warning') && (
          <div className="space-y-3 p-4 bg-bg-main rounded-xl border border-border-main animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <Sparkles className="w-4 h-4 text-brand" />
                Log Bruto do Erro (IA)
              </label>
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || !rawLog.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analisar com IA
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              placeholder="Cole aqui o log de erro do Nakivo para diagnóstico automático..."
              className="w-full p-3 rounded-lg border border-border-main bg-bg-card text-text-main text-xs font-mono focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none transition-all"
            />
          </div>
        )}

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
