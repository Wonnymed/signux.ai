import type { SimulationSSEEvent } from './engine';

/* ═══════════════════════════════════════
   Mock simulation — ~8-10s total
   Used when ANTHROPIC_API_KEY is not set
   ═══════════════════════════════════════ */

export async function* runMockSimulation(question: string, _engine: string): AsyncGenerator<SimulationSSEEvent> {
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // ── 1. Planning phase ──
  yield { event: 'phase_start', data: { phase: 'planning', status: 'active' } };
  await wait(1000);

  // ── 2. Plan complete ──
  yield {
    event: 'plan_complete',
    data: {
      tasks: [
        { description: 'Analyze market data', assigned_agent: 'demand_signal_analyst' as const },
        { description: 'Check historical rates', assigned_agent: 'base_rate_archivist' as const },
        { description: 'Evaluate unit economics', assigned_agent: 'unit_economics_auditor' as const },
        { description: 'Assess regulatory risk', assigned_agent: 'regulatory_gatekeeper' as const },
        { description: 'Map competition', assigned_agent: 'competitive_intel' as const },
      ],
      estimated_rounds: 10,
    },
  };
  await wait(500);

  // ── 3. Opening phase ──
  yield { event: 'phase_start', data: { phase: 'opening', status: 'active' } };
  await wait(500);

  // ── 4. Agent reports ──
  const agents = [
    {
      agent_id: 'base_rate_archivist' as const,
      agent_name: 'Base Rate Archivist',
      position: 'delay' as const,
      confidence: 8,
      key_argument:
        'Historical data shows 42% failure rate in F&B within the first year. The base rate for success in Gangnam specifically is even lower at 35% due to high rent and turnover.',
      evidence: ['42% F&B failure rate in year 1', '35% success rate in Gangnam district'],
      risks_identified: ['High base rate of failure for this business category'],
      recommendation: 'Delay until you have validated demand with a pop-up test.',
    },
    {
      agent_id: 'demand_signal_analyst' as const,
      agent_name: 'Demand Signal Analyst',
      position: 'proceed' as const,
      confidence: 7,
      key_argument:
        'Target segment is growing 15% YoY with underserved demand in the 25-35 demographic. Delivery-first models are outperforming dine-in by 2.3x in the district.',
      evidence: ['15% YoY growth in target segment', 'Delivery-first outperforms dine-in 2.3x'],
      risks_identified: ['Assumed demand not yet validated with real customer data'],
      recommendation: 'Proceed with a delivery-first MVP to validate demand signals.',
    },
    {
      agent_id: 'unit_economics_auditor' as const,
      agent_name: 'Unit Economics Auditor',
      position: 'proceed' as const,
      confidence: 6,
      key_argument:
        'Unit economics are marginal but viable — 62% gross margin with the proposed menu, but breakeven requires 85% of projected volume. Tight but achievable.',
      evidence: ['62% gross margin estimate', 'Breakeven at 85% of projected volume'],
      risks_identified: ['Thin margin for error on volume projections'],
      recommendation: 'Proceed but build in a 20% cost buffer.',
    },
    {
      agent_id: 'regulatory_gatekeeper' as const,
      agent_name: 'Regulatory Gatekeeper',
      position: 'delay' as const,
      confidence: 9,
      key_argument:
        'Permit process in Gangnam-gu takes 3-6 months. Starting lease payments before permits are secured creates a cash burn window of ₩15-30M with zero revenue.',
      evidence: ['3-6 month permit timeline in Gangnam-gu', '₩15-30M cash burn risk during permit wait'],
      risks_identified: ['Regulatory delay could exhaust runway before opening'],
      recommendation: 'Secure permits before signing any lease agreement.',
    },
  ];

  for (const agent of agents) {
    yield { event: 'agent_complete', data: agent };
    await wait(800);
  }

  // ── 5. Adversarial phase ──
  yield { event: 'phase_start', data: { phase: 'adversarial', status: 'active' } };
  await wait(1000);

  // ── 6. Consensus update ──
  yield {
    event: 'consensus_update',
    data: { proceed: 70, delay: 20, abandon: 10, avg_confidence: 7.2 },
  };
  await wait(1500);

  // ── 7. Convergence phase ──
  yield { event: 'phase_start', data: { phase: 'convergence', status: 'active' } };
  await wait(1000);

  // ── 8. Verdict phase ──
  yield { event: 'phase_start', data: { phase: 'verdict', status: 'active' } };
  await wait(500);

  // ── 9. Verdict artifact ──
  yield {
    event: 'verdict_artifact',
    data: {
      recommendation: 'proceed_with_conditions',
      probability: 67,
      main_risk: 'Regulatory timeline uncertainty',
      leverage_point: 'Secure permits before signing lease',
      next_action: 'Apply for food service permit this week',
      grade: 'B+',
      grade_score: 82,
      citations: [
        { id: 1, agent_id: 'base_rate_archivist' as const, agent_name: 'Base Rate Archivist', claim: '42% failure rate in F&B first year', confidence: 8 },
        { id: 2, agent_id: 'regulatory_gatekeeper' as const, agent_name: 'Regulatory Gatekeeper', claim: 'Permit process takes 3-6 months in Gangnam', confidence: 9 },
        { id: 3, agent_id: 'demand_signal_analyst' as const, agent_name: 'Demand Signal Analyst', claim: 'Market growing 15% YoY in target segment', confidence: 7 },
      ],
    },
  };
  await wait(500);

  // ── 10. Follow-up suggestions ──
  yield {
    event: 'followup_suggestions',
    data: [
      'What if I start with a pop-up first?',
      'Which permits do I need first?',
      'How does the analysis change with 2x budget?',
      'Who are my top 3 competitors?',
    ],
  };
  await wait(300);

  // ── 11. Complete ──
  yield { event: 'complete', data: { simulation_id: 'sim_mock_001' } };
}
