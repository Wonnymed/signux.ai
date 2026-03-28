import type { AgentNode, CanvasSnapshot } from '@/lib/canvas/types';
import { TAU, wrapLines } from './shared';

const PHASES = ['Launch', 'Growth', 'Decline', 'Crisis', 'DEAD'] as const;

/** Horizontal timeline Y band. */
export function premortemLayout(
  agents: AgentNode[],
  w: number,
  h: number,
): {
  lineY: number;
  milestones: { x: number; label: string }[];
  agentSlots: Map<string, { x: number; y: number }>;
  ponrX: number;
} {
  const lineY = h * 0.42;
  const x0 = w * 0.08;
  const x1 = w * 0.92;
  const milestones = PHASES.map((label, i) => ({
    x: x0 + ((x1 - x0) * i) / (PHASES.length - 1),
    label,
  }));
  const ponrX = x0 + (x1 - x0) * 0.62;
  const m = new Map<string, { x: number; y: number }>();
  const real = agents.filter(
    (a) => !a.id.startsWith('placeholder-') || a.id.startsWith('placeholder-pm'),
  );
  const n = Math.max(real.length, 1);
  real.forEach((ag, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + (x1 - x0) * (0.08 + t * 0.84);
    const y = lineY + (i % 2 === 0 ? -28 : 28);
    m.set(ag.id, { x, y });
  });
  return { lineY, milestones, agentSlots: m, ponrX };
}

export function premortemProgress(snap: CanvasSnapshot): number {
  const tr = Math.max(snap.totalRounds, 1);
  const u = snap.simStatus === 'complete' ? 1 : Math.min(1, snap.currentRound / tr);
  return u;
}

export function drawPremortemTimeline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: CanvasSnapshot,
  layout: ReturnType<typeof premortemLayout>,
  t: number,
): void {
  const { lineY, milestones, ponrX } = layout;
  const x0 = milestones[0].x;
  const x1 = milestones[milestones.length - 1].x;
  const prog = premortemProgress(snap);
  const endX = x0 + (x1 - x0) * prog;

  const lg = ctx.createLinearGradient(x0, lineY, x1, lineY);
  lg.addColorStop(0, 'rgba(74,222,128,0.85)');
  lg.addColorStop(0.45, 'rgba(251,191,36,0.85)');
  lg.addColorStop(1, 'rgba(248,113,113,0.9)');

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.moveTo(x0, lineY);
  ctx.lineTo(x1, lineY);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = lg as unknown as string;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.moveTo(x0, lineY);
  ctx.lineTo(endX, lineY);
  ctx.stroke();
  ctx.restore();

  const pulse = 0.9 + 0.1 * Math.sin(t * 0.04);
  milestones.forEach((ms, i) => {
    const lit = prog >= i / (milestones.length - 1) - 0.01;
    ctx.beginPath();
    ctx.fillStyle = lit ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)';
    ctx.arc(ms.x, lineY, lit ? 5 : 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ms.label, ms.x, lineY - 14);
  });

  ctx.beginPath();
  ctx.fillStyle = `rgba(248,113,113,${0.35 * pulse})`;
  ctx.moveTo(ponrX, lineY - 7);
  ctx.lineTo(ponrX + 8, lineY);
  ctx.lineTo(ponrX, lineY + 7);
  ctx.lineTo(ponrX - 8, lineY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(248,113,113,0.55)';
  ctx.font = '500 8px system-ui, sans-serif';
  ctx.fillText('No return', ponrX, lineY + 20);

  const month = Math.max(1, Math.round(snap.currentRound + snap.elapsedSec / 8));
  ctx.fillStyle = `rgba(255,255,255,${0.28 * pulse})`;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Month ${month}`, w / 2, h * 0.12);
}

export function drawPremortemAgents(
  ctx: CanvasRenderingContext2D,
  snap: CanvasSnapshot,
  layout: ReturnType<typeof premortemLayout>,
  t: number,
): void {
  const { agentSlots, lineY } = layout;
  for (const ag of snap.agents) {
    if (ag.id.startsWith('placeholder-') && !ag.id.startsWith('placeholder-pm')) continue;
    const pt = agentSlots.get(ag.id);
    if (!pt) continue;
    const r = 10 + (ag.isActive ? Math.sin(t * 0.07) * 2 : 0);
    ctx.beginPath();
    ctx.fillStyle = ag.position === 'abandon' ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.2)';
    ctx.arc(pt.x, pt.y, r + 8, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle =
      ag.position === 'abandon' ? '#f87171' : ag.position === 'proceed' ? '#4ade80' : '#fbbf24';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = ag.isActive ? 1.4 : 0.9;
    ctx.arc(pt.x, pt.y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const nm = ag.name.length > 16 ? `${ag.name.slice(0, 14)}…` : ag.name;
    ctx.fillText(nm, pt.x, pt.y - r - 6);
    if (ag.argument) {
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.font = '400 8px system-ui, sans-serif';
      const lines = wrapLines(ctx, ag.argument, 120, 2);
      let ly = pt.y + r + 10;
      for (const line of lines) {
        ctx.fillText(line, pt.x, ly);
        ly += 9;
      }
    }
    if (ag.webSourceCount && ag.webSourceCount > 0) {
      ctx.font = '9px sans-serif';
      ctx.fillText('\u{1F50D}', pt.x + r + 2, pt.y - r);
    }
  }

  if (snap.simStatus === 'complete') {
    const fx = layout.milestones[layout.milestones.length - 1].x;
    ctx.beginPath();
    ctx.fillStyle = `rgba(248,113,113,${0.45 + 0.15 * Math.sin(t * 0.06)})`;
    ctx.arc(fx, lineY, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FAILED', fx, lineY + 26);
  }
}
