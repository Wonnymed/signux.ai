import {
  forceCollide,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { DARK_THEME } from '@/lib/dashboard/theme';
import {
  createOrbitalParticle,
  createSwarmParticle,
  fadeAlpha,
  paletteStyle,
  stepFree,
  stepOrbital,
  type OrbitalParticle,
  type FreeParticle,
} from './particle-system';
import type { AgentNode, CanvasSnapshot } from './types';

const TAU = Math.PI * 2;

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

function posColor(p: string): string {
  switch (p) {
    case 'proceed':
      return '#4ade80';
    case 'delay':
      return '#fbbf24';
    case 'abandon':
      return '#f87171';
    default:
      return 'rgba(255,255,255,0.22)';
  }
}

function posGlow(p: string): string {
  switch (p) {
    case 'proceed':
      return 'rgba(74,222,128,0.08)';
    case 'delay':
      return 'rgba(251,191,36,0.08)';
    case 'abandon':
      return 'rgba(248,113,113,0.08)';
    default:
      return 'rgba(255,255,255,0.06)';
  }
}

function drawRadialBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  center: string,
  mid: string,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
  g.addColorStop(0, center);
  g.addColorStop(0.48, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
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
  let ambient: OrbitalParticle[] = [];

  let forceSim: ReturnType<typeof forceSimulation<ForceNode>> | null = null;
  let forceNodes: ForceNode[] = [];
  let lastSpecialistCount = -1;
  let lastLayoutKey = '';
  let lastSpecialistHitMap = new Map<string, { x: number; y: number }>();

  const stressThreats = ['Capital', 'Regulation', 'Demand', 'Execution', 'Competition', 'Team'];
  const premortemCauses = ['Pricing', 'CAC', 'Churn', 'Product', 'Hiring'];

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

  function ensureSwarm(target: number, w: number, h: number, now: number): void {
    while (swarm.length < target) {
      swarm.push(createSwarmParticle(w, h, now - Math.random() * 600));
    }
    if (swarm.length > target) swarm.length = target;
  }

  function ensureCompareParticles(cx: number, cy: number, minDim: number, now: number): void {
    const ax = cx - minDim * 0.22;
    const ay = cy;
    const bx = cx + minDim * 0.22;
    const by = cy;
    const need = 100;
    while (orbital.length < need) {
      const cluster = orbital.length % 2 === 0 ? 0 : 1;
      orbital.push(
        createOrbitalParticle(
          cx,
          cy,
          minDim * 0.06,
          minDim * 0.14,
          cluster === 0 ? 'anchorBlue' : 'anchorRed',
          now,
          cluster as 0 | 1,
          cluster === 0 ? ax : bx,
          cluster === 0 ? ay : by,
        ),
      );
    }
  }

  function syncForceRing(n: number, cx: number, cy: number, R: number): void {
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

    if (s.mode === 'compare') {
      m.set('opt-a', { x: cx - minDim * 0.22, y: cy });
      m.set('opt-b', { x: cx + minDim * 0.22, y: cy });
      return m;
    }
    if (s.mode === 'stress') {
      m.set('plan', { x: cx, y: cy });
      const R = minDim * 0.2;
      stressThreats.forEach((_, i) => {
        const a = (i / stressThreats.length) * TAU - TAU / 4;
        m.set(`threat-${i}`, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
      });
      return m;
    }
    if (s.mode === 'premortem') {
      m.set('fail', { x: cx, y: h * 0.35 });
      const n = premortemCauses.length;
      premortemCauses.forEach((_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = cx + (t - 0.5) * minDim * 0.62;
        const y = h * 0.66;
        m.set(`cause-${i}`, { x, y });
      });
      return m;
    }

    // simulate: specialist ring or swarm (no fixed nodes)
    if (s.tier === 'specialist' && agents.length > 0) {
      const R = minDim * 0.25;
      syncForceRing(agents.length, cx, cy, R);
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
      lastSpecialistCount = -1;
      forceSim = null;
      forceNodes = [];
    }

    const showIdleText =
      !snap.demo &&
      !snap.isRunning &&
      snap.simStatus === 'idle' &&
      snap.agents.length === 0;

    // Background accent by mode/tier
    if (snap.mode === 'stress') {
      drawRadialBg(ctx, w, h, 'rgba(248,113,113,0.045)', 'rgba(248,113,113,0.015)');
    } else if (snap.mode === 'premortem') {
      drawRadialBg(ctx, w, h, 'rgba(251,191,36,0.04)', 'rgba(251,191,36,0.012)');
    } else if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      drawRadialBg(ctx, w, h, 'rgba(59,130,246,0.04)', 'rgba(59,130,246,0.012)');
    } else {
      drawRadialBg(ctx, w, h, 'rgba(232,89,60,0.035)', 'rgba(232,89,60,0.01)');
    }

    ensureAmbient(cx, cy, minDim, now);

    // ─── Mode-specific particles & nodes ───
    if (snap.mode === 'compare') {
      ensureCompareParticles(cx, cy, minDim, now);
    } else if (snap.mode === 'stress') {
      ensureOrbitalCrowd(80, cx, cy, minDim, now, 'stress');
    } else if (snap.mode === 'premortem') {
      ensureOrbitalCrowd(60, cx, cy, minDim, now, 'premortem');
    } else if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      const tgt = snap.demo ? 420 : Math.min(1000, 200 + snap.voiceCount);
      ensureSwarm(tgt, w, h, now);
    } else {
      const tgt = snap.demo ? 88 : Math.min(220, 40 + snap.voiceCount);
      ensureOrbitalCrowd(tgt, cx, cy, minDim, now, 'specialist');
    }

    // Draw ambient
    for (const p of ambient) {
      const { x, y } = stepOrbital(p, cx, cy, t, 0.35 * slow);
      const fa = fadeAlpha(p.spawnAt, now, 2800) * 0.35;
      const { fill } = paletteStyle(p.palette, fa * 0.12);
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(x, y, p.size * 0.7, 0, TAU);
      ctx.fill();
    }

    // Swarm particles
    if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      for (const p of swarm) {
        stepFree(p, w, h, slow);
        const base = p.palette === 'swarmBlue' ? 0.14 : p.palette === 'positive' ? 0.18 : p.palette === 'negative' ? 0.1 : 0.12;
        const fa = fadeAlpha(p.spawnAt, now) * base;
        const { fill } = paletteStyle(p.palette, fa);
        ctx.beginPath();
        ctx.fillStyle = fill;
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }

    // Orbital crowd (specialist / compare / stress / premortem)
    if (!(snap.mode === 'simulate' && snap.tier === 'swarm')) {
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

    // Edges (specialist simulate only — and demo/compare stress premortem variants)
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
        ctx.lineWidth = (e.type === 'agree' ? 1.1 : 0.55) * (snap.simStatus === 'complete' ? 0.9 : 1);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (snap.mode === 'compare') {
      const a = posMap.get('opt-a')!;
      const b = posMap.get('opt-b')!;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(96,165,250,${0.25 * (0.75 + 0.25 * Math.sin(t * 0.018))})`;
      ctx.lineWidth = 1;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (snap.mode === 'stress') {
      const c = posMap.get('plan')!;
      stressThreats.forEach((_, i) => {
        const p = posMap.get(`threat-${i}`);
        if (!p) return;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(248,113,113,${0.35 + 0.15 * Math.sin(t * 0.025 + i)})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      });
    }

    if (snap.mode === 'premortem') {
      const f = posMap.get('fail')!;
      premortemCauses.forEach((_, i) => {
        const p = posMap.get(`cause-${i}`);
        if (!p) return;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(251,191,36,${0.28})`;
        ctx.lineWidth = 0.9;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
      });
    }

    // Draw nodes
    if (snap.mode === 'compare') {
      const a = posMap.get('opt-a')!;
      const b = posMap.get('opt-b')!;
      for (const [pt, label, col, rad] of [
        [a, 'Option A', '#60a5fa', 20],
        [b, 'Option B', '#f87171', 20],
      ] as const) {
        ctx.beginPath();
        ctx.fillStyle = col + '14';
        ctx.arc(pt.x, pt.y, rad + 10, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 0.9;
        ctx.fillStyle = col;
        ctx.arc(pt.x, pt.y, rad, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '500 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, pt.x, pt.y + rad + 16);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText('VS', cx, cy + 5);
    } else if (snap.mode === 'stress') {
      const c = posMap.get('plan')!;
      ctx.beginPath();
      ctx.fillStyle = '#4ade8022';
      ctx.arc(c.x, c.y, 28, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.9;
      ctx.arc(c.x, c.y, 18, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Your plan', c.x, c.y + 30);
      stressThreats.forEach((name, i) => {
        const p = posMap.get(`threat-${i}`);
        if (!p) return;
        ctx.beginPath();
        ctx.fillStyle = '#f8717120';
        ctx.arc(p.x, p.y, 18, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#f87171';
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.arc(p.x, p.y, 10, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '500 10px system-ui, sans-serif';
        ctx.fillText(name, p.x, p.y + 22);
      });
    } else if (snap.mode === 'premortem') {
      const f = posMap.get('fail')!;
      ctx.beginPath();
      ctx.fillStyle = '#f8717125';
      ctx.arc(f.x, f.y, 24, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#f87171';
      ctx.arc(f.x, f.y, 16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Failure', f.x, f.y + 28);
      premortemCauses.forEach((name, i) => {
        const p = posMap.get(`cause-${i}`);
        if (!p) return;
        ctx.beginPath();
        ctx.fillStyle = '#fbbf2428';
        ctx.arc(p.x, p.y, 14, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#fbbf24';
        ctx.arc(p.x, p.y, 9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.font = '500 9px system-ui, sans-serif';
        ctx.fillText(name, p.x, p.y + 20);
      });
    } else if (snap.mode === 'simulate' && snap.tier === 'specialist') {
      const pulseBase = 12;
      for (const ag of snap.agents) {
        const pt = posMap.get(ag.id);
        if (!pt) continue;
        const phase = (ag.id.charCodeAt(0) % 8) * 0.7;
        const pulse = pulseBase + Math.sin(t * 0.003 + phase) * 2;
        const rDraw = ag.isActive ? pulse + 2 : pulse;
        const highlighted = snap.highlightAgentId && ag.id === snap.highlightAgentId;
        const col = posColor(ag.position);
        const glow = posGlow(ag.position);
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(
          pt.x,
          pt.y,
          rDraw + (highlighted ? 18 : ag.isActive ? 14 : 10),
          0,
          TAU,
        );
        ctx.fill();
        if (highlighted) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(232,89,60,0.55)';
          ctx.lineWidth = 2;
          ctx.arc(pt.x, pt.y, rDraw + 6, 0, TAU);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.strokeStyle = ag.isActive
          ? 'rgba(255,255,255,0.5)'
          : highlighted
            ? 'rgba(232,89,60,0.85)'
            : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = ag.isActive ? 1.2 : highlighted ? 1.4 : 0.8;
        ctx.arc(pt.x, pt.y, rDraw, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '500 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const short = ag.name.length > 18 ? `${ag.name.slice(0, 16)}…` : ag.name;
        ctx.fillText(short, pt.x, pt.y + rDraw + 14);
      }
    }

    // Center orb / swarm label
    if (snap.mode === 'simulate' && snap.tier === 'swarm') {
      const pr = 16 + Math.sin(t * 0.03) * 3;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(96,165,250,0.08)';
      ctx.arc(cx, cy, pr + 8, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(96,165,250,0.22)';
      ctx.arc(cx, cy, pr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '500 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1,000', cx, cy + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.fillText('voices', cx, cy + 18);
    } else if (snap.mode === 'simulate' && snap.tier === 'specialist') {
      const pct = Math.round(consensusLerp);
      const or = 20 + Math.sin(t * 0.03) * 4;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(232,89,60,0.06)';
      ctx.arc(cx, cy, or + 10, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(232,89,60,0.18)';
      ctx.arc(cx, cy, or - 2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(232,89,60,0.35)';
      ctx.arc(cx, cy, or - 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, cx, cy + 6);
    } else if (snap.mode !== 'compare' && snap.mode !== 'stress' && snap.mode !== 'premortem') {
      /* noop */
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
