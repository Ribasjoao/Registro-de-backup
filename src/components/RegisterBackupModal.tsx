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
  Activity
} from 'lucide-react';
import { Client, BackupRecord, BackupStatus, BackupType, Criticality, RootCause, Impact, TreatmentStatus } from '../types';
import { cn } from '../lib/utils';

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

export function RegisterBackupModal({ 
  isOpen, 
  onClose, 
  clients, 
  backupTypes, 
  onSave, 
  isSaving, 
  initialData, 
  defaultResponsible 
}: RegisterBackupModalProps) {
  
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [backupType, setBackupType] = useState('');
  const [technicalAnalysis, setTechnicalAnalysis] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [status, setStatus] = useState<BackupStatus>('success');
  const [timestamp, setTimestamp] = useState('');
  const [error, setError] = useState('');
  const [isCustomClient, setIsCustomClient] = useState(false);

  // Executive fields
  const [criticality, setCriticality] = useState<Criticality>('medium');
  const [rootCause, setRootCause] = useState<RootCause>('other');
  const [impact, setImpact] = useState<Impact>('medium');
  const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>('pending');
  const [responsibleTreatment, setResponsibleTreatment] = useState('');
  const [actionDeadline, setActionDeadline] = useState('');
  const [recurrence, setRecurrence] = useState(false);
  const [showExecutiveFields, setShowExecutiveFields] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setClient(initialData.client || '');
      setBackupType(initialData.backupType || '');
      setTechnicalAnalysis(initialData.technicalAnalysis || '');
      setActionPlan(initialData.actionPlan || '');
      setStatus(initialData.status || 'success');
      setTimestamp(initialData.timestamp || new Date().toISOString());
      
      setCriticality(initialData.criticality || 'medium');
      setRootCause(initialData.rootCause || 'other');
      setImpact(initialData.impact || 'medium');
      setTreatmentStatus(initialData.treatmentStatus || 'pending');
      setResponsibleTreatment(initialData.responsibleTreatment || '');
      setActionDeadline(initialData.actionDeadline || '');
      setRecurrence(initialData.recurrence || false);
      
      const clientExists = clients.some(c => c.name === initialData.client);
      setIsCustomClient(!clientExists && !!initialData.client);
      setShowExecutiveFields(initialData.status !== 'success');
    } else {
      setTitle('');
      setClient('');
      setBackupType('');
      setTechnicalAnalysis('');
      setActionPlan('');
      setStatus('success');
      setTimestamp(new Date().toISOString());
      
      setCriticality('medium');
      setRootCause('other');
      setImpact('medium');
      setTreatmentStatus('pending');
      setResponsibleTreatment('');
      setActionDeadline('');
      setRecurrence(false);
      setIsCustomClient(false);
      setShowExecutiveFields(false);
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSave = () => {
    if (!title || !client) {
      setError('O Título e a Identificação do Cliente são obrigatórios.');
      return;
    }
    
    const backupData: Partial<BackupRecord> = {
      ...(initialData && { id: initialData.id }),
      title: title.trim(),
      client: client.trim(),
      backupType,
      technicalAnalysis: technicalAnalysis.trim(),
      actionPlan: actionPlan.trim(),
      status,
      timestamp,
      responsible: initialData?.responsible || defaultResponsible || 'João Santos',
      category: initialData?.category || 'Rotina',
      
      // Executive fields
      criticality,
      rootCause,
      impact,
      treatmentStatus,
      responsibleTreatment: responsibleTreatment.trim(),
      actionDeadline,
      recurrence,
    };

    onSave(backupData);
    onClose();
    setError('');
  };

  const autoSetupTitle = (typeString: string) => {
    if (!title) {
      const formattedDate = new Date().toLocaleDateString('pt-BR');
      setTitle(`${typeString || 'Validação'} Diária - ${formattedDate}`);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Editar Registro de Auditoria" : "Nova Auditoria de Infraestrutura"}
    >
      <div className="space-y-4 pr-1">
        
        {/* REACTIONAL PANEL HEADER */}
        <div className={cn(
          "relative overflow-hidden p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300",
          status === 'success' && "border-green-500/15 bg-green-500/[0.03] text-green-700 dark:text-green-400",
          status === 'warning' && "border-amber-500/20 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400",
          status === 'failed' && "border-red-500/20 bg-red-500/[0.04] text-red-600 dark:text-red-400"
        )}>
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
            status === 'success' && "bg-green-500",
            status === 'warning' && "bg-amber-500",
            status === 'failed' && "bg-red-500"
          )} />
          
          <div className="flex items-center gap-2.5 ml-1">
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition-all",
              status === 'success' && "bg-green-500/10 text-green-600",
              status === 'warning' && "bg-amber-500/10 text-amber-500",
              status === 'failed' && "bg-red-500/15 text-red-500"
            )}>
              {status === 'success' && <CheckCircle2 className="w-4.5 h-4.5" />}
              {status === 'warning' && <AlertCircle className="w-4.5 h-4.5" />}
              {status === 'failed' && <ShieldAlert className="w-4.5 h-4.5" />}
            </span>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest leading-none">
                {status === 'success' ? 'Janela Saudável' : status === 'warning' ? 'Atenção Necessária' : 'Incidente de Falha'}
              </div>
              <div className="text-[9px] opacity-75 mt-0.5 leading-tight">
                {status === 'success' ? 'Backup replicado e validado com sucesso.' : 'Advertências ou falhas na replicação do Job.'}
              </div>
            </div>
          </div>

          <span className="text-[9px] font-black tracking-wider uppercase bg-bg-card/40 border border-border-main/5 px-2 py-1 rounded">
            {initialData?.category || 'Rotina'}
          </span>
        </div>

        {/* GENERAL INFO FIELDS */}
        <div className="space-y-3.5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Cliente */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-text-secondary">
                  <Building2 className="w-3.5 h-3.5" />
                  Cliente
                </label>
                {clients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setClient('');
                      setIsCustomClient(!isCustomClient);
                    }}
                    className={cn(
                      "text-[8px] font-extrabold uppercase tracking-wider border px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                      isCustomClient 
                        ? "bg-brand/10 border-brand/30 text-brand" 
                        : "bg-bg-main border-border-main text-text-secondary hover:text-text-main"
                    )}
                  >
                    {isCustomClient ? 'Selecionar da Lista' : 'Digitar Novo'}
                  </button>
                )}
              </div>
              
              {clients.length === 0 || isCustomClient ? (
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
              )}
            </div>

            {/* Tecnologia / Job */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-text-secondary">
                <Database className="w-3.5 h-3.5" />
                Tecnologia / Job
              </label>
              <select 
                value={backupType}
                onChange={(e) => {
                  setBackupType(e.target.value);
                  autoSetupTitle(e.target.value);
                }}
                className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all cursor-pointer"
              >
                <option value="">Selecione a Tecnologia...</option>
                {backupTypes.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Título de Auditoria */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-text-secondary">
                <FileText className="w-3.5 h-3.5" />
                Título de Resumo
              </label>
              <button
                type="button"
                onClick={() => {
                  const formattedDate = new Date().toLocaleDateString('pt-BR');
                  setTitle(`Validação Diária de Rotina - ${formattedDate}`);
                }}
                className="text-[9px] font-bold text-brand hover:underline"
              >
                Auto-adicionar
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Auditoria Diária de Replicação Nakivo"
              className={cn(
                "w-full h-10 px-3 rounded-lg border bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all shadow-inner",
                error && !title ? 'border-danger' : 'border-border-main'
              )}
            />
          </div>

          {/* Status Final Grid */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary block">Status Final da Auditoria</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'success', label: 'Sucesso', style: 'border-green-500 text-green-600 bg-green-500/[0.04]', dot: 'bg-green-500' },
                { key: 'warning', label: 'Aviso', style: 'border-amber-400 text-amber-500 bg-amber-500/[0.04]', dot: 'bg-amber-400' },
                { key: 'failed', label: 'Falha', style: 'border-red-500 text-red-500 bg-red-500/[0.04]', dot: 'bg-red-500' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setStatus(item.key as BackupStatus);
                    if (item.key !== 'success') {
                      setShowExecutiveFields(true);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95",
                    status === item.key 
                      ? `${item.style} ring-1 font-black shadow-sm` 
                      : "border-border-main bg-bg-main hover:bg-bg-main/60 text-text-muted text-[11px] font-bold"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", item.dot)} />
                  <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* TECHNICAL DETAILS section (Show dynamically if not Success) */}
        {(status === 'failed' || status === 'warning') && (
          <div className="space-y-3.5 border-t border-border-main/50 pt-3.5 animate-in slide-in-from-top duration-300">
            
            {/* Ocorrência / Technical description */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-secondary">
                <FileText className="w-3.5 h-3.5" />
                Análise / Descrição da Ocorrência
              </label>
              <textarea
                rows={2}
                value={technicalAnalysis}
                onChange={(e) => setTechnicalAnalysis(e.target.value)}
                placeholder="Descreva o que motivou o aviso ou falha no job de backup..."
                className="w-full p-2.5 rounded-lg border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none resize-none transition-all shadow-inner"
              />
            </div>

            {/* Action Plan */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-secondary">
                <Activity className="w-3.5 h-3.5" />
                Plano de Ação Corretiva
              </label>
              <textarea
                rows={2}
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Descreva o que foi feito ou será planejado para mitigar o problema..."
                className="w-full p-2.5 rounded-lg border border-border-main bg-bg-card text-text-main text-xs font-semibold focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none resize-none transition-all shadow-inner"
              />
            </div>

            {/* Executive Collapsible Section */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowExecutiveFields(!showExecutiveFields)}
                className="w-full flex items-center justify-between p-2.5 bg-bg-main hover:bg-bg-main/60 rounded-xl border border-border-main text-text-main font-bold text-xs cursor-pointer select-none"
              >
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                  <ShieldAlert className="w-4 h-4 text-brand" />
                  Métricas Executivas para o Painel Geral
                </span>
                <span className="text-[10px] font-extrabold text-brand">{showExecutiveFields ? 'Recolher [-]' : 'Expandir [+]'}</span>
              </button>

              {showExecutiveFields && (
                <div className="p-3 bg-bg-main/30 border border-border-main rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Criticidade */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Criticidade</label>
                      <select 
                        value={criticality}
                        onChange={(e) => setCriticality(e.target.value as Criticality)}
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">🚨 Crítica</option>
                      </select>
                    </div>

                    {/* Impacto */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Impacto</label>
                      <select 
                        value={impact}
                        onChange={(e) => setImpact(e.target.value as Impact)}
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
                      >
                        <option value="low">Baixo impacto</option>
                        <option value="medium">Médio impacto</option>
                        <option value="high">Alto impacto</option>
                      </select>
                    </div>

                    {/* Causa Raiz */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1">
                        Causa Raiz
                      </label>
                      <select 
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value as RootCause)}
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Tratamento</label>
                      <select 
                        value={treatmentStatus}
                        onChange={(e) => setTreatmentStatus(e.target.value as TreatmentStatus)}
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
                      >
                        <option value="pending">Pendente</option>
                        <option value="analyzing">Em Diagnóstico</option>
                        <option value="mitigated">Mitigação Temporária</option>
                        <option value="resolved">Resolvido</option>
                      </select>
                    </div>

                    {/* Responsável pelo Tratamento */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Responsável de Suporte</label>
                      <input
                        type="text"
                        value={responsibleTreatment}
                        onChange={(e) => setResponsibleTreatment(e.target.value)}
                        placeholder="Nome..."
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
                      />
                    </div>

                    {/* Prazo da Solução */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">Prazo Solução</label>
                      <input
                        type="date"
                        value={actionDeadline}
                        onChange={(e) => setActionDeadline(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-border-main bg-bg-card text-xs text-text-main font-semibold outline-none"
                      />
                    </div>
                  </div>

                  {/* Recurrence Switch */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border-main/50">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={recurrence}
                        onChange={(e) => setRecurrence(e.target.checked)}
                      />
                      <div className="w-8 h-4.5 bg-border-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-danger"></div>
                      <span className="ml-2.5 text-[10px] font-bold text-text-main">
                        Este incidente é reincidente/recorrente neste servidor?
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* BOTTOM FOUL DETAILS INFO */}
        <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-border-main/40 text-[10px] font-bold text-text-secondary">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>Data: <span className="text-text-main underline">{new Date(timestamp).toLocaleDateString('pt-BR')}</span></span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <User className="w-3 h-3" />
            <span>Resp: <span className="text-text-main font-black">{initialData?.responsible || defaultResponsible || 'João Santos'}</span></span>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-danger text-center bg-danger/5 py-2 border border-danger/10 rounded-lg">{error}</p>}

        {/* FOOTER ACTION ROW */}
        <div className="flex justify-between items-center pt-3 mt-1 border-t border-border-main/40">
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-text-secondary">
            <HelpCircle className="w-3 h-3" />
            <span>Processando auditoria...</span>
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
