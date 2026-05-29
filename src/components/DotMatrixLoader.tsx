import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';

export type DotMatrixPattern = 'pulse' | 'wave' | 'spiral' | 'rain' | 'helix' | 'dynamic';

interface DotMatrixLoaderProps {
  pattern?: DotMatrixPattern;
  color?: 'purple' | 'violet' | 'brand' | 'petal-shimmer';
  size?: 'xs' | 'logo' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function DotMatrixLoader({
  pattern = 'pulse',
  color = 'brand',
  size = 'md',
  interactive = false
}: DotMatrixLoaderProps) {
  const [activePattern, setActivePattern] = useState<'pulse' | 'wave' | 'spiral' | 'rain' | 'helix'>('pulse');

  useEffect(() => {
    if (pattern !== 'dynamic') {
      setActivePattern(pattern as any);
      return;
    }

    const patterns: ('pulse' | 'wave' | 'spiral' | 'rain' | 'helix')[] = ['pulse', 'wave', 'spiral', 'rain', 'helix'];
    const randomStart = Math.floor(Math.random() * patterns.length);
    setActivePattern(patterns[randomStart]);

    let currentIndex = randomStart;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % patterns.length;
      setActivePattern(patterns[currentIndex]);
    }, 10000); // Cycles every 10 seconds

    return () => clearInterval(interval);
  }, [pattern]);

  // Configurable dimensions
  const rows = 8;
  const cols = 8;

  // Custom theme colors for the active dot glow
  const colorMap = {
    purple: 'bg-purple-500 shadow-purple-500/80',
    violet: 'bg-violet-500 shadow-violet-500/80',
    brand: 'bg-brand shadow-brand/80',
    'petal-shimmer': 'bg-pink-400 shadow-pink-400/80'
  };

  const activeColorClass = colorMap[color] || colorMap.brand;

  // Keyframes configuration for iridescent shades
  const animConfig = useMemo(() => {
    if (color === 'petal-shimmer') {
      return {
        bg: [
          'rgba(168, 85, 247, 0.05)', // base translucent purple
          'rgba(168, 85, 247, 0.95)', // iridescent lavender
          'rgba(244, 114, 182, 0.95)', // petal lilac-pink
          'rgba(252, 211, 77, 0.85)',  // warm gold shimmer
          'rgba(168, 85, 247, 0.05)'
        ],
        shadow: [
          '0 0 0px rgba(168, 85, 247, 0)',
          '0 0 8px rgba(168, 85, 247, 0.8)',
          '0 0 10px rgba(244, 114, 182, 0.8)',
          '0 0 8px rgba(252, 211, 77, 0.7)',
          '0 0 0px rgba(168, 85, 247, 0)'
        ]
      };
    }
    
    // Default purple / brand tints
    return {
      bg: ['rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.95)', 'rgba(139, 92, 246, 0.08)'],
      shadow: [
        '0 0 0px rgba(139, 92, 246, 0)',
        '0 0 10px rgba(139, 92, 246, 0.85)',
        '0 0 0px rgba(139, 92, 246, 0)'
      ]
    };
  }, [color]);

  // Grid sizing
  const gridSizing = {
    logo: 'gap-[1.5px]',
    xs: 'gap-0.5',
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  };

  const dotSizing = {
    logo: 'w-[2.5px] h-[2.5px]',
    xs: 'w-0.5 h-0.5',
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };


  // Generate dots with delay mapping based on x, y coordinates and selected pattern
  const dots = useMemo(() => {
    const list = [];
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let delay = 0;

        // Custom delay formulas to create breathtaking retro-modern dot matrix motion designs
        switch (activePattern) {
          case 'wave':
            // Diagonal wave propagation
            delay = (r + c) * 0.12;
            break;
          case 'spiral': {
            // Spiral or angle-based rotational delay
            const angle = Math.atan2(r - centerY, c - centerX);
            // Normalise angle between 0 and 2*PI
            const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
            const dist = Math.sqrt((r - centerY) ** 2 + (c - centerX) ** 2);
            delay = (normalizedAngle / (2 * Math.PI)) * 0.8 + dist * 0.1;
            break;
          }
          case 'rain':
            // Downward rain layout with vertical stagger and horizontal random offset
            delay = r * 0.15 + (c % 3) * 0.2;
            break;
          case 'helix': {
            // Helix sine wave
            const phase = (c / cols) * Math.PI * 2;
            delay = Math.sin(phase + r * 0.4) * 0.4 + 0.4;
            break;
          }
          case 'pulse':
          default: {
            // Concentric circle expand/contract from the exact midpoint
            const dx = c - centerX;
            const dy = r - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            delay = distance * 0.18;
            break;
          }
        }

        list.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          delay: parseFloat(delay.toFixed(3))
        });
      }
    }
    return list;
  }, [rows, cols, activePattern]);

  const isLogo = size === 'logo';

  return (
    <div className="relative flex flex-col items-center justify-center select-none shrink-0">
      {/* Glow highlight background ring */}
      {!isLogo && <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full pointer-events-none" />}

      {/* Grid container */}
      <div 
        className={
          isLogo
            ? `grid ${gridSizing[size]} relative overflow-hidden`
            : `grid ${gridSizing[size]} p-4 bg-bg-main/40 rounded-2xl border border-border-main/50 relative overflow-hidden backdrop-blur-sm`
        }
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {dots.map((dot) => (
          <motion.div
            key={dot.id}
            id={`dot-${dot.id}`}
            className={`${dotSizing[size]} rounded-full transition-all duration-300 relative`}
            animate={
              activePattern === 'rain'
                ? {
                    backgroundColor: color === 'petal-shimmer' ? animConfig.bg : ['rgba(168, 85, 247, 0.08)', 'rgba(168, 85, 247, 0.95)', 'rgba(168, 85, 247, 0.08)'],
                    boxShadow: color === 'petal-shimmer' ? animConfig.shadow : [
                      '0 0 0px rgba(168, 85, 247, 0)',
                      '0 0 8px rgba(168, 85, 247, 0.8)',
                      '0 0 0px rgba(168, 85, 247, 0)'
                    ]
                  }
                : {
                    scale: [0.8, 1.3, 0.8],
                    backgroundColor: animConfig.bg,
                    boxShadow: animConfig.shadow
                  }
            }
            transition={{
              duration: activePattern === 'rain' ? 1.5 : 1.8,
              repeat: Infinity,
              delay: dot.delay,
              ease: activePattern === 'spiral' ? 'linear' : 'easeInOut'
            }}
            whileHover={interactive ? {
              scale: 1.8,
              backgroundColor: '#a855f7',
              boxShadow: '0 0 14px #a855f7',
              transition: { duration: 0.1 }
            } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
