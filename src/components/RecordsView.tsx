import React, { useState, useMemo } from 'react';
import { Search, Calendar, Filter, Download, RefreshCw, ChevronLeft, ChevronRight, Eye, CheckCircle2, Edit2, Trash2, LayoutList, CalendarDays } from 'lucide-react';
import { StatusBadge } from './UI';
import { cn } from '../lib/utils';
import { BackupRecord } from '../types';
import { BackupDetailsModal } from './BackupDetailsModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface RecordsViewProps {
  backups: BackupRecord[];
  onEdit?: (backup: BackupRecord) => void;
  onDelete?: (id: string) => void;
}

export function RecordsView({ backups, onEdit, onDelete }: RecordsViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'week' | 'month' | 'all'>('month');
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const filteredBackups = useMemo(() => {
    let result = backups.filter(backup => 
      backup.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      backup.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      backup.responsible.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const now = new Date();
    if (filterMode === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(b => new Date(b.timestamp) >= sevenDaysAgo);
    } else if (filterMode === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(b => new Date(b.timestamp) >= thirtyDaysAgo);
    }

    return result;
  }, [backups, searchTerm, filterMode]);

  const currentMonthLabel = useMemo(() => {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const now = new Date();
    return `${months[now.getMonth()]}/${now.getFullYear()}`;
  }, []);

  const groupedBackups = useMemo(() => {
    const groups: Record<string, BackupRecord[]> = {};
    filteredBackups.forEach(backup => {
      const date = backup.timestamp.split(' ')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(backup);
    });
    
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => {
      const dateA = a[0].split('/').reverse().join('-');
      const dateB = b[0].split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  }, [filteredBackups]);

  const handleOpenDetails = (backup: BackupRecord) => {
    setSelectedBackup(backup);
    setIsDetailsOpen(true);
  };

  const exportToCSV = () => {
    if (filteredBackups.length === 0) return;

    const headers = [
      'ID',
      'Status',
      'Cliente',
      'Categoria',
      'Título',
      'Data da Auditoria',
      'Responsável',
      'Tipo de Backup',
      'Análise Técnica',
      'Plano de Ação'
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const stringValue = String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvRows = filteredBackups.map(backup => [
      escapeCSV(backup.id),
      escapeCSV(backup.status),
      escapeCSV(backup.client),
      escapeCSV(backup.category),
      escapeCSV(backup.title),
      escapeCSV(backup.timestamp),
      escapeCSV(backup.responsible),
      escapeCSV(backup.backupType || ''),
      escapeCSV(backup.technicalAnalysis || ''),
      escapeCSV(backup.actionPlan || '')
    ].join(';'));

    const csvContent = [headers.map(escapeCSV).join(';'), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `backups_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderRow = (backup: BackupRecord) => (
    <tr key={backup.id} className="hover:bg-bg-main transition-colors group">
      <td className="py-4 px-6 whitespace-nowrap">
        <StatusBadge status={backup.status} />
      </td>
      <td className="py-4 px-6 whitespace-nowrap font-medium text-text-main">
        {backup.client}
      </td>
      <td className="py-4 px-6 whitespace-nowrap">
        {backup.backupType ? (
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border",
            backup.backupType.toLowerCase().includes('cloud') || backup.backupType.toLowerCase().includes('nuvem')
              ? "bg-brand/10 text-brand border-brand/20"
              : "bg-bg-main text-text-secondary border-border-main"
          )}>
            {backup.backupType}
          </span>
        ) : (
          <span className="text-text-secondary italic text-[10px]">-</span>
        )}
      </td>
      <td className="py-4 px-6 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-light text-brand text-[10px] font-bold border border-brand/10">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {backup.category}
        </span>
      </td>
      <td className="py-4 px-6 whitespace-nowrap">
        <button 
          onClick={() => handleOpenDetails(backup)}
          className="text-text-main hover:text-brand font-medium transition-colors text-left max-w-xs truncate"
        >
          {backup.title}
        </button>
      </td>
      <td className="py-4 px-6 whitespace-nowrap text-text-secondary">
        {backup.timestamp}
      </td>
      <td className="py-4 px-6 whitespace-nowrap">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-bg-main text-text-main text-xs font-medium border border-border-main">
          {backup.responsible}
        </span>
      </td>
      <td className="py-4 px-6 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => handleOpenDetails(backup)}
            className="p-1.5 text-text-secondary hover:text-text-main hover:bg-bg-main rounded-lg transition-all"
            title="Ver Detalhes"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onEdit && (
            <button 
              onClick={() => onEdit(backup)}
              className="p-1.5 text-text-secondary hover:text-brand hover:bg-bg-main rounded-lg transition-all"
              title="Editar Registro"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => {
                setDeleteBackupId(backup.id);
                setIsDeleteModalOpen(true);
              }}
              className="p-1.5 text-text-secondary hover:text-danger hover:bg-bg-main rounded-lg transition-all"
              title="Excluir Registro"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="card p-0 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-border-main flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="font-heading text-lg font-bold text-text-main">Auditoria - {currentMonthLabel}</h2>
          
          <div className="flex items-center bg-bg-main p-1 rounded-lg border border-border-main">
            <button 
              onClick={() => setFilterMode('week')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                filterMode === 'week' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary hover:text-text-main"
              )}
            >
              Semana
            </button>
            <button 
              onClick={() => setFilterMode('month')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                filterMode === 'month' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary hover:text-text-main"
              )}
            >
              Mês
            </button>
            <button 
              onClick={() => setFilterMode('all')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                filterMode === 'all' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary hover:text-text-main"
              )}
            >
              Tudo
            </button>
          </div>

          <div className="relative flex items-center w-64 h-10 rounded-lg border border-border-main bg-bg-card focus-within:border-brand focus-within:ring-1 focus-within:ring-brand overflow-hidden transition-all">
            <div className="pl-3 pr-2 text-text-secondary flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full border-none bg-transparent text-sm text-text-main placeholder:text-text-secondary focus:ring-0 px-0"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-bg-main p-1 rounded-lg border border-border-main">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === 'list' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary hover:text-text-main"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Lista
            </button>
            <button 
              onClick={() => setViewMode('grouped')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                viewMode === 'grouped' ? "bg-bg-card text-brand shadow-sm" : "text-text-secondary hover:text-text-main"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Por Dia
            </button>
          </div>
          <button 
            onClick={exportToCSV}
            disabled={filteredBackups.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand-light/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-lg hover:bg-bg-main">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-main border-b border-border-main">
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status do backup</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Cliente</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tipo</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Categorias</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Título</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Data da Auditoria</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Responsável</th>
              <th className="py-3 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-border-main">
            {viewMode === 'list' ? (
              filteredBackups.map(renderRow)
            ) : (
              groupedBackups.map(([date, items]) => (
                <React.Fragment key={date}>
                  <tr className="bg-bg-main">
                    <td colSpan={8} className="py-2 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand" />
                        <span className="font-bold text-text-main text-xs uppercase tracking-wider">{date}</span>
                        <span className="text-[10px] text-text-secondary font-medium ml-2">({items.length} registros)</span>
                      </div>
                    </td>
                  </tr>
                  {items.map(renderRow)}
                </React.Fragment>
              ))
            )}
            {filteredBackups.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-secondary italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border-main flex items-center justify-between bg-bg-card">
        <span className="text-sm text-text-secondary">Total de Registros: {filteredBackups.length}</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-main disabled:opacity-50 flex items-center gap-1" disabled>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-brand hover:text-brand-dark flex items-center gap-1">
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BackupDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        backup={selectedBackup} 
      />

      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteBackupId(null);
        }} 
        onConfirm={() => {
          if (deleteBackupId && onDelete) {
            onDelete(deleteBackupId);
          }
        }}
        title="Excluir Auditoria de Backup"
        message="Tem certeza que deseja excluir permanentemente esta auditoria de backup? Esta ação não poderá ser desfeita."
      />
    </div>
  );
}
