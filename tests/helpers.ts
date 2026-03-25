/**
 * Shared test helpers — factory functions for creating test data.
 */

export const TEST_USER_ID = 'test-user-001';
export const TEST_SIM_ID = 'test-sim-001';

export function createTestFact(overrides: Partial<any> = {}) {
  return {
    id: crypto.randomUUID(),
    user_id: TEST_USER_ID,
    content: 'Budget is $50K',
    category: 'financial',
    confidence: 0.85,
    evidence_count: 2,
    is_current: true,
    valid_from: '2026-01-01T00:00:00Z',
    valid_until: null,
    learned_at: '2026-01-15T00:00:00Z',
    expired_at: null,
    superseded_by: null,
    source_simulation: TEST_SIM_ID,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

export function createTestSimulation(overrides: Partial<any> = {}) {
  return {
    id: TEST_SIM_ID,
    user_id: TEST_USER_ID,
    question: 'Should I open a café in Gangnam?',
    engine: 'simulate',
    domain: 'business',
    status: 'complete',
    verdict: {
      recommendation: 'proceed',
      probability: 72,
      grade: 'B+',
      main_risk: 'Permit timeline',
      next_action: 'Apply for FDA permit',
      one_liner: 'Viable with proper permit strategy.',
    },
    debate: { agent_reports: {} },
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestExperience(overrides: Partial<any> = {}) {
  return {
    id: crypto.randomUUID(),
    user_id: TEST_USER_ID,
    simulation_id: TEST_SIM_ID,
    question: 'Should I open a café in Gangnam?',
    verdict_recommendation: 'proceed',
    verdict_probability: 72,
    verdict_summary: 'Viable with proper permit strategy.',
    key_risks: ['Permit timeline', 'High rent'],
    key_opportunities: ['Growing market', 'Low competition'],
    outcome_status: 'pending',
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

export function createTestProfile(overrides: Partial<any> = {}) {
  return {
    user_id: TEST_USER_ID,
    risk_tolerance: 0.5,
    speed_preference: 0.5,
    evidence_threshold: 0.5,
    optimism_bias: 0.5,
    detail_preference: 0.5,
    confidence_calibration: 0.5,
    inference_confidence: 0.0,
    user_overrides: {},
    ...overrides,
  };
}

export function createTestAgentReport(agentId: string, overrides: Partial<any> = {}) {
  return {
    agent_name: agentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    position: 'proceed',
    confidence: 7,
    key_argument: 'Market conditions are favorable.',
    evidence: [{ description: 'Market grew 12% in 2025', source: 'KOSIS' }],
    risks: [{ description: 'Permit timeline 3-6 months' }],
    ...overrides,
  };
}
