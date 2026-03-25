import { describe, it, expect, beforeEach } from 'vitest';
import { setMockData, clearMockData } from '../mocks/supabase';
import { setNextLLMResponse, clearLLMCallLog } from '../mocks/llm';
import { TEST_USER_ID, createTestFact, createTestSimulation } from '../helpers';

describe('Chat: Decision Chat', () => {
  beforeEach(() => {
    clearMockData();
    clearLLMCallLog();
  });

  // TEST 25: Chat returns response for any message
  it('chatWithMemory returns non-empty response', async () => {
    setMockData('user_facts', []);
    setMockData('decision_profiles', []);
    setMockData('simulations', []);
    setMockData('behavioral_profiles', []);
    setMockData('decision_experiences', []);
    setMockData('decision_opinions', []);
    setMockData('decision_observations', []);
    setMockData('knowledge_entities', []);
    setMockData('knowledge_relations', []);
    setMockData('chat_messages', []);
    setNextLLMResponse('Gangnam rent for F&B ranges ₩3-8M/month.');

    const { chatWithMemory } = await import('@/lib/chat/chat');
    const result = await chatWithMemory(TEST_USER_ID, 'How much is rent in Gangnam?', [], 'ink');

    expect(result.response).toBeTruthy();
    expect(result.response.length).toBeGreaterThan(10);
    expect(result.tier).toBe('ink');
  });

  // TEST 26: Chat includes disclaimer for investment questions
  it('includes disclaimer for investment domain', async () => {
    setMockData('user_facts', []);
    setMockData('decision_profiles', []);
    setMockData('simulations', []);
    setMockData('behavioral_profiles', []);
    setMockData('decision_experiences', []);
    setMockData('decision_opinions', []);
    setMockData('decision_observations', []);
    setMockData('knowledge_entities', []);
    setMockData('knowledge_relations', []);
    setMockData('chat_messages', []);
    setNextLLMResponse('Bitcoin is highly volatile. Consider DCA.');

    const { chatWithMemory } = await import('@/lib/chat/chat');
    const result = await chatWithMemory(TEST_USER_ID, 'Should I invest in Bitcoin?', [], 'ink');

    expect(result.disclaimer).toBeDefined();
    expect(result.disclaimer).toContain('not financial advice');
  });
});
