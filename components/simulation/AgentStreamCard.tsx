'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';
import { OctBadge } from '@/components/octux';
import { OctAvatar } from '@/components/ui';
import { CitatedText } from '@/components/citations';
import type { StreamingAgent } from '@/lib/hooks/useSimulationStream';
import { SIMULATION_UI_LABELS } from '@/lib/simulation/streamingCopy';

interface AgentStreamCardProps {
  agent: StreamingAgent;
  index: number;
  className?: string;
}

export default function AgentStreamCard({ agent, index, className }: AgentStreamCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isStreaming = agent.status === 'streaming';
  const isComplete = agent.status === 'complete';

  const posKey = (agent.position || '').toLowerCase();
  const trendArrow = agent.confidence_trend === 'up' ? '\u2191' : agent.confidence_trend === 'down' ? '\u2193' : '';

  return (
    <div className={cn(
      'rounded-radius-lg border transition-all duration-normal ease-out overflow-hidden',
      isStreaming && 'border-accent/30 bg-accent-subtle/30',
      isComplete && 'border-border-subtle bg-surface-1',
      agent.status === 'pending' && 'border-border-subtle bg-surface-1 opacity-50',
      `stagger-${Math.min(index + 1, 10)} animate-slide-in-up`,
      className,
    )}>
      {/* Header */}
      <div
        role={isComplete ? 'button' : undefined}
        tabIndex={isComplete ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isComplete) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5',
          isComplete &&
            'cursor-pointer hover:bg-surface-2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          !isComplete && 'cursor-default',
        )}
        onClick={() => isComplete && setExpanded(!expanded)}
      >
        <OctAvatar
          type="agent"
          category={(agent.category as any) || 'business'}
          agentIndex={index}
          name={agent.agent_name}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-txt-primary truncate">{agent.agent_name}</span>
            {isStreaming && (
              <span className="text-micro text-accent animate-pulse-accent">{SIMULATION_UI_LABELS.agentAnalyzing}</span>
            )}
          </div>
          {agent.round && (
            <span className="text-micro text-txt-disabled">Round {agent.round}</span>
          )}
        </div>

        {/* Position badge */}
        {agent.position && (
          <OctBadge
            verdict={posKey === 'proceed' ? 'proceed' : posKey === 'delay' ? 'delay' : posKey === 'abandon' ? 'abandon' : undefined}
            size="xs"
          >
            {agent.position.toUpperCase()}
          </OctBadge>
        )}

        {/* Confidence badge */}
        {agent.confidence !== undefined && (
          <OctBadge
            confidence={agent.confidence >= 7 ? 'high' : agent.confidence >= 4 ? 'medium' : 'low'}
            size="xs"
          >
            {agent.confidence}/10{trendArrow && <span className="ml-0.5">{trendArrow}</span>}
          </OctBadge>
        )}

        {/* Expand chevron */}
        {isComplete && (
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={cn('shrink-0 text-icon-secondary transition-transform duration-normal', expanded && 'rotate-180')}
          >
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        )}
      </div>

      {/* Streaming text */}
      {isStreaming && agent.partial_text && (
        <div className="px-3 pb-3">
          <p className="text-xs text-txt-secondary leading-relaxed">
            {agent.partial_text}
            <span className="inline-block w-0.5 h-3 bg-accent animate-pulse-accent ml-0.5 align-text-bottom" />
          </p>
        </div>
      )}

      {/* Key argument preview (collapsed) */}
      {isComplete && !expanded && agent.key_argument && (
        <div className="px-3 pb-2.5">
          <p className="text-xs text-txt-tertiary leading-relaxed line-clamp-2">{agent.key_argument}</p>
        </div>
      )}

      {/* Expanded details */}
      {isComplete && expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border-subtle pt-2.5 animate-fade-in">
          {agent.key_argument && (
            <div>
              <span className="text-micro font-medium text-txt-tertiary">Key Argument</span>
              <CitatedText
                text={agent.key_argument || ''}
                citations={[]}
                className="text-xs text-txt-secondary leading-relaxed mt-0.5"
                as="p"
              />
            </div>
          )}

          {agent.evidence && agent.evidence.length > 0 && (
            <div>
              <span className="text-micro font-medium text-txt-tertiary">Evidence</span>
              <div className="mt-0.5 space-y-0.5">
                {agent.evidence.map((e, i) => (
                  <p key={i} className="text-micro text-txt-tertiary flex items-start gap-1.5">
                    <span className="text-accent shrink-0 mt-0.5">&bull;</span>
                    <span>{e}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {agent.risks && agent.risks.length > 0 && (
            <div>
              <span className="text-micro font-medium text-verdict-abandon/70">Risks Identified</span>
              <div className="mt-0.5 space-y-0.5">
                {agent.risks.map((r, i) => (
                  <p key={i} className="text-micro text-txt-tertiary flex items-start gap-1.5">
                    <span className="text-verdict-abandon shrink-0 mt-0.5">!</span>
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
