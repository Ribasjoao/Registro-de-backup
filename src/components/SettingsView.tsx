import React, { useState } from 'react';
import { Database, History, Bell, Shield, Cloud, HardDrive, Edit2, Plus, Users, Trash2, Search, Settings, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Client, StorageDestination, BackupType } from '../types';
import { EditDestinationModal } from './EditDestinationModal';
import { EditClientModal } from './EditClientModal';
import { AddDestinationModal } from './AddDestinationModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

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

type SettingsTab = 'storage' | 'clients' | 'backup-types' | 'retention' | 'notifications' | 'security' | 'reset';

export function SettingsView({ 
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
      alert('Seus dados pessoais (Tarefas e Gamificação) foram resetados de volta ao zero com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar o reset dos dados pessoais.');
    } finally {
      setIsResettingPersonal(false);
    }
  };

  const handleResetSystem = async () => {
    if (!onResetData) return;
    if (!deleteBackups && !deleteClients && !deleteDestinations) {
      alert('Selecione pelo menos uma das opções acima para limpar do banco de dados.');
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
      alert('Os dados selecionados do sistema foram limpos com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar o reset dos dados selecionados do sistema.');
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
                              alert('Selecione pelo menos uma das opções acima para redefinir!');
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
        <button 
          onClick={() => setActiveTab('security')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 rounded transition-colors",
            activeTab === 'security' 
              ? "border-brand bg-brand/5 text-text-main font-bold" 
              : "border-transparent text-text-main hover:bg-bg-main font-medium"
          )}
        >
          <Shield className={cn("w-5 h-5", activeTab === 'security' ? "text-brand" : "text-text-secondary")} />
          <span className="text-sm">Controle de Acesso</span>
        </button>
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

        {activeTab !== 'clients' && activeTab !== 'reset' && (
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
}

