import React from 'react';
import { motion } from 'motion/react';
import { getSLAStatus } from '../utils/slaStatus';
import { cn } from '../lib/utils';

export interface SLABadgeProps {
  conformity: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  showMessageTooltip?: boolean;
}

export const SLABadge: React.FC<SLABadgeProps> = ({
  conformity,
  size = 'md',
  className,
  showLabel = true,
  showMessageTooltip = true,
}) => {
  const status = getSLAStatus(conformity);
  const IconComponent = status.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-medium gap-1 rounded-md',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5 rounded-lg',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      title={showMessageTooltip ? status.message : undefined}
      className={cn(
        'inline-flex items-center border shadow-xs transition-colors',
        status.bgColor,
        status.borderColor,
        status.textColor,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={cn('shrink-0', iconSizes[size], status.color)} />
      {showLabel && <span>{status.label}</span>}
    </motion.div>
  );
};
