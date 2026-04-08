import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Shield, Database, History, X, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BackupRecord } from '../types';
import { cn } from '../lib/utils';

interface PresentationCarouselProps {
  backups: BackupRecord[];
  onClose: () => void;
}

export function PresentationCarousel({ backups, onClose }: PresentationCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 2;

  // Data Calculations
  const totalBackups = backups.length;
  const successCount = backups.filter(b => b.status === 'success').length;
  const warningCount = backups.filter(b => b.status === 'warning').length;
  const failedCount = backups.filter(b => b.status === 'failed').length;
  const successRate = totalBackups > 0 ? Math.round((successCount / totalBackups) * 100) : 0;

  const parseSize = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/^([\d.]+)\s*(GB|MB|TB|KB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    switch (unit) {
      case 'KB': return value / (1024 * 1024);
      case 'MB': return value / 1024;
      case 'GB': return value;
      case 'TB': return value * 1024;
      default: return 0;
    }
  };

  const totalStorageGB = backups.reduce((acc, b) => acc + parseSize(b.size), 0);
  const displayStorage = totalStorageGB >= 1024 
    ? `${(totalStorageGB / 1024).toFixed(2)} TB` 
    : `${totalStorageGB.toFixed(2)} GB`;

  const chartData = [
    { name: 'Sucesso', value: successCount, color: '#10B981' },
    { name: 'Aviso', value: warningCount, color: '#F59E0B' },
    { name: 'Falha', value: failedCount, color: '#EF4444' },
  ];

  // Auto-advance timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 10000); // 10 seconds
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      {/* Header / Exit */}
      <div className="absolute top-8 right-8 z-[110]">
        <button 
          onClick={onClose}
          className="p-4 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all group"
        >
          <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Navigation */}
      <button 
        onClick={prevSlide}
        className="absolute left-8 top-1/2 -translate-y-1/2 z-[110] p-6 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-40 hover:opacity-100"
      >
        <ChevronLeft className="w-12 h-12" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-[110] p-6 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-40 hover:opacity-100"
      >
        <ChevronRight className="w-12 h-12" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-2 bg-white/5 z-[110]">
        <motion.div 
          key={currentSlide}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 10, ease: "linear" }}
          className="h-full bg-brand"
        />
      </div>

      {/* Slides Container */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {currentSlide === 0 && (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="absolute inset-0 flex flex-col items-center justify-center p-20"
            >
              <h2 className="text-4xl font-heading font-bold text-slate-400 mb-20 uppercase tracking-[0.2em]">Visão Executiva</h2>
              <div className="grid grid-cols-3 gap-20 w-full max-w-7xl">
                <div className="flex flex-col items-center text-center space-y-8">
                  <div className="p-8 bg-success/10 rounded-3xl border border-success/20">
                    <Shield className="w-20 h-20 text-success" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-slate-400">Saúde Geral</p>
                    <p className="text-[120px] font-heading font-black leading-none text-white">{successRate}%</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-8">
                  <div className="p-8 bg-brand/10 rounded-3xl border border-brand/20">
                    <Database className="w-20 h-20 text-brand" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-slate-400">Armazenamento</p>
                    <p className="text-[120px] font-heading font-black leading-none text-white">{displayStorage}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-8">
                  <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                    <History className="w-20 h-20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-medium text-slate-400">Total de Backups</p>
                    <p className="text-[120px] font-heading font-black leading-none text-white">{totalBackups}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentSlide === 1 && (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="absolute inset-0 flex flex-col items-center justify-center p-20"
            >
              <h2 className="text-4xl font-heading font-bold text-slate-400 mb-12 uppercase tracking-[0.2em]">Distribuição de Status</h2>
              
              <div className="flex items-center justify-center gap-32 w-full max-w-7xl">
                <div className="w-[600px] h-[600px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={180}
                        outerRadius={280}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[140px] font-heading font-black leading-none text-white">{successRate}%</span>
                    <span className="text-4xl font-medium text-slate-400">Sucesso Total</span>
                  </div>
                </div>

                <div className="space-y-12">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-8">
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex flex-col">
                        <span className="text-3xl font-medium text-slate-400">{item.name}</span>
                        <span className="text-6xl font-heading font-bold text-white">
                          {totalBackups > 0 ? Math.round((item.value / totalBackups) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-[110]">
        {[...Array(totalSlides)].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-4 h-4 rounded-full transition-all duration-300",
              currentSlide === i ? "bg-brand w-12" : "bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}
