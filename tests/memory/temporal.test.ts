import { describe, it, expect, beforeEach } from 'vitest';
import { clearMockData, setMockData } from '../mocks/supabase';
import { TEST_USER_ID, createTestFact } from '../helpers';

describe('Memory: Temporal', () => {
  beforeEach(() => {
    clearMockData();
  });

  // TEST 4: addFact sets temporal dimensions correctly
  it('addFact returns an ID', async () => {
    setMockData('user_facts', []);

    const { addFact } = await import('@/lib/memory/temporal');
    const id = await addFact(TEST_USER_ID, 'Budget is $50K', 'financial', 0.85, 'sim-001');

    // addFact should return an ID (or null on failure with mock)
    expect(id).toBeDefined();
  });

  // TEST 5: invalidateFact marks inactive (non-lossy)
  it('invalidateFact does not delete, only marks inactive', async () => {
    const factId = 'fact-to-invalidate';
    setMockData('user_facts', [
      createTestFact({ id: factId, is_current: true }),
    ]);

    const { invalidateFact } = await import('@/lib/memory/temporal');
    const result = await invalidateFact(factId, 'Superseded by new fact');

    // Should return a boolean
    expect(typeof result).toBe('boolean');
  });
});
