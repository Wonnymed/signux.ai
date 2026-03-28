import type { AgentNode, CanvasSnapshot } from '@/lib/canvas/types';
import { posColor, TAU, wrapLines } from './shared';

export function layoutCompareSpecialists(
  agents: AgentNode[],
  w: number,
  h: number,
): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  const cx = w / 2;
  const cy = h / 2;
  const leftCx = w * 0.26;
  const rightCx = w * 0.74;
  const real = agents.filter((a) => !a.id.startsWith('placeholder-'));
  const fill = (list: AgentNode[], tcx: number) => {
    const n = Math.max(list.length, 1);
    list.forEach((ag, i) => {
      const ty = cy + (i - (n - 1) / 2) * 40;
      m.set(ag.id, { x: tcx, y: ty });
    });
  };
  const teamA = real.filter((a) => a.team === 'A');
  const teamB = real.filter((a) => a.team === 'B');
  if (teamA.length + teamB.length === 0) {
    for (let i = 0; i < 5; i++) {
      m.set(`ph-a-${i}`, { x: leftCx, y: cy + (i - 2) * 36 });
      m.set(`ph-b-${i}`, { x: rightCx, y: cy + (i - 2) * 36 });
    }
    return m;
  }
  fill(teamA.length ? teamA : real.slice(0, Math.ceil(real.length / 2)), leftCx);
  fill(teamB.length ? teamB : real.slice(Math.ceil(real.length / 2)), rightCx);
  return m;
}

export function drawCompareDivider(
  ctx: CanvasRenderingContext2D,
  cx: number,
  h: number,
  t: number,
  momentum: number,
): void {
  const shift = momentum * 0.04 * Math.min(cx, 200);
  const x = cx + shift;
  const g = ctx.createLinearGradient(x, 0, x, h);
  const pulse = 0.35 + 0.2 * Math.sin(t * 0.022);
  g.addColorStop(0, `rgba(255,255,255,${0.02 * pulse})`);
  g.addColorStop(0.45, `rgba(255,255,255,${0.14 * pulse})`);
  g.addColorStop(0.55, `rgba(147,197,253,${0.25 * pulse})`);
  g.addColorStop(1, `rgba(255,255,255,${0.02 * pulse})`);
  ctx.save();
  ctx.shadowColor = 'rgba(147,197,253,0.35)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.strokeStyle = g as unknown as string;
  ctx.lineWidth = 2;
  ctx.moveTo(x, h * 0.12);
  ctx.lineTo(x, h * 0.88);
  ctx.stroke();
  ctx.restore();
}

/** Momentum -1..1 from agent stance balance (A proceed vs B proceed). */
export function compareMomentum(agents: AgentNode[]): number {
  const real = agents.filter((a) => !a.id.startsWith('placeholder-'));
  if (!real.length) return 0;
  let sa = 0;
  let sb = 0;
  for (const a of real) {
    const w = a.position === 'proceed' ? 1 : a.position === 'abandon' ? -0.5 : 0;
    if (a.team === 'A') sa += w;
    else if (a.team === 'B') sb += w;
  }
  const t = sa + sb;
  if (t === 0) return 0;
  return Math.max(-1, Math.min(1, (sa - sb) / (Math.abs(sa) + Math.abs(sb) + 0.01)));
}

export function drawCompareSpecialistNodes(
  ctx: CanvasRenderingContext2D,
  snap: CanvasSnapshot,
  posMap: Map<string, { x: number; y: number }>,
  t: number,
): void {
  const colA = '#3B8BD4';
  const colB = '#f43f5e';
  for (const ag of snap.agents) {
    const pt = posMap.get(ag.id);
    if (!pt) continue;
    const teamCol = ag.team === 'B' ? colB : colA;
    const pulse = ag.isActive ? 3 + Math.sin(t * 0.05) * 2 : 0;
    const r = 11 + pulse;
    ctx.beginPath();
    ctx.fillStyle = teamCol + '22';
    ctx.arc(pt.x, pt.y, r + 8, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = posColor(ag.position) + 'cc';
    ctx.strokeStyle = teamCol + 'aa';
    ctx.lineWidth = ag.isActive ? 1.8 : 1;
    ctx.arc(pt.x, pt.y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const nm = ag.name.length > 14 ? `${ag.name.slice(0, 12)}…` : ag.name;
    ctx.fillText(nm, pt.x, pt.y + r + 12);
    if (ag.webSourceCount && ag.webSourceCount > 0) {
      ctx.font = '9px sans-serif';
      ctx.fillText('\u{1F50D}', pt.x + r, pt.y - r);
    }
  }
}

export function drawCompareArenaLabels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: CanvasSnapshot,
): void {
  const q = snap.centerQuestion;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(96,165,250,0.85)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('OPTION A', w * 0.26, h * 0.1);
  ctx.fillStyle = 'rgba(244,63,94,0.85)';
  ctx.fillText('OPTION B', w * 0.74, h * 0.1);
  if (q) {
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    const lines = wrapLines(ctx, q, w * 0.5, 2);
    let y = h * 0.06;
    for (const line of lines) {
      ctx.fillText(line, w / 2, y);
      y += 12;
    }
  }
}

export function drawCompareScoreBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: CanvasSnapshot,
  t: number,
): void {
  const real = snap.agents.filter((a) => !a.id.startsWith('placeholder-'));
  let scoreA = 50;
  let scoreB = 50;
  if (real.length) {
    let pa = 0;
    let pb = 0;
    for (const a of real) {
      const c = typeof a.confidence === 'number' ? a.confidence : 5;
      if (a.team === 'A') pa += c * (a.position === 'proceed' ? 1 : a.position === 'abandon' ? -0.5 : 0.2);
      if (a.team === 'B') pb += c * (a.position === 'proceed' ? 1 : a.position === 'abandon' ? -0.5 : 0.2);
    }
    const tot = Math.abs(pa) + Math.abs(pb) + 1;
    scoreA = Math.round(40 + (60 * (pa + tot / 2)) / tot);
    scoreB = Math.round(40 + (60 * (pb + tot / 2)) / tot);
  }
  const pulse = 0.92 + 0.08 * Math.sin(t * 0.04);
  const bw = w * 0.32;
  const y = h * 0.9;
  const drawBar = (x: number, score: number, col: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x - bw / 2, y, bw, 6);
    ctx.fillStyle = col;
    ctx.globalAlpha = pulse;
    ctx.fillRect(x - bw / 2, y, (bw * score) / 100, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, x, y - 6);
  };
  drawBar(w * 0.26, scoreA, 'rgba(59,139,212,0.9)');
  drawBar(w * 0.74, scoreB, 'rgba(244,63,94,0.9)');
}
