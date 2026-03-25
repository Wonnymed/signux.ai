import { describe, it, expect } from 'vitest';

describe('Chat: Model Tiers', () => {
  // TEST 20: Free plan can only use Ink
  it('free plan only allows ink tier', async () => {
    const { canUseTier } = await import('@/lib/chat/tiers');

    expect(canUseTier('free', 'ink', 0).allowed).toBe(true);
    expect(canUseTier('free', 'deep', 0).allowed).toBe(false);
    expect(canUseTier('free', 'kraken', 0).allowed).toBe(false);
  });

  // TEST 21: Pro plan can use Ink + Deep
  it('pro plan allows ink and deep', async () => {
    const { canUseTier } = await import('@/lib/chat/tiers');

    expect(canUseTier('pro', 'ink', 0).allowed).toBe(true);
    expect(canUseTier('pro', 'deep', 0).allowed).toBe(true);
    expect(canUseTier('pro', 'kraken', 0).allowed).toBe(false);
  });

  // TEST 22: Max plan with Kraken tokens can use all tiers
  it('max plan with tokens allows all tiers', async () => {
    const { canUseTier } = await import('@/lib/chat/tiers');

    expect(canUseTier('max', 'ink', 5).allowed).toBe(true);
    expect(canUseTier('max', 'deep', 5).allowed).toBe(true);
    expect(canUseTier('max', 'kraken', 5).allowed).toBe(true);
  });

  // TEST 23: Max plan WITHOUT Kraken tokens cannot use Kraken
  it('max plan without tokens blocks kraken', async () => {
    const { canUseTier } = await import('@/lib/chat/tiers');

    const result = canUseTier('max', 'kraken', 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No Kraken tokens');
  });

  // TEST 24: getModelForTier returns correct model strings
  it('maps tiers to correct model identifiers', async () => {
    const { getModelForTier } = await import('@/lib/chat/tiers');

    expect(getModelForTier('ink')).toContain('haiku');
    expect(getModelForTier('deep')).toContain('sonnet');
    expect(getModelForTier('kraken')).toContain('opus');
  });
});
