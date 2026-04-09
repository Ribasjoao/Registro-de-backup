import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Shield, Database, History, TrendingUp, ArrowUp, ArrowRight } from 'lucide-react';
import { StatusBadge } from './UI';
import { BackupRecord } from '../types';
import { cn } from '../lib/utils';

interface DashboardViewProps {
  backups: BackupRecord[];
}

export function DashboardView({ backups }: DashboardViewProps) {
  const totalBackups = backups.length;
  const successCount = backups.filter(b => b.status === 'success').length;
  const warningCount = backups.filter(b => b.status === 'warning').length;
  const failedCount = backups.filter(b => b.status === 'failed').length;

  const successRate = totalBackups > 0 ? Math.round((successCount / totalBackups) * 100) : 0;
  
  const chartData = [
    { name: 'Sucesso', value: successCount, color: '#10B981' },
    { name: 'Aviso', value: warningCount, color: '#F59E0B' },
    { name: 'Falha', value: failedCount, color: '#EF4444' },
  ];

  const hasData = totalBackups > 0;
  const displayChartData = hasData ? chartData : [{ name: 'Sem Dados', value: 1, color: '#E2E8F0' }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-text-secondary">Saúde Geral</span>
            <Shield className={cn("w-5 h-5", successRate > 90 ? "text-success" : successRate > 70 ? "text-warning" : "text-danger")} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-text-main">{successRate}%</span>
            {hasData && (
              <span className="text-xs font-semibold text-success flex items-center bg-green-50 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1" />
                Estável
              </span>
            )}
          </div>
        </div>

        <div className="card p-6 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-text-secondary">Total de Backups</span>
            <History className="w-5 h-5 text-text-main" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-text-main">{totalBackups}</span>
            <span className="text-xs font-medium text-text-secondary">Registrados</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card flex flex-col">
          <h2 className="font-heading text-lg font-bold text-text-main mb-6">Status dos Backups</h2>
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayChartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading text-2xl font-bold text-text-main">{successRate}%</span>
              <span className="text-xs text-text-secondary">Sucesso</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {hasData ? chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-main">{item.name}</span>
                </div>
                <span className="font-medium">{totalBackups > 0 ? Math.round((item.value / totalBackups) * 100) : 0}%</span>
              </div>
            )) : (
              <p className="text-center text-sm text-text-secondary italic">Nenhum registro para exibir</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border-main flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-text-main">Atividade Recente</h2>
            <button className="text-sm font-medium text-brand hover:text-brand-dark transition-colors flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-main border-b border-border-main text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main">
                {backups.slice(0, 5).map((backup) => (
                  <tr key={backup.id} className="hover:bg-bg-main transition-colors group">
                    <td className="px-6 py-4">
                      <StatusBadge status={backup.status} />
                    </td>
                    <td className="px-6 py-4 font-medium text-text-main">{backup.client}</td>
                    <td className="px-6 py-4 text-text-secondary truncate max-w-[200px]">{backup.title}</td>
                    <td className="px-6 py-4 text-text-secondary text-right">{backup.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
