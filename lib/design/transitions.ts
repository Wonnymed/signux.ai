/** Shared motion / CSS timing — keep durations ≤ 300ms (product motion budget). */
export const TRANSITIONS = {
  page: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  component: { duration: 0.15, ease: 'easeOut' as const },
  micro: { duration: 0.1, ease: 'easeOut' as const },
  layout: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  /** Subtle spring for shared layout indicators only — no bounce. */
  spring: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.85 },
} as const;
