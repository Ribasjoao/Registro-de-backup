import { CheckCircle2, AlertTriangle, XCircle, LucideIcon } from 'lucide-react';

export type SLALevel = 'healthy' | 'warning' | 'critical';

export interface SLAStatus {
  level: SLALevel;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
  label: string;
  message: string;
}

export function getSLAStatus(conformity: number): SLAStatus {
  if (conformity >= 95) {
    return {
      level: 'healthy',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-500',
      borderColor: 'border-green-500/30',
      icon: CheckCircle2,
      label: 'SLA OK',
      message: 'Conformidade excelente dentro dos padrões de SLA (≥ 95%).',
    };
  } else if (conformity >= 80) {
    return {
      level: 'warning',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
      borderColor: 'border-amber-500/30',
      icon: AlertTriangle,
      label: 'SLA em risco',
      message: 'Conformidade em nível de atenção (80–94%). Monitorar próximas rotinas.',
    };
  } else {
    return {
      level: 'critical',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
      borderColor: 'border-red-500/30',
      icon: XCircle,
      label: 'SLA comprometido',
      message: 'Conformidade abaixo do limite aceitável (< 80%). Ação corretiva necessária.',
    };
  }
}
