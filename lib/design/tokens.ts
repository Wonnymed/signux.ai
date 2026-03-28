/**
 * Design Token Exports — TypeScript access to design system values.
 * Use for: Framer Motion, dynamic styles, agent color lookups.
 * NEVER for static styling — use Tailwind classes instead.
 */

/** Mirrors `app/globals.css` Phase 0.4 — system feedback (not verdict-specific). */
export const stateSemantic = {
  success: 'var(--state-success)',
  successMuted: 'var(--state-success-muted)',
  warning: 'var(--state-warning)',
  warningMuted: 'var(--state-warning-muted)',
  error: 'var(--state-error)',
  errorMuted: 'var(--state-error-muted)',
  info: 'var(--state-info)',
  infoMuted: 'var(--state-info-muted)',
} as const;

/** Mirrors `app/globals.css` Phase 0.3 — use CSS vars in static styles when needed. */
export const focusRing = {
  colorVar: 'var(--focus-ring-color)',
  width: '2px',
  offsetVar: 'var(--focus-ring-offset)',
} as const;

/** Mirrors `app/globals.css` BUILD PLAN §2.2 (+ display-lg for marketing). */
export const typographyRoles = {
  pageTitle: { size: '1.75rem', weight: 300, lineHeight: 1.3, letterSpacing: '-0.025em' },
  section: { size: '1.25rem', weight: 500, lineHeight: 1.4, letterSpacing: '-0.015em' },
  cardTitle: { size: '0.9375rem', weight: 500, lineHeight: 1.4, letterSpacing: '-0.005em' },
  body: { size: '0.875rem', weight: 400, lineHeight: 1.6 },
  meta: { size: '0.75rem', weight: 400, lineHeight: 1.5 },
  micro: { size: '0.6875rem', weight: 400, lineHeight: 1.4 },
  displayLg: { size: '2rem', weight: 500, lineHeight: 1.2, letterSpacing: '-0.02em' },
} as const;

/** BUILD PLAN §2.3 — gradient text stops (see `.octux-gradient-text` / `.octux-gradient-text-cyan`). */
export const gradientTextStops = {
  from: 'var(--gradient-text-from)',
  via: 'var(--gradient-text-via)',
  to: 'var(--gradient-text-to)',
  viaCyan: 'var(--gradient-text-via-cyan)',
} as const;

/** Default text color per role (BUILD PLAN §2.2 — use with typography role). */
export const typographyRoleColors = {
  pageTitle: 'var(--text-primary)',
  section: 'var(--text-primary)',
  cardTitle: 'var(--text-primary)',
  body: 'var(--text-secondary)',
  meta: 'var(--text-tertiary)',
  micro: 'var(--text-tertiary)',
  displayLg: 'var(--text-primary)',
} as const;

/** 4px grid — same as `--space-*` in globals.css */
export const spacingPx = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 24: 96,
} as const;

export const transitions = {
  fast: { duration: 0.1, ease: 'easeOut' },
  normal: { duration: 0.15, ease: 'easeOut' },
  slow: { duration: 0.25, ease: 'easeOut' },
  entity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  takeover: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  spring: { type: 'spring' as const, stiffness: 400, damping: 25 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
} as const;

export const stagger = {
  fast: { staggerChildren: 0.03 },
  normal: { staggerChildren: 0.05 },
  slow: { staggerChildren: 0.08 },
  agents: { staggerChildren: 0.12 },
} as const;

export const verdictColors = {
  proceed: { solid: '#10B981', muted: 'rgba(16, 185, 129, 0.15)' },
  delay: { solid: '#F59E0B', muted: 'rgba(245, 158, 11, 0.15)' },
  abandon: { solid: '#EF4444', muted: 'rgba(239, 68, 68, 0.15)' },
} as const;
export type VerdictType = keyof typeof verdictColors;

export const verdictLabels: Record<VerdictType, string> = {
  proceed: 'PROCEED',
  delay: 'DELAY',
  abandon: 'ABANDON',
};

export const gradeColors: Record<string, string> = {
  'A+': '#10B981', 'A': '#10B981', 'A-': '#10B981',
  'B+': '#3B82F6', 'B': '#3B82F6', 'B-': '#3B82F6',
  'C+': '#F59E0B', 'C': '#F59E0B', 'C-': '#F59E0B',
  'D+': '#F97316', 'D': '#F97316', 'D-': '#F97316',
  'F': '#EF4444',
};

export const categoryColors = {
  investment: '#6366F1',
  relationships: '#EC4899',
  career: '#10B981',
  business: '#F59E0B',
  health: '#EF4444',
  life: '#8B5CF6',
} as const;
export type CategoryType = keyof typeof categoryColors;

export const agentPalettes: Record<CategoryType, string[]> = {
  investment: ['#6366F1', '#3B82F6', '#06B6D4', '#8B5CF6', '#14B8A6', '#2563EB', '#7C3AED', '#0EA5E9', '#4F46E5', '#0D9488'],
  relationships: ['#EC4899', '#F43F5E', '#E879F9', '#FB7185', '#D946EF', '#F472B6', '#C084FC', '#FB923C', '#A855F7', '#F87171'],
  career: ['#10B981', '#22C55E', '#14B8A6', '#34D399', '#06B6D4', '#2DD4BF', '#4ADE80', '#059669', '#0D9488', '#16A34A'],
  business: ['#F59E0B', '#F97316', '#EAB308', '#FB923C', '#FBBF24', '#D97706', '#EA580C', '#CA8A04', '#DC2626', '#B45309'],
  health: ['#EF4444', '#F87171', '#FB7185', '#F43F5E', '#DC2626', '#E11D48', '#BE123C', '#F97316', '#EA580C', '#F59E0B'],
  life: ['#8B5CF6', '#A855F7', '#C084FC', '#7C3AED', '#6D28D9', '#D946EF', '#E879F9', '#4F46E5', '#9333EA', '#7E22CE'],
};

export function getAgentColor(category: CategoryType, index: number): string {
  const palette = agentPalettes[category] || agentPalettes.life;
  return palette[index % palette.length];
}

export const entityStates = {
  dormant: { scale: 1, opacity: 0.6, glow: 'rgba(124, 58, 237, 0.15)', breatheDuration: 4 },
  active: { scale: 1.05, opacity: 0.8, glow: 'rgba(124, 58, 237, 0.40)', breatheDuration: 2 },
  engaged: { scale: 1.5, opacity: 1, glow: 'rgba(124, 58, 237, 0.70)', breatheDuration: 1.5 },
  maximum: { scale: 2, opacity: 1, glow: 'rgba(124, 58, 237, 1.0)', breatheDuration: 0.8 },
} as const;
export type EntityState = keyof typeof entityStates;

export const tierConfig = {
  free: { label: 'Free', color: 'rgba(255,255,255,0.40)', badgeClass: 'oct-badge-free' },
  pro: { label: 'Pro', color: '#7C3AED', badgeClass: 'oct-badge-pro' },
  max: { label: 'Max', color: '#F59E0B', badgeClass: 'oct-badge-max' },
  kraken: { label: 'Kraken', color: '#00E5FF', badgeClass: 'oct-badge-kraken' },
} as const;

/** BUILD PLAN §2.1 — product engines (CSS vars; use in motion/SVG). */
export const engineSemantic = {
  simulate: 'var(--engine-simulate)',
  build: 'var(--engine-build)',
  grow: 'var(--engine-grow)',
  hire: 'var(--engine-hire)',
  protect: 'var(--engine-protect)',
  compete: 'var(--engine-compete)',
} as const;

/** BUILD PLAN §2.1 — canonical agent roles (CSS vars). */
export const agentRoleSemantic = {
  baseRate: 'var(--agent-base-rate)',
  unitEcon: 'var(--agent-unit-econ)',
  demand: 'var(--agent-demand)',
  competitive: 'var(--agent-competitive)',
  regulatory: 'var(--agent-regulatory)',
  execution: 'var(--agent-execution)',
  capital: 'var(--agent-capital)',
  scenario: 'var(--agent-scenario)',
  intervention: 'var(--agent-intervention)',
  chair: 'var(--agent-chair)',
} as const;

export const layout = {
  sidebarCollapsed: 56, sidebarExpanded: 288, chatMaxWidth: 768, headerHeight: 48,
  agentCardMinHeight: 120, verdictCardMinHeight: 200,
} as const;

export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

// ═══ CONFIDENCE HELPERS ═══

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return '#10B981';
  if (confidence >= 50) return '#F59E0B';
  return '#EF4444';
}

// Deterministic avatar gradient from agent index
export const AGENT_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#10B981', '#14B8A6'],
  ['#F59E0B', '#F97316'],
  ['#3B82F6', '#06B6D4'],
  ['#D946EF', '#E879F9'],
  ['#EF4444', '#F87171'],
  ['#22C55E', '#4ADE80'],
  ['#0EA5E9', '#38BDF8'],
  ['#A855F7', '#C084FC'],
] as const;
