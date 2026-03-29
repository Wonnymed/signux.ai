'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/sukgo';
import { OctAvatar, OctDialog, OctInput, OctCollapsible } from '@/components/ui';
import { getCategoryColor } from '@/lib/design/tokens';
import type { CategoryType } from '@/lib/design/tokens';

export interface AgentDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  constraints?: string;
  expertise?: string[];
}

interface AgentBrowserProps {
  open: boolean;
  onClose: () => void;
  allAgents: AgentDefinition[];
  selectedIds: Set<string>;
  onToggle: (agentId: string) => void;
  onCreateCustom?: () => void;
  maxAgents?: number;
}

const CATEGORY_ORDER: CategoryType[] = ['investment', 'business', 'career'];

export default function AgentBrowser({
  open, onClose, allAgents, selectedIds, onToggle, onCreateCustom, maxAgents = 12,
}: AgentBrowserProps) {
  const [query, setQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, AgentDefinition[]> = {};
    for (const agent of allAgents) {
      if (!groups[agent.category]) groups[agent.category] = [];
      groups[agent.category].push(agent);
    }
    return groups;
  }, [allAgents]);

  const filteredAgents = useMemo(() => {
    if (query.length < 2) return null;
    const q = query.toLowerCase();
    return allAgents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.expertise?.some(e => e.toLowerCase().includes(q))
    );
  }, [query, allAgents]);

  const selectedCount = selectedIds.size;

  return (
    <OctDialog
      open={open}
      onClose={onClose}
      title="Agent Panel"
      description={`${selectedCount} of ${maxAgents} agents selected`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {onCreateCustom && (
              <OctButton variant="ghost" size="sm" onClick={onCreateCustom}>
                + Create custom agent
              </OctButton>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro text-txt-tertiary">{selectedCount}/{maxAgents}</span>
            <OctButton variant="default" size="sm" onClick={onClose}>
              Done
            </OctButton>
          </div>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <OctInput
          placeholder="Search agents by name, skill, or category..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          inputSize="sm"
          iconLeft={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4" /><path d="M9 9l3.5 3.5" />
            </svg>
          }
        />
      </div>

      {/* Search results */}
      {filteredAgents && (
        <div className="space-y-1 mb-4">
          <span className="text-micro text-txt-disabled">{filteredAgents.length} results</span>
          {filteredAgents.map((agent, i) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              index={i}
              selected={selectedIds.has(agent.id)}
              disabled={!selectedIds.has(agent.id) && selectedCount >= maxAgents}
              onToggle={() => onToggle(agent.id)}
            />
          ))}
          {filteredAgents.length === 0 && (
            <p className="text-xs text-txt-tertiary py-4 text-center">No agents match &quot;{query}&quot;</p>
          )}
        </div>
      )}

      {/* Category browse */}
      {!filteredAgents && (
        <div className="space-y-2">
          {CATEGORY_ORDER.map((cat, catIndex) => {
            const agents = grouped[cat] || [];
            if (agents.length === 0) return null;
            const selectedInCat = agents.filter(a => selectedIds.has(a.id)).length;

            return (
              <OctCollapsible
                key={cat}
                defaultOpen={expandedCategory === cat}
                onOpenChange={(isOpen) => setExpandedCategory(isOpen ? cat : null)}
                trigger={
                  <div className="flex items-center gap-2 w-full py-0.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(cat, catIndex) }}
                    />
                    <span className="text-xs font-medium text-txt-primary capitalize flex-1">{cat}</span>
                    <span className="text-micro text-txt-disabled">
                      {selectedInCat}/{agents.length}
                    </span>
                  </div>
                }
                className="px-1"
              >
                <div className="space-y-0.5 mt-1">
                  {agents.map((agent, i) => (
                    <AgentRow
                      key={agent.id}
                      agent={agent}
                      index={i}
                      selected={selectedIds.has(agent.id)}
                      disabled={!selectedIds.has(agent.id) && selectedCount >= maxAgents}
                      onToggle={() => onToggle(agent.id)}
                    />
                  ))}
                </div>
              </OctCollapsible>
            );
          })}
        </div>
      )}
    </OctDialog>
  );
}

function AgentRow({ agent, index, selected, disabled, onToggle }: {
  agent: AgentDefinition;
  index: number;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors duration-normal',
      selected ? 'bg-accent-subtle/50' : 'hover:bg-surface-2/50',
      disabled && !selected && 'opacity-40',
    )}>
      <button
        onClick={onToggle}
        disabled={disabled && !selected}
        className={cn(
          'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-normal',
          selected ? 'bg-accent border-accent' : 'border-border-default hover:border-accent/50',
          disabled && !selected && 'cursor-not-allowed',
        )}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M2 5l2.5 2.5L8 3" />
          </svg>
        )}
      </button>

      <OctAvatar
        type="agent"
        category={agent.category as any}
        agentIndex={index}
        name={agent.name}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        <span className="text-xs text-txt-primary block truncate">{agent.name}</span>
        <span className="text-micro text-txt-tertiary block truncate">{agent.description}</span>
      </div>
    </div>
  );
}
