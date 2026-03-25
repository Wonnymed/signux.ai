import { describe, it, expect, beforeEach } from 'vitest';
import { setNextLLMResponseJSON, clearLLMCallLog } from '../mocks/llm';
import { createTestAgentReport } from '../helpers';

describe('Simulation: Confidence Heatmap', () => {
  beforeEach(() => {
    clearLLMCallLog();
  });

  // TEST 19: extractVerdictClaims returns graded claims
  it('returns claims with green/yellow/red grades', async () => {
    setNextLLMResponseJSON([
      {
        claim: 'Market growing at 12%',
        confidence_grade: 'green',
        confidence_score: 0.85,
        supporting_agents: ['base_rate_archivist', 'demand_signal_analyst'],
        contested_by: [],
        evidence_quality: 'strong',
        category: 'market',
      },
      {
        claim: 'Breakeven in 8 months',
        confidence_grade: 'red',
        confidence_score: 0.35,
        supporting_agents: ['unit_economics_auditor'],
        contested_by: ['scenario_planner'],
        evidence_quality: 'weak',
        category: 'financial',
      },
    ]);

    const { extractVerdictClaims } = await import('@/lib/simulation/confidence-heatmap');

    const reports = new Map([
      ['base_rate_archivist', createTestAgentReport('base_rate_archivist')],
      ['unit_economics_auditor', createTestAgentReport('unit_economics_auditor', { position: 'delay', confidence: 5 })],
    ]);

    const heatmap = await extractVerdictClaims(
      'Should I open a café?',
      { recommendation: 'proceed', probability: 72 },
      reports
    );

    expect(heatmap.total_claims).toBe(2);
    expect(heatmap.green_count).toBe(1);
    expect(heatmap.red_count).toBe(1);
    expect(heatmap.overall_confidence).toBeGreaterThan(0);
    expect(heatmap.overall_confidence).toBeLessThan(1);
  });
});
