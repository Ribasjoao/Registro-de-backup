import React, { useState, useEffect } from 'react';
import { Modal } from './UI';
import { LiquidMetalButton } from './LiquidMetal';
import { 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  User, 
  Calendar as CalendarIcon, 
  Building2, 
  Database, 
  ShieldAlert, 
  History, 
  UserCheck, 
  Timer, 
  Repeat, 
  Check, 
  HelpCircle,
  Activity,
  Plus,
  Trash2,
  Cloud,
  Server,
  Sparkles,
  Info
} from 'lucide-react';
import { Client, BackupRecord, BackupStatus, BackupType, Criticality, RootCause, Impact, TreatmentStatus } from '../types';
import { cn } from '../lib/utils';

interface RegisterBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  backups: BackupRecord[];
  backupTypes: BackupType[];
  onSave: (backup: Partial<BackupRecord> | Partial<BackupRecord>[]) => void;
  isSaving?: boolean;
  initialData?: BackupRecord;
  defaultResponsible?: string;
}

interface JobItem {
  id: string;
  title: string;
  backupType: 'LOCAL' | 'CLOUD';
  status: BackupStatus;
  
  // Incident details
  technicalAnalysis?: string;
  actionPlan?: string;
  criticality?: Criticality;
  rootCause?: RootCause;
  impact?: Impact;
  treatmentStatus?: TreatmentStatus;
  responsibleTreatment?: string;
  actionDeadline?: string;
  recurrence?: boolean;
  showExecutiveFields?: boolean;
}

export function RegisterBackupModal({ 
  isOpen, 
  onClose, 
  clients, 
  backups,
  backupTypes, 
  onSave, 
  isSaving, 
  initialData, 
  defaultResponsible 
}: RegisterBackupModalProps) {
  
  const [client, setClient] = useState('');
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString());
  const [error, setError] = useState('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [jobs, setJobs] = useState<JobItem[]>([]);

  // Reset or initialize state
  useEffect(() => {
    if (initialData) {
      setClient(initialData.client || '');
      setTimestamp(initialData.timestamp || new Date().toISOString());
      setIsCustomClient(false);
      
      setJobs([
        {
          id: initialData.id,
          title: initialData.title || '',
          backupType: (initialData.backupType === 'CLOUD' ? 'CLOUD' : 'LOCAL') as 'LOCAL' | 'CLOUD',
          status: initialData.status || 'success',
          technicalAnalysis: initialData.technicalAnalysis || '',
          actionPlan: initialData.actionPlan || '',
          criticality: initialData.criticality || 'medium',
          rootCause: initialData.rootCause || 'other',
          impact: initialData.impact || 'medium',
          treatmentStatus: initialData.treatmentStatus || 'pending',
          responsibleTreatment: initialData.responsibleTreatment || '',
          actionDeadline: initialData.actionDeadline || '',
          recurrence: initialData.recurrence || false,
          showExecutiveFields: initialData.status !== 'success'
        }
      ]);
    } else {
      setClient('');
      setTimestamp(new Date().toISOString());
      setJobs([]);
      setIsCustomClient(false);
    }
    setError('');
  }, [initialData, isOpen]);

  // Handle client selection -> load previous jobs or smart defaults
  useEffect(() => {
    if (!client || initialData) return;
    
    // Search history for previous jobs of this client
    const previousBackups = backups.filter(b => b.client.toLowerCase() === client.toLowerCase());
    
    if (previousBackups.length > 0) {
      // Filter unique combinations of title and environment
      const uniqueJobs: { title: string; backupType: 'LOCAL' | 'CLOUD' }[] = [];
      const keys = new Set<string>();
      
      // Sort to get newest first so duplicates are ignored for oldest
      const sortedHistory = [...previousBackups].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      sortedHistory.forEach(b => {
        const title = b.title || '';
        const bType = (b.backupType === 'CLOUD' ? 'CLOUD' : 'LOCAL') as 'LOCAL' | 'CLOUD';
        const key = `${title.toLowerCase()}|${bType}`;
        if (!keys.has(key)) {
          keys.add(key);
          uniqueJobs.push({ title, backupType: bType });
        }
      });
      
      const items: JobItem[] = uniqueJobs.map((uj, idx) => ({
        id: `prev-${idx}-${Date.now()}`,
        title: uj.title,
        backupType: uj.backupType,
        status: 'success',
        technicalAnalysis: '',
        actionPlan: '',
        criticality: 'medium',
        rootCause: 'other',
        impact: 'medium',
        treatmentStatus: 'pending',
        responsibleTreatment: '',
        actionDeadline: '',
        recurrence: false,
        showExecutiveFields: false
      }));
      
      setJobs(items);
    } else {
      // Auto-generate high fidelity prefix out of client name (e.g. CLINICA SUL -> [CLI])
      const sanitizeName = client.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const parts = sanitizeName.split(/\s+/);
      let prefix = '';
      if (parts.length >= 2) {
        prefix = (parts[0].substring(0, 3) + parts[1].substring(0, 1)).toUpperCase();
      } else if (parts[0].length >= 3) {
        prefix = parts[0].substring(0, 3).toUpperCase();
      } else {
        prefix = parts[0].toUpperCase().padEnd(3, 'X');
      }
      
      setJobs([
        {
          id: `default-local-${Date.now()}`,
          title: `[${prefix}] - Backup LOCAL`,
          backupType: 'LOCAL',
          status: 'success',
          technicalAnalysis: '',
          actionPlan: '',
          criticality: 'medium',
          rootCause: 'other',
          impact: 'medium',
          treatmentStatus: 'pending',
          responsibleTreatment: '',
          actionDeadline: '',
          recurrence: false,
          showExecutiveFields: false
        },
        {
          id: `default-cloud-${Date.now()}`,
          title: `[${prefix}] - Backup CLOUD`,
          backupType: 'CLOUD',
          status: 'success',
          technicalAnalysis: '',
          actionPlan: '',
          criticality: 'medium',
          rootCause: 'other',
          impact: 'medium',
          treatmentStatus: 'pending',
          responsibleTreatment: '',
          actionDeadline: '',
          recurrence: false,
          showExecutiveFields: false
        }
      ]);
    }
  }, [client, backups, initialData]);

  const updateJob = (id: string, updates: Partial<JobItem>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    setError('');
  };

  const addJob = () => {
    let prefix = 'JOB';
    if (client) {
      const sanitizeName = client.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const parts = sanitizeName.split(/\s+/);
      if (parts.length >= 2) {
        prefix = (parts[0].substring(0, 3) + parts[1].substring(0, 1)).toUpperCase();
      } else if (parts[0].length >= 3) {
        prefix = parts[0].substring(0, 3).toUpperCase();
      } else {
        prefix = parts[0].toUpperCase().padEnd(3, 'X');
      }
    }
    const idx = jobs.length + 1;
    
    setJobs(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}-${idx}`,
        title: `[${prefix}] - Servidor ${idx}`,
        backupType: 'LOCAL',
        status: 'success',
        technicalAnalysis: '',
        actionPlan: '',
        criticality: 'medium',
        rootCause: 'other',
        impact: 'medium',
        treatmentStatus: 'pending',
        responsibleTreatment: '',
        actionDeadline: '',
        recurrence: false,
        showExecutiveFields: false
      }
    ]);
    setError('');
  };

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setError('');
  };

  const handleSave = () => {
    if (!client) {
      setError('A identificação do Cliente é obrigatória.');
      return;
    }
    
    if (jobs.length === 0) {
      setError('Adicione pelo menos um Job para auditoria.');
      return;
    }

    // Individual job name validations
    const emptyJobIdx = jobs.findIndex(j => !j.title.trim());
    if (emptyJobIdx !== -1) {
      setError(`O Nome do Job #${emptyJobIdx + 1} não pode estar vazio.`);
      return;
    }

    // Descriptions validation for failed/warning items
    const missingAnalysisIncident = jobs.find(j => 
      (j.status === 'failed' || j.status === 'warning') && !j.technicalAnalysis?.trim()
    );
    if (missingAnalysisIncident) {
      setError(`Por favor, preencha a "Descrição da Ocorrência" para o job "${missingAnalysisIncident.title}" com alerta/falha.`);
      return;
    }

    const responsible = initialData?.responsible || defaultResponsible || 'João Santos';
    const category = initialData?.category || 'Rotina';

    const outputRecords: Partial<BackupRecord>[] = jobs.map(j => {
      const record: Partial<BackupRecord> = {
        title: j.title.trim(),
        client: client.trim(),
        backupType: j.backupType,
        status: j.status,
        timestamp,
        responsible,
        category,
      };

      if (initialData && initialData.id) {
        record.id = initialData.id;
      }

      if (j.status !== 'success') {
        record.technicalAnalysis = (j.technicalAnalysis || '').trim();
        record.actionPlan = (j.actionPlan || '').trim();
        record.criticality = j.criticality || 'medium';
        record.rootCause = j.rootCause || 'other';
        record.impact = j.impact || 'medium';
        record.treatmentStatus = j.treatmentStatus || 'pending';
        record.responsibleTreatment = (j.responsibleTreatment || '').trim();
        record.actionDeadline = j.actionDeadline || '';
        record.recurrence = j.recurrence || false;
      }

      return record;
    });

    if (initialData) {
      onSave(outputRecords[0]);
    } else {
      onSave(outputRecords);
    }
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Editar Registro de Auditoria" : "Nova Auditoria de Infraestrutura"}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 pr-1">
        
        {/* CLIENT SELECTION CARD */}
        <div className="bg-bg-card/40 border border-border-main/50 p-4 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-secondary">
              <Building2 className="w-4 h-4 text-brand" />
              Empresa / Cliente Regulado
            </label>
            {clients.length > 0 && !initialData && (
              <button
                type="button"
                onClick={() => {
                  setClient('');
                  setIsCustomClient(!isCustomClient);
                  setJobs([]);
                }}
                className={cn(
                  "text-[8px] font-extrabold uppercase tracking-wider border px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                  isCustomClient 
                    ? "bg-brand/10 border-brand/30 text-brand" 
                    : "bg-bg-main border-border-main text-text-secondary hover:text-text-main"
                )}
              >
                {isCustomClient ? 'Selecionar da Lista' : 'Digitar Novo Cliente'}
              </button>
            )}
          </div>
          
          {initialData ? (
            <div className="w-full h-10 px-3 bg-bg-main/50 text-text-main border border-border-main/40 rounded-lg flex items-center text-xs font-black">
              {client}
            </div>
          ) : (clients.length === 0 || isCustomClient ? (
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nome do cliente (Ex: Clinica Alfa)..."
              className={cn(
                "w-full h-10 px-3 rounded-lg border bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all shadow-inner",
                error && !client ? 'border-danger' : 'border-border-main'
              )}
            />
          ) : (
            <select 
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className={cn(
                "w-full h-10 px-3 rounded-lg border bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all cursor-pointer",
                error && !client ? 'border-danger' : 'border-border-main'
              )}
            >
              <option value="">Selecione o Cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          ))}
        </div>

        {/* DYNAMIC JOBS LISTING */}
        {client && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-text-secondary">
                Jobs atrelados à auditoria ({jobs.length})
              </span>
              <span className="text-[9px] text-text-muted flex items-center gap-1 font-bold">
                <Info className="w-3 h-3 text-brand" />
                Vincule o status individual
              </span>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {jobs.map((job, idx) => (
                <div 
                  key={job.id} 
                  className={cn(
                    "relative overflow-hidden p-4 rounded-xl border transition-all duration-300",
                    job.status === 'success' && "bg-bg-main/45 border-border-main/40 hover:border-green-500/10",
                    job.status === 'warning' && "bg-amber-500/[0.02] border-amber-500/20",
                    job.status === 'failed' && "bg-red-500/[0.02] border-red-500/20"
                  )}
                >
                  {/* Left status badge line decoration */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                    job.status === 'success' && "bg-green-500/40",
                    job.status === 'warning' && "bg-amber-500/70",
                    job.status === 'failed' && "bg-red-500/80"
                  )} />

                  {/* Job item primary grid row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between ml-1">
                    
                    {/* Environment segment slider */}
                    <div className="flex bg-bg-main p-0.5 rounded-lg border border-border-main/40 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateJob(job.id, { backupType: 'LOCAL' })}
                        className={cn(
                          "px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-md flex items-center gap-1 cursor-pointer transition-all",
                          job.backupType === 'LOCAL'
                            ? "bg-brand text-white shadow-sm"
                            : "text-text-secondary hover:text-text-main"
                        )}
                      >
                        <Server className="w-2.5 h-2.5" />
                        Local
                      </button>
                      <button
                        type="button"
                        onClick={() => updateJob(job.id, { backupType: 'CLOUD' })}
                        className={cn(
                          "px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-md flex items-center gap-1 cursor-pointer transition-all",
                          job.backupType === 'CLOUD'
                            ? "bg-brand text-white shadow-sm"
                            : "text-text-secondary hover:text-text-main"
                        )}
                      >
                        <Cloud className="w-2.5 h-2.5" />
                        Cloud
                      </button>
                    </div>

                    {/* Job Title / Name Input */}
                    <div className="flex-1 w-full min-w-0">
                      <input
                        type="text"
                        value={job.title}
                        onChange={(e) => updateJob(job.id, { title: e.target.value })}
                        placeholder={`Nome do job (ex: [${client.slice(0,3).toUpperCase()}] - Diário)...`}
                        className="w-full bg-bg-main/50 text-text-main text-xs font-semibold px-2.5 py-1.5 h-8.5 rounded-lg border border-border-main/40 focus:border-brand focus:ring-1 focus:ring-brand/10 outline-none transition-all"
                      />
                    </div>

                    {/* Simple compact status selector segment */}
                    <div className="flex shrink-0 gap-1 mt-1 sm:mt-0 w-full sm:w-auto">
                      {[
                        { key: 'success', label: 'Sucesso', active: 'border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/15', inactive: 'border-border-main/30 text-text-muted hover:text-green-500 hover:bg-green-500/5', color: 'bg-green-500' },
                        { key: 'warning', label: 'Aviso', active: 'border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/15', inactive: 'border-border-main/30 text-text-muted hover:text-amber-500 hover:bg-amber-500/5', color: 'bg-amber-500' },
                        { key: 'failed', label: 'Falha', active: 'border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/15', inactive: 'border-border-main/30 text-text-muted hover:text-red-500 hover:bg-red-500/5', color: 'bg-red-500' }
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            const isIssue = opt.key !== 'success';
                            updateJob(job.id, { 
                              status: opt.key as BackupStatus,
                              showExecutiveFields: isIssue,
                              ...(isIssue && {
                                criticality: job.criticality || 'medium',
                                rootCause: job.rootCause || 'other',
                                impact: job.impact || 'medium',
                                treatmentStatus: job.treatmentStatus || 'pending'
                              })
                            });
                          }}
                          className={cn(
                            "flex-1 sm:flex-none h-8 px-2 rounded-lg border text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer",
                            job.status === opt.key ? opt.active : opt.inactive
                          )}
                        >
                          <span className={cn("w-1 h-1 rounded-full", opt.color, job.status === opt.key && "animate-pulse")} />
                          {opt.label}
                        </button>
                      ))}

                      {/* Trash action button */}
                      {!initialData && jobs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeJob(job.id)}
                          className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center border border-border-main/30 h-8 w-8 ml-0.5"
                          title="Remover job do registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>

                  {/* INCIDENT DETAILS FORM (when warning or failed) */}
                  {job.status !== 'success' && (
                    <div className="mt-3 pt-3 border-t border-border-main/30 space-y-3.5 animate-in slide-in-from-top-2 duration-300 ml-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Technical Description */}
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-text-secondary">
                            <FileText className="w-3 h-3 text-brand" />
                            Análise / Descrição do Ocorrido
                          </label>
                          <textarea
                            rows={2}
                            value={job.technicalAnalysis || ''}
                            onChange={(e) => updateJob(job.id, { technicalAnalysis: e.target.value })}
                            placeholder="Descreva o que gerou o log de alerta ou a falha do job..."
                            className="w-full p-2 rounded-lg border border-border-main/40 bg-bg-main text-text-main text-xs font-semibold focus:border-brand outline-none resize-none transition-all shadow-inner"
                          />
                        </div>

                        {/* Action Plan */}
                        <div className="space-y-1">
                          <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-text-secondary">
                            <Activity className="w-3 h-3 text-brand" />
                            Plano de Mitigação / Reparo
                          </label>
                          <textarea
                            rows={2}
                            value={job.actionPlan || ''}
                            onChange={(e) => updateJob(job.id, { actionPlan: e.target.value })}
                            placeholder="Etapas realizadas ou planejadas para resolver o problema..."
                            className="w-full p-2 rounded-lg border border-border-main/40 bg-bg-main text-text-main text-xs font-semibold focus:border-brand outline-none resize-none transition-all shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Executive Collapsible Section inside Card */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => updateJob(job.id, { showExecutiveFields: !job.showExecutiveFields })}
                          className="w-full flex items-center justify-between p-2 bg-bg-main/60 hover:bg-bg-main/80 rounded-lg border border-border-main/20 text-text-secondary font-bold text-[9px] cursor-pointer"
                        >
                          <span className="flex items-center gap-1 font-black uppercase tracking-widest">
                            <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                            Métricas de Auditoria Corporativa
                          </span>
                          <span className="text-brand font-black">
                            {job.showExecutiveFields ? 'Recolher [-]' : 'Expandir [+]'}
                          </span>
                        </button>

                        {job.showExecutiveFields && (
                          <div className="p-3 bg-bg-main/40 border border-border-main/20 rounded-lg space-y-3 animate-in fade-in duration-200">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {/* Criticidade */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Criticidade</label>
                                <select 
                                  value={job.criticality || 'medium'}
                                  onChange={(e) => updateJob(job.id, { criticality: e.target.value as Criticality })}
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                >
                                  <option value="low">Baixa</option>
                                  <option value="medium">Média</option>
                                  <option value="high">Alta</option>
                                  <option value="critical">🚨 Crítica</option>
                                </select>
                              </div>

                              {/* Impacto */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Impacto</label>
                                <select 
                                  value={job.impact || 'medium'}
                                  onChange={(e) => updateJob(job.id, { impact: e.target.value as Impact })}
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                >
                                  <option value="low">Baixo Impacto</option>
                                  <option value="medium">Médio Impacto</option>
                                  <option value="high">Alto Impacto</option>
                                </select>
                              </div>

                              {/* Causa Raiz */}
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Causa Raiz</label>
                                <select 
                                  value={job.rootCause || 'other'}
                                  onChange={(e) => updateJob(job.id, { rootCause: e.target.value as RootCause })}
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                >
                                  <option value="network">Rede (WAN/DNS)</option>
                                  <option value="storage">Storage/Espaço</option>
                                  <option value="credential">Credencial Vmware</option>
                                  <option value="service">Serviço/Nakivo Daemon</option>
                                  <option value="window">Fora da Janela</option>
                                  <option value="human">Fator Humano</option>
                                  <option value="other">Outra Causa</option>
                                </select>
                              </div>

                              {/* Status de Tratamento */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Tratamento</label>
                                <select 
                                  value={job.treatmentStatus || 'pending'}
                                  onChange={(e) => updateJob(job.id, { treatmentStatus: e.target.value as TreatmentStatus })}
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                >
                                  <option value="pending">Pendente</option>
                                  <option value="analyzing">Em Diagnóstico</option>
                                  <option value="mitigated">Mitigação Temp.</option>
                                  <option value="resolved">Resolvido</option>
                                </select>
                              </div>

                              {/* Responsável pelo Tratamento */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Suporte Técnico</label>
                                <input
                                  type="text"
                                  value={job.responsibleTreatment || ''}
                                  onChange={(e) => updateJob(job.id, { responsibleTreatment: e.target.value })}
                                  placeholder="Nome..."
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                />
                              </div>

                              {/* Prazo da Solução */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-wider text-text-secondary">Prazo Solução</label>
                                <input
                                  type="date"
                                  value={job.actionDeadline || ''}
                                  onChange={(e) => updateJob(job.id, { actionDeadline: e.target.value })}
                                  className="w-full h-8 px-2 rounded-md border border-border-main/50 bg-bg-main text-[10px] text-text-main font-semibold outline-none"
                                />
                              </div>
                            </div>

                            {/* Recurrent Switches */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border-main/30">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={job.recurrence || false}
                                  onChange={(e) => updateJob(job.id, { recurrence: e.target.checked })}
                                />
                                <div className="w-8 h-4.5 bg-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-danger"></div>
                                <span className="ml-2.5 text-[9px] font-bold text-text-main">
                                  Este erro é reincidente/recorrente neste servidor?
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

            {/* ADD JOB BUTTON CONTROLLER */}
            {!initialData && (
              <button
                type="button"
                onClick={addJob}
                className="w-full py-2.5 border border-dashed border-border-main/60 hover:border-brand/40 text-text-secondary hover:text-brand bg-bg-card/30 hover:bg-brand/[0.03] rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-brand" />
                <span>+ Adicionar Job de Backup</span>
              </button>
            )}
          </div>
        )}

        {/* TIMESTAMP AND RESPONSIBLE DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5 border-t border-border-main/30 text-[10px] font-bold text-text-secondary">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-brand" />
            <span>Auditoria: </span>
            <input
              type="datetime-local"
              value={(() => {
                try {
                  const d = new Date(timestamp);
                  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 16) : d.toISOString().slice(0, 16);
                } catch {
                  return new Date().toISOString().slice(0, 16);
                }
              })()}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      setTimestamp(d.toISOString());
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }
              }}
              className="bg-transparent text-text-main outline-none focus:border-brand cursor-pointer text-[10px] font-black underline"
            />
          </div>
          <div className="flex items-center gap-1 sm:justify-end">
            <UserCheck className="w-3.5 h-3.5 text-brand" />
            <span>Resp: <span className="text-text-main font-black">{initialData?.responsible || defaultResponsible || 'João Santos'}</span></span>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <p className="text-xs font-bold text-danger text-center bg-danger/5 py-2 border border-danger/10 rounded-lg animate-pulse">
            {error}
          </p>
        )}

        {/* FOOTER ACTION BUTTONS row */}
        <div className="flex justify-between items-center pt-3 mt-1 border-t border-border-main/30">
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>Processando auditoria dinâmica...</span>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-[11px] font-black uppercase tracking-wider text-text-secondary bg-bg-main hover:bg-bg-main/60 rounded-xl border border-border-main transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <LiquidMetalButton
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              preset="chrome"
              className="flex-1 sm:flex-none px-6 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer text-[11px] font-black uppercase tracking-widest text-center"
            >
              {isSaving ? 'Gravando...' : initialData ? 'Salvar Edições' : 'Concluir Registro'}
            </LiquidMetalButton>
          </div>
        </div>

      </div>
    </Modal>
  );
}
