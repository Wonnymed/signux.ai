import { describe, it, expect } from 'vitest';
import { getTokenCost } from '@/lib/billing/token-costs';

describe('token costs (orchestrator v2)', () => {
  it('compare is 3 tokens', () => {
    expect(getTokenCost('compare')).toBe(3);
  });

  it('specialist and stress/premortem are 1 token', () => {
    expect(getTokenCost('specialist')).toBe(1);
    expect(getTokenCost('stress_test')).toBe(1);
    expect(getTokenCost('premortem')).toBe(1);
    expect(getTokenCost('swarm')).toBe(1);
  });
});
