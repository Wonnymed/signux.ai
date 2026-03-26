# PF-29 — Agent Selection UI

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion.

**Ref:** v0 (mode tabs — clean selection), CrewAI (role-goal-backstory agents), Linear (command surface for everything). Users should be able to customize WHICH specialists debate their decision. Default is auto-select (zero friction). Power users can handpick agents or use templates.

**What exists:**
- Simulation engine backend (P5→P38) accepts an `agents` param with agent IDs/roles
- `AgentCardsStream` (PF-11) renders agents during simulation
- `AgentScoreboard` (PF-11) shows post-sim agent summary
- DecisionCard (PF-07) has "Activate Deep Simulation" button
- Command Palette Cmd+K (PF-05)
- `useSimulationStream` hook (PF-09) triggers simulation via `/api/c/[id]/chat`
- Agent avatar colors deterministic by ID (PF-11)

**What this prompt builds:**

1. `lib/agents/catalog.ts` — full agent catalog (all 50 specialists, grouped by domain)
2. `AgentSelectionPanel` — expandable "8 specialists selected" bar with 3 modes:
   - Auto-select (default, zero friction)
   - Agent Browser (search, filter by domain, toggle on/off)
   - Panel Templates (pre-built combos)
3. `CustomAgentCreator` — modal to create a one-off agent (name, role, perspective)
4. `SelfAgentToggle` — "Join the debate" switch (YOUR avatar enters the simulation)
5. Integration into the simulation trigger flow


---

## Part A — Agent Catalog

CREATE `lib/agents/catalog.ts`:

```typescript
/**
 * Full catalog of Octux specialist agents.
 * Grouped by domain. Each agent has: id, name, role, domain, description, icon color.
 *
 * The backend already knows these agents — this is the FRONTEND catalog for selection UI.
 */

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  domain: AgentDomain;
  description: string;
  defaultFor: AgentDomain[]; // auto-selected for these domains
}

export type AgentDomain =
  | 'universal'
  | 'investment'
  | 'career'
  | 'business'
  | 'relationships'
  | 'life';

export const DOMAIN_LABELS: Record<AgentDomain, string> = {
  universal: 'Universal',
  investment: 'Investment',
  career: 'Career',
  business: 'Business',
  relationships: 'Relationships',
  life: 'Life',
};

export const DOMAIN_COLORS: Record<AgentDomain, string> = {
  universal: '#7C3AED',
  investment: '#6366f1',
  career: '#f59e0b',
  business: '#10b981',
  relationships: '#ec4899',
  life: '#06b6d4',
};

export const AGENT_CATALOG: AgentDef[] = [
  // ═══ UNIVERSAL (always available) ═══
  {
    id: 'base_rate',
    name: 'Base Rate Archivist',
    role: 'Historical data & statistical baselines',
    domain: 'universal',
    description: 'Finds the statistical base rate for your situation. "What usually happens when people do this?"',
    defaultFor: ['universal', 'investment', 'career', 'business', 'relationships', 'life'],
  },
  {
    id: 'devils_advocate',
    name: "Devil's Advocate",
    role: 'Contrarian stress-testing',
    domain: 'universal',
    description: 'Actively argues AGAINST the emerging consensus to find blind spots.',
    defaultFor: ['universal', 'investment', 'career', 'business', 'relationships', 'life'],
  },
  {
    id: 'risk_assessor',
    name: 'Risk Assessor',
    role: 'Downside analysis & worst cases',
    domain: 'universal',
    description: 'Maps every possible failure mode and estimates probability of each.',
    defaultFor: ['universal', 'investment', 'career', 'business'],
  },
  {
    id: 'opportunity_scout',
    name: 'Opportunity Scout',
    role: 'Upside potential & hidden value',
    domain: 'universal',
    description: 'Finds what others miss — asymmetric upside, second-order effects, optionality.',
    defaultFor: ['universal', 'investment', 'career', 'business'],
  },
  {
    id: 'temporal_analyst',
    name: 'Temporal Analyst',
    role: 'Timing & reversibility',
    domain: 'universal',
    description: 'Analyzes whether the timing is right and if the decision is reversible.',
    defaultFor: ['universal', 'investment', 'career', 'life'],
  },

  // ═══ INVESTMENT ═══
  {
    id: 'unit_economics',
    name: 'Unit Economics Auditor',
    role: 'Financial model & break-even',
    domain: 'investment',
    description: 'Builds the financial model. Revenue, costs, margins, break-even timeline.',
    defaultFor: ['investment', 'business'],
  },
  {
    id: 'regulatory',
    name: 'Regulatory Gatekeeper',
    role: 'Compliance & legal risks',
    domain: 'investment',
    description: 'Checks permits, regulations, legal requirements, and compliance risks.',
    defaultFor: ['investment', 'business'],
  },
  {
    id: 'demand_signal',
    name: 'Demand Signal Analyst',
    role: 'Market demand & trends',
    domain: 'investment',
    description: 'Analyzes market demand signals, growth trends, competitive landscape.',
    defaultFor: ['investment', 'business'],
  },
  {
    id: 'portfolio_fit',
    name: 'Portfolio Fit Analyst',
    role: 'Diversification & allocation',
    domain: 'investment',
    description: 'How does this fit your overall portfolio? Correlation, concentration risk.',
    defaultFor: ['investment'],
  },
  {
    id: 'exit_strategist',
    name: 'Exit Strategist',
    role: 'Liquidity & exit paths',
    domain: 'investment',
    description: 'Maps exit paths. When and how can you get out if things change?',
    defaultFor: ['investment'],
  },

  // ═══ CAREER ═══
  {
    id: 'career_trajectory',
    name: 'Career Trajectory Analyst',
    role: 'Long-term career impact',
    domain: 'career',
    description: 'Projects how this choice affects your 5-10 year career arc.',
    defaultFor: ['career'],
  },
  {
    id: 'skill_auditor',
    name: 'Skill Gap Auditor',
    role: 'Capability assessment',
    domain: 'career',
    description: 'What skills do you need vs what you have? Gap analysis and learning path.',
    defaultFor: ['career'],
  },
  {
    id: 'compensation_analyst',
    name: 'Compensation Analyst',
    role: 'Pay, equity & total comp',
    domain: 'career',
    description: 'Market rates, equity value, total comp comparison, negotiation leverage.',
    defaultFor: ['career'],
  },
  {
    id: 'network_mapper',
    name: 'Network Mapper',
    role: 'Professional relationships',
    domain: 'career',
    description: 'How does this affect your professional network? Bridges burned vs built.',
    defaultFor: ['career'],
  },
  {
    id: 'burnout_detector',
    name: 'Burnout Detector',
    role: 'Wellbeing & sustainability',
    domain: 'career',
    description: 'Assesses workload sustainability, stress factors, recovery capacity.',
    defaultFor: ['career', 'life'],
  },

  // ═══ BUSINESS ═══
  {
    id: 'competitive_analyst',
    name: 'Competitive Analyst',
    role: 'Market position & moat',
    domain: 'business',
    description: 'Competitive landscape, differentiation, barriers to entry, moat analysis.',
    defaultFor: ['business'],
  },
  {
    id: 'operations_auditor',
    name: 'Operations Auditor',
    role: 'Execution feasibility',
    domain: 'business',
    description: 'Can you actually execute this? People, processes, logistics, supply chain.',
    defaultFor: ['business'],
  },
  {
    id: 'growth_strategist',
    name: 'Growth Strategist',
    role: 'Scale & acquisition',
    domain: 'business',
    description: 'Customer acquisition, growth loops, viral mechanics, market expansion.',
    defaultFor: ['business'],
  },

  // ═══ RELATIONSHIPS ═══
  {
    id: 'emotional_analyst',
    name: 'Emotional Intelligence Analyst',
    role: 'Feelings & attachment patterns',
    domain: 'relationships',
    description: 'Maps emotional dynamics, attachment styles, communication patterns.',
    defaultFor: ['relationships'],
  },
  {
    id: 'values_auditor',
    name: 'Values Alignment Auditor',
    role: 'Core values compatibility',
    domain: 'relationships',
    description: 'Are your core values aligned? Where are the non-negotiable conflicts?',
    defaultFor: ['relationships'],
  },
  {
    id: 'future_projector',
    name: 'Future Projector',
    role: '5-year relationship trajectory',
    domain: 'relationships',
    description: 'Projects where this relationship goes based on current patterns.',
    defaultFor: ['relationships', 'life'],
  },
  {
    id: 'support_network',
    name: 'Support Network Analyst',
    role: 'Family & social impact',
    domain: 'relationships',
    description: 'How does this affect your broader support network? Family, friends, community.',
    defaultFor: ['relationships', 'life'],
  },

  // ═══ LIFE ═══
  {
    id: 'regret_minimizer',
    name: 'Regret Minimizer',
    role: 'Future self perspective',
    domain: 'life',
    description: 'What will 80-year-old you think about this decision? Deathbed test.',
    defaultFor: ['life', 'career', 'relationships'],
  },
  {
    id: 'second_order',
    name: 'Second-Order Thinker',
    role: 'Cascading consequences',
    domain: 'life',
    description: '"And then what?" Maps the chain of consequences beyond the immediate.',
    defaultFor: ['life', 'business'],
  },
];

/** Get agents recommended for a domain */
export function getDefaultAgents(domain: AgentDomain, maxCount = 10): AgentDef[] {
  const defaults = AGENT_CATALOG.filter((a) => a.defaultFor.includes(domain));
  return defaults.slice(0, maxCount);
}

/** Get all agents grouped by domain */
export function getAgentsByDomain(): Record<AgentDomain, AgentDef[]> {
  const groups: Record<AgentDomain, AgentDef[]> = {
    universal: [], investment: [], career: [], business: [], relationships: [], life: [],
  };
  for (const agent of AGENT_CATALOG) {
    groups[agent.domain].push(agent);
  }
  return groups;
}

// ═══ PANEL TEMPLATES ═══

export interface PanelTemplate {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  domain: AgentDomain;
}

export const PANEL_TEMPLATES: PanelTemplate[] = [
  {
    id: 'startup_launch',
    name: 'Startup Launch',
    description: 'Should I start this business?',
    agentIds: ['base_rate', 'devils_advocate', 'unit_economics', 'demand_signal', 'competitive_analyst', 'operations_auditor', 'growth_strategist', 'risk_assessor', 'regulatory', 'exit_strategist'],
    domain: 'business',
  },
  {
    id: 'investment_decision',
    name: 'Investment Decision',
    description: 'Should I put money into this?',
    agentIds: ['base_rate', 'devils_advocate', 'unit_economics', 'demand_signal', 'portfolio_fit', 'risk_assessor', 'regulatory', 'exit_strategist', 'temporal_analyst', 'opportunity_scout'],
    domain: 'investment',
  },
  {
    id: 'career_move',
    name: 'Career Move',
    description: 'Should I take this job / quit / pivot?',
    agentIds: ['base_rate', 'devils_advocate', 'career_trajectory', 'skill_auditor', 'compensation_analyst', 'network_mapper', 'burnout_detector', 'risk_assessor', 'regret_minimizer', 'temporal_analyst'],
    domain: 'career',
  },
  {
    id: 'relationship_crossroad',
    name: 'Relationship Crossroad',
    description: 'Stay, leave, or change?',
    agentIds: ['base_rate', 'devils_advocate', 'emotional_analyst', 'values_auditor', 'future_projector', 'support_network', 'regret_minimizer', 'temporal_analyst', 'risk_assessor', 'second_order'],
    domain: 'relationships',
  },
  {
    id: 'life_decision',
    name: 'Life Decision',
    description: 'Big life change — move, health, family',
    agentIds: ['base_rate', 'devils_advocate', 'regret_minimizer', 'second_order', 'temporal_analyst', 'risk_assessor', 'opportunity_scout', 'future_projector', 'support_network', 'burnout_detector'],
    domain: 'life',
  },
];
```

---

## Part B — Agent Selection Store

CREATE `lib/store/agentSelection.ts`:

```typescript
import { create } from 'zustand';
import { AGENT_CATALOG, getDefaultAgents, type AgentDef, type AgentDomain } from '@/lib/agents/catalog';

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  perspective: string;
  isCustom: true;
}

interface AgentSelectionState {
  mode: 'auto' | 'manual' | 'template';
  selectedAgentIds: string[];
  customAgents: CustomAgent[];
  selfAgentEnabled: boolean;
  detectedDomain: AgentDomain;

  // Actions
  setMode: (mode: 'auto' | 'manual' | 'template') => void;
  setDetectedDomain: (domain: AgentDomain) => void;
  toggleAgent: (agentId: string) => void;
  selectAll: (agentIds: string[]) => void;
  applyTemplate: (templateId: string) => void;
  addCustomAgent: (agent: Omit<CustomAgent, 'id' | 'isCustom'>) => void;
  removeCustomAgent: (id: string) => void;
  toggleSelfAgent: () => void;
  reset: () => void;

  // Computed
  getSelectedAgents: () => (AgentDef | CustomAgent)[];
  getAgentCount: () => number;
}

export const useAgentSelectionStore = create<AgentSelectionState>((set, get) => ({
  mode: 'auto',
  selectedAgentIds: [],
  customAgents: [],
  selfAgentEnabled: false,
  detectedDomain: 'universal',

  setMode: (mode) => {
    set({ mode });
    if (mode === 'auto') {
      const domain = get().detectedDomain;
      const defaults = getDefaultAgents(domain);
      set({ selectedAgentIds: defaults.map((a) => a.id) });
    }
  },

  setDetectedDomain: (domain) => {
    set({ detectedDomain: domain });
    if (get().mode === 'auto') {
      const defaults = getDefaultAgents(domain);
      set({ selectedAgentIds: defaults.map((a) => a.id) });
    }
  },

  toggleAgent: (agentId) => {
    const current = get().selectedAgentIds;
    if (current.includes(agentId)) {
      set({ selectedAgentIds: current.filter((id) => id !== agentId), mode: 'manual' });
    } else if (current.length < 12) {
      set({ selectedAgentIds: [...current, agentId], mode: 'manual' });
    }
  },

  selectAll: (agentIds) => {
    set({ selectedAgentIds: agentIds.slice(0, 12), mode: 'manual' });
  },

  applyTemplate: (templateId) => {
    const { PANEL_TEMPLATES } = require('@/lib/agents/catalog');
    const template = PANEL_TEMPLATES.find((t: any) => t.id === templateId);
    if (template) {
      set({
        selectedAgentIds: template.agentIds,
        mode: 'template',
      });
    }
  },

  addCustomAgent: (agent) => {
    const id = `custom_${Date.now()}`;
    const custom: CustomAgent = { ...agent, id, isCustom: true };
    const state = get();
    if (state.selectedAgentIds.length + state.customAgents.length < 12) {
      set({
        customAgents: [...state.customAgents, custom],
        mode: 'manual',
      });
    }
  },

  removeCustomAgent: (id) => {
    set((s) => ({ customAgents: s.customAgents.filter((a) => a.id !== id) }));
  },

  toggleSelfAgent: () => set((s) => ({ selfAgentEnabled: !s.selfAgentEnabled })),

  reset: () => {
    const domain = get().detectedDomain;
    const defaults = getDefaultAgents(domain);
    set({
      mode: 'auto',
      selectedAgentIds: defaults.map((a) => a.id),
      customAgents: [],
      selfAgentEnabled: false,
    });
  },

  getSelectedAgents: () => {
    const state = get();
    const catalogAgents = state.selectedAgentIds
      .map((id) => AGENT_CATALOG.find((a) => a.id === id))
      .filter(Boolean) as AgentDef[];
    return [...catalogAgents, ...state.customAgents];
  },

  getAgentCount: () => {
    const state = get();
    return state.selectedAgentIds.length + state.customAgents.length + (state.selfAgentEnabled ? 1 : 0);
  },
}));
```

---

## Part C — AgentSelectionPanel Component

CREATE `components/agents/AgentSelectionPanel.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, Search, Plus, User, Sparkles, LayoutGrid, Wand2 } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentSelectionStore } from '@/lib/store/agentSelection';
import {
  AGENT_CATALOG, PANEL_TEMPLATES, DOMAIN_LABELS, DOMAIN_COLORS,
  getAgentsByDomain, type AgentDef, type AgentDomain,
} from '@/lib/agents/catalog';
import CustomAgentCreator from './CustomAgentCreator';

interface AgentSelectionPanelProps {
  className?: string;
}

export default function AgentSelectionPanel({ className }: AgentSelectionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);

  const mode = useAgentSelectionStore((s) => s.mode);
  const selectedIds = useAgentSelectionStore((s) => s.selectedAgentIds);
  const customAgents = useAgentSelectionStore((s) => s.customAgents);
  const selfEnabled = useAgentSelectionStore((s) => s.selfAgentEnabled);
  const agentCount = useAgentSelectionStore((s) => s.getAgentCount());

  return (
    <div className={cn('rounded-xl border border-border-subtle bg-surface-1 overflow-hidden', className)}>
      {/* ─── COMPACT BAR (always visible) ─── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-2/30 transition-colors"
      >
        <Users size={14} className="text-accent shrink-0" />
        <span className="text-xs text-txt-secondary flex-1 text-left">
          {mode === 'auto' && `${agentCount} specialists auto-selected`}
          {mode === 'manual' && `${agentCount} specialists selected`}
          {mode === 'template' && `${agentCount} specialists (template)`}
        </span>

        {/* Mini agent dots */}
        <div className="flex items-center gap-0.5">
          {selectedIds.slice(0, 6).map((id) => {
            const agent = AGENT_CATALOG.find((a) => a.id === id);
            return (
              <span
                key={id}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: agent ? DOMAIN_COLORS[agent.domain] : '#7C3AED' }}
              />
            );
          })}
          {agentCount > 6 && (
            <span className="text-micro text-txt-disabled">+{agentCount - 6}</span>
          )}
        </div>

        <ChevronDown
          size={13}
          className={cn('text-txt-disabled transition-transform duration-150', expanded && 'rotate-180')}
        />
      </button>

      {/* ─── EXPANDED PANEL ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border-subtle/50"
          >
            <div className="p-3.5">
              <Tabs defaultValue="auto" className="w-full">
                <TabsList className="w-full justify-start bg-surface-2/50 p-0.5 h-auto gap-0.5 mb-3">
                  <TabsTrigger
                    value="auto"
                    onClick={() => useAgentSelectionStore.getState().setMode('auto')}
                    className="text-[11px] px-2.5 py-1 data-[state=active]:bg-surface-raised data-[state=active]:text-txt-primary"
                  >
                    <Sparkles size={11} className="mr-1" />
                    Auto
                  </TabsTrigger>
                  <TabsTrigger
                    value="browse"
                    className="text-[11px] px-2.5 py-1 data-[state=active]:bg-surface-raised data-[state=active]:text-txt-primary"
                  >
                    <LayoutGrid size={11} className="mr-1" />
                    Browse
                  </TabsTrigger>
                  <TabsTrigger
                    value="templates"
                    className="text-[11px] px-2.5 py-1 data-[state=active]:bg-surface-raised data-[state=active]:text-txt-primary"
                  >
                    <Wand2 size={11} className="mr-1" />
                    Templates
                  </TabsTrigger>
                </TabsList>

                {/* ─── AUTO TAB ─── */}
                <TabsContent value="auto" className="mt-0">
                  <p className="text-micro text-txt-tertiary mb-2">
                    Octux automatically selects the best specialists based on your question.
                  </p>
                  <SelectedAgentsList />
                </TabsContent>

                {/* ─── BROWSE TAB ─── */}
                <TabsContent value="browse" className="mt-0">
                  <AgentBrowser />
                </TabsContent>

                {/* ─── TEMPLATES TAB ─── */}
                <TabsContent value="templates" className="mt-0">
                  <TemplatesList />
                </TabsContent>
              </Tabs>

              {/* ─── BOTTOM ROW: Self-Agent + Custom Agent ─── */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle/50">
                <SelfAgentToggle />
                <button
                  onClick={() => setShowCustomCreator(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-txt-tertiary hover:text-accent hover:bg-accent/5 transition-colors"
                >
                  <Plus size={11} />
                  Custom agent
                </button>
                <span className="ml-auto text-micro text-txt-disabled tabular-nums">
                  {agentCount}/12
                </span>
              </div>
            </div>

            {showCustomCreator && (
              <CustomAgentCreator onClose={() => setShowCustomCreator(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ SELECTED AGENTS LIST ═══

function SelectedAgentsList() {
  const selectedIds = useAgentSelectionStore((s) => s.selectedAgentIds);
  const toggleAgent = useAgentSelectionStore((s) => s.toggleAgent);

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
      {selectedIds.map((id) => {
        const agent = AGENT_CATALOG.find((a) => a.id === id);
        if (!agent) return null;
        return (
          <AgentRow key={id} agent={agent} selected onToggle={() => toggleAgent(id)} />
        );
      })}
    </div>
  );
}

// ═══ AGENT BROWSER ═══

function AgentBrowser() {
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState<AgentDomain | 'all'>('all');
  const selectedIds = useAgentSelectionStore((s) => s.selectedAgentIds);
  const toggleAgent = useAgentSelectionStore((s) => s.toggleAgent);

  const filtered = AGENT_CATALOG.filter((a) => {
    if (filterDomain !== 'all' && a.domain !== filterDomain) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1.5 h-7 px-2 rounded-md bg-surface-2/50 border border-border-subtle/50">
          <Search size={11} className="text-txt-disabled shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="flex-1 text-[11px] bg-transparent text-txt-primary placeholder:text-txt-disabled outline-none"
          />
        </div>
      </div>

      {/* Domain filters */}
      <div className="flex gap-1 mb-2 flex-wrap">
        <FilterChip label="All" active={filterDomain === 'all'} onClick={() => setFilterDomain('all')} />
        {(Object.keys(DOMAIN_LABELS) as AgentDomain[]).map((d) => (
          <FilterChip
            key={d}
            label={DOMAIN_LABELS[d]}
            active={filterDomain === d}
            onClick={() => setFilterDomain(d)}
            color={DOMAIN_COLORS[d]}
          />
        ))}
      </div>

      {/* Agent list */}
      <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-hide">
        {filtered.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            selected={selectedIds.includes(agent.id)}
            onToggle={() => toggleAgent(agent.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-micro text-txt-disabled text-center py-4">No agents match your search</p>
        )}
      </div>
    </div>
  );
}

// ═══ TEMPLATES LIST ═══

function TemplatesList() {
  const applyTemplate = useAgentSelectionStore((s) => s.applyTemplate);

  return (
    <div className="space-y-1.5">
      {PANEL_TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => applyTemplate(t.id)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-subtle/50 hover:border-accent/20 hover:bg-accent/[0.03] transition-all text-left"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: DOMAIN_COLORS[t.domain] }}
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-txt-primary">{t.name}</span>
            <p className="text-micro text-txt-disabled">{t.description}</p>
          </div>
          <span className="text-micro text-txt-disabled tabular-nums shrink-0">{t.agentIds.length}</span>
        </button>
      ))}
    </div>
  );
}

// ═══ AGENT ROW ═══

function AgentRow({ agent, selected, onToggle }: { agent: AgentDef; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left',
        selected ? 'bg-accent/5 border border-accent/15' : 'border border-transparent hover:bg-surface-2/30',
      )}
    >
      <span
        className={cn('w-2 h-2 rounded-full shrink-0', selected ? 'ring-2 ring-accent/30' : '')}
        style={{ backgroundColor: DOMAIN_COLORS[agent.domain] }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-txt-primary truncate block">{agent.name}</span>
        <span className="text-micro text-txt-disabled truncate block">{agent.role}</span>
      </div>
      <span className={cn(
        'text-micro shrink-0 w-4 h-4 rounded flex items-center justify-center',
        selected ? 'bg-accent text-white' : 'bg-surface-2 text-txt-disabled',
      )}>
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

// ═══ FILTER CHIP ═══

function FilterChip({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 rounded-md text-[10px] transition-colors',
        active
          ? 'bg-accent/15 text-accent border border-accent/20'
          : 'bg-surface-2/50 text-txt-disabled border border-transparent hover:text-txt-tertiary',
      )}
    >
      {color && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

// ═══ SELF-AGENT TOGGLE ═══

function SelfAgentToggle() {
  const enabled = useAgentSelectionStore((s) => s.selfAgentEnabled);
  const toggle = useAgentSelectionStore((s) => s.toggleSelfAgent);

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors',
        enabled
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-txt-tertiary hover:text-txt-secondary hover:bg-surface-2/30',
      )}
    >
      <User size={11} />
      {enabled ? 'You\'re in the debate' : 'Join the debate'}
    </button>
  );
}
```

---

## Part D — Custom Agent Creator

CREATE `components/agents/CustomAgentCreator.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useAgentSelectionStore } from '@/lib/store/agentSelection';

interface CustomAgentCreatorProps {
  onClose: () => void;
}

export default function CustomAgentCreator({ onClose }: CustomAgentCreatorProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [perspective, setPerspective] = useState('');
  const addCustomAgent = useAgentSelectionStore((s) => s.addCustomAgent);

  const handleCreate = () => {
    if (!name.trim() || !role.trim()) return;
    addCustomAgent({ name: name.trim(), role: role.trim(), perspective: perspective.trim() });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-border-subtle/50"
    >
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-txt-primary">Create custom agent</span>
          <button onClick={onClose} className="p-1 rounded text-txt-disabled hover:text-txt-tertiary">
            <X size={13} />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name (e.g., Korean Market Expert)"
          className="w-full h-8 px-2.5 rounded-md text-xs bg-surface-2/50 border border-border-subtle text-txt-primary placeholder:text-txt-disabled outline-none focus:border-accent/30"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g., Seoul real estate analysis)"
          className="w-full h-8 px-2.5 rounded-md text-xs bg-surface-2/50 border border-border-subtle text-txt-primary placeholder:text-txt-disabled outline-none focus:border-accent/30"
        />
        <input
          value={perspective}
          onChange={(e) => setPerspective(e.target.value)}
          placeholder="Perspective (e.g., Bearish on Gangnam commercial)"
          className="w-full h-8 px-2.5 rounded-md text-xs bg-surface-2/50 border border-border-subtle text-txt-primary placeholder:text-txt-disabled outline-none focus:border-accent/30"
        />

        <button
          onClick={handleCreate}
          disabled={!name.trim() || !role.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors',
            name.trim() && role.trim()
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-surface-2 text-txt-disabled cursor-default',
          )}
        >
          <Plus size={12} />
          Add to panel
        </button>
      </div>
    </motion.div>
  );
}
```

---

## Part E — Wire into Simulation Trigger

The selected agents need to be sent to the simulation API. Update the simulation trigger:

```typescript
// In useSimulationStream or wherever triggerSimulation is called:
import { useAgentSelectionStore } from '@/lib/store/agentSelection';

// When triggering simulation, include selected agents:
const selectedAgents = useAgentSelectionStore.getState().getSelectedAgents();
const selfEnabled = useAgentSelectionStore.getState().selfAgentEnabled;

const res = await fetch(`/api/c/${conversationId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'simulate',
    question,
    tier,
    agents: selectedAgents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      perspective: 'perspective' in a ? a.perspective : undefined,
      isCustom: 'isCustom' in a,
    })),
    selfAgent: selfEnabled,
  }),
});
```

**Place the AgentSelectionPanel ABOVE the DecisionCard's "Activate Deep Simulation" button:**

```typescript
// In DecisionCard or the simulation trigger area:
import AgentSelectionPanel from '@/components/agents/AgentSelectionPanel';

// Before the simulate button:
{suggestSimulation && (
  <>
    <AgentSelectionPanel className="mt-3" />
    <button data-action="simulate" onClick={...}>
      Activate Deep Simulation
    </button>
  </>
)}
```

---

## Part F — Export

CREATE `components/agents/index.ts`:

```typescript
export { default as AgentSelectionPanel } from './AgentSelectionPanel';
export { default as CustomAgentCreator } from './CustomAgentCreator';
```

---

## Testing

### Test 1 — Auto-select (default):
DecisionCard appears → below it, compact bar: "10 specialists auto-selected" with colored dots.

### Test 2 — Expand panel:
Click the bar → expands with 3 tabs: Auto, Browse, Templates.

### Test 3 — Auto tab shows selected agents:
Lists all 10 auto-selected agents with names, roles, domain dots.

### Test 4 — Browse tab with search:
Type "regulatory" → filters to Regulatory Gatekeeper. Search "risk" → shows Risk Assessor.

### Test 5 — Domain filter:
Click "Investment" → shows only investment-domain agents. Click "All" → shows all.

### Test 6 — Toggle agent:
Click unselected agent → adds to panel (checkmark appears). Click selected → removes. Max 12.

### Test 7 — Templates:
Click "Startup Launch" → replaces selection with 10 startup-specific agents. Bar shows "10 specialists (template)".

### Test 8 — Custom agent:
Click "Custom agent" → form appears → type "Korean Market Expert" + role → click "Add to panel" → appears in selected list.

### Test 9 — Self-agent toggle:
Click "Join the debate" → button turns accent, text changes to "You're in the debate". Count increases by 1.

### Test 10 — 12 agent limit:
Select 12 agents → can't add more (toggle is disabled). Remove one → can add again.

### Test 11 — Agent dots in compact bar:
Shows 6 colored dots matching the domains of selected agents + "+4" if more than 6.

### Test 12 — Selection persists:
Change selection → click "Activate Deep Simulation" → simulation uses the selected agents (verified by API payload).

---

## Files Created/Modified

```
CREATED:
  lib/agents/catalog.ts — 24 agents + 5 templates + domain config
  lib/store/agentSelection.ts — Zustand store for selection state
  components/agents/AgentSelectionPanel.tsx — full selection UI (3 tabs)
  components/agents/CustomAgentCreator.tsx — create one-off agent
  components/agents/index.ts — barrel export

MODIFIED:
  hooks/useSimulationStream.ts (or simulation trigger) — send selected agents
  components/chat/DecisionCard.tsx — add AgentSelectionPanel above simulate button
```

---

Manda pro Fernando. Esse é o feature que faz power users sentirem controle sobre a simulação. Próximo é **PF-30** (Sidebar Search + Context Menu). 🐙
