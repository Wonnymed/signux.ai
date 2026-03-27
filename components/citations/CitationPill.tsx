'use client';

import { cn } from '@/lib/design/cn';
import { type Citation, type CitationGroup } from '@/lib/citations/types';
import { getCitationById } from '@/lib/citations/parser';
import CitationHoverContent from './CitationHoverContent';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/shadcn/hover-card';

interface CitationPillProps {
  group: CitationGroup;
  citations: Citation[];
  simulationId?: string;
  conversationId?: string;
  onAgentChat?: (agentId: string, agentName: string) => void;
}

/** Phase 1.3 — Radix HoverCard: portal, collision, Escape; one focusable trigger (superscript numbers are decorative). */
export default function CitationPill({
  group, citations, simulationId, conversationId, onAgentChat,
}: CitationPillProps) {
  const resolvedCitations = group.ids
    .map(id => getCitationById(citations, id))
    .filter(Boolean) as Citation[];

  if (resolvedCitations.length === 0) return null;

  const pillStyle = group.type === 'contest'
    ? 'bg-confidence-contested/15 text-confidence-contested hover:bg-confidence-contested/25'
    : 'bg-accent-muted text-accent hover:bg-accent-glow';

  return (
    <HoverCard openDelay={150} closeDelay={120}>
      <HoverCardTrigger asChild>
        <span
          className="inline-flex cursor-help align-super"
          aria-label="Citation — hover or focus for details"
        >
          <span className="inline-flex items-center gap-px">
            {group.type === 'contest' ? (
              <>
                {group.ids.slice(0, Math.ceil(group.ids.length / 2)).map(id => (
                  <PillButton key={id} id={id} className={pillStyle} />
                ))}
                <span className="text-micro text-txt-disabled mx-0.5">vs</span>
                {group.ids.slice(Math.ceil(group.ids.length / 2)).map(id => (
                  <PillButton key={id} id={id} className={pillStyle} />
                ))}
              </>
            ) : (
              group.ids.map(id => (
                <PillButton key={id} id={id} className={pillStyle} />
              ))
            )}
          </span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        className="w-auto min-w-[280px] max-w-[min(22rem,360px)] border-0 bg-transparent p-0 shadow-none"
      >
        <CitationHoverContent
          citations={resolvedCitations}
          groupType={group.type}
          simulationId={simulationId}
          conversationId={conversationId}
          onAgentChat={onAgentChat}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

function PillButton({ id, className }: { id: number; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-radius-xs text-[10px] font-semibold',
        'cursor-inherit transition-colors duration-normal ease-out',
        className,
      )}
      aria-hidden
    >
      {id}
    </span>
  );
}
