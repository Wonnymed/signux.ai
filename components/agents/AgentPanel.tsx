'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/design/cn';
import { OctTabs } from '@/components/ui';
import AgentAutoSelect from './AgentAutoSelect';
import type { SelectedAgent } from './AgentAutoSelect';
import AgentBrowser from './AgentBrowser';
import type { AgentDefinition } from './AgentBrowser';
import PanelTemplates from './PanelTemplates';
import type { PanelTemplate } from './PanelTemplates';
import CustomAgentCreator from './CustomAgentCreator';
import type { CustomAgent } from './CustomAgentCreator';
import SelfAgentToggle from './SelfAgentToggle';

interface AgentPanelProps {
  /** All available agents in the system */
  allAgents: AgentDefinition[];
  /** Currently selected agent objects */
  selectedAgents: SelectedAgent[];
  /** The question being analyzed */
  question: string;
  /** Called when selection changes */
  onSelectionChange: (agentIds: string[]) => void;
  /** Whether user joins debate */
  selfEnabled?: boolean;
  onSelfToggle?: (enabled: boolean) => void;
  userName?: string;
  userImage?: string;
  className?: string;
}

const TABS = [
  { id: 'auto', label: 'Auto' },
  { id: 'templates', label: 'Templates' },
  { id: 'browse', label: 'Browse' },
];

const MAX_AGENTS = 12;

export default function AgentPanel({
  allAgents,
  selectedAgents,
  question,
  onSelectionChange,
  selfEnabled = false,
  onSelfToggle,
  userName,
  userImage,
  className,
}: AgentPanelProps) {
  const [activeTab, setActiveTab] = useState('auto');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [customCreatorOpen, setCustomCreatorOpen] = useState(false);

  const selectedIds = new Set(selectedAgents.map(a => a.id));

  const handleToggleAgent = useCallback(
    (agentId: string) => {
      const current = selectedAgents.map(a => a.id);
      if (current.includes(agentId)) {
        onSelectionChange(current.filter(id => id !== agentId));
      } else if (current.length < MAX_AGENTS) {
        onSelectionChange([...current, agentId]);
      }
    },
    [selectedAgents, onSelectionChange],
  );

  const handleRemoveAgent = useCallback(
    (agentId: string) => {
      onSelectionChange(selectedAgents.map(a => a.id).filter(id => id !== agentId));
    },
    [selectedAgents, onSelectionChange],
  );

  const handleTemplateSelect = useCallback(
    (template: PanelTemplate) => {
      onSelectionChange(template.agentIds.slice(0, MAX_AGENTS));
    },
    [onSelectionChange],
  );

  const handleCustomCreate = useCallback(
    (agent: CustomAgent) => {
      const current = selectedAgents.map(a => a.id);
      if (current.length < MAX_AGENTS) {
        onSelectionChange([...current, agent.id]);
      }
      setCustomCreatorOpen(false);
    },
    [selectedAgents, onSelectionChange],
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Tab switcher */}
      <OctTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        size="sm"
        variant="pills"
      />

      {/* Auto-selected agents */}
      {activeTab === 'auto' && (
        <AgentAutoSelect
          agents={selectedAgents}
          question={question}
          onEdit={() => setBrowserOpen(true)}
          onRemove={handleRemoveAgent}
        />
      )}

      {/* Template selection */}
      {activeTab === 'templates' && (
        <PanelTemplates onSelect={handleTemplateSelect} />
      )}

      {/* Browse triggers browser dialog */}
      {activeTab === 'browse' && (
        <div className="text-center py-4">
          <button
            onClick={() => setBrowserOpen(true)}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Open agent browser ({selectedAgents.length}/{MAX_AGENTS} selected)
          </button>
        </div>
      )}

      {/* Self-agent toggle */}
      {onSelfToggle && (
        <SelfAgentToggle
          enabled={selfEnabled}
          onChange={onSelfToggle}
          userName={userName}
          userImage={userImage}
        />
      )}

      {/* Agent Browser Dialog */}
      <AgentBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        allAgents={allAgents}
        selectedIds={selectedIds}
        onToggle={handleToggleAgent}
        onCreateCustom={() => setCustomCreatorOpen(true)}
        maxAgents={MAX_AGENTS}
      />

      {/* Custom Agent Creator Dialog */}
      <CustomAgentCreator
        open={customCreatorOpen}
        onClose={() => setCustomCreatorOpen(false)}
        onCreate={handleCustomCreate}
      />
    </div>
  );
}
