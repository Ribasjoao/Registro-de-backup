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
          const runtimeKey = (window as any).process?.env?.GEMINI_API_KEY || (window as any).process?.env?.API_KEY;
          const buildTimeKey = process.env.GEMINI_API_KEY;
          const key = runtimeKey || buildTimeKey;
          setHasKey(!!key && key !== "undefined" && key !== "MY_GEMINI_API_KEY" && key !== "YOUR_GEMINI_API_KEY" && key.length > 10);
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
      <div className="bg-surface rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-primary">Relatórios Semanais Inteligentes</h2>
              <p className="text-sm text-muted">Use IA para analisar seus backups e gerar insights acionáveis.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {hasKey === false && window.aistudio && (
              <button
                onClick={handleSelectKey}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
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
                className="p-3 text-muted hover:text-brand transition-colors rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200"
                title="Trocar Chave de API"
              >
                <Key className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {report ? (
        <div className="bg-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Relatório Gerado por IA</span>
            <div className="flex gap-2">
              <button className="p-2 text-muted hover:text-primary transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-200">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-muted hover:text-primary transition-colors rounded-lg hover:bg-white border border-transparent hover:border-slate-200">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-8 prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-primary prose-strong:text-primary prose-a:text-brand">
            <Markdown>{report}</Markdown>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-heading text-lg font-bold text-primary mb-2">Nenhum relatório gerado</h3>
            <p className="text-sm text-muted max-w-sm">
              Clique no botão acima para que a nossa IA analise os {backups.length} registros atuais e gere um resumo detalhado para você.
            </p>
          </div>
        )
      )}
    </div>
  );
}
