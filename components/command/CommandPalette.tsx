'use client';

import { useCallback } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/shadcn/command';
import {
  Plus,
  Zap,
  Moon,
  Keyboard,
  Settings,
  Layers,
  MessageSquare,
  Bot,
  Loader2,
} from 'lucide-react';
import { getCategoryColor, verdictColors, type VerdictType } from '@/lib/design/tokens';
import type { Command } from '@/lib/commands/registry';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: Command[];
  recentCommands: Command[];
  selectedIndex: number;
  onSelectedIndexChange: (i: number) => void;
  onExecute: (command: Command) => void;
  loading: boolean;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  plus: <Plus className="h-4 w-4" />,
  simulate: <Zap className="h-4 w-4" />,
  theme: <Moon className="h-4 w-4" />,
  keyboard: <Keyboard className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  tier: <Layers className="h-4 w-4" />,
};

function VerdictDot({ verdict }: { verdict?: string }) {
  if (!verdict) return null;
  const key = verdict.toLowerCase() as VerdictType;
  const color = verdictColors[key]?.solid;
  if (!color) return null;
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  results,
  recentCommands,
  onExecute,
  loading,
}: CommandPaletteProps) {
  const handleSelect = useCallback(
    (value: string) => {
      const allItems = query.length >= 1 ? results : [...recentCommands, ...DEFAULT_ACTIONS, ...DEFAULT_CATEGORIES];
      const item = allItems.find((c) => c.id === value);
      if (item) onExecute(item);
    },
    [query, results, recentCommands, onExecute],
  );

  const showResults = query.length >= 1;
  const hasResults = results.length > 0;

  // Group results by type
  const actionResults = results.filter((r) => r.type === 'action');
  const conversationResults = results.filter((r) => r.type === 'conversation');
  const categoryResults = results.filter((r) => r.type === 'category');
  const agentResults = results.filter((r) => r.type === 'agent');

  return (
    <CommandDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <CommandInput
        placeholder="Search conversations, actions, categories…"
        value={query}
        onValueChange={onQueryChange}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-txt-tertiary" />
          </div>
        )}

        {!loading && showResults && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* ── Search results ── */}
        {!loading && showResults && hasResults && (
          <>
            {actionResults.length > 0 && (
              <CommandGroup heading="Actions">
                {actionResults.map((cmd) => (
                  <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
                    <span className="text-icon-secondary">
                      {ACTION_ICONS[cmd.icon || ''] ?? <Zap className="h-4 w-4" />}
                    </span>
                    <span>{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-txt-tertiary text-xs ml-1 truncate">{cmd.description}</span>
                    )}
                    {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {conversationResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Conversations">
                  {conversationResults.map((cmd) => (
                    <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
                      <VerdictDot verdict={cmd.verdictDot} />
                      <MessageSquare className="h-4 w-4 text-icon-secondary" />
                      <span className="truncate">{cmd.label}</span>
                      {cmd.timestamp && (
                        <span className="ml-auto text-xs text-txt-disabled">{formatTimestamp(cmd.timestamp)}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {categoryResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Categories">
                  {categoryResults.map((cmd, i) => (
                    <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: getCategoryColor(cmd.category, i) }}
                      />
                      <span>{cmd.label}</span>
                      {cmd.description && (
                        <span className="text-txt-tertiary text-xs ml-1">{cmd.description}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {agentResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Agents">
                  {agentResults.map((cmd) => (
                    <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
                      <Bot className="h-4 w-4 text-icon-secondary" />
                      <span>{cmd.label}</span>
                      {cmd.description && (
                        <span className="text-txt-tertiary text-xs ml-1 truncate">{cmd.description}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* ── Default view (no query) ── */}
        {!loading && !showResults && (
          <>
            {recentCommands.length > 0 && (
              <CommandGroup heading="Recent">
                {recentCommands.map((cmd) => (
                  <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
                    <VerdictDot verdict={cmd.verdictDot} />
                    <MessageSquare className="h-4 w-4 text-icon-secondary" />
                    <span className="truncate">{cmd.label}</span>
                    {cmd.timestamp && (
                      <span className="ml-auto text-xs text-txt-disabled">{formatTimestamp(cmd.timestamp)}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup heading="Actions">
              {DEFAULT_ACTIONS.map((action) => (
                <CommandItem key={action.id} value={action.id} onSelect={handleSelect}>
                  <span className="text-icon-secondary">{ACTION_ICONS[action.icon || '']}</span>
                  <span>{action.label}</span>
                  {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Categories">
              {DEFAULT_CATEGORIES.map((cat, i) => (
                <CommandItem key={cat.id} value={cat.id} onSelect={handleSelect}>
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(cat.category, i) }}
                  />
                  <span className="capitalize">{cat.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// Static defaults for the no-query view
const DEFAULT_ACTIONS: Command[] = [
  { id: 'action:new-conversation', type: 'action', label: 'New conversation', shortcut: 'C', icon: 'plus' },
  { id: 'action:new-simulation', type: 'action', label: 'New simulation', shortcut: 'S', icon: 'simulate' },
  { id: 'action:toggle-dark-mode', type: 'action', label: 'Toggle dark mode', shortcut: 'D', icon: 'theme' },
  { id: 'action:shortcuts', type: 'action', label: 'Keyboard shortcuts', shortcut: '?', icon: 'keyboard' },
  { id: 'action:settings', type: 'action', label: 'Settings', shortcut: ',', icon: 'settings' },
];

const DEFAULT_CATEGORIES: Command[] = [
  { id: 'cat:business', type: 'category', label: 'Business', category: 'business' },
  { id: 'cat:career', type: 'category', label: 'Career', category: 'career' },
  { id: 'cat:investment', type: 'category', label: 'Investment', category: 'investment' },
];
