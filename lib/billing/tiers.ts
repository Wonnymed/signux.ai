export type TierType = 'free' | 'pro' | 'max' | 'octopus';

export interface TierConfig {
  id: TierType;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  tagline: string;
  stripePriceId?: string;
  features: TierFeature[];
  limits: TierLimits;
  popular?: boolean;
  color: string;
}

export interface TierFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface TierLimits {
  tokensPerMonth: number;
  inkChatsPerDay: number;
  memoryDays: number;
  webSearch: boolean;
  heatmap: boolean;
  citations: boolean;
  pdfExport: boolean;
  agentChat: boolean;
  boardroomReport: boolean;
  apiAccess: boolean;
  customAgents: boolean;
}

// ═══ TOKEN COSTS ═══

export const TOKEN_COSTS = {
  deep: 1,
  kraken: 8,
} as const;

// ═══ TIER DEFINITIONS ═══

export const TIERS: Record<TierType, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    description: 'Your first decision, on us',
    tagline: 'Experience the full power of 10 AI specialists',
    color: 'text-txt-secondary',
    limits: {
      tokensPerMonth: 1,
      inkChatsPerDay: 5,
      memoryDays: 7,
      webSearch: false,
      heatmap: false,
      citations: false,
      pdfExport: false,
      agentChat: false,
      boardroomReport: false,
      apiAccess: false,
      customAgents: false,
    },
    features: [
      { text: '1 simulation token/month', included: true, highlight: true },
      { text: '5 Ink chats/day', included: true },
      { text: 'Full verdict with probability', included: true },
      { text: '7-day memory', included: true },
      { text: 'Citations & agent chat', included: false },
      { text: 'Web search & heatmap', included: false },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    description: 'For serious decisions',
    tagline: '8 tokens — simulate, debate, decide with confidence',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    popular: true,
    color: 'text-accent',
    limits: {
      tokensPerMonth: 8,
      inkChatsPerDay: -1,
      memoryDays: 90,
      webSearch: false,
      heatmap: false,
      citations: true,
      pdfExport: false,
      agentChat: true,
      boardroomReport: true,
      apiAccess: false,
      customAgents: false,
    },
    features: [
      { text: '8 tokens/month (1 Deep = 1 token)', included: true, highlight: true },
      { text: 'Unlimited Ink chat', included: true },
      { text: 'Full verdicts + citations', included: true },
      { text: 'Agent chat', included: true },
      { text: '90-day memory', included: true },
      { text: 'Boardroom reports', included: true },
    ],
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 99,
    priceLabel: '$99',
    period: '/month',
    description: 'Full power',
    tagline: '25 tokens — every feature, no limits on depth',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID,
    color: 'text-tier-max',
    limits: {
      tokensPerMonth: 25,
      inkChatsPerDay: -1,
      memoryDays: -1,
      webSearch: true,
      heatmap: true,
      citations: true,
      pdfExport: true,
      agentChat: true,
      boardroomReport: true,
      apiAccess: false,
      customAgents: false,
    },
    features: [
      { text: '25 tokens/month (1 Kraken = 8 tokens)', included: true, highlight: true },
      { text: 'Unlimited Ink chat', included: true },
      { text: 'Web search + heatmap', included: true },
      { text: 'Permanent memory', included: true },
      { text: 'PDF export + boardroom reports', included: true },
      { text: 'All analysis features', included: true },
    ],
  },
  octopus: {
    id: 'octopus',
    name: 'Octopus',
    price: 249,
    priceLabel: '$249',
    period: '/month',
    description: 'For power users & teams',
    tagline: '70 tokens — API access, custom agents, unlimited depth',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_OCTOPUS_PRICE_ID,
    color: 'text-entity-bioluminescent',
    limits: {
      tokensPerMonth: 70,
      inkChatsPerDay: -1,
      memoryDays: -1,
      webSearch: true,
      heatmap: true,
      citations: true,
      pdfExport: true,
      agentChat: true,
      boardroomReport: true,
      apiAccess: true,
      customAgents: true,
    },
    features: [
      { text: '70 tokens/month', included: true, highlight: true },
      { text: 'All features unlocked', included: true },
      { text: 'API access', included: true },
      { text: 'Custom agents', included: true },
      { text: 'Priority support', included: true },
      { text: 'Permanent memory', included: true },
    ],
  },
};

// ═══ HELPERS ═══

export function getTierConfig(tier: TierType): TierConfig {
  return TIERS[tier] || TIERS.free;
}

export function getTierByPrice(priceId: string): TierType {
  for (const [key, config] of Object.entries(TIERS)) {
    if (config.stripePriceId === priceId) return key as TierType;
  }
  return 'free';
}

export function getNextTier(current: TierType): TierType | null {
  const order: TierType[] = ['free', 'pro', 'max', 'octopus'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export function getTokenCost(simType: 'deep' | 'kraken'): number {
  return TOKEN_COSTS[simType];
}

export function canAffordSim(tokensRemaining: number, simType: 'deep' | 'kraken'): boolean {
  return tokensRemaining >= TOKEN_COSTS[simType];
}
