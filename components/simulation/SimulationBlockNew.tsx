'use client';

/** Phase 1.1 — Deep Simulation shell: Decision OS radius, depth, semantic error surfaces. */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ChevronDown, XCircle, Clock,
  StopCircle, Maximize2, Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useSimulationStore } from '@/lib/store/simulation';
import { useConsensusHistory } from '@/lib/hooks/useConsensusHistory';
import { Separator } from '@/components/ui/shadcn/separator';

import SimulationPhases from './SimulationPhases';
import SimulationPhasesSummary from './SimulationPhasesSummary';
import AgentCardsStream from './AgentCardsStream';
import AgentScoreboard from './AgentScoreboard';
import ConsensusTracker from './ConsensusTracker';
import ConsensusSparkline from './ConsensusSparkline';
import { getSimulationStatusLabel } from '@/lib/simulation/streamingCopy';

interface SimulationBlockNewProps {
  question: string;
  streamUrl?: string;
  className?: string;
}

export default function SimulationBlockNew({
  question,
  className,
}: SimulationBlockNewProps) {
  const status = useSimulationStore((s) => s.status);
  const elapsed = useSimulationStore((s) => s.elapsed);
  const phases = useSimulationStore((s) => s.phases);
  const agents = useSimulationStore((s) => s.agents);
  const error = useSimulationStore((s) => s.error);
  const stopSimulation = useSimulationStore((s) => s.stopSimulation);

  const consensusHistory = useConsensusHistory();
  const isActive = !['idle', 'complete', 'error'].includes(status);
  const isComplete = status === 'complete';
  const isError = status === 'error';

  const [expanded, setExpanded] = useState(true);

  // Auto-collapse when simulation completes
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  // During simulation: always expanded
  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  if (isError) {
    return (
      <SimulationError
        question={question}
        error={error}
        elapsed={elapsed}
        className={className}
      />
    );
  }

  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'my-4 rounded-radius-xl border-2 overflow-hidden transition-colors duration-normal ease-out',
        isActive
          ? 'border-accent/25 shadow-accent-ring'
          : 'border-border-subtle shadow-premium',
        className,
      )}
    >
      {/* ═══ HEADER ═══ */}
      <SimulationHeader
        question={question}
        status={status}
        elapsed={elapsed}
        isActive={isActive}
        isComplete={isComplete}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onCancel={isActive ? stopSimulation : undefined}
      />

      {/* ═══ BODY ═══ */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {isActive ? (
              <StreamingBody />
            ) : isComplete ? (
              <CompletedBody
                consensusHistory={consensusHistory}
                phases={phases}
                elapsed={elapsed}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ COLLAPSED SUMMARY ═══ */}
      {isComplete && !expanded && (
        <CollapsedSummary
          phases={phases}
          elapsed={elapsed}
          agents={agents}
          onExpand={() => setExpanded(true)}
        />
      )}
    </motion.div>
  );
}

// ═══ HEADER ═══

function SimulationHeader({
  question, status, elapsed, isActive, isComplete, expanded, onToggle, onCancel,
}: {
  question: string;
  status: string;
  elapsed: number;
  isActive: boolean;
  isComplete: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        isActive ? 'bg-accent-subtle/20' : 'bg-surface-1',
      )}
    >
      {isActive ? (
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap size={16} className="text-accent" />
        </motion.div>
      ) : (
        <Zap size={16} className="text-txt-tertiary" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-card-title',
            isActive ? 'text-accent' : 'text-txt-secondary',
          )}>
            Deep Simulation
          </span>
          {isActive && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-micro text-accent"
            >
              {getSimulationStatusLabel(status)}
            </motion.span>
          )}
          {isComplete && (
            <span className="text-micro text-verdict-proceed">Complete</span>
          )}
        </div>
        <p className="text-xs text-txt-tertiary truncate mt-0.5">
          {question}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Clock size={11} className="text-txt-disabled" />
        <span className="text-micro text-txt-disabled tabular-nums">
          {elapsed}s
        </span>
      </div>

      {onCancel && isActive && (
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-surface-2 text-txt-disabled hover:text-verdict-abandon transition-colors duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          title="Cancel simulation"
        >
          <StopCircle size={14} />
        </button>
      )}

      {isComplete && (
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-surface-2 text-txt-disabled hover:text-txt-secondary transition-colors duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          title={expanded ? 'Collapse' : 'Expand analysis'}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}
    </div>
  );
}

// ═══ STREAMING BODY ═══

function StreamingBody() {
  return (
    <div className="px-4 pb-4 space-y-4">
      <SimulationPhases />
      <Separator className="bg-border-subtle/50" />
      <ConsensusTracker variant="full" />
      <Separator className="bg-border-subtle/50" />
      <AgentCardsStream />
    </div>
  );
}

// ═══ COMPLETED BODY ═══

function CompletedBody({
  consensusHistory,
  phases,
  elapsed,
}: {
  consensusHistory: any[];
  phases: any[];
  elapsed: number;
}) {
  return (
    <div className="px-4 pb-4 space-y-4">
      <div>
        <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider">
          Analysis phases
        </span>
        <SimulationPhasesSummary
          phases={phases}
          elapsed={elapsed}
          className="mt-1.5"
        />
      </div>

      {consensusHistory.length > 1 && (
        <div>
          <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider">
            Consensus shift
          </span>
          <div className="mt-1.5">
            <ConsensusSparkline history={consensusHistory} width={240} height={32} />
          </div>
        </div>
      )}

      <ConsensusTracker variant="compact" />

      <Separator className="bg-border-subtle/50" />

      <AgentScoreboard />
    </div>
  );
}

// ═══ COLLAPSED SUMMARY ═══

function CollapsedSummary({
  phases, elapsed, agents, onExpand,
}: {
  phases: any[];
  elapsed: number;
  agents: Map<string, any>;
  onExpand: () => void;
}) {
  const counts = useMemo(() => {
    const completed = Array.from(agents.values()).filter((a) => a.status === 'complete');
    return {
      proceed: completed.filter((a) => a.position === 'proceed').length,
      delay: completed.filter((a) => a.position === 'delay').length,
      abandon: completed.filter((a) => a.position === 'abandon').length,
    };
  }, [agents]);

  return (
    <div className="px-4 py-2.5 bg-surface-1 flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {phases.map((p) => (
          <span
            key={p.name}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              p.status === 'complete' ? 'bg-verdict-proceed' : 'bg-surface-2',
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 text-micro">
        {counts.proceed > 0 && (
          <span className="text-verdict-proceed tabular-nums">{counts.proceed} proceed</span>
        )}
        {counts.delay > 0 && (
          <span className="text-verdict-delay tabular-nums">{counts.delay} delay</span>
        )}
        {counts.abandon > 0 && (
          <span className="text-verdict-abandon tabular-nums">{counts.abandon} abandon</span>
        )}
      </div>

      <span className="text-micro text-txt-disabled tabular-nums">{elapsed}s</span>

      <button
        type="button"
        onClick={onExpand}
        className="ml-auto flex items-center gap-1 text-micro text-accent hover:text-accent-hover transition-colors duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 rounded-md"
      >
        View analysis
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

// ═══ ERROR STATE ═══

function SimulationError({
  question, error, elapsed, className,
}: {
  question: string;
  error: string | null;
  elapsed: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'my-4 overflow-hidden rounded-radius-xl border border-state-error/25 shadow-depth-sm',
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-3 border-b border-state-error/15 bg-state-error-muted px-4 py-3">
        <XCircle size={16} className="shrink-0 text-state-error" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-state-error">Simulation failed</span>
          <p className="mt-0.5 truncate text-xs text-txt-secondary">{question}</p>
        </div>
        <span className="text-micro tabular-nums text-txt-disabled">{elapsed}s</span>
      </div>
      <div className="bg-surface-1 px-4 py-3">
        <p className="mb-2 text-xs text-txt-secondary">
          {error || 'An unexpected error occurred. Please try again.'}
        </p>
        <p className="text-micro text-txt-disabled">
          Your token was not consumed. You can retry the simulation.
        </p>
      </div>
    </div>
  );
}

