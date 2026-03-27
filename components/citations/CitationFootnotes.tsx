'use client';

import { cn } from '@/lib/design/cn';
import { OctBadge } from '@/components/octux';
import { OctAvatar, OctCollapsible } from '@/components/ui';
import { type Citation, getConfidenceLevel } from '@/lib/citations/types';
import { getUniqueCitedAgents } from '@/lib/citations/parser';

interface CitationFootnotesProps {
  citations: Citation[];
  defaultOpen?: boolean;
  onAgentChat?: (agentId: string, agentName: string) => void;
  className?: string;
}

/**
 * CitationFootnotes — Expandable list of all citations.
 * Shows below verdict or agent report for full reference.
 *
 * Default: collapsed showing "N sources from M agents"
 * Expanded: full list with agent, claim, confidence, evidence
 */
export default function CitationFootnotes({
  citations, defaultOpen = false, onAgentChat, className,
}: CitationFootnotesProps) {
  if (!citations || citations.length === 0) return null;

  const uniqueAgents = getUniqueCitedAgents(citations);

  return (
    <div className={cn('mt-3 pt-3 border-t border-border-subtle', className)}>
      <OctCollapsible
        defaultOpen={defaultOpen}
        trigger={
          <div className="flex items-center gap-2">
            <span className="text-micro font-medium text-txt-tertiary">
              {citations.length} citation{citations.length !== 1 ? 's' : ''} from {uniqueAgents.length} agent{uniqueAgents.length !== 1 ? 's' : ''}
            </span>
            {/* Agent avatar stack */}
            <div className="flex -space-x-1.5">
              {uniqueAgents.slice(0, 4).map((agent, i) => (
                <OctAvatar
                  key={agent.agent_id}
                  type="agent"
                  category="business"
                  agentIndex={i}
                  name={agent.agent_name}
                  size="xs"
                  className="ring-1 ring-surface-0"
                />
              ))}
              {uniqueAgents.length > 4 && (
                <span className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-[9px] text-txt-disabled ring-1 ring-surface-0">
                  +{uniqueAgents.length - 4}
                </span>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-2 mt-1">
          {citations.map(citation => (
            <div
              key={citation.id}
              className="flex items-start gap-2.5 py-1.5 group"
            >
              {/* Citation number */}
              <span className="w-4 h-4 rounded-radius-xs bg-accent-muted text-accent text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {citation.id}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-micro font-medium text-txt-secondary">{citation.agent_name}</span>
                  <OctBadge confidence={getConfidenceLevel(citation.confidence)} size="xs">
                    {citation.confidence}/10
                  </OctBadge>
                  <span className="text-micro text-txt-disabled">R{citation.round}</span>
                </div>
                <p className="text-micro text-txt-tertiary leading-relaxed">{citation.claim}</p>
                {citation.supporting_data && (
                  <p className="text-micro text-txt-disabled mt-0.5 italic">{citation.supporting_data}</p>
                )}
              </div>

              {/* Chat action (visible on hover) */}
              {onAgentChat && (
                <button
                  onClick={() => onAgentChat(citation.agent_id, citation.agent_name)}
                  className="text-micro text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-normal shrink-0 mt-0.5"
                >
                  Chat →
                </button>
              )}
            </div>
          ))}
        </div>
      </OctCollapsible>
    </div>
  );
}
