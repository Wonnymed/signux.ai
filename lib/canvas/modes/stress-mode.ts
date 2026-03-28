import type { AgentNode, CanvasSnapshot } from '@/lib/canvas/types';
import { posColor, TAU, wrapLines } from './shared';

/** Nine attack vectors around the central plan (penetration-test metaphor). */
export const STRESS_LABELS = [
  'Financial',
  'Market',
  'Regulatory',
  'Timing',
  'Competitive',
  'Team',
  'Execution',
  'Capital',
  'Black swan',
] as const;

export function layoutStressRing(
  agents: AgentNode[],
  cx: number,
  cy: number,
  R: number,
): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  const attackers = agents.filter((a) => !a.isOperator);
  if (!attackers.length) return m;
  const ringN = Math.min(attackers.length, STRESS_LABELS.length);
  for (let i = 0; i < ringN; i++) {
    const ag = attackers[i];
    const ang = (i / ringN) * TAU - TAU / 4;
    m.set(ag.id, { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R });
  }
  for (let i = STRESS_LABELS.length; i < attackers.length; i++) {
    const ag = attackers[i];
    const ang = (i / attackers.length) * TAU - TAU / 4;
    m.set(ag.id, { x: cx + Math.cos(ang) * R * 1.14, y: cy + Math.sin(ang) * R * 1.14 });
  }
  return m;
}

function strikeStyle(position: string): { stroke: string; width: number; dash?: number[] } {
  if (position === 'abandon') return { stroke: 'rgba(248,113,113,0.85)', width: 2.2, dash: [6, 4] };
  if (position === 'delay') return { stroke: 'rgba(251,191,36,0.75)', width: 1.4 };
  if (position === 'proceed') return { stroke: 'rgba(74,222,128,0.45)', width: 0.9 };
  return { stroke: 'rgba(255,255,255,0.22)', width: 0.8 };
}

export function stressShieldHealth(snap: CanvasSnapshot): number {
  const real = snap.agents.filter((a) => !a.isOperator && a.position !== 'pending');
  if (!real.length) return 1;
  let dmg = 0;
  for (const a of real) {
    if (a.position === 'abandon') dmg += 0.22;
    else if (a.position === 'delay') dmg += 0.09;
    else if (a.position === 'proceed') dmg += 0.02;
  }
  return Math.max(0.08, 1 - Math.min(0.92, dmg));
}

export function drawStressStrikes(
  ctx: CanvasRenderingContext2D,
  snap: CanvasSnapshot,
  posMap: Map<string, { x: number; y: number }>,
  center: { x: number; y: number },
  t: number,
): void {
  const real = snap.agents.filter((a) => !a.isOperator);
  const flicker = 0.75 + 0.25 * Math.sin(t * 0.028);
  for (let i = 0; i < real.length; i++) {
    const ag = real[i];
    const p = posMap.get(ag.id);
    if (!p) continue;
    const st = strikeStyle(ag.position);
    const pulse = ag.isActive ? 1.15 + 0.12 * Math.sin(t * 0.08) : 1;
    ctx.save();
    ctx.beginPath();
    if (st.dash) ctx.setLineDash(st.dash);
    ctx.strokeStyle = st.stroke;
    ctx.globalAlpha = flicker * pulse * (snap.simStatus === 'complete' ? 0.9 : 1);
    ctx.lineWidth = st.width * pulse;
    ctx.moveTo(p.x, p.y);
    const pull = ag.isActive ? 0.12 : 0;
    const tcx = center.x + (center.x - p.x) * pull;
    const tcy = center.y + (center.y - p.y) * pull;
    ctx.lineTo(tcx, tcy);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawStressShield(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  snap: CanvasSnapshot,
  health: number,
  t: number,
): void {
  const baseR = 34;
  const crack = 1 - health;
  ctx.beginPath();
  ctx.fillStyle = `rgba(59,130,246,${0.06 + crack * 0.08})`;
  ctx.arc(cx, cy, baseR + 16, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = `rgba(96,165,250,${0.35 - crack * 0.15})`;
  ctx.lineWidth = 2 + crack * 4;
  ctx.arc(cx, cy, baseR, 0, TAU);
  ctx.stroke();
  if (crack > 0.35) {
    ctx.save();
    ctx.strokeStyle = `rgba(248,113,113,${0.15 + crack * 0.25})`;
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const ang = (k / 3) * TAU + t * 0.002;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * (baseR * 0.3), cy + Math.sin(ang) * (baseR * 0.3));
      ctx.lineTo(cx + Math.cos(ang) * (baseR * 0.95), cy + Math.sin(ang) * (baseR * 0.95));
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const q = snap.centerQuestion?.trim();
  if (q) {
    ctx.font = '500 9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    const lines = wrapLines(ctx, q, baseR * 2.2, 2);
    let ly = cy - 6;
    for (const line of lines) {
      ctx.fillText(line, cx, ly);
      ly += 11;
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.fillText('YOUR PLAN', cx, cy + baseR * 0.55);
  const surv =
    snap.verdict?.probability != null
      ? Math.round(snap.verdict.probability)
      : Math.round(health * 100);
  ctx.fillStyle = health > 0.45 ? 'rgba(74,222,128,0.9)' : health > 0.2 ? 'rgba(251,191,36,0.95)' : 'rgba(248,113,113,0.95)';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(`${surv}% survival`, cx, cy + baseR + 22);
}

export function drawStressAttackers(
  ctx: CanvasRenderingContext2D,
  snap: CanvasSnapshot,
  posMap: Map<string, { x: number; y: number }>,
  t: number,
): void {
  const real = snap.agents.filter((a) => !a.isOperator);
  real.forEach((ag, i) => {
    const p = posMap.get(ag.id);
    if (!p) return;
    const label = STRESS_LABELS[i % STRESS_LABELS.length] ?? ag.name.slice(0, 12);
    const col = posColor(ag.position);
    const pulse = ag.isActive ? 4 + Math.sin(t * 0.06) * 2 : 0;
    const r = 12 + pulse;
    ctx.beginPath();
    ctx.fillStyle = col + '18';
    ctx.arc(p.x, p.y, r + 10, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = col + 'cc';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = ag.isActive ? 1.5 : 1;
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${label} ⚔`, p.x, p.y + r + 12);
    if (ag.webSourceCount && ag.webSourceCount > 0) {
      ctx.font = '9px sans-serif';
      ctx.fillText('\u{1F50D}', p.x + r, p.y - r);
    }
  });
}

export function drawStressOperatorInside(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  snap: CanvasSnapshot,
  t: number,
): void {
  const op = snap.agents.find((a) => a.isOperator);
  if (!op) return;
  const oy = cy + 8 + Math.sin(t * 0.04) * 2;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,89,60,0.95)';
  ctx.fillText('★', cx, oy);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 8px system-ui, sans-serif';
  const nm = op.name.length > 14 ? `${op.name.slice(0, 12)}…` : op.name;
  ctx.fillText(nm, cx, oy + 12);
}
