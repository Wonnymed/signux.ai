import { create } from 'zustand';
import type { TierType } from '@/lib/billing/tiers';
import { TOKEN_COSTS } from '@/lib/billing/tiers';

interface BillingState {
  // Current subscription
  tier: TierType;
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;

  // Loading
  loading: boolean;

  // Actions
  setBalance: (data: { tier: TierType; total: number; used: number; remaining: number }) => void;
  consumeTokens: (cost: number) => void;
  canAfford: (simType: 'deep' | 'kraken') => boolean;

  // Fetch from API
  fetchBalance: () => Promise<void>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  tier: 'free',
  tokensTotal: 1,
  tokensUsed: 0,
  tokensRemaining: 1,
  loading: false,

  setBalance: ({ tier, total, used, remaining }) =>
    set({ tier, tokensTotal: total, tokensUsed: used, tokensRemaining: remaining }),

  consumeTokens: (cost) =>
    set((s) => ({
      tokensUsed: s.tokensUsed + cost,
      tokensRemaining: Math.max(0, s.tokensRemaining - cost),
    })),

  canAfford: (simType) => {
    const cost = TOKEN_COSTS[simType];
    return get().tokensRemaining >= cost;
  },

  fetchBalance: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/billing/balance');
      if (!res.ok) return;
      const data = await res.json();
      set({
        tier: data.tier || 'free',
        tokensTotal: data.total ?? 1,
        tokensUsed: data.used ?? 0,
        tokensRemaining: data.remaining ?? 1,
      });
    } catch {
      // Silent — default to free/1 token
    } finally {
      set({ loading: false });
    }
  },
}));
