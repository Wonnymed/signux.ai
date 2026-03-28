/** Shared 2D helpers for mode-specific canvas renderers. */

export const TAU = Math.PI * 2;

export function posColor(p: string): string {
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

export function posGlow(p: string): string {
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

export function drawRadialBg(
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

/** Returns lines (max `maxLines`) fitting `maxWidth` px. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const tryLine = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(tryLine).width <= maxWidth) {
      cur = tryLine;
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (words.length && lines.length === 0) lines.push(text.slice(0, 24));
  return lines.slice(0, maxLines);
}
