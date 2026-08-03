import React, { useState } from 'react';
import { X } from 'lucide-react';
import { StorageDestination, Client } from '../types';

interface AddDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (destination: Omit<StorageDestination, 'id'>) => Promise<void>;
  clients: Client[];
}

export function AddDestinationModal({ isOpen, onClose, onSave, clients }: AddDestinationModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [freeSpaceTB, setFreeSpaceTB] = useState('');
  const [usedSpaceTB, setUsedSpaceTB] = useState('');
  const [totalSpaceTB, setTotalSpaceTB] = useState('');
  const [savingsPercent, setSavingsPercent] = useState('');
  const [savingsTB, setSavingsTB] = useState('');
  const [backupsCount, setBackupsCount] = useState('');
  const [location, setLocation] = useState<'Local' | 'S3' | 'Cloud'>('Local');
  const [isCustomClient, setIsCustomClient] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && client) {
      try {
        await onSave({
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
        setName('');
        setClient('');
        setFreeSpaceTB('');
        setUsedSpaceTB('');
        setTotalSpaceTB('');
        setSavingsPercent('');
        setSavingsTB('');
        setBackupsCount('');
        setLocation('Local');
      } catch (error) {
        console.error('Error adding destination:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-2xl shadow-2xl border border-border-main w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border-main flex items-center justify-between bg-bg-main/50">
          <h2 className="font-heading text-lg font-bold text-text-main">Novo Repositório</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-main text-text-secondary hover:text-text-main rounded-lg transition-colors">
            <X className="w-5 h-5" />
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
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="Ex: Repo-Imutavel"
                autoFocus
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-text-main">Cliente</label>
                {clients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setClient('');
                      setIsCustomClient(!isCustomClient);
                    }}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {isCustomClient ? 'Selecionar' : 'Digitar Novo'}
                  </button>
                )}
              </div>
              {clients.length === 0 || isCustomClient ? (
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  required
                />
              ) : (
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                  required
                >
                  <option value="">Selecione...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name} className="bg-bg-card text-text-main">{c.name}</option>
                  ))}
                </select>
              )}
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
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Usado (TB)</label>
              <input
                type="number"
                step="0.01"
                value={usedSpaceTB}
                onChange={(e) => setUsedSpaceTB(e.target.value)}
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
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
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">Localização</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as any)}
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
              >
                <option value="Local" className="bg-bg-card text-text-main">Local</option>
                <option value="S3" className="bg-bg-card text-text-main">S3</option>
                <option value="Cloud" className="bg-bg-card text-text-main">Cloud</option>
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
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1">TB Poupados</label>
              <input
                type="number"
                step="0.01"
                value={savingsTB}
                onChange={(e) => setSavingsTB(e.target.value)}
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
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
                className="w-full px-4 py-2 bg-bg-main border border-border-main text-text-main rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="Ex: 150"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border-main rounded-xl text-sm font-semibold text-text-main hover:bg-bg-main transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-dark transition-colors shadow-sm"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
