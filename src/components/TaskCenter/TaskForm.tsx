import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  User, 
  Tag, 
  RefreshCw, 
  ListCheck,
  ChevronRight,
  Plus,
  Trash2,
  Database,
  Users,
  Presentation,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task, TaskType, TaskStatus, TaskPriority, TaskSource, TaskRecurrence } from '../../types';
import { TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '../../lib/taskService';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  initialData?: Partial<Task>;
}

const TEMPLATES: { label: string; icon: any; values: Partial<Task> }[] = [
  { 
    label: 'Validar Backup', 
    icon: Database, 
    values: { title: 'Validar Backup Diário', type: 'rotina', priority: 'high', duration: 15, tags: ['Backup', 'Diário'] } 
  },
  { 
    label: 'Analisar Falha', 
    icon: AlertTriangle, 
    values: { title: 'Análise técnica de falha registrada', type: 'incidente', priority: 'critical', duration: 30, tags: ['Falha', 'Investigação'] } 
  },
  { 
    label: 'Executar Correção', 
    icon: Zap, 
    values: { title: 'Correção de infra/configuração', type: 'plano_de_acao', priority: 'medium', duration: 60, tags: ['Infra', 'Correção'] } 
  },
  { 
    label: 'Cobrar Retorno', 
    icon: Users, 
    values: { title: 'Solicitar retorno do terceiro/cliente', type: 'follow_up', priority: 'low', tags: ['Follow-up', 'Aguardando'] } 
  },
  { 
    label: 'Resumo Semanal', 
    icon: Presentation, 
    values: { title: 'Preparar resumo para diretoria', type: 'apresentacao', priority: 'critical', tags: ['Executivo', 'Sexta'] } 
  },
];

export function TaskForm({ isOpen, onClose, onSave, initialData }: TaskFormProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'inbox',
    type: 'rotina',
    priority: 'medium',
    owner: 'João Santos', // Default
    checklist: [],
    tags: [],
    recurrence: { type: 'none' },
    source: 'manual'
  });

  const [newCheckItem, setNewCheckItem] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'inbox',
        type: 'rotina',
        priority: 'medium',
        owner: 'João Santos',
        checklist: [],
        tags: [],
        recurrence: { type: 'none' },
        source: 'manual'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    const item = { id: Math.random().toString(36).substr(2, 9), text: newCheckItem.trim(), completed: false };
    setFormData(prev => ({ ...prev, checklist: [...(prev.checklist || []), item] }));
    setNewCheckItem('');
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({ ...prev, checklist: (prev.checklist || []).filter(i => i.id !== id) }));
  };

  const toggleChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: (prev.checklist || []).map(i => i.id === id ? { ...i, completed: !i.completed } : i)
    }));
  };

  const applyTemplate = (template: Partial<Task>) => {
    setFormData(prev => ({ ...prev, ...template }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl bg-bg-card border border-border-main rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border-main flex items-center justify-between bg-bg-main/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl">
              <Plus className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-main uppercase tracking-widest">{formData.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Configuração Operacional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-danger hover:bg-bg-main rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Form Fields */}
            <div className="lg:col-span-8 space-y-8">
              {/* Templates */}
              {!formData.id && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Templates Rápidos</label>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => applyTemplate(t.values)}
                        className="flex items-center gap-2 px-4 py-2 border border-border-main rounded-xl text-xs font-bold text-text-secondary hover:border-brand hover:text-brand transition-all bg-bg-main/30"
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Título da tarefa..."
                  className="w-full bg-transparent border-none text-2xl font-bold text-text-main outline-none placeholder:text-text-secondary/30"
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                />
                <textarea 
                  placeholder="Descrição ou observações detalhadas..."
                  className="w-full bg-bg-main/30 border border-border-main rounded-2xl p-4 text-sm text-text-main outline-none focus:border-brand transition-all resize-none min-h-[100px]"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Cliente Vinculado</label>
                  <input 
                    type="text"
                    placeholder="Nome do cliente/contrato"
                    className="w-full bg-bg-main/30 border border-border-main rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-brand"
                    value={formData.relatedClient || ''}
                    onChange={e => setFormData(f => ({ ...f, relatedClient: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Responsável (Dono)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input 
                      type="text"
                      className="w-full bg-bg-main/30 border border-border-main rounded-xl pl-10 pr-4 py-2 text-sm text-text-main outline-none focus:border-brand"
                      value={formData.owner || ''}
                      onChange={e => setFormData(f => ({ ...f, owner: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                  <ListCheck className="w-3.5 h-3.5" />
                  Checklist Operacional
                </label>
                <div className="space-y-2">
                  {formData.checklist?.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-bg-main/20 p-2 rounded-xl group border border-transparent hover:border-border-main">
                      <button 
                        type="button" 
                        onClick={() => toggleChecklistItem(item.id)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          item.completed ? "bg-brand border-brand text-white" : "border-border-main"
                        )}
                      >
                        {item.completed && <Check className="w-3 h-3" />}
                      </button>
                      <span className={cn("text-xs flex-1", item.completed && "line-through text-text-secondary")}>{item.text}</span>
                      <button type="button" onClick={() => removeChecklistItem(item.id)} className="opacity-0 group-hover:opacity-100 text-danger p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Adicionar passo..."
                      className="flex-1 bg-bg-main/30 border border-border-main rounded-xl px-4 py-2 text-xs text-text-main outline-none"
                      value={newCheckItem}
                      onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    />
                    <button 
                      type="button"
                      onClick={addChecklistItem}
                      className="p-2 bg-brand text-white rounded-xl shadow-lg shadow-brand/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar Metadata */}
            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-4 bg-bg-main/30 p-6 rounded-3xl border border-border-main">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Status</label>
                  <select 
                    className="w-full bg-bg-card border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-none appearance-none cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                  >
                    {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Tipo de Tarefa</label>
                  <select 
                    className="w-full bg-bg-card border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-none appearance-none cursor-pointer"
                    value={formData.type}
                    onChange={e => setFormData(f => ({ ...f, type: e.target.value as any }))}
                  >
                    {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Prioridade</label>
                  <select 
                    className="w-full bg-bg-card border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-none appearance-none cursor-pointer"
                    value={formData.priority}
                    onChange={e => setFormData(f => ({ ...f, priority: e.target.value as any }))}
                  >
                    {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">Prazo de Entrega (DueDate)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input 
                      type="datetime-local"
                      className="w-full bg-bg-card border border-border-main rounded-xl pl-10 pr-4 py-3 text-sm text-text-main outline-none"
                      value={formData.dueDate || ''}
                      onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    Recorrência
                  </label>
                  <select 
                    className="w-full bg-bg-card border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-main outline-none appearance-none cursor-pointer"
                    value={formData.recurrence?.type}
                    onChange={e => setFormData(f => ({ ...f, recurrence: { ...f.recurrence, type: e.target.value as any } }))}
                  >
                    <option value="none">Nenhuma</option>
                    <option value="daily">Diária</option>
                    <option value="business">Dias Úteis</option>
                    <option value="weekly">Semanal</option>
                    <option value="fridays">Toda Sexta</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
              </div>

              {formData.status === 'blocked' && (
                <div className="space-y-2 p-6 bg-danger/5 border border-danger/20 rounded-3xl animate-in shake-1 duration-500">
                  <label className="text-[10px] font-black text-danger uppercase tracking-widest px-1 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Motivo do Bloqueio
                  </label>
                  <textarea 
                    placeholder="Descreva o que está impedindo esta tarefa..."
                    className="w-full bg-bg-card border border-danger/30 rounded-xl p-3 text-xs text-text-main outline-none focus:border-danger transition-all resize-none"
                    value={formData.blockedReason || ''}
                    onChange={e => setFormData(f => ({ ...f, blockedReason: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-border-main flex items-center justify-end gap-3 bg-bg-main/30 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl text-sm font-bold text-text-secondary hover:text-text-main transition-all">
            Cancelar
          </button>
          <button 
            type="submit"
            onClick={handleSubmit} 
            className="px-10 py-3 bg-brand text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
          >
            {formData.id ? 'Salvar Alterações' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}
