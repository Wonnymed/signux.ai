'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import type { SimPhase } from '@/lib/store/simulation';

interface Props {
  phases: SimPhase[];
  elapsed: number;
  className?: string;
}

/**
 * Compact post-simulation summary.
 * Shows all phases as completed dots in a single row.
 */
export default function SimulationPhasesSummary({ phases, elapsed, className }: Props) {
  const allComplete = phases.every((p) => p.status === 'complete');

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1">
        {phases.map((phase) => (
          <div
            key={phase.name}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              phase.status === 'complete' ? 'bg-verdict-proceed' :
              phase.status === 'active' ? 'bg-accent' :
              'bg-surface-2',
            )}
            title={phase.name}
          />
        ))}
      </div>

      {allComplete && (
        <span className="flex items-center gap-1.5 text-micro text-txt-tertiary">
          <CheckCircle2 size={11} className="text-verdict-proceed" />
          5 phases completed in {elapsed}s
        </span>
      )}
    </div>
  );
}
