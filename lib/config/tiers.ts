export const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Sonnet',
  'claude-haiku-4-5-20251001': 'Haiku',
  'claude-opus-4-6': 'Opus',
};

export function getModelLabel(modelId: string): string {
  return MODEL_LABELS[modelId] || modelId;
}

// ── Tier Types ──────────────────────────────────────────────

export type TierName = 'free' | 'pro' | 'max' | 'octopus';

export type TierConfig = {
  name: string;
  displayName: string;
  price: number;
  limits: {
    simsPerMonth: number;
    simsPerWeek: number;
    maxSimsBeforeAuth: number;
  };
  features: {
    specialists: number;
    fieldIntelligence: boolean;
    maxAdvisors: number;
    advisorOptions: number[];
    selfRefine: boolean;
    hitl: boolean;
    counterFactual: boolean;
    blindSpotDetector: boolean;
  };
};

// ── Tier Definitions ────────────────────────────────────────

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    limits: {
      simsPerMonth: 2,
      simsPerWeek: 1,
      maxSimsBeforeAuth: 1,
    },
    features: {
      specialists: 10,
      fieldIntelligence: false,
      maxAdvisors: 0,
      advisorOptions: [],
      selfRefine: true,
      hitl: false,
      counterFactual: true,
      blindSpotDetector: true,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 29,
    limits: {
      simsPerMonth: 16,
      simsPerWeek: 4,
      maxSimsBeforeAuth: 0,
    },
    features: {
      specialists: 10,
      fieldIntelligence: true,
      maxAdvisors: 20,
      advisorOptions: [20],
      selfRefine: true,
      hitl: false,
      counterFactual: true,
      blindSpotDetector: true,
    },
  },
  max: {
    name: 'max',
    displayName: 'Max',
    price: 99,
    limits: {
      simsPerMonth: 40,
      simsPerWeek: 10,
      maxSimsBeforeAuth: 0,
    },
    features: {
      specialists: 10,
      fieldIntelligence: true,
      maxAdvisors: 50,
      advisorOptions: [20, 50],
      selfRefine: true,
      hitl: true,
      counterFactual: true,
      blindSpotDetector: true,
    },
  },
  octopus: {
    name: 'octopus',
    displayName: 'Octopus',
    price: 249,
    limits: {
      simsPerMonth: 120,
      simsPerWeek: 40,
      maxSimsBeforeAuth: 0,
    },
    features: {
      specialists: 10,
      fieldIntelligence: true,
      maxAdvisors: 100,
      advisorOptions: [20, 50, 100],
      selfRefine: true,
      hitl: true,
      counterFactual: true,
      blindSpotDetector: true,
    },
  },
};

// ── Advisor Options (for UI selector) ───────────────────────

export const ADVISOR_OPTIONS = [
  { count: 20, label: '+ 20 Field Researchers', tier: 'pro' as TierName },
  { count: 50, label: '+ 50 Field Researchers', tier: 'max' as TierName },
  { count: 100, label: '+ 100 Field Researchers', tier: 'octopus' as TierName },
] as const;

// ── Helpers ─────────────────────────────────────────────────

export function canRunSimulation(
  tier: TierName,
  simsThisMonth: number,
  simsThisWeek: number,
  advisorCount: number
): { allowed: boolean; reason?: string } {
  const config = TIERS[tier];

  if (config.limits.simsPerMonth > 0 && simsThisMonth >= config.limits.simsPerMonth) {
    return { allowed: false, reason: `Monthly limit reached (${config.limits.simsPerMonth} sims). Upgrade for more.` };
  }

  if (config.limits.simsPerWeek > 0 && simsThisWeek >= config.limits.simsPerWeek) {
    return { allowed: false, reason: `Weekly limit reached (${config.limits.simsPerWeek}/week). Try again next week or upgrade.` };
  }

  if (advisorCount > 0 && !config.features.fieldIntelligence) {
    return { allowed: false, reason: 'Field Intelligence requires Pro or higher.' };
  }

  if (advisorCount > config.features.maxAdvisors) {
    return { allowed: false, reason: `Your plan supports up to ${config.features.maxAdvisors} advisors. Upgrade for more.` };
  }

  if (advisorCount > 0 && !config.features.advisorOptions.includes(advisorCount)) {
    return { allowed: false, reason: `${advisorCount} advisors not available on ${config.displayName}. Available: ${config.features.advisorOptions.join(', ')}` };
  }

  return { allowed: true };
}

export function getUsageDisplay(
  tier: TierName,
  simsThisMonth: number
): { used: number; total: number; percentage: number; label: string } {
  const config = TIERS[tier];
  const total = config.limits.simsPerMonth;
  const percentage = total > 0 ? Math.round((simsThisMonth / total) * 100) : 0;
  return {
    used: simsThisMonth,
    total,
    percentage: Math.min(percentage, 100),
    label: `${simsThisMonth} / ${total} simulations this month`,
  };
}

export function getTierComparison(): { feature: string; free: string; pro: string; max: string; octopus: string }[] {
  return [
    { feature: 'Price', free: 'Free', pro: '$29/mo', max: '$99/mo', octopus: '$249/mo' },
    { feature: 'Simulations', free: '2/month', pro: '16/month', max: '40/month', octopus: '120/month' },
    { feature: 'Specialist Agents', free: '10', pro: '10', max: '10', octopus: '10' },
    { feature: 'Field Researchers', free: '\u2014', pro: 'Up to 20', max: 'Up to 50', octopus: 'Up to 100' },
    { feature: 'Self-Refine', free: '\u2713', pro: '\u2713', max: '\u2713', octopus: '\u2713' },
    { feature: 'Counter-Factual', free: '\u2713', pro: '\u2713', max: '\u2713', octopus: '\u2713' },
    { feature: 'Blind Spot Detector', free: '\u2713', pro: '\u2713', max: '\u2713', octopus: '\u2713' },
    { feature: 'Human Intervention', free: '\u2014', pro: '\u2014', max: '\u2713', octopus: '\u2713' },
    { feature: 'Marketing claim', free: '10 specialists', pro: '30 analysts', max: '60 analysts', octopus: '110 analysts' },
  ];
}
