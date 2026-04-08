import React, { useState } from 'react';
import { Database, History, Bell, Shield, Cloud, HardDrive, Edit2, Plus, Users, Trash2, Search, Settings } from 'lucide-react';
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
  isAdmin: boolean;
}

type SettingsTab = 'storage' | 'clients' | 'backup-types' | 'retention' | 'notifications' | 'security';

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
  isAdmin
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
      case 'security':
        if (!isAdmin) return null;
        return (
          <>
            <div className="mb-6">
              <h2 className="font-heading text-xl text-text-main font-bold">Gerenciamento de Usuários</h2>
              <p className="text-sm text-text-secondary mt-1">Controle quem tem acesso ao sistema e quais são suas permissões.</p>
            </div>

            <div className="border border-border-main rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-main border-b border-border-main">
                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Permissão</th>
                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-bg-main transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-text-main">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          u.role === 'admin' ? "bg-purple-100 text-purple-800 border-purple-200" :
                          u.role === 'editor' ? "bg-blue-100 text-blue-800 border-blue-200" :
                          "bg-slate-100 text-slate-800 border-slate-200"
                        )}>
                          {u.role === 'admin' ? 'Administrador' : u.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select 
                          value={u.role}
                          onChange={(e) => onUpdateUserRole?.(u.id, e.target.value)}
                          className="text-xs border border-border-main bg-bg-card text-text-main rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand"
                          disabled={u.email === 'joaoribasdossantos@gmail.com'}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      </nav>

      <div className="flex-1 w-full card p-6 md:p-8 min-h-[500px]">
        {renderContent()}

        {activeTab !== 'clients' && (
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

