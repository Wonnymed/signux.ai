'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Loader2, Circle, ChevronDown,
  FileSearch, Users, Swords, GitMerge, Scale,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { useSimulationStore, type SimPhase } from '@/lib/store/simulation';
import { SIMULATION_PHASES, ESTIMATED_TOTAL_SECONDS } from '@/lib/simulation/phases';

// ═══ ICON MAP ═══

const PHASE_ICONS: Record<string, typeof FileSearch> = {
  'Research Plan': FileSearch,
  'Opening Analysis': Users,
  'Adversarial Debate': Swords,
  'Convergence': GitMerge,
  'Verdict': Scale,
};

// ═══ MAIN COMPONENT ═══

export default function SimulationPhases() {
  const phases = useSimulationStore((s) => s.phases);
  const elapsed = useSimulationStore((s) => s.elapsed);
  const status = useSimulationStore((s) => s.status);

  const activeIndex = phases.findIndex((p) => p.status === 'active');
  const completedCount = phases.filter((p) => p.status === 'complete').length;
  const progressPercent = phases.length > 0
    ? Math.round((completedCount / phases.length) * 100)
    : 0;

  const estimatedRemaining = useMemo(() => {
    if (activeIndex < 0) return 0;
    const remaining = SIMULATION_PHASES
      .slice(activeIndex)
      .reduce((sum, p) => sum + p.estimatedDuration, 0);
    return Math.max(0, remaining - (elapsed % 60));
  }, [activeIndex, elapsed]);

  if (status === 'idle') return null;

  return (
    <div className="space-y-1">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-txt-secondary">
            Analysis Progress
          </span>
          <span className="text-micro text-txt-disabled tabular-nums">
            {completedCount}/{phases.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-micro text-txt-disabled tabular-nums">
            {elapsed}s
          </span>
          {estimatedRemaining > 0 && status !== 'complete' && (
            <span className="text-micro text-txt-disabled">
              ~{estimatedRemaining}s left
            </span>
          )}
        </div>
      </div>

      {/* ─── PROGRESS BAR ─── */}
      <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* ─── PHASE LIST ─── */}
      <div className="space-y-1">
        {phases.map((phase, i) => (
          <PhaseItem
            key={phase.name}
            phase={phase}
            index={i}
            isLast={i === phases.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ═══ PHASE ITEM ═══

function PhaseItem({
  phase,
  index,
  isLast,
}: {
  phase: SimPhase;
  index: number;
  isLast: boolean;
}) {
  const Icon = PHASE_ICONS[phase.name] || Circle;
  const hasDetails = phase.details && phase.details.length > 0;
  const isExpandable = hasDetails && phase.status !== 'pending';

  return (
    <Collapsible>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        className={cn(
          'rounded-lg border transition-all duration-normal',
          phase.status === 'active' && 'border-accent/30 bg-accent-subtle/20 shadow-sm shadow-accent/5',
          phase.status === 'complete' && 'border-border-subtle bg-surface-1/50',
          phase.status === 'pending' && 'border-transparent bg-transparent opacity-50',
        )}
      >
        <CollapsibleTrigger
          disabled={!isExpandable}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-left',
            isExpandable && 'cursor-pointer hover:bg-surface-2/30',
            !isExpandable && 'cursor-default',
          )}
        >
          {/* Status icon */}
          <div className="shrink-0">
            {phase.status === 'complete' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <CheckCircle2 size={16} className="text-verdict-proceed" />
              </motion.div>
            )}
            {phase.status === 'active' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={16} className="text-accent" />
              </motion.div>
            )}
            {phase.status === 'pending' && (
              <Circle size={16} className="text-txt-disabled" />
            )}
          </div>

          {/* Phase icon + name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon
              size={14}
              className={cn(
                'shrink-0',
                phase.status === 'active' ? 'text-accent' :
                phase.status === 'complete' ? 'text-txt-secondary' :
                'text-txt-disabled',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium truncate',
                phase.status === 'active' ? 'text-txt-primary' :
                phase.status === 'complete' ? 'text-txt-secondary' :
                'text-txt-disabled',
              )}
            >
              {phase.name}
            </span>
          </div>

          {/* Description (active only) */}
          {phase.status === 'active' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-micro text-txt-tertiary hidden sm:block"
            >
              {phase.description}
            </motion.span>
          )}

          {/* Expand chevron */}
          {isExpandable && (
            <ChevronDown
              size={13}
              className="shrink-0 text-txt-disabled transition-transform duration-normal [[data-state=open]>&]:rotate-180"
            />
          )}
        </CollapsibleTrigger>

        {isExpandable && (
          <CollapsibleContent>
            <PhaseDetails phase={phase} />
          </CollapsibleContent>
        )}
      </motion.div>

      {/* Connector line */}
      {!isLast && (
        <div className="flex justify-start pl-[19px] py-0">
          <div
            className={cn(
              'w-px h-2',
              phase.status === 'complete' ? 'bg-verdict-proceed/30' :
              phase.status === 'active' ? 'bg-accent/30' :
              'bg-border-subtle/30',
            )}
          />
        </div>
      )}
    </Collapsible>
  );
}

// ═══ PHASE DETAILS ═══

function PhaseDetails({ phase }: { phase: SimPhase }) {
  if (!phase.details || phase.details.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="px-3 pb-2.5 pt-0"
    >
      <div className="ml-8 space-y-1.5 border-l border-border-subtle/50 pl-3">
        {phase.details.map((detail: any, i: number) => (
          <DetailItem key={i} detail={detail} index={i} phaseName={phase.name} />
        ))}
      </div>
    </motion.div>
  );
}

// ═══ DETAIL ITEM ═══

function DetailItem({
  detail,
  index,
  phaseName,
}: {
  detail: any;
  index: number;
  phaseName: string;
}) {
  // Research Plan: { task, assigned, priority }
  if (phaseName === 'Research Plan') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15, delay: index * 0.03 }}
        className="flex items-start gap-2"
      >
        <span className="text-micro text-txt-disabled tabular-nums shrink-0 mt-0.5">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <span className="text-xs text-txt-secondary">{detail.task || detail}</span>
          {detail.assigned && (
            <span className="text-micro text-txt-disabled ml-2">&rarr; {detail.assigned}</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Agent reports
  if (detail.agent || detail.agent_name) {
    const name = detail.agent || detail.agent_name;
    const detailStatus = detail.status;
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15, delay: index * 0.03 }}
        className="flex items-center gap-2"
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            detailStatus === 'complete' ? 'bg-verdict-proceed' :
            detailStatus === 'streaming' ? 'bg-accent animate-pulse' :
            'bg-surface-2',
          )}
        />
        <span className="text-xs text-txt-secondary truncate">{name}</span>
        {detailStatus === 'complete' && detail.summary && (
          <span className="text-micro text-txt-disabled truncate hidden sm:block">
            {detail.summary.substring(0, 60)}...
          </span>
        )}
      </motion.div>
    );
  }

  // Fallback: plain string
  if (typeof detail === 'string') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        className="text-xs text-txt-secondary"
      >
        {detail}
      </motion.div>
    );
  }

  return null;
}
