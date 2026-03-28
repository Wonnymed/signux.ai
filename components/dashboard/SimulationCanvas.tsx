'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { useSimulationStore } from '@/lib/store/simulation';
import { useDeepDiveStore } from '@/lib/store/deep-dive';
import { getCanvasSnapshot } from '@/lib/canvas/build-snapshot';
import { createSimulationRenderer } from '@/lib/canvas/simulation-renderer';
import { getClickedSpecialistAgentId } from '@/lib/canvas/specialist-hit-test';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { cn } from '@/lib/design/cn';
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

  const activeChargeType = useSimulationStore((s) => s.activeChargeType);

  const deepDiveOpen = useDeepDiveStore((s) => s.isOpen);

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

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-0 flex-1 overflow-hidden transition-[padding] duration-300 ease-out',
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

      <VerdictPanel visible={showFullVerdict} />
      <DeepDivePanel />

      {showOverlays && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
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
                  className="h-full rounded-full transition-all duration-500"
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
        </>
      )}
    </div>
  );
}
