'use client';

import { useMemo, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { getTokenCost } from '@/lib/billing/token-costs';
import {
  dashboardModeToChargeType,
  useDashboardUiStore,
  type DashboardMode,
} from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import { useSimulationStore } from '@/lib/store/simulation';
import type { TierType } from '@/lib/billing/tiers';

const CTA_STYLES: Record<DashboardMode, { bg: string; hover: string }> = {
  simulate: { bg: '#e8593c', hover: '#d04e33' },
  compare: { bg: '#3B8BD4', hover: '#2d7bc4' },
  stress: { bg: '#EF9F27', hover: '#d98d1f' },
  premortem: { bg: '#c43333', hover: '#a82b2b' },
};

const SIMULATE_CHIPS = [
  'Open a café in Seoul',
  'Launch SaaS in Brazil',
  'Import electronics wholesale',
  'Franchise vs own brand',
] as const;

const COMPARE_CHIPS: { a: string; b: string }[] = [
  { a: 'Shopify', b: 'Custom site' },
  { a: 'Hire CTO', b: 'Outsource' },
  { a: 'Seoul', b: 'Tokyo office' },
  { a: 'Angel round', b: 'Bootstrap' },
];

const STRESS_CHIPS = ['My restaurant plan', 'SaaS pricing model', 'Expansion to LatAm', 'New hire budget'] as const;

const PREMORTEM_CHIPS = [
  'Café failed in 6 months',
  'SaaS churned 80%',
  'Partnership collapsed',
  'Ran out of capital',
] as const;

const STRESS_THREAT_CATS = [
  'Financial',
  'Market',
  'Operational',
  'Competitive',
  'Regulatory',
  'Timing',
  'Team',
  'Execution',
  'Black swan',
] as const;

const PREMORTEM_TIMELINE = [
  { month: 'Month 1', label: 'Launch' },
  { month: 'Month 3', label: 'Growth?' },
  { month: 'Month 6', label: 'Decline?' },
  { month: 'Month 9', label: 'Crisis?' },
  { month: 'Month 12', label: 'Outcome' },
] as const;

const PLACEHOLDER: Record<DashboardMode, string> = {
  simulate: 'What business decision are you facing?',
  compare: 'First option…',
  stress: 'Describe your business plan or strategy…',
  premortem: 'Describe the plan you want to stress against failure…',
};

const MODE_HEADING: Record<DashboardMode, string> = {
  simulate: 'What would you like to simulate?',
  compare: 'Which two options are you weighing?',
  stress: 'What plan needs stress testing?',
  premortem: 'What plan might fail?',
};

const RUN_LABEL: Record<DashboardMode, string> = {
  simulate: 'Run simulation',
  compare: 'Compare',
  stress: 'Stress test',
  premortem: 'Run pre-mortem',
};

function formatTokenCostPhrase(n: number): string {
  return n === 1 ? '1 token' : `${n} tokens`;
}

const inputSurfaceClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-white/20';

export default function SimulationInput({
  onRun,
  loading,
  billingTier,
}: {
  onRun: () => void | Promise<void>;
  loading: boolean;
  billingTier: TierType;
}) {
  const activeMode = useDashboardUiStore((s) => s.activeMode);
  const activeTier = useDashboardUiStore((s) => s.activeTier);
  const previewTier = useDashboardUiStore((s) => s.previewTier);
  const setActiveTier = useDashboardUiStore((s) => s.setActiveTier);
  const setPreviewTier = useDashboardUiStore((s) => s.setPreviewTier);
  const inputA = useDashboardUiStore((s) => s.inputA);
  const inputB = useDashboardUiStore((s) => s.inputB);
  const setInputA = useDashboardUiStore((s) => s.setInputA);
  const setInputB = useDashboardUiStore((s) => s.setInputB);
  const resetSession = useDashboardUiStore((s) => s.resetSession);

  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const canAffordMode = useBillingStore((s) => s.canAffordMode);

  const [specialistBlockedHint, setSpecialistBlockedHint] = useState(false);
  const freeUser = billingTier === 'free';

  const effectiveTier =
    activeMode === 'stress' || activeMode === 'premortem' ? 'specialist' : activeTier;

  const chargeType = useMemo(
    () => dashboardModeToChargeType(activeMode, effectiveTier),
    [activeMode, effectiveTier],
  );
  const tokenCost = getTokenCost(chargeType);
  const affordable = canAffordMode(chargeType);
  const freeBlocksSpecialist = freeUser && effectiveTier === 'specialist';

  const showsTierToggle = activeMode === 'simulate' || activeMode === 'compare';

  const onPickSwarm = useCallback(() => {
    setSpecialistBlockedHint(false);
    setActiveTier('swarm');
    setPreviewTier('swarm');
  }, [setActiveTier, setPreviewTier]);

  const onPickSpecialist = useCallback(() => {
    if (freeUser) {
      setSpecialistBlockedHint(true);
      setPreviewTier('specialist');
      return;
    }
    setSpecialistBlockedHint(false);
    setActiveTier('specialist');
    setPreviewTier('specialist');
  }, [freeUser, setActiveTier, setPreviewTier]);

  const hasInput =
    Boolean(inputA.trim()) || (activeMode === 'compare' && Boolean(inputB.trim()));

  const handleClear = useCallback(() => {
    if (loading) return;
    setSpecialistBlockedHint(false);
    resetSession();
    useSimulationStore.getState().reset();
  }, [loading, resetSession]);

  const messageForSubmit = useMemo(() => {
    if (activeMode === 'compare') {
      const a = inputA.trim();
      const b = inputB.trim();
      if (!a || !b) return '';
      return `Option A: ${a}\n\nOption B: ${b}`;
    }
    return inputA.trim();
  }, [activeMode, inputA, inputB]);

  const disabled =
    loading || !messageForSubmit || !affordable || freeBlocksSpecialist;

  const { bg, hover } = CTA_STYLES[activeMode];

  const tierHintSimulate =
    previewTier === 'swarm'
      ? '1,000 market voices validate your idea'
      : '9 experts + your perspective debate the decision';

  const tierHintCompare =
    previewTier === 'swarm'
      ? '500 people react to A, 500 react to B — which gets more love?'
      : '5 experts argue for A, 5 argue for B — structured debate';

  return (
    <div
      className={cn(
        'shrink-0 px-4 pb-4 pt-6 sm:px-5',
        activeMode === 'stress' && 'pt-5',
        activeMode === 'premortem' && 'pt-7',
      )}
    >
      <div
        className={cn(
          'mode-input-area mx-auto max-w-[720px] space-y-4 transition-opacity duration-200 ease-out',
        )}
      >
        <div>
          <p className="text-[15px] font-medium text-white/50">{MODE_HEADING[activeMode]}</p>
          {activeMode === 'stress' ? (
            <p className="mt-1.5 text-[13px] text-white/35">
              9 specialists will attack your plan from every angle.
            </p>
          ) : null}
          {activeMode === 'premortem' ? (
            <p className="mt-1.5 text-[13px] italic text-white/35">
              Imagine it&apos;s one year from now. It failed. We&apos;ll tell you why.
            </p>
          ) : null}
        </div>

        {activeMode === 'compare' ? (
          <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/30">
                Option A
              </label>
              <input
                data-chat-input
                type="text"
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                placeholder={PLACEHOLDER.compare}
                className={inputSurfaceClass}
              />
            </div>
            <div className="flex justify-center pt-0 text-[13px] font-medium text-white/20 select-none md:pt-9">
              vs
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/30">
                Option B
              </label>
              <input
                type="text"
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
                placeholder="Second option…"
                className={inputSurfaceClass}
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <textarea
              data-chat-input
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder={PLACEHOLDER[activeMode]}
              rows={activeMode === 'premortem' ? 3 : 2}
              className={cn(
                inputSurfaceClass,
                'resize-none pr-10 text-[13px] leading-relaxed',
                activeMode === 'stress' && 'py-2.5',
              )}
            />
            {hasInput && !loading ? (
              <button
                type="button"
                aria-label="Clear input"
                onClick={handleClear}
                className="absolute right-2 top-2 rounded-md p-1 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/65"
              >
                <X size={16} strokeWidth={2} />
              </button>
            ) : null}
          </div>
        )}

        {activeMode === 'compare' && hasInput && !loading ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 transition-colors hover:text-white/65"
            >
              <X size={12} strokeWidth={2} aria-hidden />
              Clear
            </button>
          </div>
        ) : null}

        {activeMode === 'stress' ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STRESS_THREAT_CATS.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-amber-500/15 bg-amber-500/[0.03] px-2.5 py-1 text-[11px] text-amber-400/40"
              >
                {cat}
              </span>
            ))}
          </div>
        ) : null}

        {activeMode === 'premortem' ? (
          <div className="flex items-center justify-between gap-0.5 overflow-x-auto px-1 pt-1 pb-0.5">
            {PREMORTEM_TIMELINE.map((step, i, arr) => (
              <div key={step.month} className="flex items-center">
                <div className="flex min-w-[52px] flex-col items-center">
                  <div
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      i === arr.length - 1 ? 'bg-red-400/50' : 'bg-white/15',
                    )}
                  />
                  <div className="mt-1 text-center text-[10px] text-white/20">{step.month}</div>
                  <div className="text-center text-[10px] italic text-white/12">{step.label}</div>
                </div>
                {i < arr.length - 1 ? (
                  <div className="mx-0.5 h-px w-6 shrink-0 bg-white/[0.06] sm:mx-1 sm:w-10" />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {showsTierToggle ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex w-fit items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
                  <button
                    type="button"
                    onClick={onPickSwarm}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                      previewTier === 'swarm'
                        ? 'bg-white/[0.08] text-white/80'
                        : 'text-white/35 hover:text-white/50',
                    )}
                  >
                    {activeMode === 'simulate' ? 'Swarm · 1000' : 'Market test · 500 vs 500'}
                  </button>
                  <button
                    type="button"
                    onClick={onPickSpecialist}
                    className={cn(
                      'inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                      previewTier === 'specialist'
                        ? 'bg-white/[0.08] text-white/80'
                        : 'text-white/35 hover:text-white/50',
                    )}
                  >
                    {activeMode === 'simulate' ? 'Specialist · 10 + crowd' : 'Expert debate · 5 vs 5'}
                    {freeUser ? (
                      <span className="ml-1 text-[9px] font-semibold text-[#e8593c]">PRO</span>
                    ) : null}
                  </button>
                </div>
                {specialistBlockedHint ? (
                  <p className="mt-1 max-w-[min(420px,100%)] text-[11px] leading-snug text-[#e8593c]">
                    Upgrade to Pro for specialist mode.
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] text-white/35">{tokensRemaining} tokens left</span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/35">
              {activeMode === 'simulate' ? tierHintSimulate : tierHintCompare}
            </p>
            {activeMode === 'simulate' && previewTier === 'specialist' ? (
              <p className="text-[11px] leading-relaxed text-white/25">
                <span className="mr-1 inline-block opacity-80" aria-hidden>
                  ◇
                </span>
                Opus Chief designs your panel · 8 Sonnet specialists + You ·{' '}
                <span className="mr-0.5 inline-block opacity-80" aria-hidden>
                  🔍
                </span>
                Web search live
              </p>
            ) : null}
            {activeMode === 'compare' && previewTier === 'specialist' ? (
              <p className="text-[11px] leading-relaxed text-white/25">
                <span className="mr-1 opacity-80" aria-hidden>
                  ◇
                </span>
                Opus Chief builds 2 teams · 5v5 Sonnet debate · Opus final verdict
              </p>
            ) : null}
            {activeMode === 'compare' && previewTier === 'swarm' ? (
              <p className="text-[11px] leading-relaxed text-white/25">
                <span className="mr-1 opacity-80" aria-hidden>
                  ◇
                </span>
                Opus Chief segments your market · 500 vs 500 voices
              </p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-white/25">
              {activeMode === 'stress'
                ? 'Opus Chief + 9 Sonnet attackers + web search · Vulnerability audit output'
                : 'Opus Chief + 9 Sonnet narrators + web search · Failure autopsy output'}
            </p>
            <span className="shrink-0 text-[11px] text-white/35">{tokensRemaining} tokens left</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onRun()}
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 text-[13px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
            )}
            style={{ backgroundColor: bg }}
            onMouseEnter={(e) => {
              if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = hover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
            }}
          >
            {RUN_LABEL[activeMode]}{' '}
            <span className="ml-1.5 text-[12px] font-medium opacity-90">
              ({formatTokenCostPhrase(tokenCost)})
            </span>
          </button>
          {!affordable ? (
            <span className="text-[11px] text-white/40">Not enough tokens for this run.</span>
          ) : null}
          {freeBlocksSpecialist ? (
            <span className="text-[11px] text-[#e8593c]/90">Upgrade to Pro to run with Specialist.</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {activeMode === 'simulate'
            ? SIMULATE_CHIPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setInputA(text)}
                  className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/75"
                >
                  {text}
                </button>
              ))
            : null}
          {activeMode === 'compare'
            ? COMPARE_CHIPS.map(({ a, b }) => (
                <button
                  key={`${a}-${b}`}
                  type="button"
                  onClick={() => {
                    setInputA(a);
                    setInputB(b);
                  }}
                  className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06]"
                >
                  <span className="text-blue-400/70">{a}</span>
                  <span className="mx-1 text-white/15">vs</span>
                  <span className="text-rose-400/70">{b}</span>
                </button>
              ))
            : null}
          {activeMode === 'stress'
            ? STRESS_CHIPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setInputA(text)}
                  className="rounded-full border border-amber-500/20 px-3 py-1.5 text-[12px] text-amber-200/50 transition-colors hover:bg-amber-500/[0.06]"
                >
                  {text}
                </button>
              ))
            : null}
          {activeMode === 'premortem'
            ? PREMORTEM_CHIPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setInputA(text)}
                  className="rounded-full border border-red-500/15 px-3 py-1.5 text-[12px] text-red-200/45 transition-colors hover:bg-red-500/[0.06]"
                >
                  {text}
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
