'use client';

import type { VerdictResult } from '@/lib/simulation/events';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { VerdictSources } from '@/components/verdict/common';

const RING_R = 38;
const RING_C = 2 * Math.PI * RING_R;

function normalizeRecommendation(
  r: string | undefined,
): 'proceed' | 'delay' | 'abandon' | 'proceed_with_conditions' {
  const s = (r || '').toLowerCase();
  if (s.includes('proceed_with') || s.includes('conditions')) return 'proceed_with_conditions';
  if (s === 'delay') return 'delay';
  if (s === 'abandon') return 'abandon';
  return 'proceed';
}

function positionColors(
  p: 'proceed' | 'delay' | 'abandon' | 'proceed_with_conditions',
): { ring: string; bg: string; label: string } {
  if (p === 'abandon') return { ring: DARK_THEME.danger, bg: 'rgba(248,113,113,0.2)', label: 'ABANDON' };
  if (p === 'delay') return { ring: DARK_THEME.warning, bg: 'rgba(251,191,36,0.2)', label: 'DELAY' };
  if (p === 'proceed_with_conditions')
    return { ring: DARK_THEME.success, bg: 'rgba(74,222,128,0.2)', label: 'PROCEED WITH CONDITIONS' };
  return { ring: DARK_THEME.success, bg: 'rgba(74,222,128,0.2)', label: 'PROCEED' };
}

export function StandardVerdict({
  verdict,
  hideSources = false,
}: {
  verdict: VerdictResult;
  /** When more sections follow (e.g. stress vectors), sources are appended by the parent. */
  hideSources?: boolean;
}) {
  const rec = normalizeRecommendation(String(verdict.recommendation));
  const colors = positionColors(rec);
  const pct = Math.min(100, Math.max(0, Math.round(verdict.probability)));
  const dash = (pct / 100) * RING_C;
  const citations = verdict.citations;
  const hasWebContext = (citations?.length ?? 0) > 0 || (verdict.sources?.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
            <circle cx={50} cy={50} r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
            <circle
              cx={50}
              cy={50}
              r={RING_R}
              fill="none"
              stroke={colors.ring}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${RING_C}`}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[28px] font-semibold text-white">{pct}%</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase"
            style={{ backgroundColor: colors.bg, color: colors.ring }}
          >
            {colors.label}
          </span>
          <p className="mt-2 text-[18px] font-medium" style={{ color: colors.ring }}>
            Grade: {verdict.grade}
          </p>
          {verdict.one_liner ? (
            <p className="mt-2 text-[14px] leading-relaxed text-white/60">{verdict.one_liner}</p>
          ) : null}
        </div>
      </div>

      {hasWebContext ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/15 bg-sky-500/[0.04] px-3 py-2 text-[11px] text-sky-200/80">
          <span className="text-[13px]" aria-hidden>
            🔍
          </span>
          <span>
            Includes web research
            {citations?.length ? (
              <span className="text-white/35"> · {citations.length} cited claim{citations.length === 1 ? '' : 's'}</span>
            ) : null}
          </span>
        </div>
      ) : null}

      {citations && citations.length > 0 ? (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Citations</p>
          <ul className="mt-2 space-y-2">
            {citations.slice(0, 8).map((c) => (
              <li key={c.id} className="text-[11px] leading-relaxed text-white/45">
                <span className="font-medium text-white/60">{c.agent_name}</span>
                <span className="text-white/25"> · R{c.round} · </span>
                {c.claim}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hideSources ? (
        <div className="mt-4">
          <VerdictSources sources={verdict.sources} />
        </div>
      ) : null}
    </div>
  );
}
