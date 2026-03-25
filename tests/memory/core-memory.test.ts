import { describe, it, expect, beforeEach } from 'vitest';
import { clearMockData, setMockData } from '../mocks/supabase';
import { TEST_USER_ID, createTestFact, createTestSimulation } from '../helpers';

describe('Memory: Core Memory', () => {
  beforeEach(() => {
    clearMockData();
  });

  // TEST 6: loadMemoryForSimulation returns anonymous payload for no userId
  it('returns anonymous payload for undefined userId', async () => {
    const { loadMemoryForSimulation } = await import('@/lib/memory/core-memory');
    const result = await loadMemoryForSimulation(undefined, 'test question');

    expect(result.isReturningUser).toBe(false);
    expect(result.previousSimCount).toBe(0);
    expect(result.coreMemory.human).toContain('Anonymous');
  });

  // TEST 7: loadMemoryForSimulation returns data for returning user
  it('returns memory payload for user with data', async () => {
    setMockData('decision_profiles', [{
      user_id: TEST_USER_ID,
      profile_text: 'F&B entrepreneur in Seoul',
      key_facts: { industry: 'F&B', location: 'Seoul', risk_tolerance: 'moderate' },
    }]);
    setMockData('user_facts', [
      createTestFact({ content: 'Budget is $50K', category: 'financial' }),
      createTestFact({ content: 'Located in Gangnam', category: 'business_info' }),
    ]);
    setMockData('simulations', [
      createTestSimulation(),
    ]);
    setMockData('decision_opinions', []);
    setMockData('decision_observations', []);
    setMockData('knowledge_entities', []);
    setMockData('knowledge_relations', []);

    const { loadMemoryForSimulation } = await import('@/lib/memory/core-memory');
    const result = await loadMemoryForSimulation(TEST_USER_ID, 'Should I open a café?');

    expect(result).not.toBeNull();
    expect(result.coreMemory).toHaveProperty('human');
    expect(result.coreMemory).toHaveProperty('business');
    expect(result.coreMemory).toHaveProperty('preferences');
    expect(result.coreMemory).toHaveProperty('history');
  });

  // TEST 8: formatMemoryContext produces non-empty string with all sections
  it('formatMemoryContext includes all block labels', async () => {
    const { formatMemoryContext } = await import('@/lib/memory/core-memory');

    const formatted = formatMemoryContext({
      coreMemory: {
        human: 'F&B entrepreneur in Seoul',
        business: 'Café in Gangnam, $50K budget',
        preferences: 'Moderate risk tolerance',
        history: '"Open café?" → PROCEED (72%)',
      },
      relevantFacts: [createTestFact()],
      profile: null,
      previousSimCount: 1,
      isReturningUser: true,
      opinions: [],
      observations: [],
      graphContext: '',
    });

    expect(formatted).toContain('WHO:');
    expect(formatted).toContain('BUSINESS:');
    expect(formatted).toContain('HISTORY:');
    expect(formatted.length).toBeGreaterThan(100);
  });
});
