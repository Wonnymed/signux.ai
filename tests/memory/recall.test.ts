import { describe, it, expect, beforeEach } from 'vitest';
import { clearMockData, setMockData } from '../mocks/supabase';
import { TEST_USER_ID, createTestFact } from '../helpers';

describe('Memory: Recall', () => {
  beforeEach(() => {
    clearMockData();
  });

  // TEST 9: scoreMemory produces score between 0 and 1
  it('scoreMemory returns value in [0, 1] range', async () => {
    const { scoreMemory } = await import('@/lib/memory/recall');

    const item = {
      id: 'test-item',
      network: 'world' as const,
      content: 'Budget is $50K',
      confidence: 0.85,
      learned_at: new Date().toISOString(),
      category: 'financial',
      rrf_score: 0,
      relevance_score: 0,
      recency_score: 0,
      importance_score: 0,
      final_score: 0,
    };

    const scored = scoreMemory(item, ['budget', '$50k']);

    expect(scored.final_score).toBeGreaterThanOrEqual(0);
    expect(scored.final_score).toBeLessThanOrEqual(1);
  });

  // TEST 10: getTopKMemories returns string for user with data
  it('getTopKMemories returns formatted context for user with facts', async () => {
    setMockData('user_facts', [
      createTestFact({ content: 'Budget is $50K', category: 'financial' }),
      createTestFact({ content: 'Target market: young professionals', category: 'business_info' }),
      createTestFact({ content: 'Located in Gangnam', category: 'business_info' }),
    ]);
    setMockData('decision_experiences', []);
    setMockData('decision_opinions', []);
    setMockData('decision_observations', []);

    const { getTopKMemories } = await import('@/lib/memory/recall');
    const result = await getTopKMemories(TEST_USER_ID, 'How much is my budget?', 5);

    expect(typeof result).toBe('string');
  });
});
