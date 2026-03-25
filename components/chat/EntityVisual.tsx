'use client';

import { cn } from '@/lib/design/cn';

type EntityState = 'idle' | 'chatting' | 'diving' | 'resting';

interface EntityVisualProps {
  state: EntityState;
  compact?: boolean;
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
  chatting: {
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

export default function EntityVisual({ state, compact = false, className }: EntityVisualProps) {
  const s = stateMap[state];

  if (compact) {
    return (
      <div className={cn('flex justify-center py-2', className)}>
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60',
          'transition-all duration-entity ease-out',
          s.scale, s.glow, s.breathe,
        )}>
          <span className="text-sm text-white font-medium">O</span>
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
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      {/* Entity glow background */}
      <div className="relative">
        <div className="absolute inset-0 oct-entity-bg scale-150 opacity-50" />
        <div className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60',
          'transition-all duration-entity ease-out',
          s.scale, s.glow, s.breathe,
        )}>
          <span className="text-3xl text-white font-medium">O</span>
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
