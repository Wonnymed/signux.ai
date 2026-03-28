/** Internal orbital / free particles for Canvas2D (not React state). */

export type ParticlePalette = 'positive' | 'negative' | 'neutral' | 'swarmBlue' | 'anchorBlue' | 'anchorRed' | 'risk' | 'amber';

export interface OrbitalParticle {
  angle: number;
  orbitR: number;
  speed: number;
  driftPhase: number;
  driftAmp: number;
  size: number;
  palette: ParticlePalette;
  spawnAt: number;
  /** Optional anchor for compare clusters (0 = A, 1 = B) */
  cluster?: 0 | 1;
  ax?: number;
  ay?: number;
}

export interface FreeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  palette: ParticlePalette;
  spawnAt: number;
  /** Compare swarm: 0 = Option A mass, 1 = Option B mass */
  compareTeam?: 0 | 1;
}

const TAU = Math.PI * 2;

export function randomBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function createOrbitalParticle(
  cx: number,
  cy: number,
  minR: number,
  maxR: number,
  palette: ParticlePalette,
  now: number,
  cluster?: 0 | 1,
  ax?: number,
  ay?: number,
): OrbitalParticle {
  return {
    angle: Math.random() * TAU,
    orbitR: randomBetween(minR, maxR),
    speed: randomBetween(0.00035, 0.00085),
    driftPhase: Math.random() * TAU,
    driftAmp: randomBetween(4, 14),
    size: randomBetween(1.2, 3.8),
    palette,
    spawnAt: now,
    cluster,
    ax,
    ay,
  };
}

export function createSwarmParticle(w: number, h: number, now: number): FreeParticle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: randomBetween(-0.35, 0.35),
    vy: randomBetween(-0.35, 0.35),
    size: randomBetween(1, 3),
    palette: ['swarmBlue', 'positive', 'neutral', 'negative'][
      Math.floor(Math.random() * 4)
    ] as ParticlePalette,
    spawnAt: now,
  };
}

export function stepOrbital(
  p: OrbitalParticle,
  cx: number,
  cy: number,
  t: number,
  speedMul: number,
): { x: number; y: number } {
  let tcx = cx;
  let tcy = cy;
  if (p.cluster !== undefined && p.ax != null && p.ay != null) {
    tcx = p.ax;
    tcy = p.ay;
  }
  p.angle += p.speed * speedMul;
  const wobble = Math.sin(t * 0.0012 + p.driftPhase) * p.driftAmp;
  const r = p.orbitR + wobble;
  return {
    x: tcx + Math.cos(p.angle) * r,
    y: tcy + Math.sin(p.angle) * r,
  };
}

export function stepFree(p: FreeParticle, w: number, h: number, speedMul: number): void {
  p.x += p.vx * speedMul;
  p.y += p.vy * speedMul;
  if (p.x < 0 || p.x > w) p.vx *= -1;
  if (p.y < 0 || p.y > h) p.vy *= -1;
  p.x = Math.max(0, Math.min(w, p.x));
  p.y = Math.max(0, Math.min(h, p.y));
}

/** Two facing crowds for compare swarm; sentiment biases vertical drift. */
export function createCompareSwarmParticle(w: number, h: number, team: 0 | 1, now: number): FreeParticle {
  const left = team === 0;
  const x = left ? randomBetween(w * 0.02, w * 0.4) : randomBetween(w * 0.6, w * 0.98);
  const y = randomBetween(h * 0.14, h * 0.86);
  const roll = Math.random();
  const palette: ParticlePalette = roll < 0.36 ? 'positive' : roll < 0.7 ? 'negative' : 'neutral';
  return {
    x,
    y,
    vx: randomBetween(-0.28, 0.28) * (left ? 1 : -1) * 0.4,
    vy: randomBetween(-0.2, 0.2),
    size: randomBetween(1.1, 3),
    palette,
    spawnAt: now,
    compareTeam: team,
  };
}

export function stepCompareSwarm(p: FreeParticle, w: number, h: number, speedMul: number): void {
  const pull = p.palette === 'positive' ? -0.045 : p.palette === 'negative' ? 0.045 : 0;
  p.vy += pull * speedMul;
  p.vy = Math.max(-0.55, Math.min(0.55, p.vy));
  p.x += p.vx * speedMul;
  p.y += p.vy * speedMul;
  const mid = w / 2;
  const margin = 8;
  if (p.compareTeam === 0 && p.x > mid - margin) {
    p.x = mid - margin;
    p.vx = -Math.abs(p.vx) - 0.05;
  }
  if (p.compareTeam === 1 && p.x < mid + margin) {
    p.x = mid + margin;
    p.vx = Math.abs(p.vx) + 0.05;
  }
  if (p.y < h * 0.1 || p.y > h * 0.9) p.vy *= -0.85;
  p.y = Math.max(h * 0.08, Math.min(h * 0.92, p.y));
  p.x = Math.max(0, Math.min(w, p.x));
}

/** Swarm particle tinted by segment hash (market cloud). */
export function createSwarmParticleForSegment(
  w: number,
  h: number,
  now: number,
  segmentKey: string,
): FreeParticle {
  const p = createSwarmParticle(w, h, now);
  let h0 = 0;
  for (let i = 0; i < segmentKey.length; i++) h0 = (h0 * 31 + segmentKey.charCodeAt(i)) >>> 0;
  const palettes: ParticlePalette[] = ['swarmBlue', 'positive', 'neutral', 'negative', 'anchorBlue', 'anchorRed'];
  p.palette = palettes[h0 % palettes.length];
  return p;
}

export function fadeAlpha(spawnAt: number, now: number, dur = 320): number {
  const u = Math.min(1, (now - spawnAt) / dur);
  return u * u * (3 - 2 * u);
}

export function paletteStyle(
  palette: ParticlePalette,
  baseAlpha: number,
): { fill: string } {
  switch (palette) {
    case 'positive':
      return { fill: `rgba(74,222,128,${baseAlpha})` };
    case 'negative':
      return { fill: `rgba(248,113,113,${baseAlpha})` };
    case 'neutral':
      return { fill: `rgba(255,255,255,${baseAlpha})` };
    case 'swarmBlue':
      return { fill: `rgba(96,165,250,${baseAlpha})` };
    case 'anchorBlue':
      return { fill: `rgba(96,165,250,${baseAlpha})` };
    case 'anchorRed':
      return { fill: `rgba(248,113,113,${baseAlpha})` };
    case 'risk':
      return { fill: `rgba(248,113,113,${baseAlpha})` };
    case 'amber':
      return { fill: `rgba(251,191,36,${baseAlpha})` };
    default:
      return { fill: `rgba(255,255,255,${baseAlpha})` };
  }
}
