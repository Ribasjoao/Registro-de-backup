import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { FileText, Sparkles, Loader2, Download, Share2, Key } from 'lucide-react';
import { BackupRecord } from '../types';
import { generateWeeklyReport } from '../services/geminiService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface ReportsViewProps {
  backups: BackupRecord[];
}

export function ReportsView({ backups }: ReportsViewProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const result = await window.aistudio.hasSelectedApiKey();
          setHasKey(result);
        } else {
          // Em produção fora do AI Studio, as Cloud Functions gerenciam a chave.
          // Não devemos expor ou checar chaves no client-side.
          setHasKey(true); 
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!hasKey && window.aistudio) {
      await handleSelectKey();
    }
    setLoading(true);
    try {
      const result = await generateWeeklyReport(backups);
      setReport(result);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-card rounded-xl border border-border-main shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-text-main">Relatórios Semanais Inteligentes</h2>
              <p className="text-sm text-text-secondary">Use IA para analisar seus backups e gerar insights acionáveis.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {hasKey === false && window.aistudio && (
              <button
                onClick={handleSelectKey}
                className="bg-bg-card hover:bg-bg-main text-text-main border border-border-main px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Key className="w-5 h-5 text-brand" />
                Configurar API Key
              </button>
            )}
            <button
              onClick={handleGenerateReport}
              disabled={loading || backups.length === 0}
              className="bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analisando Dados...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Relatório da Semana
                </>
              )}
            </button>
            {hasKey === true && window.aistudio && (
              <button
                onClick={handleSelectKey}
                className="p-3 text-text-secondary hover:text-brand transition-colors rounded-xl hover:bg-bg-main border border-transparent hover:border-border-main"
                title="Trocar Chave de API"
              >
                <Key className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {report ? (
        <div className="bg-bg-card rounded-xl border border-border-main shadow-sm overflow-hidden">
          <div className="p-4 bg-bg-main border-b border-border-main flex justify-between items-center">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Relatório Gerado por IA</span>
            <div className="flex gap-2">
              <button className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-lg hover:bg-bg-card border border-transparent hover:border-border-main">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-text-secondary hover:text-text-main transition-colors rounded-lg hover:bg-bg-card border border-transparent hover:border-border-main">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-8 prose prose-slate dark:prose-invert max-w-none prose-headings:font-heading prose-headings:text-text-main prose-strong:text-text-main prose-a:text-brand">
            <Markdown>{report}</Markdown>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-bg-main border-2 border-dashed border-border-main rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-bg-card rounded-full flex items-center justify-center shadow-sm mb-4">
              <Sparkles className="w-8 h-8 text-text-secondary/30" />
            </div>
            <h3 className="font-heading text-lg font-bold text-text-main mb-2">Nenhum relatório gerado</h3>
            <p className="text-sm text-text-secondary max-w-sm">
              Clique no botão acima para que a nossa IA analise os {backups.length} registros atuais e gere um resumo detalhado para você.
            </p>
          </div>
        )
      )}
    </div>
  );
}
