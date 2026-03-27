'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dna,
  Sparkles,
  Search,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Save,
  Pencil,
  User,
  Brain,
  Target,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';

type AgentDomain = 'investment' | 'relationships' | 'career' | 'business' | 'life' | 'custom' | 'self';

interface AgentDef {
  id: string;
  name: string;
  role: string;
  description: string;
  domain: AgentDomain;
  defaultFor: AgentDomain[];
}

interface JokerProfile {
  joker_name: string;
  joker_role: string;
  joker_bio: string;
  joker_risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  joker_priorities: string[];
  joker_biases: string;
  joker_enabled: boolean;
}

interface AgentOverride {
  weight: number;
  perspective: string;
  notes: string;
}

const FALLBACK_DOMAIN_LABELS: Record<AgentDomain, string> = {
  investment: 'Investment',
  relationships: 'Relationships',
  career: 'Career',
  business: 'Business',
  life: 'Life',
  custom: 'Custom',
  self: 'Self',
};

const DOMAIN_COLORS: Record<AgentDomain, string> = {
  investment: '#10B981',
  relationships: '#EC4899',
  career: '#06B6D4',
  business: '#7C3AED',
  life: '#F97316',
  custom: '#A855F7',
  self: '#8B5CF6',
};

export default function AgentLabPage() {
  const [joker, setJoker] = useState<JokerProfile>({
    joker_name: 'The Joker',
    joker_role: '',
    joker_bio: '',
    joker_risk_tolerance: 'moderate',
    joker_priorities: [],
    joker_biases: '',
    joker_enabled: false,
  });
  const [overrides, setOverrides] = useState<Record<string, AgentOverride>>({});
  const [disabledAgents, setDisabledAgents] = useState<string[]>([]);
  const [allAgents, setAllAgents] = useState<AgentDef[]>([]);
  const [domainLabels, setDomainLabels] = useState<Record<string, string>>({ ...FALLBACK_DOMAIN_LABELS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<AgentDomain | 'all'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [jokerEditing, setJokerEditing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, categoriesRes] = await Promise.all([
          fetch('/api/agents?action=profile'),
          fetch('/api/agents?action=categories'),
        ]);
        const profileJson = await profileRes.json();
        const categoriesJson = await categoriesRes.json();

        if (profileJson?.data) {
          setJoker({
            joker_name: profileJson.data.joker_name || 'The Joker',
            joker_role: profileJson.data.joker_role || '',
            joker_bio: profileJson.data.joker_bio || '',
            joker_risk_tolerance: profileJson.data.joker_risk_tolerance || 'moderate',
            joker_priorities: profileJson.data.joker_priorities || [],
            joker_biases: profileJson.data.joker_biases || '',
            joker_enabled: !!profileJson.data.joker_enabled,
          });
          setOverrides(profileJson.data.agent_overrides || {});
          setDisabledAgents(profileJson.data.disabled_agents || []);
        }

        const categories = categoriesJson?.categories || [];
        if (categories.length > 0) {
          const labels: Record<string, string> = { ...FALLBACK_DOMAIN_LABELS };
          for (const c of categories) labels[c.id] = c.name;
          setDomainLabels(labels);
        }

        const byCategory = await Promise.all(
          categories.map(async (c: { id: string }) => {
            const res = await fetch(`/api/agents?action=agents&category=${encodeURIComponent(c.id)}`);
            const json = await res.json();
            return (json?.agents || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              role: a.role,
              description: a.goal || a.role || '',
              domain: a.category_id as AgentDomain,
              defaultFor: [a.category_id as AgentDomain],
            }));
          })
        );
        setAllAgents(byCategory.flat());
      } catch {
        setAllAgents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true);
    await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
    setSaving(false);
  }, []);

  const filteredAgents = useMemo(
    () =>
      allAgents.filter((a) => {
        if (filterDomain !== 'all' && a.domain !== filterDomain) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }),
    [allAgents, filterDomain, searchQuery]
  );

  const selectedAgent = selectedAgentId ? allAgents.find((a) => a.id === selectedAgentId) || null : null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Dna size={24} className="animate-pulse text-accent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <Dna size={18} className="text-accent" />
            </div>
            <h1 className="text-xl font-medium text-txt-primary">Agent Lab</h1>
          </div>
          <p className="max-w-lg text-sm text-txt-tertiary">
            Your simulation team. Create your personal agent, customize specialists, and make every simulation personal.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-txt-primary">
              <User size={15} className="text-accent" />
              Your Agent
            </h2>
            <button
              onClick={() => {
                const next = !joker.joker_enabled;
                setJoker((j) => ({ ...j, joker_enabled: next }));
                save({ joker_enabled: next });
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                joker.joker_enabled ? 'border-accent/20 bg-accent/10 text-accent' : 'border-border-subtle bg-surface-2 text-txt-tertiary'
              )}
            >
              {joker.joker_enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              {joker.joker_enabled ? 'Active in simulations' : 'Not joining simulations'}
            </button>
          </div>

          {jokerEditing ? (
            <JokerEditor
              joker={joker}
              onChange={setJoker}
              onSave={() => {
                setJokerEditing(false);
                save(joker);
              }}
              onCancel={() => setJokerEditing(false)}
            />
          ) : (
            <JokerCard joker={joker} onEdit={() => setJokerEditing(true)} />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-txt-primary">
              <Brain size={15} className="text-accent" />
              Specialist Agents
              <span className="text-xs font-normal text-txt-disabled">({allAgents.length})</span>
            </h2>
            {saving && <span className="text-xs text-txt-tertiary">Saving...</span>}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex h-9 max-w-xs flex-1 items-center gap-2 rounded-xl border border-border-subtle bg-surface-2 px-3">
              <Search size={14} className="text-txt-disabled" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="flex-1 bg-transparent text-xs text-txt-primary outline-none placeholder:text-txt-disabled"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'investment', 'relationships', 'career', 'business', 'life'] as const).map((domain) => (
                <button
                  key={domain}
                  onClick={() => setFilterDomain(domain)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] transition-all',
                    filterDomain === domain
                      ? 'border border-accent/20 bg-accent/10 text-accent'
                      : 'text-txt-tertiary hover:bg-surface-2 hover:text-txt-secondary'
                  )}
                >
                  {domain === 'all' ? 'All' : domainLabels[domain] || domain}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent, i) => (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * Math.min(i, 10) }}>
                <AgentCard
                  agent={agent}
                  override={overrides[agent.id]}
                  isDisabled={disabledAgents.includes(agent.id)}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              </motion.div>
            ))}
          </div>

          {filteredAgents.length === 0 && (
            <div className="py-12 text-center">
              <Search size={20} className="mx-auto mb-2 text-txt-disabled" />
              <p className="text-sm text-txt-tertiary">No agents match your search</p>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailPanel
            agent={selectedAgent}
            override={overrides[selectedAgent.id]}
            isDisabled={disabledAgents.includes(selectedAgent.id)}
            domainLabels={domainLabels}
            onClose={() => setSelectedAgentId(null)}
            onSaveOverride={(ov) => {
              setOverrides((prev) => ({ ...prev, [selectedAgent.id]: ov }));
              save({ agent_overrides: { [selectedAgent.id]: ov } });
            }}
            onToggleDisable={() => {
              const isDisabled = disabledAgents.includes(selectedAgent.id);
              const next = isDisabled ? disabledAgents.filter((id) => id !== selectedAgent.id) : [...disabledAgents, selectedAgent.id];
              setDisabledAgents(next);
              save({ disabled_agents: next });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function JokerCard({ joker, onEdit }: { joker: JokerProfile; onEdit: () => void }) {
  const isEmpty = !joker.joker_role && !joker.joker_bio;
  return (
    <div className={cn('rounded-xl border p-5 transition-all', joker.joker_enabled ? 'border-accent/15 bg-accent-subtle' : 'border-border-subtle bg-surface-1')}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/60 to-cyan-500/30">
          <span className="text-xl">🃏</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-txt-primary">{joker.joker_name || 'The Joker'}</span>
            <span className="text-[10px] text-txt-disabled">- You</span>
            {joker.joker_enabled && <span className="rounded bg-accent-muted px-1.5 py-0.5 text-[9px] font-bold text-accent">ACTIVE</span>}
          </div>
          {isEmpty ? (
            <p className="text-xs italic text-txt-disabled">No profile yet. Configure your profile to join simulations as a participant.</p>
          ) : (
            <>
              {joker.joker_role && <p className="mb-1 text-xs text-txt-secondary">{joker.joker_role}</p>}
              {joker.joker_bio && <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-txt-tertiary">&quot;{joker.joker_bio}&quot;</p>}
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-txt-disabled"><Gauge size={10} /> {joker.joker_risk_tolerance} risk</span>
                {joker.joker_priorities.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-txt-disabled"><Target size={10} /> {joker.joker_priorities.slice(0, 3).join(', ')}</span>
                )}
              </div>
            </>
          )}
        </div>
        <button onClick={onEdit} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-txt-secondary transition-all hover:bg-accent-subtle hover:text-accent">
          <Pencil size={12} />
          {isEmpty ? 'Set up' : 'Edit'}
        </button>
      </div>
    </div>
  );
}

function JokerEditor({
  joker,
  onChange,
  onSave,
  onCancel,
}: {
  joker: JokerProfile;
  onChange: (j: JokerProfile) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const priorities = ['profit', 'safety', 'speed', 'family', 'growth', 'stability', 'innovation', 'independence'];
  return (
    <div className="space-y-4 rounded-xl border border-accent/15 bg-surface-1 p-5">
      <Field label="Agent name"><input value={joker.joker_name} onChange={(e) => onChange({ ...joker, joker_name: e.target.value })} placeholder="The Joker" className="field-input" /></Field>
      <Field label="Your role / expertise"><input value={joker.joker_role} onChange={(e) => onChange({ ...joker, joker_role: e.target.value })} placeholder="Entrepreneur, investor, software engineer..." className="field-input" /></Field>
      <Field label="Your situation & context"><textarea value={joker.joker_bio} onChange={(e) => onChange({ ...joker, joker_bio: e.target.value })} rows={4} className="field-input resize-none" /></Field>
      <Field label="Risk tolerance">
        <div className="flex gap-2">
          {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
            <button
              key={level}
              onClick={() => onChange({ ...joker, joker_risk_tolerance: level })}
              className={cn(
                'flex-1 rounded-lg border py-2 text-xs font-medium transition-all',
                joker.joker_risk_tolerance === level
                  ? level === 'conservative'
                    ? 'border-verdict-proceed/20 bg-verdict-proceed/10 text-verdict-proceed'
                    : level === 'moderate'
                      ? 'border-verdict-delay/20 bg-verdict-delay/10 text-verdict-delay'
                      : 'border-verdict-abandon/20 bg-verdict-abandon/10 text-verdict-abandon'
                  : 'border-border-subtle bg-surface-2 text-txt-tertiary hover:border-border-default'
              )}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Your priorities">
        <div className="flex flex-wrap gap-1.5">
          {priorities.map((p) => {
            const active = joker.joker_priorities.includes(p);
            return (
              <button
                key={p}
                onClick={() => onChange({ ...joker, joker_priorities: active ? joker.joker_priorities.filter((x) => x !== p) : [...joker.joker_priorities, p] })}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[11px] transition-all',
                  active ? 'border-accent/20 bg-accent/10 font-medium text-accent' : 'border-border-subtle text-txt-tertiary hover:border-border-default'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Known biases"><input value={joker.joker_biases} onChange={(e) => onChange({ ...joker, joker_biases: e.target.value })} className="field-input" /></Field>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-txt-on-accent transition-colors hover:bg-accent-hover"><Save size={13} />Save agent</button>
        <button onClick={onCancel} className="rounded-xl bg-surface-2 px-4 py-2 text-xs text-txt-secondary transition-colors hover:bg-surface-3">Cancel</button>
      </div>
    </div>
  );
}

function AgentCard({ agent, override, isDisabled, onSelect }: { agent: AgentDef; override?: AgentOverride; isDisabled: boolean; onSelect: () => void }) {
  const hasOverride = !!override && (override.weight !== 1 || !!override.perspective || !!override.notes);
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl border p-4 text-left transition-all',
        isDisabled ? 'border-border-subtle/50 bg-surface-0 opacity-50' : 'border-border-subtle bg-surface-1 hover:border-border-default hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[agent.domain] }} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-txt-primary">{agent.name}</span>
            {hasOverride && <span className="rounded bg-accent-muted px-1 py-0.5 text-[8px] font-bold text-accent">CUSTOM</span>}
          </div>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-txt-tertiary">{agent.description}</p>
        </div>
        <ChevronRight size={14} className="mt-1 shrink-0 text-txt-disabled transition-colors group-hover:text-txt-tertiary" />
      </div>
    </button>
  );
}

function AgentDetailPanel({
  agent,
  override,
  isDisabled,
  domainLabels,
  onClose,
  onSaveOverride,
  onToggleDisable,
}: {
  agent: AgentDef;
  override?: AgentOverride;
  isDisabled: boolean;
  domainLabels: Record<string, string>;
  onClose: () => void;
  onSaveOverride: (ov: AgentOverride) => void;
  onToggleDisable: () => void;
}) {
  const [weight, setWeight] = useState(override?.weight ?? 1);
  const [perspective, setPerspective] = useState(override?.perspective ?? '');
  const [notes, setNotes] = useState(override?.notes ?? '');
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-surface-overlay" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-border-subtle bg-surface-raised shadow-lg">
        <div className="p-6">
          <div className="mb-6 flex items-start gap-3">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[agent.domain] }} />
            <div className="flex-1">
              <h3 className="mb-0.5 text-base font-medium text-txt-primary">{agent.name}</h3>
              <p className="text-xs text-txt-tertiary">{agent.role}</p>
              <span className="text-[10px] uppercase tracking-wider text-txt-disabled">{domainLabels[agent.domain] || agent.domain}</span>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-txt-disabled hover:bg-surface-2 hover:text-txt-tertiary">x</button>
          </div>
          <Field label="What this agent does"><p className="text-sm leading-relaxed text-txt-primary">{agent.description}</p></Field>
          <div className="my-6 h-px bg-border-subtle" />
          <h4 className="mb-4 flex items-center gap-1.5 text-xs font-medium text-accent"><Sparkles size={12} />Your customizations</h4>
          <Field label="Influence weight" hint="0.5x less influence -> 1.5x more influence">
            <div className="flex items-center gap-3">
              <input type="range" min="0.5" max="1.5" step="0.1" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} className="flex-1 accent-accent" />
              <span className={cn('w-8 text-center font-mono text-xs', weight > 1 ? 'text-accent' : weight < 1 ? 'text-txt-disabled' : 'text-txt-secondary')}>{weight.toFixed(1)}x</span>
            </div>
          </Field>
          <Field label="Custom perspective"><textarea value={perspective} onChange={(e) => setPerspective(e.target.value)} rows={3} className="field-input resize-none" /></Field>
          <Field label="Your notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="field-input resize-none" /></Field>
          <div className="my-6 h-px bg-border-subtle" />
          <button onClick={onToggleDisable} className={cn('mb-4 flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-xs transition-all', isDisabled ? 'border-verdict-abandon/15 bg-verdict-abandon/5 text-verdict-abandon' : 'border-border-subtle bg-surface-2 text-txt-secondary hover:border-border-default')}>
            <AlertTriangle size={14} />
            {isDisabled ? "Agent is DISABLED - won't appear in auto-select" : 'Disable this agent from auto-select'}
          </button>
          <div className="flex gap-2">
            <button onClick={() => { onSaveOverride({ weight, perspective, notes }); onClose(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-xs font-medium text-txt-on-accent transition-colors hover:bg-accent-hover">
              <Save size={13} />
              Save customizations
            </button>
            <button onClick={onClose} className="rounded-xl bg-surface-2 px-4 py-2.5 text-xs text-txt-secondary transition-colors hover:bg-surface-3">Cancel</button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-txt-secondary">{label}</label>
      {hint && <p className="mb-1.5 text-[10px] text-txt-disabled">{hint}</p>}
      {children}
    </div>
  );
}
