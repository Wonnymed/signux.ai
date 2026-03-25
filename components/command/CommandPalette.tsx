'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/design/cn';
import { OctAvatar, OctBadge, OctSkeleton } from '@/components/ui';
import { type Command, ACTIONS, CATEGORIES } from '@/lib/commands/registry';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: Command[];
  recentCommands: Command[];
  selectedIndex: number;
  onSelectedIndexChange: (i: number) => void;
  onExecute: (cmd: Command) => void;
  loading: boolean;
}

export default function CommandPalette({
  open, onClose, query, onQueryChange, results, recentCommands,
  selectedIndex, onSelectedIndexChange, onExecute, loading,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const hasQuery = query.length >= 1;
  const showRecent = !hasQuery && recentCommands.length > 0;
  const showActions = !hasQuery;
  const showCategories = !hasQuery;

  // Build flat list for keyboard nav
  const allItems: Command[] = [];
  if (showRecent) allItems.push(...recentCommands);
  if (showActions) allItems.push(...ACTIONS);
  if (showCategories) allItems.push(...CATEGORIES);
  if (hasQuery) allItems.push(...results);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onSelectedIndexChange(Math.min(selectedIndex + 1, allItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) onExecute(allItems[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  let itemCounter = 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-surface-overlay/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative z-10 w-full max-w-[560px] mx-4 animate-scale-in',
          'bg-surface-raised border border-border-subtle rounded-xl shadow-xl',
          'flex flex-col overflow-hidden max-h-[60vh]',
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border-subtle">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-icon-secondary shrink-0">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search conversations, agents, actions..."
            className={cn(
              'flex-1 h-12 bg-transparent text-sm text-txt-primary placeholder:text-txt-disabled',
              'outline-none',
            )}
          />
          <kbd className="text-micro text-txt-disabled bg-surface-2 px-1.5 py-0.5 rounded-sm">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="px-4 py-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <OctSkeleton key={i} variant="text" className="h-8" />
              ))}
            </div>
          )}

          {showRecent && (
            <div>
              <div className="px-4 py-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                Recent
              </div>
              {recentCommands.map((cmd) => {
                const idx = itemCounter++;
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    selected={selectedIndex === idx}
                    onSelect={() => onExecute(cmd)}
                    onHover={() => onSelectedIndexChange(idx)}
                  />
                );
              })}
            </div>
          )}

          {showActions && (
            <div>
              <div className="px-4 py-1 mt-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                Actions
              </div>
              {ACTIONS.map((cmd) => {
                const idx = itemCounter++;
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    selected={selectedIndex === idx}
                    onSelect={() => onExecute(cmd)}
                    onHover={() => onSelectedIndexChange(idx)}
                  />
                );
              })}
            </div>
          )}

          {showCategories && (
            <div>
              <div className="px-4 py-1 mt-1 text-[10px] font-medium text-txt-disabled uppercase tracking-widest">
                Categories
              </div>
              {CATEGORIES.map((cmd) => {
                const idx = itemCounter++;
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    selected={selectedIndex === idx}
                    onSelect={() => onExecute(cmd)}
                    onHover={() => onSelectedIndexChange(idx)}
                  />
                );
              })}
            </div>
          )}

          {hasQuery && results.length > 0 && (
            <div>
              {results.map((cmd) => {
                const idx = itemCounter++;
                return (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    selected={selectedIndex === idx}
                    onSelect={() => onExecute(cmd)}
                    onHover={() => onSelectedIndexChange(idx)}
                  />
                );
              })}
            </div>
          )}

          {hasQuery && results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-txt-tertiary">No results for &quot;{query}&quot;</p>
              <p className="text-micro text-txt-disabled mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4">
          <span className="flex items-center gap-1 text-micro text-txt-disabled">
            <kbd className="bg-surface-2 px-1 rounded-sm">{'\u2191\u2193'}</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-micro text-txt-disabled">
            <kbd className="bg-surface-2 px-1 rounded-sm">{'\u21B5'}</kbd> select
          </span>
          <span className="flex items-center gap-1 text-micro text-txt-disabled">
            <kbd className="bg-surface-2 px-1 rounded-sm">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══ Command Item ═══

function CommandItem({ command, selected, onSelect, onHover }: {
  command: Command;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      data-selected={selected}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-fast',
        selected ? 'bg-accent/10 text-txt-primary' : 'text-txt-secondary hover:bg-surface-2',
      )}
    >
      <div className="w-6 h-6 flex items-center justify-center shrink-0">
        {command.type === 'conversation' && (
          <span className={cn(
            'w-2 h-2 rounded-full',
            command.verdictDot === 'proceed' && 'bg-verdict-proceed',
            command.verdictDot === 'delay' && 'bg-verdict-delay',
            command.verdictDot === 'abandon' && 'bg-verdict-abandon',
            !command.verdictDot && 'bg-txt-disabled',
          )} />
        )}
        {command.type === 'agent' && (
          <OctAvatar
            type="agent"
            category={(command.category as any) || 'life'}
            agentIndex={0}
            name={command.label}
            size="xs"
          />
        )}
        {command.type === 'category' && (
          <span className="text-sm">{command.icon}</span>
        )}
        {command.type === 'action' && (
          <ActionIcon iconId={command.icon} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs block truncate">{command.label}</span>
        {command.description && (
          <span className="text-micro text-txt-tertiary block truncate">{command.description}</span>
        )}
      </div>

      {command.shortcut && (
        <kbd className="text-micro text-txt-disabled bg-surface-2 px-1.5 py-0.5 rounded-sm shrink-0">
          {command.shortcut}
        </kbd>
      )}
      {command.type === 'agent' && command.category && (
        <OctBadge category={command.category as any} size="xs">{command.category}</OctBadge>
      )}
      {command.type === 'conversation' && command.timestamp && (
        <span className="text-micro text-txt-disabled shrink-0">
          {formatRelativeTime(command.timestamp)}
        </span>
      )}
    </button>
  );
}

function ActionIcon({ iconId }: { iconId?: string }) {
  const cls = "w-4 h-4 text-icon-secondary";
  switch (iconId) {
    case 'plus':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10" /></svg>;
    case 'simulate':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L3 4v5l5 3 5-3V4L8 1z" opacity="0.4" /><path d="M8 4L5 6v3l3 2 3-2V6L8 4z" /></svg>;
    case 'theme':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3" /><path d="M8 2v1M8 13v1M2 8h1M13 8h1" /></svg>;
    case 'keyboard':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="14" height="8" rx="1.5" /><path d="M4 7h1M7 7h2M11 7h1M5 10h6" /></svg>;
    case 'settings':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 2v1.5M8 12.5V14M14 8h-1.5M3.5 8H2" /></svg>;
    case 'tier':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12l4-8 4 8M6 8h4" /></svg>;
    default:
      return <span className="text-sm">{'\u26A1'}</span>;
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
