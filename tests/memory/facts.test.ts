import { describe, it, expect, beforeEach } from 'vitest';
import { setMockData, clearMockData } from '../mocks/supabase';
import { setNextLLMResponseJSON, clearLLMCallLog } from '../mocks/llm';
import { TEST_USER_ID, createTestFact } from '../helpers';

describe('Memory: Facts', () => {
  beforeEach(() => {
    clearMockData();
    clearLLMCallLog();
  });

  // TEST 1: WAL extracts budget from question
  it('parseQuestionForFacts extracts budget fact', async () => {
    setMockData('user_facts', []);
    setNextLLMResponseJSON([
      {
        action: 'ADD',
        fact: 'Budget is $50K',
        category: 'financial',
        confidence: 0.9,
        reason: 'directly stated in question',
      },
    ]);

    const { parseQuestionForFacts } = await import('@/lib/memory/facts');
    const actions = await parseQuestionForFacts(TEST_USER_ID, 'I have a $50K budget for my café');

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('ADD');
    expect(actions[0].category).toBe('financial');
    expect(actions[0].confidence).toBeGreaterThanOrEqual(0.7);
  });

  // TEST 2: WAL returns empty for questions with no facts
  it('parseQuestionForFacts returns empty for no-fact question', async () => {
    setMockData('user_facts', []);
    setNextLLMResponseJSON([]);

    const { parseQuestionForFacts } = await import('@/lib/memory/facts');
    const actions = await parseQuestionForFacts(TEST_USER_ID, 'What is the meaning of life?');

    expect(actions).toHaveLength(0);
  });

  // TEST 3: getUserFacts returns only current facts
  it('getUserFacts filters by is_current=true', async () => {
    setMockData('user_facts', [
      createTestFact({ content: 'Budget $50K', is_current: true }),
      createTestFact({ content: 'Budget $30K (old)', is_current: false }),
      createTestFact({ content: 'Location Gangnam', is_current: true }),
    ]);

    const { getUserFacts } = await import('@/lib/memory/facts');
    const facts = await getUserFacts(TEST_USER_ID);

    // Should only return is_current=true facts
    expect(facts.every((f: any) => f.is_current === true)).toBe(true);
  });
});
