'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/design/cn';

type EntityState = 'idle' | 'chatting' | 'diving' | 'resting' | 'dormant' | 'active' | 'thinking';

interface EntityVisualProps {
  state: EntityState;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map external states to internal animation states
const stateMap: Record<EntityState, { scale: string; glow: string; breathe: string; label: string }> = {
  idle: {
    scale: 'scale-100',
    glow: 'entity-ring',
    breathe: 'animate-breathe',
    label: '',
  },
  dormant: {
    scale: 'scale-100',
    glow: 'entity-ring',
    breathe: 'animate-breathe',
    label: '',
  },
  chatting: {
    scale: 'scale-105',
    glow: 'entity-ring-active',
    breathe: 'animate-breathe-fast',
    label: 'Thinking...',
  },
  active: {
    scale: 'scale-105',
    glow: 'entity-ring-active',
    breathe: 'animate-breathe-fast',
    label: '',
  },
  thinking: {
    scale: 'scale-105',
    glow: 'entity-ring-active',
    breathe: 'animate-breathe-fast',
    label: 'Thinking...',
  },
  diving: {
    scale: 'scale-110',
    glow: 'entity-ring-engaged',
    breathe: 'animate-breathe-fast',
    label: 'Simulating...',
  },
  resting: {
    scale: 'scale-100',
    glow: 'entity-ring',
    breathe: 'animate-breathe',
    label: '',
  },
};

export default function EntityVisual({ state, compact = false, size, className }: EntityVisualProps) {
  const s = stateMap[state] || stateMap.idle;
  const resolvedSize = size ?? (compact ? 'sm' : 'md');
  const isCompact = compact || resolvedSize === 'sm';
  const sizeMap = {
    sm: { shell: 'w-10 h-10', sparkles: 16 },
    md: { shell: 'w-20 h-20', sparkles: 32 },
    lg: { shell: 'w-24 h-24', sparkles: 40 },
  } as const;
  const selected = sizeMap[resolvedSize];

  if (isCompact) {
    return (
      <div className={cn('flex justify-center py-2', className)}>
        <div className={cn(
          `${selected.shell} rounded-full flex items-center justify-center`,
          'bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60',
          'transition-all duration-entity ease-out',
          s.scale, s.glow, s.breathe,
        )}>
          <Sparkles size={selected.sparkles} className="text-white/95" strokeWidth={1.5} aria-hidden />
        </div>
        {s.label && (
          <span className="absolute mt-12 text-micro text-txt-tertiary animate-fade-in">
            {s.label}
          </span>
        )}
      </div>
    );
  }

  // Full entity visual (new conversation / empty state)
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-6', className)}>
      {/* Entity glow background */}
      <div className="relative">
        <div className="absolute inset-0 oct-entity-bg scale-150 opacity-50" />
        <div className={cn(
          `${selected.shell} relative rounded-full flex items-center justify-center`,
          'bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60',
          'transition-all duration-entity ease-out',
          s.scale, s.glow, s.breathe,
        )}>
          <Sparkles size={selected.sparkles} className="text-white/95" strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <h1 className="oct-wordmark text-2xl text-txt-primary">octux</h1>
        <p className="text-xs text-txt-tertiary mt-1 tracking-wide uppercase">
          Never decide alone again
        </p>
      </div>
    </div>
  );
}
