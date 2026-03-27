'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { type Citation, type CitationGroup } from '@/lib/citations/types';
import { getCitationById } from '@/lib/citations/parser';
import CitationHoverContent from './CitationHoverContent';

interface CitationPillProps {
  group: CitationGroup;
  citations: Citation[];
  simulationId?: string;
  conversationId?: string;
  onAgentChat?: (agentId: string, agentName: string) => void;
}

export default function CitationPill({
  group, citations, simulationId, conversationId, onAgentChat,
}: CitationPillProps) {
  const [showHover, setShowHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const enterTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!showHover || !isMobile) return;
    const handler = (e: TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowHover(false);
      }
    };
    document.addEventListener('touchstart', handler);
    return () => document.removeEventListener('touchstart', handler);
  }, [showHover, isMobile]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    clearTimeout(leaveTimeout.current);
    enterTimeout.current = setTimeout(() => setShowHover(true), 200);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    clearTimeout(enterTimeout.current);
    leaveTimeout.current = setTimeout(() => setShowHover(false), 150);
  };

  const handleTap = () => {
    if (isMobile) setShowHover(!showHover);
  };

  // Resolve citation objects
  const resolvedCitations = group.ids
    .map(id => getCitationById(citations, id))
    .filter(Boolean) as Citation[];

  if (resolvedCitations.length === 0) return null;

  // Visual style based on group type
  const pillStyle = group.type === 'contest'
    ? 'bg-confidence-contested/15 text-confidence-contested hover:bg-confidence-contested/25'
    : 'bg-accent-muted text-accent hover:bg-accent-glow';

  return (
    <span
      ref={containerRef}
      className="relative inline-flex align-super"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* The pill(s) */}
      <span className="inline-flex items-center gap-px">
        {group.type === 'contest' ? (
          // Contest: [1] vs [2]
          <>
            {group.ids.slice(0, Math.ceil(group.ids.length / 2)).map(id => (
              <PillButton key={id} id={id} className={pillStyle} onClick={handleTap} />
            ))}
            <span className="text-micro text-txt-disabled mx-0.5">vs</span>
            {group.ids.slice(Math.ceil(group.ids.length / 2)).map(id => (
              <PillButton key={id} id={id} className={pillStyle} onClick={handleTap} />
            ))}
          </>
        ) : (
          // Single or agreement: [1] or [1][3]
          group.ids.map(id => (
            <PillButton key={id} id={id} className={pillStyle} onClick={handleTap} />
          ))
        )}
      </span>

      {/* Hover card */}
      {showHover && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 animate-scale-in"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CitationHoverContent
            citations={resolvedCitations}
            groupType={group.type}
            simulationId={simulationId}
            conversationId={conversationId}
            onAgentChat={onAgentChat}
            onClose={() => setShowHover(false)}
          />
        </span>
      )}
    </span>
  );
}

// --- Pill button sub-component ---
function PillButton({ id, className, onClick }: { id: number; className: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'h-4 w-4 rounded-radius-xs text-[10px] font-semibold',
        'cursor-pointer transition-colors duration-normal ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
        className,
      )}
      aria-label={`Open citation ${id} details`}
    >
      {id}
    </button>
  );
}
