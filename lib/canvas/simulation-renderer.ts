import {
  forceCollide,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  type SimulationNodeDatum,
} from 'd3-force';
import { DARK_THEME } from '@/lib/dashboard/theme';
import {
  compareMomentum,
  drawCompareArenaLabels,
  drawCompareDivider,
  drawCompareScoreBars,
  drawCompareSpecialistNodes,
  layoutCompareSpecialists,
} from '@/lib/canvas/modes/compare-mode';
import {
  drawPremortemAgents,
  drawPremortemTimeline,
  premortemLayout,
} from '@/lib/canvas/modes/premortem-mode';
import {
  drawSimulateCenterQuestion,
  drawSimulateSpecialistBoardroom,
  drawSimulateSwarmCenter,
  drawSwarmLegend,
} from '@/lib/canvas/modes/simulate-mode';
import {
  drawStressAttackers,
  drawStressOperatorInside,
  drawStressShield,
  drawStressStrikes,
  layoutStressRing,
  stressShieldHealth,
} from '@/lib/canvas/modes/stress-mode';
import { drawRadialBg, TAU } from '@/lib/canvas/modes/shared';
import {
  createCompareSwarmParticle,
  createOrbitalParticle,
  createSwarmParticle,
  createSwarmParticleForSegment,
  fadeAlpha,
  paletteStyle,
  stepCompareSwarm,
  stepFree,
  stepOrbital,
  type FreeParticle,
  type OrbitalParticle,
} from './particle-system';
import type { CanvasSnapshot } from './types';

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

export function createSimulationRenderer(
  canvas: HTMLCanvasElement,
  getSnapshot: () => CanvasSnapshot,
): {
  start: () => void;
  stop: () => void;
  resize: () => void;
  getSpecialistHitTargets: () => Map<string, { x: number; y: number }>;
  dispose: () => void;
} {
  let ctx = canvas.getContext('2d', { alpha: false });
  let raf = 0;
  let running = false;
  let dpr = 1;
  let wCss = 0;
  let hCss = 0;

  let consensusLerp = 0;
  let consensusTargetPrev = -1;
  let lastConsensusTick = 0;

  let orbital: OrbitalParticle[] = [];
  let swarm: FreeParticle[] = [];
  let compareSwarm: FreeParticle[] = [];
  let ambient: OrbitalParticle[] = [];

  let forceSim: ReturnType<typeof forceSimulation<ForceNode>> | null = null;
  let forceNodes: ForceNode[] = [];
  let lastSpecialistCount = -1;
  let lastLayoutKey = '';
  let lastSpecialistHitMap = new Map<string, { x: number; y: number }>();
  /** Refreshed each frame for stance drift on the specialist ring. */
  let ringAgentsRef: AgentNode[] = [];

  function layoutKey(s: CanvasSnapshot): string {
    return `${s.mode}-${s.tier}-${s.demo}-${s.agents.length}`;
  }

  function ensureAmbient(cx: number, cy: number, minDim: number, now: number): void {
    if (ambient.length >= 24) return;
    while (ambient.length < 24) {
      ambient.push(
        createOrbitalParticle(
          cx,
          cy,
          minDim * 0.28,
          minDim * 0.48,
          Math.random() > 0.5 ? 'neutral' : 'positive',
          now - Math.random() * 2000,
        ),
      );
    }
  }

  function ensureOrbitalCrowd(
    target: number,
    cx: number,
    cy: number,
    minDim: number,
    now: number,
    style: 'specialist' | 'stress' | 'premortem',
  ): void {
    while (orbital.length < target) {
      const pal =
        style === 'stress' ? 'risk' : style === 'premortem' ? 'amber' : Math.random() > 0.55 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral';
      orbital.push(
        createOrbitalParticle(cx, cy, minDim * 0.3, minDim * 0.45, pal, now - Math.random() * 400),
      );
    }
    if (orbital.length > target) orbital.length = target;
  }

  function ensureSwarm(target: number, w: number, h: number, now: number, snap: CanvasSnapshot): void {
    const voices = snap.crowdVoices;
    while (swarm.length < target) {
      if (voices && voices.length > 0) {
        const v = voices[Math.floor(Math.random() * voices.length)];
        const key = `${v.persona ?? ''}-${v.sentiment}`;
        swarm.push(createSwarmParticleForSegment(w, h, now, key));
      } else {
        swarm.push(createSwarmParticle(w, h, now));
      }
    }
    if (swarm.length > target) swarm.length = target;
  }

  function ensureCompareSwarm(target: number, w: number, h: number, now: number): void {
    while (compareSwarm.length < target) {
      const team = compareSwarm.length % 2 === 0 ? 0 : 1;
      compareSwarm.push(createCompareSwarmParticle(w, h, team as 0 | 1, now));
    }
    if (compareSwarm.length > target) compareSwarm.length = target;
  }

  function syncForceRing(agents: AgentNode[], cx: number, cy: number, R: number): void {
    const n = agents.length;
    if (n <= 0) {
      forceSim = null;
      forceNodes = [];
      lastSpecialistCount = -1;
      return;
    }
    if (n !== lastSpecialistCount || !forceSim) {
      lastSpecialistCount = n;
      forceNodes = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU - TAU / 4;
        return {
          id: String(i),
          x: cx + Math.cos(a) * R,
          y: cy + Math.sin(a) * R,
        };
      });
      forceSim = forceSimulation<ForceNode>(forceNodes)
        .force(
          'radial',
          forceRadial<ForceNode>(() => R, cx, cy).strength(0.28),
        )
        .force(
          'stance',
          forceX<ForceNode>((_, i) => {
            const ag = ringAgentsRef[i];
            if (!ag) return cx;
            if (ag.position === 'proceed') return cx + R * 0.42;
            if (ag.position === 'abandon') return cx - R * 0.42;
            return cx;
          }).strength(0.11),
        )
        .force('charge', forceManyBody<ForceNode>().strength(-9))
        .force('collide', forceCollide<ForceNode>().radius(24))
        .alphaDecay(0.02)
        .velocityDecay(0.85);
      for (let i = 0; i < 80; i++) forceSim.tick();
    } else {
      const radial = forceSim.force('radial') as ReturnType<typeof forceRadial<ForceNode>>;
      radial.radius(() => R).x(cx).y(cy);
    }
  }

  function nodePositions(
    s: CanvasSnapshot,
    cx: number,
    cy: number,
    minDim: number,
    h: number,
  ): Map<string, { x: number; y: number }> {
    const m = new Map<string, { x: number; y: number }>();
    const agents = s.agents;

    if (s.mode === 'compare' && s.tier === 'specialist') {
      return layoutCompareSpecialists(agents, wCss, hCss);
    }

    if (s.mode === 'stress') {
      const R = minDim * 0.22;
      const ring = layoutStressRing(agents, cx, cy, R);
      ring.forEach((v, k) => m.set(k, v));
      m.set('plan', { x: cx, y: cy });
      return m;
    }

    if (s.mode === 'premortem') {
      return premortemLayout(agents, wCss, hCss).agentSlots;
    }

    if (s.mode === 'simulate' && s.tier === 'specialist' && agents.length > 0) {
      const R = minDim * 0.25;
      syncForceRing(agents, cx, cy, R);
      if (forceSim && forceNodes.length === agents.length) {
        forceSim.alpha(Math.min(0.35, forceSim.alpha() + 0.02));
        forceSim.tick();
        agents.forEach((ag, i) => {
          const fn = forceNodes[i];
          if (fn && fn.x != null && fn.y != null) m.set(ag.id, { x: fn.x, y: fn.y });
        });
      }
    }
    return m;
  }

  function drawFrame(t: number): void {
    if (!ctx || !running) return;
    const snap = getSnapshot();
    const now = performance.now();

    if (document.hidden) {
      raf = requestAnimationFrame(drawFrame);
      return;
    }

    const slow = snap.simStatus === 'complete' ? 0.5 : 1;

    if (snap.consensusTarget !== consensusTargetPrev) {
      consensusTargetPrev = snap.consensusTarget;
      lastConsensusTick = now;
    }
    const lerpU = Math.min(1, (now - lastConsensusTick) / 500);
    consensusLerp += (snap.consensusTarget - consensusLerp) * (0.08 + lerpU * 0.25);

    const w = wCss;
    const h = hCss;
    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = DARK_THEME.bg_primary;
    ctx.fillRect(0, 0, w, h);

    const lk = layoutKey(snap);
    if (lk !== lastLayoutKey) {
      lastLayoutKey = lk;
      orbital = [];
      swarm = [];
      compareSwarm = [];
      lastSpecialistCount = -1;
      forceSim = null;
      forceNodes = [];
    }

    ringAgentsRef = snap.mode === 'simulate' && snap.tier === 'specialist' ? snap.agents : [];

    const showIdleText =
      !snap.demo &&
      !snap.isRunning &&
      snap.simStatus === 'idle' &&
      snap.agents.length === 0;

    if (snap.mode === 'stress') {
      drawRadialBg(ctx, w, h, 'rgba(248,113,113,0.045)', 'rgba(248,113,113,0.015)');
    } else if (snap.mode === 'premortem') {
      drawRadialBg(ctx, w, h, 'rgba(251,191,36,0.04)', 'rgba(251,191,36,0.012)');
    } else if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      drawRadialBg(ctx, w, h, 'rgba(59,130,246,0.04)', 'rgba(59,130,246,0.012)');
    } else if (snap.mode === 'compare' && snap.tier === 'swarm') {
      drawRadialBg(ctx, w, h, 'rgba(96,165,250,0.035)', 'rgba(244,63,94,0.02)');
    } else {
      drawRadialBg(ctx, w, h, 'rgba(232,89,60,0.035)', 'rgba(232,89,60,0.01)');
    }

    ensureAmbient(cx, cy, minDim, now);

    if (snap.mode === 'compare' && snap.tier === 'swarm') {
      const tgt = snap.demo ? 520 : Math.min(900, 180 + snap.voiceCount * 2);
      ensureCompareSwarm(tgt, w, h, now);
    } else if (snap.mode === 'stress') {
      ensureOrbitalCrowd(72, cx, cy, minDim, now, 'stress');
    } else if (snap.mode === 'premortem') {
      ensureOrbitalCrowd(56, cx, cy, minDim, now, 'premortem');
    } else if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      const tgt = snap.demo ? 420 : Math.min(1000, 200 + snap.voiceCount);
      ensureSwarm(tgt, w, h, now, snap);
    } else if (!(snap.mode === 'compare' && snap.tier === 'specialist')) {
      const tgt = snap.demo ? 88 : Math.min(220, 40 + snap.voiceCount);
      ensureOrbitalCrowd(tgt, cx, cy, minDim, now, 'specialist');
    }

    for (const p of ambient) {
      const { x, y } = stepOrbital(p, cx, cy, t, 0.35 * slow);
      const fa = fadeAlpha(p.spawnAt, now, 2800) * 0.35;
      const { fill } = paletteStyle(p.palette, fa * 0.12);
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(x, y, p.size * 0.7, 0, TAU);
      ctx.fill();
    }

    if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      for (const p of swarm) {
        stepFree(p, w, h, slow);
        const vert = p.palette === 'positive' ? -0.22 : p.palette === 'negative' ? 0.22 : 0;
        p.y += vert * slow;
        p.y = Math.max(0, Math.min(h, p.y));
        const base =
          p.palette === 'swarmBlue'
            ? 0.14
            : p.palette === 'positive'
              ? 0.18
              : p.palette === 'negative'
                ? 0.1
                : 0.12;
        const fa = fadeAlpha(p.spawnAt, now) * base;
        const { fill } = paletteStyle(p.palette, fa);
        ctx.beginPath();
        ctx.fillStyle = fill;
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }

    if (snap.mode === 'compare' && snap.tier === 'swarm') {
      for (const p of compareSwarm) {
        stepCompareSwarm(p, w, h, slow);
        const base = p.palette === 'positive' ? 0.2 : p.palette === 'negative' ? 0.14 : 0.11;
        const fa = fadeAlpha(p.spawnAt, now) * base;
        const { fill } = paletteStyle(p.palette, fa);
        ctx.beginPath();
        ctx.fillStyle = fill;
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }

    if (
      !(snap.mode === 'simulate' && snap.tier === 'swarm') &&
      !(snap.mode === 'compare' && snap.tier === 'swarm') &&
      !(snap.mode === 'compare' && snap.tier === 'specialist')
    ) {
      for (const p of orbital) {
        const { x, y } = stepOrbital(p, cx, cy, t, slow);
        const fa = fadeAlpha(p.spawnAt, now) * (p.palette === 'neutral' ? 0.1 : 0.22);
        const { fill } = paletteStyle(p.palette, fa);
        ctx.beginPath();
        ctx.fillStyle = fill;
        ctx.arc(x, y, p.size, 0, TAU);
        ctx.fill();
      }
    }

    const posMap = nodePositions(snap, cx, cy, minDim, h);
    const premLayout = snap.mode === 'premortem' ? premortemLayout(snap.agents, w, h) : null;

    if (snap.mode === 'simulate' && snap.tier === 'specialist') {
      lastSpecialistHitMap = new Map();
      for (const ag of snap.agents) {
        if (ag.id.startsWith('placeholder-')) continue;
        const p = posMap.get(ag.id);
        if (p) lastSpecialistHitMap.set(ag.id, p);
      }
    } else {
      lastSpecialistHitMap = new Map();
    }

    if (snap.mode === 'compare' && snap.tier === 'specialist') {
      const mom = compareMomentum(snap.agents);
      const activeA = snap.agents.some((a) => a.team === 'A' && a.isActive);
      const activeB = snap.agents.some((a) => a.team === 'B' && a.isActive);
      if (activeA) {
        ctx.fillStyle = 'rgba(59,139,212,0.08)';
        ctx.fillRect(0, 0, cx, h);
      }
      if (activeB) {
        ctx.fillStyle = 'rgba(244,63,94,0.07)';
        ctx.fillRect(cx, 0, w - cx, h);
      }
      drawCompareDivider(ctx, cx, h, t, mom);
      drawCompareArenaLabels(ctx, w, h, snap);
    }

    if (snap.mode === 'simulate' && snap.tier === 'specialist' && snap.agents.length > 1) {
      const flicker = 0.7 + 0.3 * Math.sin(t * 0.02);
      const settle = snap.simStatus === 'complete' ? 0.85 : flicker;
      for (const e of snap.edges) {
        const a = posMap.get(e.sourceId);
        const b = posMap.get(e.targetId);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.strokeStyle =
          e.type === 'agree'
            ? `rgba(74,222,128,${0.35 * settle})`
            : `rgba(248,113,113,${0.28 * settle})`;
        const lw =
          (e.type === 'agree' ? 1.1 : 0.55) *
          (snap.simStatus === 'complete' ? 0.75 + 0.5 * (e.strength ?? 0.5) : 1);
        ctx.lineWidth = lw;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (snap.mode === 'stress') {
      const center = posMap.get('plan') ?? { x: cx, y: cy };
      drawStressStrikes(ctx, snap, posMap, center, t);
    }

    if (snap.mode === 'premortem' && premLayout) {
      drawPremortemTimeline(ctx, w, h, snap, premLayout, t);
    }

    if (snap.mode === 'compare' && snap.tier === 'specialist') {
      drawCompareSpecialistNodes(ctx, snap, posMap, t);
      drawCompareScoreBars(ctx, w, h, snap, t);
    } else if (snap.mode === 'stress') {
      const center = posMap.get('plan') ?? { x: cx, y: cy };
      const health = stressShieldHealth(snap);
      drawStressShield(ctx, center.x, center.y, snap, health, t);
      drawStressAttackers(ctx, snap, posMap, t);
      drawStressOperatorInside(ctx, center.x, center.y, snap, t);
    } else if (snap.mode === 'premortem' && premLayout) {
      drawPremortemAgents(ctx, snap, premLayout, t);
    } else if (snap.mode === 'simulate' && snap.tier === 'specialist') {
      drawSimulateSpecialistBoardroom(ctx, snap, posMap, t);
      drawSimulateCenterQuestion(ctx, cx, cy, snap, consensusLerp, t);
    }

    if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      drawSimulateSwarmCenter(ctx, cx, cy, t, snap);
      drawSwarmLegend(ctx, w, h, snap, t);
    }

    if (snap.mode === 'compare' && snap.tier === 'swarm') {
      let posA = 0;
      let negA = 0;
      let posB = 0;
      let negB = 0;
      for (const p of compareSwarm) {
        if (p.compareTeam === 0) {
          if (p.palette === 'positive') posA++;
          else if (p.palette === 'negative') negA++;
        } else {
          if (p.palette === 'positive') posB++;
          else if (p.palette === 'negative') negB++;
        }
      }
      const totA = posA + negA + 1;
      const totB = posB + negB + 1;
      const pctA = Math.round((100 * posA) / totA);
      const pctB = Math.round((100 * posB) / totB);
      ctx.textAlign = 'center';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(96,165,250,0.9)';
      ctx.fillText('Option A', w * 0.26, h * 0.88);
      ctx.fillStyle = 'rgba(244,63,94,0.9)';
      ctx.fillText('Option B', w * 0.74, h * 0.88);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '500 10px system-ui, sans-serif';
      ctx.fillText(`${pctA}% positive`, w * 0.26, h * 0.92);
      ctx.fillText(`${pctB}% positive`, w * 0.74, h * 0.92);
      const boostA = 0.85 + Math.min(0.35, (pctA - pctB) / 200);
      const boostB = 0.85 + Math.min(0.35, (pctB - pctA) / 200);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(96,165,250,${0.04 * boostA})`;
      ctx.fillRect(0, 0, cx - 4, h);
      ctx.fillStyle = `rgba(244,63,94,${0.04 * boostB})`;
      ctx.fillRect(cx + 4, 0, w - cx - 4, h);
      ctx.restore();
    }

    if (showIdleText) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = '400 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Enter a decision above to start your simulation', cx, cy);
    }

    if (snap.simError) {
      ctx.fillStyle = 'rgba(248,113,113,0.9)';
      ctx.font = '500 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(snap.simError.slice(0, 80), cx, h - 24);
    }

    raf = requestAnimationFrame(drawFrame);
  }

  function resize(): void {
    const parent = canvas.parentElement;
    if (!parent || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    wCss = parent.clientWidth;
    hCss = parent.clientHeight;
    canvas.width = Math.max(1, Math.floor(wCss * dpr));
    canvas.height = Math.max(1, Math.floor(hCss * dpr));
    canvas.style.width = `${wCss}px`;
    canvas.style.height = `${hCss}px`;
    lastLayoutKey = '';
  }

  return {
    start() {
      if (running) return;
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      running = true;
      resize();
      raf = requestAnimationFrame(drawFrame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize,
    getSpecialistHitTargets(): Map<string, { x: number; y: number }> {
      return lastSpecialistHitMap;
    },
    dispose() {
      this.stop();
    },
  };
}
