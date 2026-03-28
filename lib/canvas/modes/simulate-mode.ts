import type { AgentNode, CanvasSnapshot } from '@/lib/canvas/types';
import { posColor, posGlow, TAU, wrapLines } from './shared';

/** Draw round-table specialists + center question (boardroom). */
export function drawSimulateSpecialistBoardroom(
  ctx: CanvasRenderingContext2D,
  snap: CanvasSnapshot,
  posMap: Map<string, { x: number; y: number }>,
  t: number,
): void {
  const pulseBase = 12;
  for (const ag of snap.agents) {
    if (ag.id.startsWith('placeholder-')) continue;
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
    ctx.arc(pt.x, pt.y, rDraw + (highlighted ? 18 : ag.isActive ? 14 : 10), 0, TAU);
    ctx.fill();
    if (ag.isOperator) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(232,89,60,0.9)';
      ctx.lineWidth = 2.5;
      ctx.arc(pt.x, pt.y, rDraw + 5, 0, TAU);
      ctx.stroke();
    } else if (highlighted) {
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
      : ag.isOperator
        ? 'rgba(232,89,60,0.85)'
        : highlighted
          ? 'rgba(232,89,60,0.85)'
          : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = ag.isActive ? 1.2 : ag.isOperator || highlighted ? 1.4 : 0.8;
    ctx.arc(pt.x, pt.y, rDraw, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const short = ag.name.length > 18 ? `${ag.name.slice(0, 16)}…` : ag.name;
    ctx.fillText(short, pt.x, pt.y + rDraw + 14);
    if (ag.isOperator) {
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(232,89,60,0.95)';
      ctx.fillText('★', pt.x, pt.y - rDraw - 6);
    }
    if (ag.webSourceCount && ag.webSourceCount > 0) {
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(147,197,253,0.85)';
      ctx.fillText('\u{1F50D}', pt.x + rDraw + 2, pt.y - rDraw + 4);
    }
  }
}

export function drawSimulateCenterQuestion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  snap: CanvasSnapshot,
  consensusLerp: number,
  t: number,
): void {
  const q = snap.centerQuestion?.trim();
  const or = 52 + Math.sin(t * 0.025) * 2;
  ctx.beginPath();
  ctx.fillStyle = 'rgba(232,89,60,0.07)';
  ctx.arc(cx, cy, or + 14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(232,89,60,0.22)';
  ctx.lineWidth = 1;
  ctx.arc(cx, cy, or, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, or - 4, 0, TAU);
  ctx.clip();
  if (q) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const lines = wrapLines(ctx, q, or * 1.45, 3);
    let ly = cy - ((lines.length - 1) * 7);
    for (const line of lines) {
      ctx.fillText(line, cx, ly);
      ly += 14;
    }
  }
  ctx.restore();
  const pct = Math.round(consensusLerp);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}% panel lean`, cx, cy + or * 0.55);
}

export function drawSimulateSwarmCenter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  snap: CanvasSnapshot,
): void {
  const pr = 18 + Math.sin(t * 0.03) * 3;
  ctx.beginPath();
  ctx.fillStyle = 'rgba(96,165,250,0.08)';
  ctx.arc(cx, cy, pr + 10, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(96,165,250,0.22)';
  ctx.arc(cx, cy, pr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const label = snap.demo ? '1,000' : String(Math.min(1000, snap.voiceCount || 0));
  ctx.fillText(label, cx, cy + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = '500 11px system-ui, sans-serif';
  ctx.fillText('market voices', cx, cy + 16);
}

export function drawSwarmLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: CanvasSnapshot,
  t: number,
): void {
  const segments = ['Office workers', 'Students', 'Competitors', 'Tourists'];
  const colors = ['#60a5fa', '#a78bfa', '#f87171', '#4ade80'];
  const x0 = 12;
  let y0 = h * 0.22;
  ctx.font = '500 9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  segments.forEach((name, i) => {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x0 + 5, y0 + 5, 4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(name, x0 + 14, y0 + 8);
    y0 += 16;
  });
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.02);
  ctx.fillStyle = `rgba(255,255,255,${0.28 * pulse})`;
  ctx.font = '500 10px system-ui, sans-serif';
  const pos = Math.floor((snap.voiceCount || 0) * 0.33 * pulse);
  const neg = Math.floor((snap.voiceCount || 0) * 0.28 * pulse);
  const neu = Math.max(0, (snap.voiceCount || 0) - pos - neg);
  ctx.fillText(`${pos} ↑ · ${neg} ↓ · ${neu} ~`, x0, h * 0.52);
}
