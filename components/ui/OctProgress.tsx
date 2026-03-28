'use client';

import { cn } from '@/lib/design/cn';

interface LinearProgressProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const linearSizeMap: Record<string, string> = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };

export function LinearProgress({ value, color = 'bg-accent', size = 'md', showLabel = false, animated = true, className }: LinearProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-surface-2 overflow-hidden', linearSizeMap[size])}>
        <div className={cn('h-full rounded-full transition-all duration-slow ease-out', color)} style={{ width: `${clamped}%` }}
          role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} />
      </div>
      {showLabel && <span className="text-micro text-txt-tertiary tabular-nums w-8 text-right">{Math.round(clamped)}%</span>}
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function CircularProgress({ value, size = 64, strokeWidth = 4, color = '#C75B2A', trackColor = 'var(--surface-2)', children, className }: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-slow ease-out" />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

interface Step { label: string; status: 'pending' | 'active' | 'complete'; description?: string; }
interface SteppedProgressProps { steps: Step[]; className?: string; }

export function SteppedProgress({ steps, className }: SteppedProgressProps) {
  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium transition-all duration-normal',
              step.status === 'complete' && 'bg-verdict-proceed text-white',
              step.status === 'active' && 'bg-accent text-white animate-pulse-accent',
              step.status === 'pending' && 'bg-surface-2 text-txt-disabled',
            )}>
              {step.status === 'complete' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-4.5" /></svg>
              ) : step.status === 'active' ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" /><path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              ) : <span>{i + 1}</span>}
            </div>
            {i < steps.length - 1 && <div className={cn('w-px h-6 my-0.5', step.status === 'complete' ? 'bg-verdict-proceed/40' : 'bg-border-subtle')} />}
          </div>
          <div className="pt-0.5 pb-3 min-w-0">
            <div className={cn('text-sm font-medium',
              step.status === 'complete' && 'text-txt-primary', step.status === 'active' && 'text-accent', step.status === 'pending' && 'text-txt-disabled',
            )}>{step.label}</div>
            {step.description && <div className="text-xs text-txt-tertiary mt-0.5 truncate">{step.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
