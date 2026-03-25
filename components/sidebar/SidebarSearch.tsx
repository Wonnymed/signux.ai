'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/design/cn';

interface SidebarSearchProps {
  expanded: boolean;
  conversations: any[];
  onSelect: (id: string) => void;
  className?: string;
}

export default function SidebarSearch({ expanded, conversations, onSelect, className }: SidebarSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+F shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Filter conversations
  const results = query.length >= 2
    ? conversations.filter(c => {
        const q = query.toLowerCase();
        return (
          c.title?.toLowerCase().includes(q) ||
          c.verdict_recommendation?.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  if (!expanded) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-md flex items-center justify-center text-icon-secondary hover:text-icon-primary hover:bg-surface-2 transition-colors duration-normal"
        title="Search (\u2318F)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="4" />
          <path d="M9 9l3.5 3.5" />
        </svg>
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md',
          'text-xs text-txt-disabled hover:text-txt-tertiary hover:bg-surface-2',
          'transition-colors duration-normal',
          className,
        )}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
          <circle cx="5" cy="5" r="3.5" />
          <path d="M8 8l2.5 2.5" />
        </svg>
        <span>Search...</span>
        <span className="ml-auto text-micro text-txt-disabled">{'\u2318'}F</span>
      </button>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-icon-secondary">
          <circle cx="5" cy="5" r="3.5" />
          <path d="M8 8l2.5 2.5" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className={cn(
            'w-full h-8 pl-7 pr-8 bg-surface-2 rounded-md',
            'text-xs text-txt-primary placeholder:text-txt-disabled',
            'outline-none border border-transparent focus:border-accent/30',
            'transition-colors duration-normal',
          )}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-icon-secondary hover:text-icon-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c.id); setOpen(false); setQuery(''); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left hover:bg-surface-2 transition-colors duration-normal"
            >
              <VerdictDot verdict={c.verdict_recommendation} />
              <span className="text-xs text-txt-primary truncate flex-1">
                {highlightMatch(c.title || 'Untitled', query)}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="text-micro text-txt-disabled px-2.5 py-2">No conversations found</p>
      )}
    </div>
  );
}

function VerdictDot({ verdict }: { verdict?: string }) {
  const v = verdict?.toLowerCase();
  return (
    <span className={cn(
      'w-1.5 h-1.5 rounded-full shrink-0',
      v === 'proceed' && 'bg-verdict-proceed',
      v === 'delay' && 'bg-verdict-delay',
      v === 'abandon' && 'bg-verdict-abandon',
      !v && 'bg-txt-disabled',
    )} />
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent font-medium">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
