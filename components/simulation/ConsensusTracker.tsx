'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadcn/tooltip';
import { useSimulationStore, type ConsensusState } from '@/lib/store/simulation';
import { verdictColors } from '@/lib/design/tokens';

interface ConsensusTrackerProps {
  variant?: 'full' | 'compact';
  className?: string;
  /** @deprecated Legacy prop from SimulationBlock — ignored, reads from store */
  consensus?: any;
}

export default function ConsensusTracker({
  variant = 'full',
  className,
  consensus: _legacyConsensus,
}: ConsensusTrackerProps) {
  const consensus = useSimulationStore((s) => s.consensus);
  const status = useSimulationStore((s) => s.status);

  if (!consensus || status === 'idle' || status === 'planning') return null;

  if (variant === 'compact') {
    return <CompactTracker consensus={consensus} className={className} />;
  }

  return <FullTracker consensus={consensus} className={className} />;
}

// ═══ FULL TRACKER ═══

function FullTracker({ consensus, className }: { consensus: ConsensusState; className?: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('rounded-lg border border-border-subtle bg-surface-1 p-3 space-y-3', className)}>
        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-txt-secondary">
            Consensus
          </span>
          <div className="flex items-center gap-2">
            {consensus.positionsChanged > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1"
              >
                <ArrowLeftRight size={11} className="text-accent" />
                <span className="text-micro text-accent font-medium">
                  {consensus.positionsChanged} shifted
                </span>
              </motion.div>
            )}
            <span className="text-micro text-txt-disabled tabular-nums">
              Round {consensus.round}/{consensus.totalRounds}
            </span>
          </div>
        </div>

        {/* ─── STACKED BAR ─── */}
        <div className="space-y-2">
          <StackedBar consensus={consensus} />
          <BarLabels consensus={consensus} />
        </div>

        {/* ─── METRICS ROW ─── */}
        <div className="flex items-center gap-4 pt-1 border-t border-border-subtle/50">
          <ConfidenceMetric value={consensus.avgConfidence} />
          {consensus.keyDisagreement && (
            <KeyDisagreement text={consensus.keyDisagreement} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ═══ STACKED BAR ═══

function StackedBar({ consensus }: { consensus: ConsensusState }) {
  const { proceed, delay, abandon } = consensus;
  const total = proceed + delay + abandon;

  const normalize = (val: number) => {
    if (val === 0 || total === 0) return 0;
    return Math.max(2, (val / total) * 100);
  };

  return (
    <div className="h-3 rounded-full bg-surface-2 overflow-hidden flex">
      <motion.div
        className="h-full rounded-l-full"
        style={{ backgroundColor: verdictColors.proceed.solid }}
        animate={{ width: `${normalize(proceed)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.div
        className="h-full"
        style={{ backgroundColor: verdictColors.delay.solid }}
        animate={{ width: `${normalize(delay)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.div
        className="h-full rounded-r-full"
        style={{ backgroundColor: verdictColors.abandon.solid }}
        animate={{ width: `${normalize(abandon)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// ═══ BAR LABELS ═══

function BarLabels({ consensus }: { consensus: ConsensusState }) {
  const positions = [
    { key: 'proceed' as const, label: 'Proceed', value: consensus.proceed, color: verdictColors.proceed.solid },
    { key: 'delay' as const, label: 'Delay', value: consensus.delay, color: verdictColors.delay.solid },
    { key: 'abandon' as const, label: 'Abandon', value: consensus.abandon, color: verdictColors.abandon.solid },
  ];

  const leading = positions.reduce((a, b) => (a.value >= b.value ? a : b));

  return (
    <div className="flex items-center justify-between">
      {positions.map((pos) => (
        <div
          key={pos.key}
          className={cn(
            'flex items-center gap-1.5 transition-opacity duration-300',
            pos.key === leading.key ? 'opacity-100' : 'opacity-60',
          )}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: pos.color }}
          />
          <span className="text-micro text-txt-secondary">
            {pos.label}
          </span>
          <motion.span
            key={pos.value}
            initial={{ opacity: 0.5, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-micro font-bold tabular-nums"
            style={{ color: pos.color }}
          >
            {pos.value}%
          </motion.span>
        </div>
      ))}
    </div>
  );
}

// ═══ CONFIDENCE METRIC ═══

function ConfidenceMetric({ value }: { value: number }) {
  const level = value >= 7 ? 'high' : value >= 4 ? 'moderate' : 'low';
  const colorVar = level === 'high'
    ? 'var(--confidence-high)'
    : level === 'moderate'
    ? 'var(--confidence-medium)'
    : 'var(--confidence-contested)';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <span className="text-micro text-txt-disabled">Confidence</span>
          <motion.span
            key={value}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-micro font-bold tabular-nums"
            style={{ color: colorVar }}
          >
            {value.toFixed(1)}/10
          </motion.span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Average confidence across all agents.
        {level === 'high' && ' Strong agreement.'}
        {level === 'moderate' && ' Some uncertainty remains.'}
        {level === 'low' && ' Significant disagreement.'}
      </TooltipContent>
    </Tooltip>
  );
}

// ═══ KEY DISAGREEMENT ═══

function KeyDisagreement({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 ml-auto cursor-default">
          <AlertTriangle size={11} className="text-verdict-delay shrink-0" />
          <span className="text-micro text-txt-tertiary truncate max-w-[140px]">
            {text}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-60">
        Key disagreement: {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ═══ COMPACT TRACKER ═══

function CompactTracker({ consensus, className }: { consensus: ConsensusState; className?: string }) {
  const leading = useMemo(() => {
    if (consensus.proceed >= consensus.delay && consensus.proceed >= consensus.abandon)
      return { position: 'proceed' as const, value: consensus.proceed };
    if (consensus.delay >= consensus.abandon)
      return { position: 'delay' as const, value: consensus.delay };
    return { position: 'abandon' as const, value: consensus.abandon };
  }, [consensus.proceed, consensus.delay, consensus.abandon]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mini bar */}
      <div className="w-20 h-1.5 rounded-full bg-surface-2 overflow-hidden flex shrink-0">
        <div
          className="h-full rounded-l-full transition-all duration-500"
          style={{
            width: `${consensus.proceed}%`,
            backgroundColor: verdictColors.proceed.solid,
          }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${consensus.delay}%`,
            backgroundColor: verdictColors.delay.solid,
          }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{
            width: `${consensus.abandon}%`,
            backgroundColor: verdictColors.abandon.solid,
          }}
        />
      </div>

      {/* Leading position */}
      <span
        className="text-micro font-bold uppercase tabular-nums"
        style={{ color: verdictColors[leading.position].solid }}
      >
        {leading.position} {leading.value}%
      </span>

      {/* Round */}
      <span className="text-micro text-txt-disabled tabular-nums">
        R{consensus.round}/{consensus.totalRounds}
      </span>
    </div>
  );
}
