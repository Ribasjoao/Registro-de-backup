import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Download, FileJson } from 'lucide-react';
import { cn } from '../lib/utils';
import { Client, StorageDestination } from '../types';
import { EditDestinationModal } from './EditDestinationModal';
import { AddDestinationModal } from './AddDestinationModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface DestinationsViewProps {
  destinations: StorageDestination[];
  clients: Client[];
  onUpdate: (updated: StorageDestination) => Promise<void>;
  onAdd: (destination: Omit<StorageDestination, 'id'>) => Promise<void>;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

export const DestinationsView = React.memo(function DestinationsView({ destinations, clients, onUpdate, onAdd, onDelete, isAdmin = true }: DestinationsViewProps) {
  const [editingDest, setEditingDest] = useState<StorageDestination | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingDestId, setDeletingDestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDestinations = destinations.filter(dest => 
    dest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dest.client && dest.client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(destinations, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "repositorios.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl text-text-main font-bold">Repositórios</h2>
          <p className="text-sm text-text-secondary mt-1">Gestão simplificada de destinos de armazenamento.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Filtrar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-10 rounded-lg border border-border-main bg-bg-card text-text-main text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none w-48"
            />
          </div>
          <button 
            onClick={exportToJson}
            className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-main text-text-main rounded-lg text-sm font-semibold hover:bg-bg-main transition-all shadow-sm"
            title="Salvar JSON"
          >
            <FileJson className="w-4 h-4 text-brand" />
            Salvar JSON
          </button>
          {isAdmin && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Repo
            </button>
          )}
        </div>
      </div>

      <div className="bg-bg-card rounded-xl shadow-sm border border-border-main overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-main border-b border-border-main">
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Nome Repo</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Livre (TB + %)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Usado (TB)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total (TB)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Backups</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Economia % (TB)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Local/Cloud</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {filteredDestinations.map((repo) => {
                const freePercent = repo.totalSpaceTB > 0 
                  ? ((repo.freeSpaceTB / repo.totalSpaceTB) * 100).toFixed(0) 
                  : '0';

                return (
                  <tr key={repo.id} className="hover:bg-bg-main/50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-text-secondary">{repo.client || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-text-main">{repo.name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-main">{repo.freeSpaceTB} TB ({freePercent}%)</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-main">{repo.usedSpaceTB} TB</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-main">{repo.totalSpaceTB} TB</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-main font-bold">{repo.backupsCount || 0}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-main">{repo.savingsPercent}% ({repo.savingsTB} TB)</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        repo.location === 'Local' ? "bg-slate-500/10 text-slate-300 border-slate-500/20" :
                        repo.location === 'S3' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      )}>
                        {repo.location}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setEditingDest(repo)}
                            className="p-1.5 text-text-secondary hover:text-brand hover:bg-bg-main rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setDeletingDestId(repo.id)}
                            className="p-1.5 text-text-secondary hover:text-danger hover:bg-bg-main rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingDest && (
        <EditDestinationModal 
          isOpen={!!editingDest}
          onClose={() => setEditingDest(null)}
          destination={editingDest}
          onSave={onUpdate}
          clients={clients}
        />
      )}

      <AddDestinationModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAdd}
        clients={clients}
      />

      <DeleteConfirmationModal 
        isOpen={!!deletingDestId}
        onClose={() => setDeletingDestId(null)}
        onConfirm={() => deletingDestId && onDelete(deletingDestId)}
        title="Excluir Repositório"
        message="Tem certeza que deseja excluir este repositório? Esta ação não pode ser desfeita."
      />
    </div>
  );
});
