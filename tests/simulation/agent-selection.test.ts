import { describe, it, expect, beforeEach } from 'vitest';
import { setNextLLMResponseJSON, clearLLMCallLog } from '../mocks/llm';

describe('Simulation: Agent Selection', () => {
  beforeEach(() => {
    clearLLMCallLog();
  });

  // TEST 17: selectRelevantAgents returns 4-6 agents
  it('selects between 4-6 agents', async () => {
    setNextLLMResponseJSON({
      selected: [
        { agentId: 'base_rate_archivist', reason: 'Need market data', priority: 'critical' },
        { agentId: 'unit_economics_auditor', reason: 'Need cost analysis', priority: 'critical' },
        { agentId: 'regulatory_gatekeeper', reason: 'Korean F&B permits', priority: 'important' },
        { agentId: 'scenario_planner', reason: 'Risk scenarios needed', priority: 'supporting' },
        { agentId: 'intervention_optimizer', reason: 'Action plan', priority: 'supporting' },
      ],
      skipped: [
        { agentId: 'competitive_intel', reason: 'Not primary focus' },
      ],
    });

    const { selectRelevantAgents } = await import('@/lib/simulation/agent-selection');
    const result = await selectRelevantAgents('Should I open a café in Gangnam?', '');

    expect(result.selected.length).toBeGreaterThanOrEqual(4);
    expect(result.selected.length).toBeLessThanOrEqual(6);
    expect(result.tokensPerAgent).toBeGreaterThan(0);
  });

  // TEST 18: calculateAgentBudget gives more tokens with fewer agents
  it('gives more tokens per agent when fewer selected', async () => {
    const { calculateAgentBudget } = await import('@/lib/simulation/agent-selection');

    const budget4 = calculateAgentBudget(4);
    const budget6 = calculateAgentBudget(6);
    const budget10 = calculateAgentBudget(10);

    expect(budget4.maxTokens).toBeGreaterThan(budget6.maxTokens);
    expect(budget6.maxTokens).toBeGreaterThan(budget10.maxTokens);
  });
});
