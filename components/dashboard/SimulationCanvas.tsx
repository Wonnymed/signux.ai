'use client';

import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useBillingStore } from '@/lib/store/billing';
import { useSimulationStore } from '@/lib/store/simulation';
import { useDeepDiveStore } from '@/lib/store/deep-dive';
import { getCanvasSnapshot } from '@/lib/canvas/build-snapshot';
import { createSimulationRenderer } from '@/lib/canvas/simulation-renderer';
import { getClickedSpecialistAgentId } from '@/lib/canvas/specialist-hit-test';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { cn } from '@/lib/design/cn';
import { TRANSITIONS } from '@/lib/design/transitions';
import type { CanvasSimStatus } from '@/lib/canvas/types';
import VerdictPanel from '@/components/dashboard/VerdictPanel';
import DeepDivePanel from '@/components/dashboard/DeepDivePanel';

const RUNNING: CanvasSimStatus[] = [
  'connecting',
  'planning',
  'opening',
  'adversarial',
  'converging',
  'verdict',
];

export default function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof createSimulationRenderer> | null>(null);

  const simStatus = useSimulationStore((s) => s.status);
  const simError = useSimulationStore((s) => s.error);
  const agents = useSimulationStore((s) => s.agents);
  const consensus = useSimulationStore((s) => s.consensus);
  const result = useSimulationStore((s) => s.result);
  const elapsed = useSimulationStore((s) => s.elapsed);
  useSimulationStore((s) => s.crowdVoices.length);

  const activeChargeType = useSimulationStore((s) => s.activeChargeType);
  const chiefAssembly = useSimulationStore((s) => s.chiefAssembly);
  const deepDiveOpen = useDeepDiveStore((s) => s.isOpen);
  const activeMode = useDashboardUiStore((s) => s.activeMode);
  /** Subscribe so idle demo updates when tier preview toggles. */
  useDashboardUiStore((s) => s.previewTier);
  const billingTier = useBillingStore((s) => s.tier);

  const getSnapshot = useCallback(() => {
    const dash = useDashboardUiStore.getState();
    const sim = useSimulationStore.getState();
    const dd = useDeepDiveStore.getState();
    return {
      ...getCanvasSnapshot(dash, {
        status: sim.status as CanvasSimStatus,
        error: sim.error,
        agents: sim.agents,
        consensus: sim.consensus,
        result: sim.result,
        elapsed: sim.elapsed,
        activeChargeType: sim.activeChargeType,
        crowdVoiceCount: sim.crowdVoices.length,
        crowdVoices: sim.crowdVoices.map((v) => ({
          sentiment: v.sentiment,
          persona: v.persona,
          team: v.team,
        })),
      }),
      highlightAgentId: dd.isOpen && dd.selectedAgentId ? dd.selectedAgentId : null,
    };
  }, []);

  const snap = getSnapshot();

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const sim = useSimulationStore.getState();
    if (sim.status !== 'complete') return;
    const snapNow = getSnapshot();
    const live = engine.getSpecialistHitTargets();
    const id = getClickedSpecialistAgentId(e.clientX, e.clientY, canvas, snapNow, live);
    if (id) useDeepDiveStore.getState().open(id);
  }, [getSnapshot]);

  const canClickSpecialists =
    simStatus === 'complete' &&
    snap.mode === 'simulate' &&
    snap.tier === 'specialist';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSimulationRenderer(canvas, getSnapshot);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [getSnapshot]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => engineRef.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showFullVerdict = simStatus === 'complete' && result != null;
  const showVerdictPanel = showFullVerdict || simStatus === 'verdict';
  const showOverlays =
    snap.demo || RUNNING.includes(snap.simStatus) || (snap.simStatus === 'complete' && !showFullVerdict);
  const showMiniVerdictHud =
    showOverlays &&
    !showFullVerdict &&
    (snap.currentRound >= 1 || snap.demo || snap.simStatus === 'complete');
  const specialistCount =
    snap.mode === 'simulate' && snap.tier === 'specialist'
      ? Math.max(snap.agents.length, snap.demo ? 10 : 0)
      : snap.mode === 'simulate' && snap.tier === 'swarm'
        ? 1000
        : snap.agents.length;

  const glass =
    'rounded-[10px] border-[0.5px] px-3 py-2 backdrop-blur-[12px]';
  const glassStyle = {
    backgroundColor: DARK_THEME.bg_glass,
    borderColor: 'rgba(255,255,255,0.07)',
  } as const;

  const showSpecialistProPreviewBadge =
    snap.demo &&
    snap.mode === 'simulate' &&
    snap.tier === 'specialist' &&
    billingTier === 'free';

  const showChiefOverlay =
    chiefAssembly != null && (simStatus === 'connecting' || simStatus === 'planning');

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden transition-[padding] duration-200 ease-out',
        deepDiveOpen && 'pr-[min(380px,40vw)]',
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 block h-full w-full',
          canClickSpecialists && 'cursor-pointer',
        )}
        aria-hidden={!canClickSpecialists}
        onClick={canClickSpecialists ? onCanvasClick : undefined}
      />

      {showChiefOverlay ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-[15] flex justify-center px-4"
          aria-live="polite"
        >
          <div
            className={cn('max-w-lg border px-4 py-3 shadow-lg backdrop-blur-md', glass)}
            style={glassStyle}
          >
            {chiefAssembly.phase === 'designing' ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: DARK_THEME.accent }}>
                  Chief orchestrator
                </p>
                <p className="mt-1 text-[13px] leading-snug" style={{ color: DARK_THEME.text_primary }}>
                  Assembling your simulation…
                </p>
                <p className="mt-1 text-[11px]" style={{ color: DARK_THEME.text_tertiary }}>
                  Designing specialists and parameters for your question ({chiefAssembly.mode} · {chiefAssembly.tier}).
                </p>
              </div>
            ) : null}
            {chiefAssembly.phase === 'panel' ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: DARK_THEME.accent }}>
                  Your panel
                </p>
                <ul className="mt-2 max-h-[28vh] space-y-1 overflow-y-auto text-left text-[12px]">
                  {chiefAssembly.specialists.map((s) => (
                    <li key={s.id} style={{ color: DARK_THEME.text_secondary }}>
                      <span className="font-medium text-white/85">{s.name}</span>
                      {s.team ? (
                        <span className="text-white/40"> · Team {s.team}</span>
                      ) : null}
                      <span className="text-white/45"> — {s.role}</span>
                    </li>
                  ))}
                </ul>
                {chiefAssembly.operator ? (
                  <p className="mt-2 border-t border-white/[0.08] pt-2 text-[12px]" style={{ color: DARK_THEME.accent }}>
                    ★ {chiefAssembly.operator.name} — you in the simulation
                  </p>
                ) : null}
              </div>
            ) : null}
            {chiefAssembly.phase === 'crowd' ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: DARK_THEME.accent }}>
                  Mapping your market
                </p>
                <ul className="mt-2 max-h-[28vh] space-y-1.5 overflow-y-auto text-left text-[12px]">
                  {chiefAssembly.segments.map((seg, i) => {
                    const total = chiefAssembly.segments.reduce((a, x) => a + x.count, 0) || 1;
                    const pct = Math.min(100, Math.round((seg.count / total) * 100));
                    return (
                      <li key={`${seg.segment}-${i}`}>
                        <div className="mb-0.5 flex justify-between gap-2" style={{ color: DARK_THEME.text_secondary }}>
                          <span className="truncate">{seg.segment}</span>
                          <span className="shrink-0 tabular-nums text-white/50">{seg.count}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-[#e8593c]/70" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <VerdictPanel visible={showVerdictPanel} />
      <DeepDivePanel />

      <AnimatePresence initial={false}>
        {showOverlays && (
          <motion.div
            key={activeMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.component}
            className="pointer-events-none absolute inset-0 z-10"
          >
          {showSpecialistProPreviewBadge ? (
            <div className="pointer-events-none absolute left-3 top-14 z-[11] rounded-md border border-[#e8593c]/35 bg-[#0a0a0f]/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#e8593c] backdrop-blur-sm">
              Pro preview
            </div>
          ) : null}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide',
                RUNNING.includes(snap.simStatus) && 'animate-pulse',
              )}
              style={{
                borderColor: DARK_THEME.border_default,
                color: DARK_THEME.text_secondary,
                backgroundColor: DARK_THEME.bg_surface,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: RUNNING.includes(snap.simStatus) ? DARK_THEME.success : DARK_THEME.text_tertiary,
                }}
              />
              {RUNNING.includes(snap.simStatus) ? 'Live' : snap.demo ? 'Preview' : 'Ready'}
              <span style={{ color: DARK_THEME.text_tertiary }}>·</span>
              <span>
                Round {snap.currentRound}/{snap.totalRounds}
              </span>
            </span>
            {snap.mode === 'simulate' && snap.tier === 'specialist' && (
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide"
                style={{ borderColor: DARK_THEME.border_default, color: DARK_THEME.text_secondary }}
              >
                {specialistCount} specialists
              </span>
            )}
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide"
              style={{ borderColor: DARK_THEME.border_default, color: DARK_THEME.text_secondary }}
            >
              {snap.voiceCount} voices
            </span>
          </div>

          <div
            className={cn(
              'pointer-events-none absolute right-3 top-3 z-10 max-h-[42%] w-[min(220px,40vw)] overflow-y-auto',
              glass,
              snap.agents.length === 0 && 'hidden',
            )}
            style={glassStyle}
          >
            <p className="text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: DARK_THEME.text_tertiary }}>
              Specialists
            </p>
            <ul className="mt-2 space-y-1.5">
              {snap.agents.slice(0, 12).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate" style={{ color: DARK_THEME.text_secondary }}>
                    {a.name}
                  </span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                    style={{
                      backgroundColor:
                        a.position === 'proceed'
                          ? 'rgba(74,222,128,0.15)'
                          : a.position === 'delay'
                            ? 'rgba(251,191,36,0.15)'
                            : a.position === 'abandon'
                              ? 'rgba(248,113,113,0.15)'
                              : 'rgba(255,255,255,0.06)',
                      color:
                        a.position === 'proceed'
                          ? DARK_THEME.success
                          : a.position === 'delay'
                            ? DARK_THEME.warning
                            : a.position === 'abandon'
                              ? DARK_THEME.danger
                              : DARK_THEME.text_tertiary,
                    }}
                  >
                    {a.position === 'pending' ? '…' : a.position}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {showMiniVerdictHud && snap.verdict && (
            <div className={cn('pointer-events-none absolute bottom-3 left-3 z-10 w-[min(220px,88vw)]', glass)} style={glassStyle}>
              <p className="text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: DARK_THEME.text_tertiary }}>
                Verdict
              </p>
              <p className="mt-1 text-lg font-semibold text-white/90">
                {snap.verdict.probability != null ? `${Math.round(snap.verdict.probability)}% ` : ''}
                {snap.verdict.recommendation.toUpperCase()}
              </p>
              {snap.verdict.grade && (
                <p className="text-[11px]" style={{ color: DARK_THEME.text_secondary }}>
                  · {snap.verdict.grade}
                </p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, snap.verdict.probability ?? 0))}%`,
                    backgroundColor: DARK_THEME.accent,
                  }}
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              'pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1',
              showFullVerdict && 'hidden',
            )}
          >
            {Array.from({ length: snap.totalRounds }, (_, i) => {
              const n = i + 1;
              const done =
                snap.simStatus === 'complete'
                  ? n <= snap.totalRounds
                  : n < snap.currentRound;
              const current =
                n === snap.currentRound &&
                (RUNNING.includes(snap.simStatus) || (snap.demo && snap.simStatus === 'idle'));
              return (
                <span
                  key={n}
                  className={cn(
                    'flex h-[13px] w-[13px] items-center justify-center rounded-full border text-[8px] font-semibold',
                    current && 'shadow-[0_0_10px_rgba(232,89,60,0.45)]',
                  )}
                  style={{
                    borderColor: done ? DARK_THEME.success : current ? DARK_THEME.accent : DARK_THEME.border_default,
                    color: done ? DARK_THEME.success : current ? DARK_THEME.accent : DARK_THEME.text_tertiary,
                  }}
                >
                  {n}
                </span>
              );
            })}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
