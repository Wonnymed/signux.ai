import type { CanvasSnapshot } from '@/lib/canvas/types';

const TAU = Math.PI * 2;

/**
 * Hit-test specialist nodes. Prefer `livePositions` from the renderer (matches d3 layout);
 * otherwise fall back to a static ring approximation.
 */
export function getClickedSpecialistAgentId(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  snap: CanvasSnapshot,
  livePositions?: Map<string, { x: number; y: number }> | null,
): string | null {
  if (snap.simStatus !== 'complete') return null;
  if (snap.mode !== 'simulate' || snap.tier !== 'specialist') return null;
  if (snap.agents.length === 0) return null;

  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) return null;

  const hitR = 30;

  if (livePositions && livePositions.size > 0) {
    let best: { id: string; d2: number } | null = null;
    for (const ag of snap.agents) {
      if (ag.id.startsWith('placeholder-') || ag.position === 'pending') continue;
      const p = livePositions.get(ag.id);
      if (!p) continue;
      const dx = x - p.x;
      const dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= hitR * hitR && (!best || d2 < best.d2)) best = { id: ag.id, d2 };
    }
    if (best) return best.id;
  }

  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  const R = minDim * 0.25;
  const n = snap.agents.length;

  for (let i = 0; i < n; i++) {
    const ag = snap.agents[i];
    if (ag.id.startsWith('placeholder-') || ag.position === 'pending') continue;
    const a = (i / n) * TAU - TAU / 4;
    const px = cx + Math.cos(a) * R;
    const py = cy + Math.sin(a) * R;
    const dx = x - px;
    const dy = y - py;
    if (dx * dx + dy * dy <= hitR * hitR) {
      return ag.id;
    }
  }
  return null;
}
