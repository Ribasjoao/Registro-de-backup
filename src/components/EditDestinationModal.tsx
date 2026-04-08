import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StorageDestination, Client } from '../types';

interface EditDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (destination: StorageDestination) => Promise<void>;
  destination: StorageDestination | null;
  clients: Client[];
}

export function EditDestinationModal({ isOpen, onClose, onSave, destination, clients }: EditDestinationModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [freeSpaceTB, setFreeSpaceTB] = useState('');
  const [usedSpaceTB, setUsedSpaceTB] = useState('');
  const [totalSpaceTB, setTotalSpaceTB] = useState('');
  const [savingsPercent, setSavingsPercent] = useState('');
  const [savingsTB, setSavingsTB] = useState('');
  const [backupsCount, setBackupsCount] = useState('');
  const [location, setLocation] = useState<'Local' | 'S3' | 'Cloud'>('Local');

  useEffect(() => {
    if (destination) {
      setName(destination.name);
      setClient(destination.client || '');
      setFreeSpaceTB(destination.freeSpaceTB.toString());
      setUsedSpaceTB(destination.usedSpaceTB.toString());
      setTotalSpaceTB(destination.totalSpaceTB.toString());
      setSavingsPercent(destination.savingsPercent.toString());
      setSavingsTB(destination.savingsTB.toString());
      setBackupsCount(destination.backupsCount?.toString() || '0');
      setLocation(destination.location);
    }
  }, [destination]);

  if (!isOpen || !destination) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && client) {
      try {
        await onSave({
          ...destination,
          name: name.trim(),
          client,
          freeSpaceTB: Number(freeSpaceTB) || 0,
          usedSpaceTB: Number(usedSpaceTB) || 0,
          totalSpaceTB: Number(totalSpaceTB) || 0,
          savingsPercent: Number(savingsPercent) || 0,
          savingsTB: Number(savingsTB) || 0,
          backupsCount: Number(backupsCount) || 0,
          location,
        });
        onClose();
      } catch (error) {
        console.error('Error updating destination:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-heading text-lg font-bold text-primary">Editar Repositório</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Nome Repo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                placeholder="Ex: Repo-Imutavel"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Cliente</label>
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                required
              >
                <option value="">Selecione...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Livre (TB)</label>
              <input
                type="number"
                step="0.01"
                value={freeSpaceTB}
                onChange={(e) => setFreeSpaceTB(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Usado (TB)</label>
              <input
                type="number"
                step="0.01"
                value={usedSpaceTB}
                onChange={(e) => setUsedSpaceTB(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Total (TB)</label>
              <input
                type="number"
                step="0.01"
                value={totalSpaceTB}
                onChange={(e) => setTotalSpaceTB(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Localização</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              >
                <option value="Local">Local</option>
                <option value="S3">S3</option>
                <option value="Cloud">Cloud</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Economia (%)</label>
              <input
                type="number"
                value={savingsPercent}
                onChange={(e) => setSavingsPercent(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">TB Poupados</label>
              <input
                type="number"
                step="0.01"
                value={savingsTB}
                onChange={(e) => setSavingsTB(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Qtd Backups</label>
              <input
                type="number"
                value={backupsCount}
                onChange={(e) => setBackupsCount(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                placeholder="Ex: 150"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold text-text-main hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors shadow-sm"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
