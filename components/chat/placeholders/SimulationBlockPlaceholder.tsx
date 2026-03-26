'use client';

import { Zap, CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useSimulationStore } from '@/lib/store/simulation';

interface Props {
  question: string;
  streamUrl?: string;
}

export default function SimulationBlockPlaceholder({ question }: Props) {
  const status = useSimulationStore((s) => s.status);
  const phases = useSimulationStore((s) => s.phases);
  const elapsed = useSimulationStore((s) => s.elapsed);
  const agents = useSimulationStore((s) => s.agents);
  const error = useSimulationStore((s) => s.error);

  const agentCount = agents.size;
  const completedAgents = Array.from(agents.values()).filter((a) => a.status === 'complete').length;

  if (status === 'idle' || status === 'complete') return null;

  return (
    <div className="my-4 p-4 rounded-xl border-2 border-accent/15 bg-accent-subtle/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {status === 'error' ? (
          <XCircle size={16} className="text-verdict-abandon" />
        ) : (
          <Zap size={16} className="text-accent animate-pulse" />
        )}
        <span className="text-sm font-medium text-accent">Deep Simulation</span>
        <span className="text-micro text-txt-disabled ml-auto tabular-nums">{elapsed}s</span>
      </div>

      {/* Question */}
      <p className="text-xs text-txt-tertiary italic mb-3">&ldquo;{question}&rdquo;</p>

      {/* Phases */}
      <div className="space-y-1.5 mb-3">
        {phases.map((phase) => (
          <div key={phase.name} className="flex items-center gap-2">
            {phase.status === 'complete' && <CheckCircle2 size={13} className="text-verdict-proceed shrink-0" />}
            {phase.status === 'active' && <Loader2 size={13} className="text-accent animate-spin shrink-0" />}
            {phase.status === 'pending' && <Circle size={13} className="text-txt-disabled shrink-0" />}
            <span className={cn(
              'text-xs',
              phase.status === 'active' ? 'text-txt-primary font-medium' :
              phase.status === 'complete' ? 'text-txt-secondary' :
              'text-txt-disabled',
            )}>
              {phase.name}
            </span>
            {phase.status === 'active' && (
              <span className="text-micro text-txt-disabled ml-auto">{phase.description}</span>
            )}
          </div>
        ))}
      </div>

      {/* Agent count */}
      {agentCount > 0 && (
        <div className="flex items-center gap-2 text-micro text-txt-tertiary">
          <span>{completedAgents}/{agentCount} agents reported</span>
          <div className="flex gap-0.5">
            {Array.from(agents.values()).map((agent) => (
              <span
                key={agent.agent_id}
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  agent.status === 'complete'
                    ? agent.position === 'proceed' ? 'bg-verdict-proceed'
                      : agent.position === 'delay' ? 'bg-verdict-delay'
                      : 'bg-verdict-abandon'
                    : agent.status === 'streaming' ? 'bg-accent animate-pulse'
                    : 'bg-surface-2',
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 text-xs text-verdict-abandon">
          {error}
        </div>
      )}

      <p className="text-micro text-txt-disabled mt-3">
        Full streaming UI in PF-10→PF-13
      </p>
    </div>
  );
}
