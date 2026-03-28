'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore, defaultVerdictGeneratingMessage } from '@/lib/store/simulation';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useDeepDiveStore } from '@/lib/store/deep-dive';
import { useBillingStore } from '@/lib/store/billing';
import { TIERS } from '@/lib/billing/tiers';
import UpgradePrompt from '@/components/billing/UpgradePrompt';
import { resolveAgentChatId } from '@/lib/agent-chat/resolve-agent-id';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { cn } from '@/lib/design/cn';
import type { VerdictResult, AgentScoreEntry, RiskEntry } from '@/lib/simulation/events';
import type { CompareVerdict, PremortemOpusVerdict, StressOpusVerdict } from '@/lib/simulation/types';
import { CompareVerdict as CompareVerdictView } from '@/components/verdict/CompareVerdict';
import { StressVerdict as StressVerdictView } from '@/components/verdict/StressVerdict';
import { PremortemVerdict as PremortemVerdictView } from '@/components/verdict/PremortemVerdict';
import { StandardVerdict } from '@/components/verdict/StandardVerdict';
import { VerdictSources } from '@/components/verdict/common';
import type { StressRiskVector } from '@/lib/simulation/mode-verdict';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type { AgentStreamState } from '@/lib/store/simulation';

const loadingBarTransition = { repeat: Infinity, duration: 1.25, ease: 'easeInOut' as const };

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

type NormRec = ReturnType<typeof normalizeRecommendation>;

function verdictDisagreeBucket(rec: NormRec): 'proceed' | 'delay' | 'abandon' {
  if (rec === 'proceed_with_conditions') return 'proceed';
  return rec;
}

function agentDisagreeBucket(pos: string): 'proceed' | 'delay' | 'abandon' {
  const p = (pos || '').toLowerCase();
  if (p === 'abandon') return 'abandon';
  if (p === 'delay') return 'delay';
  return 'proceed';
}

function pickDissentingAgentId(
  verdictRec: string | undefined,
  scoreboard: AgentScoreEntry[],
  agentsMap: Map<string, AgentStreamState>,
): string | null {
  if (scoreboard.length === 0) return null;
  const vb = verdictDisagreeBucket(normalizeRecommendation(verdictRec));
  for (const row of scoreboard) {
    if (agentDisagreeBucket(row.position) !== vb) {
      return resolveAgentChatId(row.agent_name, agentsMap);
    }
  }
  return resolveAgentChatId(scoreboard[0].agent_name, agentsMap);
}

const HEADER = 'text-[10px] font-medium uppercase tracking-[0.2em] text-white/25';

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

function stressImpactWeight(impact: string): number {
  switch (impact) {
    case 'fatal':
      return 4;
    case 'severe':
      return 3;
    case 'moderate':
      return 2;
    case 'minor':
    default:
      return 1;
  }
}

function sortStressVectors(rows: StressRiskVector[]): StressRiskVector[] {
  return [...rows].sort(
    (a, b) => b.probability * stressImpactWeight(b.impact) - a.probability * stressImpactWeight(a.impact),
  );
}

function impactBadgeClass(impact: string): string {
  switch (impact) {
    case 'fatal':
      return 'text-red-300 bg-red-500/15';
    case 'severe':
      return 'text-orange-300 bg-orange-500/15';
    case 'moderate':
      return 'text-amber-200 bg-amber-500/12';
    case 'minor':
    default:
      return 'text-white/50 bg-white/10';
  }
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

/** Route compare / stress / premortem / simulate verdict UI. */
function resolveVerdictMode(
  r: VerdictResult,
  panelMode: PanelMode,
): 'compare' | 'stress_test' | 'premortem' | 'simulate' {
  if (r._mode === 'compare' || r.opus_compare) return 'compare';
  if (r._mode === 'stress_test' || r.opus_stress) return 'stress_test';
  if (r._mode === 'premortem' || r.opus_premortem) return 'premortem';
  if (panelMode === 'compare') return 'compare';
  if (panelMode === 'stress') return 'stress_test';
  if (panelMode === 'premortem') return 'premortem';
  return 'simulate';
}

function VerdictLoadingBody({
  panelMode,
  message,
  activeChargeType,
}: {
  panelMode: PanelMode;
  message: string | null;
  activeChargeType: SimulationChargeType | null;
}) {
  const line =
    (message && message.trim()) ||
    defaultVerdictGeneratingMessage(
      panelMode === 'compare'
        ? 'compare'
        : panelMode === 'stress'
          ? 'stress_test'
          : panelMode === 'premortem'
            ? 'premortem'
            : activeChargeType,
    );
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-8">
      <p className="text-center text-[13px] leading-relaxed text-white/55">{line}</p>
      <div className="relative mt-6 h-1 w-full max-w-[280px] overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-[#e8593c]/70"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '320%'] }}
          transition={loadingBarTransition}
        />
      </div>
    </div>
  );
}

export default function VerdictPanel({ visible }: { visible: boolean }) {
  const router = useRouter();
  const tier = useBillingStore((s) => s.tier);
  const activeChargeType = useSimulationStore((s) => s.activeChargeType);
  const simStatus = useSimulationStore((s) => s.status);
  const result = useSimulationStore((s) => s.result) as VerdictResult | null;
  const consensus = useSimulationStore((s) => s.consensus);
  const agentsMap = useSimulationStore((s) => s.agents);
  const verdictGeneratingMessage = useSimulationStore((s) => s.verdictGeneratingMessage);
  const openDeepDive = useDeepDiveStore((s) => s.open);
  const simulationId = useSimulationStore((s) => s.simulationId);

  const [collapsed, setCollapsed] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pdfUpsell, setPdfUpsell] = useState(false);
  const [shareUpsell, setShareUpsell] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const panelMode = chargeTypeToPanelMode(activeChargeType);
  const verdict = result;
  const loading = simStatus === 'verdict' && !verdict;

  const vTyped = verdict as VerdictResult & {
    opus_compare?: CompareVerdict;
    opus_stress?: StressOpusVerdict;
    opus_premortem?: PremortemOpusVerdict;
  };

  const verdictMode = verdict ? resolveVerdictMode(verdict, panelMode) : null;

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

  const stressVectorsStructured = useMemo(() => {
    const raw = verdict?.stress_data?.risk_matrix;
    if (!raw?.length) return [] as StressRiskVector[];
    return sortStressVectors(raw);
  }, [verdict?.stress_data?.risk_matrix]);

  const stressRisks: RiskEntry[] = useMemo(() => {
    if (!verdict?.risk_matrix?.length) return [];
    const rank = { high: 0, medium: 1, low: 2 };
    return [...verdict.risk_matrix].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [verdict]);

  const premortemCauses = useMemo(() => {
    if (!verdict) return [] as { label: string }[];
    const fa = verdict.failure_analysis;
    if (fa?.failure_causes?.length) {
      return fa.failure_causes.map((c) => ({
        label: `${c.cause} (${Math.round(c.probability * 100)}% · ${c.timeline || 'timing n/a'})`,
      }));
    }
    if (verdict.action_plan?.length) {
      return verdict.action_plan.slice(0, 8).map((s) => ({ label: s }));
    }
    const fromOne = parseNumberList(verdict.one_liner || '');
    if (fromOne.length) return fromOne;
    return parseNumberList(verdict.main_risk || '');
  }, [verdict]);

  const premortemNarrative = verdict?.failure_analysis?.failure_narrative || verdict?.one_liner || '';

  const godsView = useMemo(() => {
    const gv = verdict?.god_view;
    if (gv && gv.totalVoices > 0) {
      const sum = gv.positive + gv.negative + gv.neutral;
      const denom = sum > 0 ? sum : gv.totalVoices;
      return {
        total: gv.totalVoices,
        source: 'market' as const,
        themes: { pos: gv.topPositive, neg: gv.topNegative },
        rows: [
          {
            pct: Math.round((100 * gv.positive) / denom),
            label: 'Positive / supportive',
            fill: DARK_THEME.success,
          },
          {
            pct: Math.round((100 * gv.neutral) / denom),
            label: 'Neutral / mixed',
            fill: 'rgba(148,163,184,0.85)',
          },
          {
            pct: Math.round((100 * gv.negative) / denom),
            label: 'Negative / concerned',
            fill: DARK_THEME.danger,
          },
        ],
      };
    }
    if (!consensus) return null;
    const { proceed, delay, abandon } = consensus;
    const sum = proceed + delay + abandon;
    if (sum <= 0) return null;
    return {
      total: sum,
      source: 'specialists' as const,
      themes: null,
      rows: [
        { pct: Math.round((100 * proceed) / sum), label: 'Would buy / proceed', fill: DARK_THEME.success },
        { pct: Math.round((100 * delay) / sum), label: 'Concerned / delay', fill: DARK_THEME.warning },
        { pct: Math.round((100 * abandon) / sum), label: 'Against / abandon', fill: DARK_THEME.danger },
      ],
    };
  }, [verdict, consensus]);

  const onNewSimulation = useCallback(() => {
    useSimulationStore.getState().reset();
    useDashboardUiStore.getState().resetSession();
    router.push('/');
  }, [router]);

  const canProExportShare = TIERS[tier].limits.pdf_export;

  const handleExportPdf = useCallback(async () => {
    if (!simulationId) {
      setShareNotice('Save your simulation first (wait until the run finishes).');
      return;
    }
    if (!canProExportShare) {
      setPdfUpsell(true);
      return;
    }
    setExportingPdf(true);
    setShareNotice(null);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId: simulationId }),
      });
      if (res.status === 403) {
        setPdfUpsell(true);
        return;
      }
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sukgo-report-${simulationId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setShareNotice('PDF export failed. Try again in a moment.');
    } finally {
      setExportingPdf(false);
    }
  }, [simulationId, canProExportShare]);

  const handleShare = useCallback(async () => {
    if (!simulationId) {
      setShareNotice('Save your simulation first (wait until the run finishes).');
      return;
    }
    if (!canProExportShare) {
      setShareUpsell(true);
      return;
    }
    setSharing(true);
    setShareNotice(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId: simulationId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 403) {
        setShareUpsell(true);
        return;
      }
      if (!res.ok || !data.url) {
        setShareNotice(data.error || 'Could not create share link.');
        return;
      }
      await navigator.clipboard.writeText(data.url);
      setShareNotice('Link copied to clipboard.');
    } catch {
      setShareNotice('Share failed. Check clipboard permissions and try again.');
    } finally {
      setSharing(false);
    }
  }, [simulationId, canProExportShare]);

  const onDeepDiveClick = useCallback(() => {
    const id = pickDissentingAgentId(verdict?.recommendation, scoreboard, agentsMap);
    if (id) openDeepDive(id);
  }, [verdict?.recommendation, scoreboard, agentsMap, openDeepDive]);

  const onSpecialistRowClick = useCallback(
    (agentName: string) => {
      const id = resolveAgentChatId(agentName, agentsMap);
      openDeepDive(id);
    },
    [agentsMap, openDeepDive],
  );

  const outlineBtn =
    'inline-flex items-center justify-center rounded-lg border border-white/10 bg-transparent px-4 py-2 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40';

  const structuredCompare = verdict?.compare_data;
  const pct = verdict ? Math.min(100, Math.max(0, Math.round(verdict.probability))) : 0;
  const showCompareCard =
    verdict &&
    verdictMode === 'compare' &&
    !vTyped.opus_compare &&
    Boolean(structuredCompare || (compareHint != null && compareHint.winner !== null));

  const showOpusCompare = Boolean(verdict && verdictMode === 'compare' && vTyped.opus_compare);
  const showOpusStress = Boolean(verdict && verdictMode === 'stress_test' && vTyped.opus_stress);
  const showOpusPremortem = Boolean(verdict && verdictMode === 'premortem' && vTyped.opus_premortem);

  const hideLegacyRiskBlocks = showOpusCompare || showOpusStress || showOpusPremortem;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={loading ? 'Generating verdict' : 'Simulation verdict'}
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

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-2">
            {loading ? (
              <VerdictLoadingBody
                panelMode={panelMode}
                message={verdictGeneratingMessage}
                activeChargeType={activeChargeType}
              />
            ) : verdict ? (
              <>
                {showOpusCompare && vTyped.opus_compare ? <CompareVerdictView verdict={vTyped.opus_compare} /> : null}
                {showOpusStress && vTyped.opus_stress ? <StressVerdictView verdict={vTyped.opus_stress} /> : null}
                {showOpusPremortem && vTyped.opus_premortem ? (
                  <PremortemVerdictView verdict={vTyped.opus_premortem} />
                ) : null}

                {verdictMode === 'simulate' ? <StandardVerdict verdict={verdict} /> : null}

                {showCompareCard && structuredCompare && (
                  <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className={HEADER}>Winner</p>
                    <p className="mt-2 text-lg font-semibold text-white/90">{structuredCompare.winner_label}</p>
                    <p className="mt-2 text-[13px] text-white/55">
                      Comparison confidence: {Math.round(structuredCompare.confidence)}% · Grade {verdict.grade}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/55">{structuredCompare.summary}</p>
                    {structuredCompare.caveat ? (
                      <p className="mt-2 border-l-2 border-amber-400/40 pl-3 text-[12px] leading-relaxed text-white/45">
                        {structuredCompare.caveat}
                      </p>
                    ) : null}
                    <p className={`${HEADER} mt-5`}>Dimensions</p>
                    <div className="mt-3 space-y-2">
                      {structuredCompare.dimensions.map((d, i) => (
                        <div
                          key={`${d.name}-${i}`}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-white/80">{d.name}</span>
                            <span className="text-[10px] font-semibold uppercase text-white/40">
                              {d.winner === 'tie' ? 'Tie' : `Option ${d.winner}`}
                            </span>
                          </div>
                          <div className="mt-1 flex gap-4 text-white/50">
                            <span>A: {d.score_a}/10</span>
                            <span>B: {d.score_b}/10</span>
                          </div>
                          {d.reasoning ? (
                            <p className="mt-2 text-[11px] leading-relaxed text-white/40">{d.reasoning}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <VerdictSources sources={verdict.sources} />
                  </div>
                )}
                {showCompareCard && !structuredCompare && compareHint && (
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
                      Structured compare data was unavailable; showing parsed narrative from the verdict.
                    </p>
                    <VerdictSources sources={verdict.sources} />
                  </div>
                )}

                {(verdictMode !== 'compare' || !showCompareCard) &&
                  !hideLegacyRiskBlocks &&
                  verdictMode !== 'simulate' && (
                  <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                    <StandardVerdict verdict={verdict} hideSources />
                  </div>
                )}

                {verdictMode === 'stress_test' && !vTyped.opus_stress && stressVectorsStructured.length > 0 && (
                  <div className="mb-6">
                    <p className={HEADER}>Failure vectors</p>
                    {typeof verdict.stress_data?.overall_resiliency === 'number' ? (
                      <p className="mt-2 text-[12px] text-white/45">
                        Overall resiliency score:{' '}
                        <span className="font-semibold text-white/70">
                          {Math.round(verdict.stress_data.overall_resiliency)}/100
                        </span>
                      </p>
                    ) : null}
                    {verdict.stress_data?.critical_vulnerability ? (
                      <p className="mt-2 border-l-2 border-red-400/50 pl-3 text-[12px] text-white/55">
                        <span className="text-[10px] font-semibold uppercase text-red-300/90">Critical gap · </span>
                        {verdict.stress_data.critical_vulnerability}
                      </p>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {stressVectorsStructured.map((row, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="min-w-0 flex-1 font-medium text-white/85">{row.threat}</span>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded px-2 py-0.5 text-[9px] font-semibold uppercase',
                                  impactBadgeClass(row.impact),
                                )}
                              >
                                {row.impact}
                              </span>
                              <span className="text-[10px] text-white/40">
                                p≈{Math.round(row.probability * 100)}% · {row.category}
                              </span>
                            </div>
                          </div>
                          {row.mitigation ? (
                            <p className="mt-2 text-[11px] leading-relaxed text-emerald-200/70">
                              Mitigation: {row.mitigation}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {verdict.stress_data?.survival_conditions ? (
                      <p className="mt-4 border-l-2 border-emerald-400/40 pl-3 text-[12px] leading-relaxed text-white/50">
                        <span className="text-[10px] font-semibold uppercase text-emerald-300/90">
                          Survival conditions ·{' '}
                        </span>
                        {verdict.stress_data.survival_conditions}
                      </p>
                    ) : null}
                  </div>
                )}
                {verdictMode === 'stress_test' &&
                  !vTyped.opus_stress &&
                  stressVectorsStructured.length === 0 &&
                  stressRisks.length > 0 && (
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

                {verdictMode === 'stress_test' && !vTyped.opus_stress ? (
                  <VerdictSources sources={verdict.sources} />
                ) : null}

                {verdictMode === 'premortem' &&
                  !vTyped.opus_premortem &&
                  verdict.failure_analysis?.failure_causes?.length ? (
                  <div className="mb-6">
                    <p className={HEADER}>Failure causes</p>
                    {verdict.failure_analysis.summary ? (
                      <p className="mt-2 text-[12px] text-white/50">{verdict.failure_analysis.summary}</p>
                    ) : null}
                    <ul className="mt-3 space-y-3">
                      {verdict.failure_analysis.failure_causes.map((c, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white/80"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium text-white/85">
                              <span className="text-white/35">{i + 1}. </span>
                              {c.cause}
                            </span>
                            <span className="text-[10px] font-semibold uppercase text-white/40">
                              {Math.round(c.probability * 100)}% · {c.timeline || '—'}
                            </span>
                          </div>
                          {c.early_warnings?.length ? (
                            <ul className="mt-2 list-inside list-disc text-[11px] text-amber-200/70">
                              {c.early_warnings.map((w, j) => (
                                <li key={j}>{w}</li>
                              ))}
                            </ul>
                          ) : null}
                          {c.prevention ? (
                            <p className="mt-2 text-[11px] leading-relaxed text-emerald-200/70">
                              Prevention: {c.prevention}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {premortemNarrative ? (
                      <p className="mt-4 border-l-2 border-amber-400/50 pl-3 text-[13px] leading-relaxed text-white/55">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
                          Failure narrative ·{' '}
                        </span>
                        {premortemNarrative}
                      </p>
                    ) : null}
                    {verdict.failure_analysis.prevention_checklist?.length ? (
                      <div className="mt-4">
                        <p className={HEADER}>Prevention checklist</p>
                        <ul className="mt-2 space-y-1.5 text-[12px] text-white/60">
                          {verdict.failure_analysis.prevention_checklist.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-emerald-400/80">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <VerdictSources sources={verdict.sources} />
                  </div>
                ) : null}
                {verdictMode === 'premortem' &&
                  !vTyped.opus_premortem &&
                  !verdict.failure_analysis?.failure_causes?.length &&
                  premortemCauses.length > 0 && (
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
                    <VerdictSources sources={verdict.sources} />
                  </div>
                )}

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
                          <button
                            key={`${a.agent_name}-${i}`}
                            type="button"
                            onClick={() => onSpecialistRowClick(a.agent_name)}
                            className="flex w-full items-center gap-2 rounded-lg py-1.5 pl-1 pr-0 text-left text-[12px] text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/70"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                            <span className="min-w-0 flex-1 truncate">{a.agent_name}</span>
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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {godsView && verdictMode === 'simulate' && (
                  <div className="mb-6">
                    <p className={HEADER}>
                      God&apos;s view · {godsView.total}{' '}
                      {godsView.source === 'market' ? 'market voices (Haiku)' : 'specialist-weighted view'}
                    </p>
                    <div className="mt-3 space-y-3">
                      {godsView.rows.map((row) => (
                        <div key={row.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
                          <div className="h-1.5 min-w-0 flex-1 basis-full overflow-hidden rounded-full bg-white/[0.06] sm:basis-auto sm:min-w-[120px]">
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
                    {godsView.themes && (godsView.themes.pos || godsView.themes.neg) && (
                      <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-white/50">
                        {godsView.themes.pos ? (
                          <p>
                            <span className="font-semibold text-emerald-300/90">Top positive theme: </span>
                            {godsView.themes.pos}
                          </p>
                        ) : null}
                        {godsView.themes.neg ? (
                          <p>
                            <span className="font-semibold text-red-300/90">Top concern: </span>
                            {godsView.themes.neg}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {(verdict.main_risk || verdict.next_action) && !hideLegacyRiskBlocks && verdictMode === 'simulate' && (
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

                <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exportingPdf || loading}
                    className={cn(outlineBtn, exportingPdf && 'opacity-60')}
                  >
                    {exportingPdf ? 'Exporting…' : 'Export PDF'}
                    {!canProExportShare && (
                      <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">
                        Pro
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing || loading}
                    className={cn(outlineBtn, sharing && 'opacity-60')}
                  >
                    {sharing ? 'Sharing…' : 'Share link'}
                    {!canProExportShare && (
                      <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/50">
                        Pro
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onDeepDiveClick}
                    disabled={scoreboard.length === 0 || loading}
                    className={outlineBtn}
                  >
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
                {shareNotice ? (
                  <p className="mt-3 text-center text-[11px] text-white/45">{shareNotice}</p>
                ) : null}
                {pdfUpsell ? (
                  <div className="mt-4">
                    <UpgradePrompt
                      reason="PDF export is included on Pro and Max."
                      suggestedTier="pro"
                      onDismiss={() => setPdfUpsell(false)}
                    />
                  </div>
                ) : null}
                {shareUpsell ? (
                  <div className="mt-4">
                    <UpgradePrompt
                      reason="Shareable public links are included on Pro and Max."
                      suggestedTier="pro"
                      onDismiss={() => setShareUpsell(false)}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
