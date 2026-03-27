'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/design/cn';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/shadcn/hover-card';

interface OctHoverCardProps {
  trigger: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  width?: number;
  delay?: number;
  className?: string;
}

/** Shared hover surface: Radix HoverCard (portal, collision, Escape). Touch: opens on trigger press (Radix). */
export default function OctHoverCard({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  width = 320,
  delay = 300,
  className,
}: OctHoverCardProps) {
  return (
    <HoverCard openDelay={delay} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn('w-auto min-w-0 p-4 text-sm text-txt-primary', className)}
        style={{
          width: `${width}px`,
          maxWidth: `min(${width}px, calc(100vw - 24px))`,
        }}
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}

interface CitationHoverProps {
  citation: { id: number; agent_name: string; round: number; confidence: number; claim: string; evidence?: string; };
  children: ReactNode;
}

export function CitationHover({ citation, children }: CitationHoverProps) {
  return (
    <OctHoverCard trigger={children} width={300} delay={200}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-txt-primary">{citation.agent_name}</span>
          <span className={cn('text-micro px-1.5 py-0.5 rounded-sm',
            citation.confidence >= 7 ? 'bg-confidence-high/15 text-confidence-high' :
            citation.confidence >= 4 ? 'bg-confidence-medium/15 text-confidence-medium' :
            'bg-confidence-low/15 text-confidence-low',
          )}>{citation.confidence}/10</span>
        </div>
        <p className="text-txt-secondary text-xs leading-relaxed">{citation.claim}</p>
        {citation.evidence && <p className="text-micro text-txt-tertiary border-l-2 border-accent/30 pl-2">{citation.evidence}</p>}
        <p className="text-micro text-txt-disabled">Round {citation.round}</p>
      </div>
    </OctHoverCard>
  );
}
