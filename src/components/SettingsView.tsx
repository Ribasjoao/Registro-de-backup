import React, { useState, useEffect } from 'react';
import { Database, History, Bell, Shield, Cloud, HardDrive, Edit2, Plus, Users, Trash2, Search, Settings, AlertTriangle, UserPlus, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { Client, StorageDestination, BackupType, AuditLog } from '../types';
import { EditDestinationModal } from './EditDestinationModal';
import { EditClientModal } from './EditClientModal';
import { AddDestinationModal } from './AddDestinationModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useUsers } from '../hooks/useUsers';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, orderBy, onSnapshot, limit } from '../firebase';

function formatRelativeTime(timestampStr: string): string {
  try {
    const date = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Agora';
    
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `Há ${diffSecs}s`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `Há ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return timestampStr;
  }
}

interface SettingsViewProps {
  clients: Client[];
  onAddClient: (name: string) => void;
  onUpdateClient: (updated: Client) => void;
  onDeleteClient: (id: string) => void;
  destinations: StorageDestination[];
  onUpdateDestination: (updated: StorageDestination) => Promise<void>;
  onAddDestination: (destination: Omit<StorageDestination, 'id'>) => Promise<void>;
  onDeleteDestination: (id: string) => void;
  backupTypes: BackupType[];
  onAddBackupType: (name: string) => void;
  onUpdateBackupType: (updated: BackupType) => void;
  onDeleteBackupType: (id: string) => void;
  users?: any[];
  onUpdateUserRole?: (userId: string, newRole: string) => void;
  onDeleteUser?: (userId: string) => Promise<void>;
  currentUserId?: string;
  isAdmin: boolean;
  onResetData?: (
    resetType: 'personal' | 'system',
    systemOptions?: {
      deleteBackups: boolean;
      deleteClients: boolean;
      deleteDestinations: boolean;
      clientNameFilter?: string;
    }
  ) => Promise<void>;
}

const usersContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

const usersItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 130,
      damping: 16
    }
  }
};

type SettingsTab = 'storage' | 'clients' | 'backup-types' | 'retention' | 'notifications' | 'security' | 'users' | 'audit' | 'reset';

export const SettingsView = React.memo(function SettingsView({ 
  clients, 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient, 
  destinations, 
  onUpdateDestination, 
  onAddDestination, 
  onDeleteDestination,
  backupTypes,
  onAddBackupType,
  onUpdateBackupType,
  onDeleteBackupType,
  users = [],
  onUpdateUserRole,
  onDeleteUser,
  currentUserId,
  isAdmin,
  onResetData
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('storage');
  const [newClientName, setNewClientName] = useState('');
  const [newBackupTypeName, setNewBackupTypeName] = useState('');
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeTab === 'audit' && isAdmin) {
      setLoadingLogs(true);
      const q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(150)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() } as AuditLog);
        });
        setAuditLogs(logs);
        setLoadingLogs(false);
      }, (error) => {
        console.error("Error listening to audit logs:", error);
        setLoadingLogs(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab, isAdmin]);
  
  // Custom states/hooks for User Management (Equipe)
  const { createUser, loading: isCreatingUser } = useUsers();
  const [createUserName, setCreateUserName] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'admin' | 'editor' | 'viewer'>('editor');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserName.trim()) {
      toast.error('Informe o nome do usuário');
      return;
    }
    if (!createUserEmail.trim()) {
      toast.error('Informe o e-mail do usuário');
      return;
    }
    if (!createUserPassword.trim()) {
      toast.error('Informe a senha do usuário');
      return;
    }
    if (createUserPassword.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres');
      return;
    }

    const newUser = await createUser(
      createUserName.trim(),
      createUserEmail.trim(),
      createUserPassword,
      createUserRole
    );

    if (newUser) {
      setCreateUserName('');
      setCreateUserEmail('');
      setCreateUserPassword('');
      setCreateUserRole('editor');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [editingDest, setEditingDest] = useState<StorageDestination | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingBackupType, setEditingBackupType] = useState<BackupType | null>(null);
  const [isAddDestModalOpen, setIsAddDestModalOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingDestId, setDeletingDestId] = useState<string | null>(null);
  const [deletingBackupTypeId, setDeletingBackupTypeId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [isResettingPersonal, setIsResettingPersonal] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);
  const [showPersonalConfirm, setShowPersonalConfirm] = useState(false);
  const [showSystemConfirm, setShowSystemConfirm] = useState(false);

  // Filtros de exclusão para o reset do sistema
  const [deleteBackups, setDeleteBackups] = useState(true);
  const [deleteClients, setDeleteClients] = useState(false);
  const [deleteDestinations, setDeleteDestinations] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');

  const handleResetPersonal = async () => {
    if (!onResetData) return;
    setIsResettingPersonal(true);
    try {
      await onResetData('personal');
      setShowPersonalConfirm(false);
      toast.success('Seus dados pessoais (Tarefas e Gamificação) foram redefinidos!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao realizar o reset dos dados pessoais.');
    } finally {
      setIsResettingPersonal(false);
    }
  };

  const handleResetSystem = async () => {
    if (!onResetData) return;
    if (!deleteBackups && !deleteClients && !deleteDestinations) {
      toast.error('Selecione pelo menos uma das opções acima para limpar do banco de dados.');
      return;
    }
    setIsResettingSystem(true);
    try {
      await onResetData('system', {
        deleteBackups,
        deleteClients,
        deleteDestinations,
        clientNameFilter: selectedClientFilter
      });
      setShowSystemConfirm(false);
      toast.success('Os dados selecionados do sistema foram limpos com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao realizar o reset dos dados selecionados do sistema.');
    } finally {
      setIsResettingSystem(false);
    }
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClientName.trim()) {
      onAddClient(newClientName.trim());
      setNewClientName('');
    }
  };

  const handleAddBackupType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBackupTypeName.trim()) {
      onAddBackupType(newBackupTypeName.trim());
      setNewBackupTypeName('');
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'storage':
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-xl text-text-main font-bold">Destinos de Armazenamento</h2>
                <p className="text-sm text-text-secondary mt-1">Configure os nós onde os backups serão armazenados fisicamente ou na nuvem.</p>
              </div>
              <button 
                onClick={() => setIsAddDestModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-border-main rounded-lg text-sm font-semibold text-text-main hover:bg-bg-main transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Destino
              </button>
            </div>

            <div className="space-y-4">
              {destinations.map((dest) => (
                <div key={dest.id} className="border border-border-main rounded-xl p-4 flex items-start gap-4 hover:border-brand/30 transition-colors">
                  <div className="mt-1 w-10 h-10 rounded-lg bg-bg-main flex items-center justify-center shrink-0 border border-border-main">
                    <Database className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-text-main truncate">{dest.name}</h3>
                      {(() => {
                        const freePercent = dest.totalSpaceTB > 0 
                          ? (dest.freeSpaceTB / dest.totalSpaceTB) * 100 
                          : 0;
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                            freePercent > 20 ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", freePercent > 20 ? "bg-green-600" : "bg-amber-600")}></span>
                            {freePercent > 20 ? 'Saudável' : 'Atenção'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-text-main grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 mb-3">
                      {(() => {
                        const freePercent = dest.totalSpaceTB > 0 
                          ? ((dest.freeSpaceTB / dest.totalSpaceTB) * 100).toFixed(0) 
                          : '0';
                        return (
                          <p><span className="text-text-secondary">Livre:</span> {dest.freeSpaceTB} TB ({freePercent}%)</p>
                        );
                      })()}
                      <p><span className="text-text-secondary">Usado:</span> {dest.usedSpaceTB} TB</p>
                      <p><span className="text-text-secondary">Total:</span> {dest.totalSpaceTB} TB</p>
                      <p><span className="text-text-secondary">Qtd Backups:</span> {dest.backupsCount || 0}</p>
                      <p><span className="text-text-secondary">Cliente:</span> {dest.client || 'N/A'}</p>
                      <p><span className="text-text-secondary">Localização:</span> {dest.location}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingDest(dest)}
                    className="p-2 text-text-secondary hover:text-brand rounded-lg hover:bg-bg-main transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingDestId(dest.id)}
                    className="p-2 text-text-secondary hover:text-danger rounded-lg hover:bg-bg-main transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {editingDest && (
              <EditDestinationModal 
                isOpen={!!editingDest}
                onClose={() => setEditingDest(null)}
                destination={editingDest}
                onSave={onUpdateDestination}
                clients={clients}
              />
            )}

            <AddDestinationModal 
              isOpen={isAddDestModalOpen}
              onClose={() => setIsAddDestModalOpen(false)}
              onSave={onAddDestination}
              clients={clients}
            />

            <DeleteConfirmationModal 
              isOpen={!!deletingDestId}
              onClose={() => setDeletingDestId(null)}
              onConfirm={() => deletingDestId && onDeleteDestination(deletingDestId)}
              title="Excluir Destino"
              message="Tem certeza que deseja excluir este destino de armazenamento? Esta ação não pode ser desfeita."
            />

            <div className="mt-8 border-t border-border-main pt-8">
              <h3 className="font-heading text-lg text-text-main font-bold mb-4">Opções Globais de Armazenamento</h3>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-main">
                  <div className="flex-1">
                    <label className="block font-semibold text-text-main text-sm">Criptografia em Repouso</label>
                    <p className="text-sm text-text-secondary mt-1">Criptografar todos os dados antes de enviar para os destinos configurados.</p>
                  </div>
                  <div className="shrink-0">
                    <button className="w-11 h-6 bg-brand rounded-full relative transition-colors">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border-main">
                  <div className="flex-1 pt-2">
                    <label className="block font-semibold text-text-main text-sm">Nível de Compressão</label>
                    <p className="text-sm text-text-secondary mt-1">Equilibre entre velocidade de backup e uso de armazenamento.</p>
                  </div>
                  <div className="shrink-0 w-full sm:w-64">
                    <select 
                      defaultValue="Padrão (GZIP)"
                      className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                    >
                      <option>Nenhuma</option>
                      <option>Rápida (LZ4)</option>
                      <option>Padrão (GZIP)</option>
                      <option>Máxima (ZSTD)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 pt-2">
                    <label className="block font-semibold text-text-main text-sm">Alerta de Capacidade (%)</label>
                    <p className="text-sm text-text-secondary mt-1">Disparar alerta quando um destino atingir esta porcentagem de uso.</p>
                  </div>
                  <div className="shrink-0 w-full sm:w-64 relative">
                    <input
                      type="number"
                      defaultValue={85}
                      className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-text-secondary">%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'clients':
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-xl text-text-main font-bold">Gerenciamento de Clientes</h2>
                <p className="text-sm text-text-secondary mt-1">Adicione e gerencie os clientes que aparecerão na lista de registro de backups.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-1 bg-bg-main p-6 rounded-xl border border-border-main">
                <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand" />
                  Novo Cliente
                </h3>
                <form onSubmit={handleAddClient} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Nome do Cliente</label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ex: Empresa ABC"
                      className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!newClientName.trim()}
                    className="w-full py-2 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Adicionar Cliente
                  </button>
                </form>
              </div>

              <div className="md:col-span-2">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                  />
                </div>

                <div className="border border-border-main rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-main border-b border-border-main">
                        <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Nome</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Data de Cadastro</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <tr key={client.id} className="hover:bg-bg-main transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-text-main">{client.name}</td>
                            <td className="px-4 py-3 text-sm text-text-secondary">{client.createdAt}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setEditingClient(client)}
                                  className="p-1.5 text-text-secondary hover:text-brand rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeletingClientId(client.id)}
                                  className="p-1.5 text-text-secondary hover:text-danger rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-text-secondary text-sm italic">
                            Nenhum cliente encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {editingClient && (
              <EditClientModal 
                isOpen={!!editingClient}
                onClose={() => setEditingClient(null)}
                client={editingClient}
                onSave={onUpdateClient}
              />
            )}

            <DeleteConfirmationModal 
              isOpen={!!deletingClientId}
              onClose={() => setDeletingClientId(null)}
              onConfirm={() => deletingClientId && onDeleteClient(deletingClientId)}
              title="Excluir Cliente"
              message="Tem certeza que deseja excluir este cliente? Todos os registros associados podem ser afetados."
            />
          </>
        );
      case 'backup-types':
        return (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-xl text-text-main font-bold">Tipos de Backup</h2>
                <p className="text-sm text-text-secondary mt-1">Gerencie as categorias de backup (ex: Local, Cloud, Offsite).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-1 bg-bg-main p-6 rounded-xl border border-border-main">
                <h3 className="font-bold text-text-main mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand" />
                  Novo Tipo
                </h3>
                <form onSubmit={handleAddBackupType} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Nome do Tipo</label>
                    <input
                      type="text"
                      value={newBackupTypeName}
                      onChange={(e) => setNewBackupTypeName(e.target.value)}
                      placeholder="Ex: Cloud"
                      className="w-full h-10 px-3 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!newBackupTypeName.trim()}
                    className="w-full py-2 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Adicionar Tipo
                  </button>
                </form>
              </div>

              <div className="md:col-span-2">
                <div className="border border-border-main rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-main border-b border-border-main">
                        <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Nome</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main">
                      {backupTypes.length > 0 ? (
                        backupTypes.map((type) => (
                          <tr key={type.id} className="hover:bg-bg-main transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-text-main">
                              {editingBackupType?.id === type.id ? (
                                <input 
                                  type="text"
                                  value={editingBackupType.name}
                                  onChange={(e) => setEditingBackupType({...editingBackupType, name: e.target.value})}
                                  onBlur={() => {
                                    onUpdateBackupType(editingBackupType);
                                    setEditingBackupType(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateBackupType(editingBackupType);
                                      setEditingBackupType(null);
                                    }
                                  }}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-brand bg-bg-card text-text-main rounded outline-none"
                                />
                              ) : (
                                type.name
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setEditingBackupType(type)}
                                  className="p-1.5 text-text-secondary hover:text-brand rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeletingBackupTypeId(type.id)}
                                  className="p-1.5 text-text-secondary hover:text-danger rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-text-secondary text-sm italic">
                            Nenhum tipo de backup configurado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DeleteConfirmationModal 
              isOpen={!!deletingBackupTypeId}
              onClose={() => setDeletingBackupTypeId(null)}
              onConfirm={() => deletingBackupTypeId && onDeleteBackupType(deletingBackupTypeId)}
              title="Excluir Tipo de Backup"
              message="Tem certeza que deseja excluir este tipo de backup?"
            />
          </>
        );
      case 'reset':
        return (
          <>
            <div className="mb-6">
              <h2 className="font-heading text-xl text-text-main font-bold flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-danger" />
                Zerar Dados e Começar do Zero
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Utilize as ferramentas abaixo para redefinir suas informações de progresso pessoais ou limpar todo o painel do sistema para um novo começo.
              </p>
            </div>

            <div className="space-y-6">
              {/* Reset pessoal */}
              <div className="border border-border-main rounded-xl p-5 hover:border-danger/30 transition-all bg-bg-main/50 animate-fadeIn">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-danger/10 text-danger rounded-lg border border-danger/20 shrink-0">
                    <History className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text-main mb-1">
                      Zerar Minhas Tarefas Pessoais
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Esta ação irá excluir permanentemente todas as suas tarefas pessoais da lista de afazeres.
                    </p>

                    {showPersonalConfirm ? (
                      <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-4">
                        <div className="flex gap-2 text-danger text-sm font-semibold mb-3 items-center">
                          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                          <span>Esta ação é irreversível! Confirma que deseja apagar suas tarefas pessoais?</span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            disabled={isResettingPersonal}
                            onClick={handleResetPersonal}
                            className="px-4 py-2 text-xs font-bold text-white bg-danger hover:bg-danger-dark rounded transition-colors disabled:opacity-50"
                          >
                            {isResettingPersonal ? 'Zerando...' : 'Sim, Zerar Minhas Tarefas'}
                          </button>
                          <button
                            disabled={isResettingPersonal}
                            onClick={() => setShowPersonalConfirm(false)}
                            className="px-4 py-2 text-xs font-semibold text-text-main border border-border-main rounded hover:bg-bg-main transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowPersonalConfirm(true)}
                        className="px-4 py-2 text-xs font-bold text-white bg-danger hover:bg-danger-dark rounded transition-colors"
                      >
                        Zerar Minhas Tarefas
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reset do sistema para administradores */}
              {isAdmin && (
                <div className="border border-border-main rounded-xl p-5 hover:border-danger/30 transition-all bg-bg-main/50 animate-fadeIn">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-danger/10 text-danger rounded-lg border border-danger/20 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-text-main mb-1">
                        Limpeza Customizada e Reset do Painel
                      </h3>
                      <p className="text-sm text-text-secondary mb-4">
                        <span className="font-bold text-danger">Apenas para Administradores.</span> Selecione precisamente o que deseja limpar do banco de dados do Registro de Backup. Você pode, por exemplo, apagar apenas os registros de backups sem afetar os clientes já criados.
                      </p>

                      {/* Opções de Filtro de Limpeza */}
                      <div className="space-y-3 mb-5 p-4 bg-bg-main/40 border border-border-main rounded-lg max-w-lg">
                        <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Opções de Limpeza:</div>
                        
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={deleteBackups} 
                            onChange={(e) => setDeleteBackups(e.target.checked)}
                            className="w-4 h-4 rounded border-border-main text-brand bg-bg-main focus:ring-brand mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-semibold text-text-main">Excluir registros de Backups</span>
                            <p className="text-xs text-text-secondary">Limpa o histórico de execuções de backup cadastradas.</p>
                          </div>
                        </label>

                        {/* Filtro por Cliente (só aparece se 'Excluir registros de Backups' estiver marcado) */}
                        {deleteBackups && (
                          <div className="ml-7 p-3 bg-bg-main border border-border-main/50 rounded-lg animate-slideDown">
                            <label className="block text-xs font-bold text-text-secondary mb-1">
                              Filtrar Backups por Cliente específico:
                            </label>
                            <select
                              value={selectedClientFilter}
                              onChange={(e) => setSelectedClientFilter(e.target.value)}
                              className="w-full text-sm bg-bg-main border border-border-main rounded px-3 py-1.5 focus:border-brand focus:outline-none text-text-main font-medium"
                            >
                              <option value="all">🧹 Excluir Backups de TODOS os Clientes (Completo)</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.name}>
                                  👤 Apenas do Cliente: {client.name}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-text-secondary mt-1">
                              {selectedClientFilter === 'all' 
                                ? "Deletará absolutamente todos os backups registrados."
                                : `Deletará unicamente os backups que pertencem a "${selectedClientFilter}".`
                              }
                            </p>
                          </div>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer select-none border-t border-border-main/40 pt-3">
                          <input 
                            type="checkbox" 
                            checked={deleteClients} 
                            onChange={(e) => setDeleteClients(e.target.checked)}
                            className="w-4 h-4 rounded border-border-main text-brand bg-bg-main focus:ring-brand mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-semibold text-text-main">Excluir Clientes Cadastrados</span>
                            <p className="text-xs text-text-secondary">Remove os clientes da lista. Excluir os clientes com backups ativos não é recomendado.</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer select-none border-t border-border-main/40 pt-3">
                          <input 
                            type="checkbox" 
                            checked={deleteDestinations} 
                            onChange={(e) => setDeleteDestinations(e.target.checked)}
                            className="w-4 h-4 rounded border-border-main text-brand bg-bg-main focus:ring-brand mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-semibold text-text-main">Excluir Destinos de Armazenamento</span>
                            <p className="text-xs text-text-secondary">Remove as configurações registradas de locais físicos e na nuvem.</p>
                          </div>
                        </label>
                      </div>

                      {showSystemConfirm ? (
                        <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-4 max-w-lg">
                          <div className="flex gap-2 text-danger text-sm font-semibold mb-3 items-start">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
                            <span>
                              {deleteBackups && selectedClientFilter !== 'all' && !deleteClients && !deleteDestinations ? (
                                `Esta ação é irreversível! Confirma a exclusão de todos os backups associados unicamente ao cliente "${selectedClientFilter}"?`
                              ) : (
                                "ATENÇÃO: Os dados selecionados serão excluídos permanentemente de todo o sistema. Deseja prosseguir?"
                              )}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={isResettingSystem}
                              onClick={handleResetSystem}
                              className="px-4 py-2 text-xs font-bold text-white bg-danger hover:bg-danger-dark rounded transition-colors disabled:opacity-50"
                            >
                              {isResettingSystem ? 'Executando...' : 'Confirmar e Limpar Banco'}
                            </button>
                            <button
                              disabled={isResettingSystem}
                              onClick={() => setShowSystemConfirm(false)}
                              className="px-4 py-2 text-xs font-semibold text-text-main border border-border-main rounded hover:bg-bg-main transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (!deleteBackups && !deleteClients && !deleteDestinations) {
                              toast.error('Selecione pelo menos uma das opções acima para redefinir!');
                              return;
                            }
                            setShowSystemConfirm(true);
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-danger hover:bg-danger-dark rounded transition-colors"
                        >
                          {deleteBackups && selectedClientFilter !== 'all' && !deleteClients && !deleteDestinations 
                            ? `Limpar Backups de "${selectedClientFilter}"`
                            : "Executar Limpeza Configurada"
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        );
      case 'security':
        if (!isAdmin) return null;
        return (
          <>
            <div className="mb-6">
              <h2 className="font-heading text-xl text-text-main font-bold">Gerenciamento de Usuários</h2>
              <p className="text-sm text-text-secondary mt-1">Controle quem tem acesso ao sistema e quais são suas permissões.</p>
            </div>

            <div className="border border-border-main rounded-xl overflow-hidden bg-bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-bg-main border-b border-border-main text-text-secondary select-none">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Usuário</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">E-mail</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">XP / Nível</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Permissão</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main">
                    {users.map((u) => {
                      const userInitials = u.displayName
                        ? u.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                        : u.email ? u.email[0].toUpperCase() : 'U';

                      return (
                        <tr key={u.id} className="hover:bg-bg-main/40 transition-colors">
                          {/* Usuário (Name & Avatar) */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {u.photoURL ? (
                                <img 
                                  src={u.photoURL} 
                                  alt={u.displayName || 'Usuário'} 
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-full border border-border-main object-cover" 
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                                  {userInitials}
                                </div>
                              )}
                              <span className="text-sm font-bold text-text-main truncate max-w-[150px]">
                                {u.displayName || 'Sem Nome'}
                              </span>
                            </div>
                          </td>

                          {/* Email Column */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-medium text-text-main font-mono">
                              {u.email || <span className="text-text-secondary italic">Não informado</span>}
                            </span>
                          </td>

                          {/* XP / Level Column */}
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-brand">{u.xp !== undefined ? `${u.xp} XP` : '0 XP'}</span>
                              <span className="text-[10px] text-text-secondary font-medium truncate max-w-[120px]">
                                {u.level || 'Operador de Snapshot L1'}
                              </span>
                            </div>
                          </td>

                          {/* Permissions State Column */}
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                              u.role === 'admin' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50" :
                              u.role === 'editor' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50" :
                              "bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800/50"
                            )}>
                              {u.role === 'admin' ? 'Administrador' : u.role === 'editor' ? 'Editor' : 'Visualizador'}
                            </span>
                          </td>

                          {/* Action Selector */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select 
                                value={u.role || 'viewer'}
                                onChange={(e) => onUpdateUserRole?.(u.id, e.target.value)}
                                className="text-xs border border-border-main bg-bg-card text-text-main rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-brand font-semibold cursor-pointer"
                                disabled={u.email === 'joaoribasdossantos@gmail.com'}
                              >
                                <option value="admin">Administrador</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Visualizador</option>
                              </select>
                              {isAdmin && onDeleteUser && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingUserId(u.id)}
                                  disabled={u.email === 'joaoribasdossantos@gmail.com' || u.id === currentUserId}
                                  className="p-1.5 rounded-lg border border-border-main text-text-secondary hover:text-danger hover:border-danger/30 hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DeleteConfirmationModal 
              isOpen={!!deletingUserId}
              onClose={() => setDeletingUserId(null)}
              onConfirm={async () => {
                if (deletingUserId && onDeleteUser) {
                  await onDeleteUser(deletingUserId);
                }
                setDeletingUserId(null);
              }}
              title="Excluir Usuário"
              message="Tem certeza que deseja excluir as permissões e o perfil de banco de dados deste usuário? Esta ação removerá seu cargo e progresso no sistema."
            />
          </>
        );

      case 'users':
        if (!isAdmin) return null;
        return (
          <motion.div 
            variants={usersContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Header */}
            <div>
              <h2 className="font-heading text-xl text-text-main font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" />
                Membros da Equipe (Técnicos)
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Cadastre novas credenciais locais para técnicos da sua equipe e controle os seus níveis de permissão no Registro de Backup.
              </p>
            </div>

            {/* Glassmorphic Form Container */}
            <motion.div 
              variants={usersItemVariants}
              className="relative p-6 rounded-2xl overflow-hidden shadow-xl border border-white/10 dark:border-border-main/50 bg-white/[0.03] dark:bg-bg-card/20 backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 via-transparent to-purple-500/5 pointer-events-none" />
              
              <h3 className="font-heading text-base font-bold text-text-main mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand" />
                Novo Integrante
              </h3>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Nome */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nome Completo</label>
                  <input
                    type="text"
                    value={createUserName}
                    onChange={(e) => setCreateUserName(e.target.value)}
                    placeholder="Carlos Silva"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border-main bg-bg-card/40 text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={createUserEmail}
                    onChange={(e) => setCreateUserEmail(e.target.value)}
                    placeholder="exemplo@empresa.com"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border-main bg-bg-card/40 text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  />
                </div>

                {/* Senha */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Senha de Acesso</label>
                  <input
                    type="password"
                    value={createUserPassword}
                    onChange={(e) => setCreateUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border-main bg-bg-card/40 text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  />
                </div>

                {/* Nível de Acesso */}
                <div className="space-y-1.5 col-span-1 flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Permissão</label>
                    <select
                      value={createUserRole}
                      onChange={(e) => setCreateUserRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                      className="w-full h-10 px-3 rounded-xl border border-border-main bg-bg-card/40 text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all cursor-pointer font-medium"
                    >
                      <option value="editor" className="bg-bg-card text-text-main">Operador</option>
                      <option value="admin" className="bg-bg-card text-text-main">Admin</option>
                      <option value="viewer" className="bg-bg-card text-text-main">Visualizador</option>
                    </select>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isCreatingUser}
                    className="h-10 px-5 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-md self-end"
                  >
                    {isCreatingUser ? 'Criando...' : 'Cadastrar'}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* List */}
            <motion.div variants={usersItemVariants} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-text-main">Cadastros Ativos</h3>
                <span className="text-xs text-text-secondary font-mono">{users.length} usuários cadastrados</span>
              </div>

              <div className="border border-border-main rounded-2xl overflow-hidden bg-bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-bg-main border-b border-border-main text-text-secondary select-none">
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Técnico</th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">E-mail de Acesso</th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Nível e Experiência (XP)</th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider">Cargo do Sistema</th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main">
                      <AnimatePresence mode="popLayout">
                        {users.map((u) => {
                          const userInitials = u.displayName
                            ? u.displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                            : u.email ? u.email[0].toUpperCase() : 'U';

                          return (
                            <motion.tr 
                              layout
                              variants={usersItemVariants}
                              initial="hidden"
                              animate="visible"
                              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                              key={u.id} 
                              className="hover:bg-bg-main/40 transition-colors"
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  {u.photoURL ? (
                                    <img 
                                      src={u.photoURL} 
                                      alt={u.displayName || 'Usuário'} 
                                      referrerPolicy="no-referrer"
                                      className="w-8 h-8 rounded-full border border-border-main object-cover" 
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                                      {userInitials}
                                    </div>
                                  )}
                                  <span className="text-sm font-bold text-text-main truncate max-w-[150px]">
                                    {u.displayName || 'Sem Nome'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <span className="text-sm font-medium text-text-main font-mono">
                                  {u.email || <span className="text-text-secondary italic">Não informado</span>}
                                </span>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-brand">{u.xp !== undefined ? `${u.xp} XP` : '0 XP'}</span>
                                  <span className="text-[10px] text-text-secondary font-medium truncate max-w-[120px]">
                                    {u.level || 'Operador de Snapshot L1'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                                  u.role === 'admin' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50" :
                                  u.role === 'editor' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50" :
                                  "bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800/50"
                                )}>
                                  {u.role === 'admin' ? 'Administrador' : u.role === 'editor' ? 'Editor' : 'Visualizador'}
                                </span>
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <select 
                                    value={u.role || 'viewer'}
                                    onChange={(e) => onUpdateUserRole?.(u.id, e.target.value)}
                                    className="text-xs border border-border-main bg-bg-card text-text-main rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-brand font-semibold cursor-pointer"
                                    disabled={u.email === 'joaoribasdossantos@gmail.com'}
                                  >
                                    <option value="admin">Administrador</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Visualizador</option>
                                  </select>
                                  {isAdmin && onDeleteUser && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingUserId(u.id)}
                                      disabled={u.email === 'joaoribasdossantos@gmail.com' || u.id === currentUserId}
                                      className="p-1.5 rounded-lg border border-border-main text-text-secondary hover:text-danger hover:border-danger/30 hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                                      title="Excluir Usuário"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
      case 'audit':
        if (!isAdmin) return null;
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 animate-fadeIn"
          >
            <div>
              <h2 className="font-heading text-xl text-text-main font-bold">Logs de Auditoria (Audit Trail)</h2>
              <p className="text-sm text-text-secondary mt-1">Rastriabilidade completa de todas as ações de criação, edição e exclusão realizadas pela equipe.</p>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Clock className="w-8 h-8 text-brand animate-spin" />
                <span className="text-sm text-text-secondary font-medium">Buscando histórico de auditoria...</span>
              </div>
            ) : auditLogs.length > 0 ? (
              <div className="relative pl-6 border-l border-border-main space-y-8 py-2">
                <AnimatePresence>
                  {auditLogs.map((log, index) => {
                    const initials = log.userName
                      ? log.userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                      : 'U';
                    
                    let iconColor = "text-blue-500 bg-blue-500/10 border-blue-500/20";
                    let Icon = Edit2;

                    if (log.action.startsWith('CREATE')) {
                      iconColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                      Icon = Plus;
                    } else if (log.action.startsWith('DELETE')) {
                      iconColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
                      Icon = Trash2;
                    } else if (log.action.startsWith('COMPLETE')) {
                      iconColor = "text-teal-400 bg-teal-400/10 border-teal-400/20";
                      Icon = CheckCircle2;
                    }

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.35 }}
                        className="relative group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-border-main/50 rounded-xl bg-bg-card/30 backdrop-blur-sm hover:border-brand/30 transition-all shadow-sm"
                      >
                        {/* Circle bullet on timeline line */}
                        <div className="absolute -left-[31px] top-[22px] w-4 h-4 rounded-full bg-bg-main border-2 border-border-main group-hover:border-brand transition-colors flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand/50 group-hover:bg-brand" />
                        </div>

                        <div className="flex items-start gap-4">
                          {/* Left Avatar initials */}
                          <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-inner">
                            {initials}
                          </div>

                          {/* Details & description */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-text-main">{log.userName}</span>
                              <span className="text-xs text-text-secondary font-medium font-mono bg-bg-main px-2 py-0.5 rounded border border-border-main/60 uppercase">
                                {log.action.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-text-main">{log.details}</p>
                          </div>
                        </div>

                        {/* Right Action icon and Timestamp */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <span className="text-xs text-text-secondary font-medium">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                          <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", iconColor)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="border border-border-main border-dashed rounded-2xl p-12 text-center bg-bg-card/20">
                <Clock className="w-8 h-8 text-text-secondary mx-auto mb-3" />
                <h3 className="font-bold text-text-main mb-1">Nenhum evento registrado</h3>
                <p className="text-sm text-text-secondary">Os eventos e ações de auditoria aparecerão aqui à medida que as modificações forem realizadas.</p>
              </div>
            )}
          </motion.div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <nav className="w-full lg:w-64 shrink-0 space-y-1 card p-2">
        <button 
          onClick={() => setActiveTab('storage')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'storage' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Database className={cn("w-5 h-5", activeTab === 'storage' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Destinos de Armazenamento</span>
        </button>
        <button 
          onClick={() => setActiveTab('clients')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'clients' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Users className={cn("w-5 h-5", activeTab === 'clients' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Gerenciar Clientes</span>
        </button>
        <button 
          onClick={() => setActiveTab('backup-types')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'backup-types' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Database className={cn("w-5 h-5", activeTab === 'backup-types' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Tipos de Backup</span>
        </button>
        <button 
          onClick={() => setActiveTab('retention')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'retention' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <History className={cn("w-5 h-5", activeTab === 'retention' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Políticas de Retenção</span>
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'notifications' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Bell className={cn("w-5 h-5", activeTab === 'notifications' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Alertas e Notificações</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
              activeTab === 'users' 
                ? "border-brand bg-brand/5 text-text-main font-bold" 
                : "border-transparent text-text-main hover:bg-bg-main font-medium"
            )}
          >
            <UserPlus className={cn("w-5 h-5", activeTab === 'users' ? "text-brand" : "text-text-secondary")} />
            <span className="text-sm">Gerenciar Equipe</span>
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('audit')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
              activeTab === 'audit' 
                ? "border-brand bg-brand/5 text-text-main font-bold" 
                : "border-transparent text-text-main hover:bg-bg-main font-medium"
            )}
          >
            <Shield className={cn("w-5 h-5", activeTab === 'audit' ? "text-brand" : "text-text-secondary")} />
            <span className="text-sm">Auditoria de Logs</span>
          </button>
        )}
        <button 
          onClick={() => setActiveTab('reset')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'reset' 
              ? "border-danger bg-danger/5 text-danger font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Trash2 className={cn("w-5 h-5", activeTab === 'reset' ? "text-danger" : "text-text-secondary")} />
          <span className="text-sm">Zerar Dados / Início</span>
        </button>
      </nav>

      <div className="flex-1 w-full card p-6 md:p-8 min-h-[500px]">
        {renderContent()}

        {activeTab !== 'clients' && activeTab !== 'users' && activeTab !== 'audit' && activeTab !== 'reset' && (
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-border-main">
            <button className="px-4 py-2 text-sm font-semibold text-text-main hover:bg-bg-main rounded-lg transition-colors">
              Cancelar
            </button>
            <button className="px-6 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-colors">
              Salvar Alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

