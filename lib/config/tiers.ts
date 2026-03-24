export const TIERS = {
  free: {
    name: 'Free',
    agents: 10,
    model: 'claude-sonnet-4-20250514',
    maxSimsPerMonth: 1,
    features: ['10 specialist agents', 'Basic verdict', 'Single simulation'],
    advisorsAvailable: false,
    requiresAuth: false,
  },
  pro: {
    name: 'Pro',
    agents: 10,
    model: 'claude-sonnet-4-20250514',
    maxSimsPerMonth: 100,
    features: ['10 specialist agents', 'Deep analysis + self-refine', 'Full audit trail', 'Agent ELO tracking'],
    advisorsAvailable: false,
    selfRefine: true,
  },
  max: {
    name: 'Max',
    agents: 10,
    model: 'claude-sonnet-4-20250514',
    maxSimsPerMonth: -1,
    features: ['Everything in Pro', 'Crowd Wisdom advisors (+20)', 'Human intervention mid-sim', 'API access'],
    advisorsAvailable: true,
    selfRefine: true,
    hitl: true,
  },
} as const;

export type TierKey = keyof typeof TIERS;
