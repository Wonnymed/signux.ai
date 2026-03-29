/**
 * R8 addendum — shared canvas colors for mode renderers (simulate / compare / stress / pre-mortem).
 * Import this when building canvas visuals; keeps simulation UI and canvas in sync.
 */
export const CANVAS = {
  gold: '#c9a96e',
  goldRgb: '201, 169, 110',
  bright: '#f5f5f0',
  dim: '#5a5a55',
  darkLine: '#3a3a36',
  surface: '#1a1a18',
  bg: '#111110',
  track: '#252522',
  glow: 'rgba(201, 169, 110, 0.12)',
  glowStrong: 'rgba(201, 169, 110, 0.15)',
  positive: '#5a9e6f',
  negative: '#b85450',
} as const;

export type AgentNodeStyle = {
  border: string;
  bg: string;
  text: string;
  dot: string;
};

export const AGENT_PALETTE = {
  operator: {
    border: 'rgba(201, 169, 110, 0.5)',
    bg: 'rgba(201, 169, 110, 0.1)',
    text: '#c9a96e',
    dot: '#c9a96e',
  } satisfies AgentNodeStyle,

  chief: {
    border: 'rgba(201, 169, 110, 0.4)',
    bg: 'rgba(201, 169, 110, 0.08)',
    text: '#c9a96e',
    dot: '#c9a96e',
  } satisfies AgentNodeStyle,

  specialist(index: number): AgentNodeStyle {
    const brightness = Math.max(0.35, 0.9 - index * 0.07);
    const alpha = Math.max(0.12, 0.45 - index * 0.04);
    return {
      border: `rgba(245, 245, 240, ${alpha * 0.45})`,
      bg: `rgba(245, 245, 240, ${alpha * 0.09})`,
      text: `rgba(245, 245, 240, ${brightness})`,
      dot: `rgba(245, 245, 240, ${alpha})`,
    };
  },

  teamA(index: number): AgentNodeStyle {
    const alpha = Math.max(0.25, 0.75 - index * 0.1);
    return {
      border: `rgba(245, 245, 240, ${alpha * 0.28})`,
      bg: 'rgba(245, 245, 240, 0.04)',
      text: `rgba(245, 245, 240, ${alpha})`,
      dot: `rgba(245, 245, 240, ${alpha})`,
    };
  },

  teamB(index: number): AgentNodeStyle {
    const alpha = Math.max(0.25, 0.75 - index * 0.1);
    return {
      border: `rgba(201, 169, 110, ${alpha * 0.42})`,
      bg: `rgba(201, 169, 110, ${alpha * 0.07})`,
      text: `rgba(201, 169, 110, ${alpha})`,
      dot: `rgba(201, 169, 110, ${alpha})`,
    };
  },
} as const;

/** Avatar / node fill gradient — chief gold, operator gold, specialists bright→dim white. */
export function getAgentMonoGradient(agentId: string, index: number): readonly [string, string] {
  if (agentId === 'decision_chair') {
    return ['rgba(201,169,110,0.38)', 'rgba(201,169,110,0.12)'];
  }
  if (agentId.startsWith('self_')) {
    return ['rgba(201,169,110,0.52)', 'rgba(201,169,110,0.18)'];
  }
  const t = Math.max(0.1, 0.38 - (index % 9) * 0.03);
  const t2 = Math.max(0.05, t * 0.5);
  return [`rgba(245,245,240,${t})`, `rgba(245,245,240,${t2})`];
}
