/**
 * Model Tier System — Ink / Deep / Kraken
 *
 * Ink (Haiku):    Fast, cheap, daily chat. ~$0.01/message.
 * Deep (Sonnet):  Balanced, simulations + serious analysis. ~$0.03/message.
 * Kraken (Opus):  Premium, rare, most powerful reasoning. ~$0.15/message.
 */

export type ModelTier = 'ink' | 'deep' | 'kraken';

export type TierConfig = {
  tier: ModelTier;
  model: string;
  label: string;
  icon: string;
  maxTokens: number;
  costPerMessage: number;
  description: string;
};

export const TIER_CONFIGS: Record<ModelTier, TierConfig> = {
  ink: {
    tier: 'ink',
    model: 'claude-haiku-4-5-20251001',
    label: 'Ink',
    icon: '🖊',
    maxTokens: 1024,
    costPerMessage: 0.01,
    description: 'Fast and smart. Great for quick questions.',
  },
  deep: {
    tier: 'deep',
    model: 'claude-sonnet-4-20250514',
    label: 'Deep',
    icon: '🌊',
    maxTokens: 2048,
    costPerMessage: 0.03,
    description: 'Deeper analysis. Better reasoning and nuance.',
  },
  kraken: {
    tier: 'kraken',
    model: 'claude-opus-4-6',
    label: 'Kraken',
    icon: '🐙',
    maxTokens: 4096,
    costPerMessage: 0.15,
    description: 'The most powerful. For decisions that truly matter.',
  },
};

export type UserPlan = 'free' | 'pro' | 'max';

export function getAvailableTiers(plan: UserPlan): ModelTier[] {
  switch (plan) {
    case 'free': return ['ink'];
    case 'pro': return ['ink', 'deep'];
    case 'max': return ['ink', 'deep', 'kraken'];
    default: return ['ink'];
  }
}

export function getDefaultTier(plan: UserPlan): ModelTier {
  switch (plan) {
    case 'free': return 'ink';
    case 'pro': return 'deep';
    case 'max': return 'deep';
    default: return 'ink';
  }
}

export function canUseTier(
  plan: UserPlan,
  requestedTier: ModelTier,
  krakenBalance: number
): { allowed: boolean; reason?: string } {
  const available = getAvailableTiers(plan);

  if (!available.includes(requestedTier)) {
    return { allowed: false, reason: `${TIER_CONFIGS[requestedTier].label} requires ${requestedTier === 'deep' ? 'Pro' : 'Max'} plan.` };
  }

  if (requestedTier === 'kraken' && krakenBalance <= 0) {
    return { allowed: false, reason: 'No Kraken tokens remaining. Purchase more or wait for monthly grant.' };
  }

  return { allowed: true };
}

export function getModelForTier(tier: ModelTier): string {
  return TIER_CONFIGS[tier].model;
}
