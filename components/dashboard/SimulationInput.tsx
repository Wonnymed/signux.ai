'use client';

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/design/cn';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { getTokenCost } from '@/lib/billing/token-costs';
import {
  dashboardModeToChargeType,
  useDashboardUiStore,
  type DashboardMode,
} from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import type { TierType } from '@/lib/billing/tiers';

const CHIPS: Record<DashboardMode, string[]> = {
  simulate: [
    'Open a cafe in Seoul',
    'Launch SaaS in Brazil',
    'Import electronics wholesale',
    'Franchise vs own brand',
  ],
  compare: [
    'Shopify vs custom site',
    'Hire CTO vs outsource',
    'Seoul vs Tokyo office',
    'Angel round vs bootstrap',
  ],
  stress: ['My restaurant plan', 'SaaS pricing model', 'Expansion to LatAm', 'New hire budget'],
  premortem: [
    'Cafe failed in 6 months',
    'SaaS churned 80%',
    'Partnership collapsed',
    'Ran out of capital',
  ],
};

const PLACEHOLDER: Record<DashboardMode, string> = {
  simulate: 'What business decision are you facing?',
  compare: 'Option A vs Option B — which is better?',
  stress: 'What plan do you want to stress test?',
  premortem: 'Imagine this failed in 12 months. What plan?',
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

function runButtonStyle(mode: DashboardMode): { bg: string; hover: string } {
  switch (mode) {
    case 'compare':
      return { bg: DARK_THEME.info, hover: '#7dd3fc' };
    case 'stress':
      return { bg: DARK_THEME.danger, hover: '#fca5a5' };
    case 'premortem':
      return { bg: DARK_THEME.warning, hover: '#fcd34d' };
    default:
      return { bg: DARK_THEME.accent, hover: '#f07860' };
  }
}

export default function SimulationInput({
  onRun,
  loading,
  billingTier,
}: {
  /** Starts simulation: parent reads dashboard store (inputs, mode, tier). */
  onRun: () => void | Promise<void>;
  loading: boolean;
  billingTier: TierType;
}) {
  const activeMode = useDashboardUiStore((s) => s.activeMode);
  const activeTier = useDashboardUiStore((s) => s.activeTier);
  const setActiveTier = useDashboardUiStore((s) => s.setActiveTier);
  const inputA = useDashboardUiStore((s) => s.inputA);
  const inputB = useDashboardUiStore((s) => s.inputB);
  const setInputA = useDashboardUiStore((s) => s.setInputA);
  const setInputB = useDashboardUiStore((s) => s.setInputB);

  const tokensRemaining = useBillingStore((s) => s.tokensRemaining);
  const canAffordMode = useBillingStore((s) => s.canAffordMode);

  const [specialistBlockedHint, setSpecialistBlockedHint] = useState(false);
  const freeUser = billingTier === 'free';
  /** Free accounts always run swarm; keep toggle UI aligned before sidebar sync effect. */
  const tierForUi: 'swarm' | 'specialist' = freeUser ? 'swarm' : activeTier;

  const chargeType = useMemo(
    () => dashboardModeToChargeType(activeMode, activeTier),
    [activeMode, activeTier],
  );
  const tokenCost = getTokenCost(chargeType);
  const affordable = canAffordMode(chargeType);
  const freeBlocksSpecialist = freeUser && activeTier === 'specialist';

  const onPickSwarm = useCallback(() => {
    setSpecialistBlockedHint(false);
    setActiveTier('swarm');
  }, [setActiveTier]);

  const onPickSpecialist = useCallback(() => {
    if (freeUser) {
      setSpecialistBlockedHint(true);
      return;
    }
    setSpecialistBlockedHint(false);
    setActiveTier('specialist');
  }, [freeUser, setActiveTier]);

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

  const { bg, hover } = runButtonStyle(activeMode);

  return (
    <div className="shrink-0 space-y-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: DARK_THEME.border_default }}>
      {activeMode === 'compare' ? (
        <div className="mx-auto w-full max-w-[720px] space-y-2">
          <label className="block text-[11px] font-medium" style={{ color: DARK_THEME.text_secondary }}>
            Option A
          </label>
          <input
            data-chat-input
            type="text"
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder={PLACEHOLDER[activeMode]}
            className="w-full rounded-xl border px-4 py-3 text-[13px] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-white/20"
            style={{
              backgroundColor: DARK_THEME.bg_surface,
              borderColor: DARK_THEME.border_default,
            }}
          />
          <label className="block text-[11px] font-medium" style={{ color: DARK_THEME.text_secondary }}>
            Option B
          </label>
          <input
            type="text"
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            placeholder="Describe option B…"
            className="w-full rounded-xl border px-4 py-3 text-[13px] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-white/20"
            style={{
              backgroundColor: DARK_THEME.bg_surface,
              borderColor: DARK_THEME.border_default,
            }}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[720px]">
          <textarea
            data-chat-input
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder={PLACEHOLDER[activeMode]}
            rows={2}
            className="w-full resize-none rounded-xl border px-4 py-3 text-[13px] leading-relaxed text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-white/20"
            style={{
              backgroundColor: DARK_THEME.bg_surface,
              borderColor: DARK_THEME.border_default,
            }}
          />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex w-fit items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={onPickSwarm}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                tierForUi === 'swarm'
                  ? 'bg-white/[0.08] text-white/80'
                  : 'text-white/35 hover:text-white/50',
              )}
            >
              Swarm · 1000
            </button>
            <button
              type="button"
              onClick={onPickSpecialist}
              className={cn(
                'inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium transition-all',
                tierForUi === 'specialist'
                  ? 'bg-white/[0.08] text-white/80'
                  : 'text-white/35 hover:text-white/50',
              )}
            >
              Specialist · 10 + crowd
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

      <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-center gap-2">
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

      <div className="mx-auto flex w-full max-w-[720px] flex-wrap gap-2">
        {CHIPS[activeMode].map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => {
              setInputA(text);
              if (activeMode === 'compare') setInputB('');
            }}
            className="rounded-full border px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06]"
            style={{
              borderColor: DARK_THEME.border_default,
              color: DARK_THEME.text_secondary,
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
