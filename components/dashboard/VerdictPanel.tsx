'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '@/lib/store/simulation';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { cn } from '@/lib/design/cn';
import type { VerdictResult, AgentScoreEntry, RiskEntry } from '@/lib/simulation/events';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type { AgentStreamState } from '@/lib/store/simulation';

type PanelMode = 'simulate' | 'compare' | 'stress' | 'premortem';

function chargeTypeToPanelMode(ct: SimulationChargeType | null): PanelMode {
  if (ct === 'compare') return 'compare';
  if (ct === 'stress_test') return 'stress';
  if (ct === 'premortem') return 'premortem';
  return 'simulate';
}

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

function scoreboardFromVerdict(v: VerdictResult): AgentScoreEntry[] | null {
  const sb = v.agent_scoreboard;
  if (Array.isArray(sb) && sb.length > 0) return sb;
  return null;
}

function streamAgentsToEntries(map: Map<string, AgentStreamState>): AgentScoreEntry[] {
  return [...map.values()]
    .filter((a) => a.status === 'complete' && a.position)
    .sort((a, b) => a.agent_name.localeCompare(b.agent_name))
    .map((a) => ({
      agent_name: a.agent_name,
      role: a.role || '',
      position: a.position!,
      confidence: typeof a.confidence === 'number' ? a.confidence : 5,
      key_argument: a.partialResponse?.slice(0, 120) || '',
    }));
}

function parseCompareHeuristic(text: string): { winner: 'A' | 'B' | 'tie' | null; line: string } {
  const t = text.toLowerCase();
  let winner: 'A' | 'B' | 'tie' | null = null;
  if (/\boption\s*a\b.*\b(wins|better|prefer|recommended|favored)\b/.test(t)) winner = 'A';
  else if (/\boption\s*b\b.*\b(wins|better|prefer|recommended|favored)\b/.test(t)) winner = 'B';
  else if (/\boption\s*a\b\s*(edges|beats|outperforms)\s*option\s*b\b/.test(t)) winner = 'A';
  else if (/\boption\s*b\b\s*(edges|beats|outperforms)\s*option\s*a\b/.test(t)) winner = 'B';
  else if (/\btie\b|\broughly\s*equal\b|\bcomparable\b/.test(t)) winner = 'tie';
  return { winner, line: text.slice(0, 320) };
}

function parseNumberList(text: string, max = 8): { label: string }[] {
  const lines = text
    .split(/[\n•]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: { label: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)[.)]\s*(.+)$/i);
    if (m) {
      out.push({ label: m[2].trim() });
      if (out.length >= max) break;
    }
  }
  return out;
}

const HEADER = 'text-[10px] font-medium uppercase tracking-[0.2em] text-white/25';

const RING_R = 38;
const RING_C = 2 * Math.PI * RING_R;

export default function VerdictPanel({ visible }: { visible: boolean }) {
  const router = useRouter();
  const tier = useBillingStore((s) => s.tier);
  const activeChargeType = useSimulationStore((s) => s.activeChargeType);
  const result = useSimulationStore((s) => s.result) as VerdictResult | null;
  const consensus = useSimulationStore((s) => s.consensus);
  const agentsMap = useSimulationStore((s) => s.agents);

  const [collapsed, setCollapsed] = useState(false);

  const panelMode = chargeTypeToPanelMode(activeChargeType);
  const verdict = result;

  const rec = verdict ? normalizeRecommendation(String(verdict.recommendation)) : 'proceed';
  const colors = positionColors(rec);
  const pct = verdict ? Math.min(100, Math.max(0, Math.round(verdict.probability))) : 0;
  const dash = (pct / 100) * RING_C;

  const scoreboard = useMemo(() => {
    if (!verdict) return [];
    const fromV = scoreboardFromVerdict(verdict);
    if (fromV) return fromV;
    return streamAgentsToEntries(agentsMap);
  }, [verdict, agentsMap]);

  const compareHint = useMemo(() => {
    if (!verdict) return null;
    const blob = `${verdict.one_liner || ''} ${verdict.disclaimer || ''}`;
    return parseCompareHeuristic(blob);
  }, [verdict]);

  const stressRisks: RiskEntry[] = useMemo(() => {
    if (!verdict?.risk_matrix?.length) return [];
    const rank = { high: 0, medium: 1, low: 2 };
    return [...verdict.risk_matrix].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [verdict]);

  const premortemCauses = useMemo(() => {
    if (!verdict) return [] as { label: string }[];
    if (verdict.action_plan?.length) {
      return verdict.action_plan.slice(0, 8).map((s) => ({ label: s }));
    }
    const fromOne = parseNumberList(verdict.one_liner || '');
    if (fromOne.length) return fromOne;
    return parseNumberList(verdict.main_risk || '');
  }, [verdict]);

  const godsView = useMemo(() => {
    if (!consensus) return null;
    const { proceed, delay, abandon } = consensus;
    const sum = proceed + delay + abandon;
    if (sum <= 0) return null;
    return {
      total: sum,
      rows: [
        { pct: Math.round((100 * proceed) / sum), label: 'Would buy / proceed', fill: DARK_THEME.success },
        { pct: Math.round((100 * delay) / sum), label: 'Concerned / delay', fill: DARK_THEME.warning },
        { pct: Math.round((100 * abandon) / sum), label: 'Against / abandon', fill: DARK_THEME.danger },
      ],
    };
  }, [consensus]);

  const onNewSimulation = useCallback(() => {
    useSimulationStore.getState().reset();
    useDashboardUiStore.getState().resetSession();
    router.push('/');
  }, [router]);

  const outlineBtn =
    'inline-flex items-center justify-center rounded-lg border border-white/10 bg-transparent px-4 py-2 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40';

  const showCompareCard =
    panelMode === 'compare' && compareHint != null && compareHint.winner !== null;

  return (
    <AnimatePresence>
      {visible && verdict && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Simulation verdict"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'absolute bottom-0 left-0 right-0 z-30 flex flex-col border-t border-white/[0.08] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] transition-[height] duration-300 ease-out',
            collapsed ? 'h-[30%]' : 'h-[60%]',
          )}
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex shrink-0 flex-col items-center gap-2 border-b border-white/[0.06] py-2"
            aria-expanded={!collapsed}
          >
            <span className="h-1 w-10 rounded-full bg-white/15" />
            <span className="text-[10px] text-white/35">{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2">
            {/* Compare winner (heuristic) */}
            {showCompareCard && compareHint && (
              <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className={HEADER}>Winner</p>
                <p className="mt-2 text-lg font-semibold text-white/90">
                  {compareHint.winner === 'A' && 'Option A'}
                  {compareHint.winner === 'B' && 'Option B'}
                  {compareHint.winner === 'tie' && 'Tie / comparable'}
                </p>
                <p className="mt-2 text-[13px] text-white/55">
                  Confidence: {pct}% · Grade {verdict.grade}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/45">{compareHint.line}</p>
                <p className="mt-3 text-[11px] text-white/30">
                  Dimension matrix will ship with structured compare results; showing narrative for now.
                </p>
              </div>
            )}

            {/* Score + summary: simulate / stress / premortem always; compare only when no heuristic winner */}
            {(panelMode !== 'compare' || !showCompareCard) && (
              <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
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
                  <p className="mt-2 text-[14px] leading-relaxed text-white/60">{verdict.one_liner}</p>
                </div>
              </div>
            )}

            {/* Stress */}
            {panelMode === 'stress' && stressRisks.length > 0 && (
              <div className="mb-6">
                <p className={HEADER}>Failure vectors</p>
                <ul className="mt-3 space-y-2">
                  {stressRisks.map((row, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white/80"
                    >
                      <span className="min-w-0 flex-1">{row.risk}</span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase text-white/45">
                        {row.severity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pre-mortem */}
            {panelMode === 'premortem' && premortemCauses.length > 0 && (
              <div className="mb-6">
                <p className={HEADER}>Most likely failure path</p>
                <ul className="mt-3 space-y-2">
                  {premortemCauses.map((row, i) => (
                    <li key={i} className="text-[13px] text-white/75">
                      <span className="text-white/35">{i + 1}. </span>
                      {row.label}
                    </li>
                  ))}
                </ul>
                {verdict.one_liner && (
                  <p className="mt-4 border-l-2 border-amber-400/50 pl-3 text-[13px] leading-relaxed text-white/55">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
                      Failure narrative ·{' '}
                    </span>
                    {verdict.one_liner}
                  </p>
                )}
              </div>
            )}

            {/* Specialists — simulate / compare; hide for stress & premortem replaced sections */}
            {(panelMode === 'simulate' || panelMode === 'compare') && scoreboard.length > 0 && (
              <div className="mb-6">
                <p className={HEADER}>Specialist positions</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {scoreboard.slice(0, 10).map((a, i) => {
                    const pos = a.position;
                    const dot =
                      pos === 'proceed'
                        ? DARK_THEME.success
                        : pos === 'delay'
                          ? DARK_THEME.warning
                          : DARK_THEME.danger;
                    return (
                      <div key={`${a.agent_name}-${i}`} className="flex items-center gap-2 text-[12px]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                        <span className="min-w-0 flex-1 truncate text-white/50">{a.agent_name}</span>
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/80"
                          style={{
                            backgroundColor: `${dot}22`,
                            color: dot,
                          }}
                        >
                          {pos}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/25">{Math.round(a.confidence)}/10</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* God's view */}
            {godsView && (
              <div className="mb-6">
                <p className={HEADER}>God&apos;s view · {godsView.total} market voices</p>
                <div className="mt-3 space-y-3">
                  {godsView.rows.map((row) => (
                    <div key={row.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
                      <div className="h-1.5 min-w-0 flex-1 basis-full sm:basis-auto overflow-hidden rounded-full bg-white/[0.06] sm:min-w-[120px]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${row.pct}%`, backgroundColor: row.fill }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-[12px] font-medium text-white/70">
                        {row.pct}%
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] text-white/45">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bordered risk / action */}
            {(verdict.main_risk || verdict.next_action) && (
              <div className="mb-6 space-y-3">
                {verdict.main_risk && (
                  <div className="border-l-2 border-red-400/70 pl-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300/90">Top risk</p>
                    <p className="mt-1 text-[13px] text-white/85">{verdict.main_risk}</p>
                  </div>
                )}
                {verdict.next_action && (
                  <div className="border-l-2 border-emerald-400/70 pl-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
                      Top action
                    </p>
                    <p className="mt-1 text-[13px] text-white/85">{verdict.next_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
              <button type="button" disabled className={outlineBtn}>
                Export PDF
                {tier === 'free' && (
                  <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">
                    Pro
                  </span>
                )}
              </button>
              <button type="button" disabled className={outlineBtn}>
                Share link
              </button>
              <button type="button" disabled className={outlineBtn}>
                Deep dive
              </button>
              <button
                type="button"
                onClick={onNewSimulation}
                className="inline-flex items-center justify-center rounded-lg bg-[#e8593c] px-4 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-95"
              >
                New simulation
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
