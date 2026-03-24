import { callClaude, parseJSON } from './claude';
import { AGENTS, getAgentById } from '../agents/prompts';
import type { AgentId, AgentConfig, AgentReport, SimulationPlan, DecisionObject, Citation } from '../agents/types';

export type SimulationSSEEvent =
  | { event: 'phase_start'; data: { phase: string; status: string } }
  | { event: 'plan_complete'; data: SimulationPlan }
  | { event: 'agent_complete'; data: AgentReport }
  | { event: 'consensus_update'; data: { proceed: number; delay: number; abandon: number; avg_confidence: number } }
  | { event: 'verdict_artifact'; data: DecisionObject }
  | { event: 'followup_suggestions'; data: string[] }
  | { event: 'complete'; data: { simulation_id: string } };

// ── Helpers ──────────────────────────────────────────────────

function specialistAgents(): AgentConfig[] {
  return AGENTS.filter((a) => a.id !== 'decision_chair');
}

function agentListForChair(): string {
  return specialistAgents()
    .map((a) => `- ${a.id}: ${a.name} (${a.role})`)
    .join('\n');
}

function calculateConsensus(reports: AgentReport[]): { proceed: number; delay: number; abandon: number; avg_confidence: number } {
  if (reports.length === 0) return { proceed: 0, delay: 0, abandon: 0, avg_confidence: 0 };
  const total = reports.length;
  const proceed = reports.filter((r) => r.position === 'proceed').length;
  const delay = reports.filter((r) => r.position === 'delay').length;
  const abandon = reports.filter((r) => r.position === 'abandon').length;
  const avg_confidence = Math.round((reports.reduce((sum, r) => sum + r.confidence, 0) / total) * 10) / 10;
  return {
    proceed: Math.round((proceed / total) * 100),
    delay: Math.round((delay / total) * 100),
    abandon: Math.round((abandon / total) * 100),
    avg_confidence,
  };
}

function summarizeReports(reports: AgentReport[]): string {
  const positions = { proceed: 0, delay: 0, abandon: 0 };
  for (const r of reports) {
    if (r.position in positions) positions[r.position as keyof typeof positions]++;
  }
  const topRisks = reports
    .filter((r) => r.risks_identified.length > 0)
    .map((r) => r.risks_identified[0])
    .slice(0, 2);
  return `Of ${reports.length} agents, ${positions.proceed} recommend proceed, ${positions.delay} recommend delay, ${positions.abandon} recommend abandon. Key risks: ${topRisks.join('; ') || 'none flagged yet'}.`;
}

async function callAgent(agent: AgentConfig, userMessage: string, maxTokens = 1024): Promise<AgentReport> {
  const raw = await callClaude({
    systemPrompt: agent.systemPrompt,
    userMessage,
    maxTokens,
  });
  console.log(`[${agent.id}] response: ${raw.length} chars`);
  const parsed = parseJSON<Partial<AgentReport>>(raw);
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    position: parsed.position || 'delay',
    confidence: parsed.confidence || 5,
    key_argument: parsed.key_argument || '',
    evidence: parsed.evidence || [],
    risks_identified: parsed.risks_identified || [],
    recommendation: parsed.recommendation || '',
  };
}

// ── Main Orchestrator ────────────────────────────────────────

export async function* runSimulation(question: string, engine: string): AsyncGenerator<SimulationSSEEvent> {
  const chair = getAgentById('decision_chair');
  const allReports: AgentReport[] = [];

  // ━━ ROUND 1 — PLANNING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  yield { event: 'phase_start', data: { phase: 'planning', status: 'active' } };

  let plan: SimulationPlan;
  try {
    const planRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: `QUESTION: ${question}\n\nENGINE: ${engine}\n\nDecompose this decision into 5-8 specific sub-tasks. For each task, assign the most relevant agent from this list:\n${agentListForChair()}\n\nReturn valid JSON only:\n{ "tasks": [{ "description": "...", "assigned_agent": "agent_id" }], "estimated_rounds": 10 }`,
    });
    console.log(`[decision_chair] plan: ${planRaw.length} chars`);
    plan = parseJSON<SimulationPlan>(planRaw);
    if (!plan.tasks || plan.tasks.length === 0) {
      throw new Error('Empty plan');
    }
  } catch (error) {
    console.error('Planning failed, using default plan:', error);
    const specialists = specialistAgents();
    plan = {
      tasks: specialists.slice(0, 6).map((a) => ({
        description: `Analyze "${question}" from the perspective of ${a.role}`,
        assigned_agent: a.id,
      })),
      estimated_rounds: 10,
    };
  }

  yield { event: 'plan_complete', data: plan };

  // ━━ ROUND 2-4 — DEEP ANALYSIS (5 agents, parallel) ━━━━━━━

  yield { event: 'phase_start', data: { phase: 'opening', status: 'active' } };

  // Get first 5 unique agents from plan
  const seenIds = new Set<AgentId>();
  const deepAgentTasks: { agent: AgentConfig; task: string }[] = [];
  for (const t of plan.tasks) {
    const agentId = t.assigned_agent as AgentId;
    if (seenIds.has(agentId) || agentId === 'decision_chair') continue;
    try {
      const agent = getAgentById(agentId);
      deepAgentTasks.push({ agent, task: t.description });
      seenIds.add(agentId);
    } catch {
      continue;
    }
    if (deepAgentTasks.length >= 5) break;
  }

  // Fill up to 5 if plan didn't have enough unique agents
  if (deepAgentTasks.length < 5) {
    for (const agent of specialistAgents()) {
      if (seenIds.has(agent.id)) continue;
      deepAgentTasks.push({ agent, task: `Analyze "${question}" from the perspective of ${agent.role}` });
      seenIds.add(agent.id);
      if (deepAgentTasks.length >= 5) break;
    }
  }

  const deepPromises = deepAgentTasks.map(({ agent, task }) =>
    callAgent(
      agent,
      `Question: ${question}\n\nYour task: ${task}\n\nAnalyze from your perspective as ${agent.role}. Be specific with data. Respond with valid JSON only.`,
    ).catch((err) => {
      console.error(`[${agent.id}] deep analysis failed:`, err);
      return null;
    }),
  );

  const deepResults = await Promise.allSettled(deepPromises);
  for (const result of deepResults) {
    if (result.status === 'fulfilled' && result.value) {
      allReports.push(result.value);
      yield { event: 'agent_complete', data: result.value };
    }
  }

  yield { event: 'consensus_update', data: calculateConsensus(allReports) };

  // ━━ ROUND 5 — QUICK TAKES (remaining agents, parallel) ━━━

  const quickAgents = specialistAgents().filter((a) => !seenIds.has(a.id));
  const summary = summarizeReports(allReports);

  const quickPromises = quickAgents.map((agent) =>
    callAgent(
      agent,
      `Question: ${question}\n\nOther agents have analyzed this. Here is a brief summary: ${summary}\n\nAs ${agent.role}, add your perspective in under 100 words. Focus on what others MISSED. Respond with valid JSON only.`,
      512,
    ).catch((err) => {
      console.error(`[${agent.id}] quick take failed:`, err);
      return null;
    }),
  );

  const quickResults = await Promise.allSettled(quickPromises);
  for (const result of quickResults) {
    if (result.status === 'fulfilled' && result.value) {
      allReports.push(result.value);
      yield { event: 'agent_complete', data: result.value };
    }
  }

  yield { event: 'consensus_update', data: calculateConsensus(allReports) };

  // ━━ ROUND 6-8 — ADVERSARIAL DEBATE ━━━━━━━━━━━━━━━━━━━━━━━

  yield { event: 'phase_start', data: { phase: 'adversarial', status: 'active' } };

  const reportSummaryForChair = allReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}"`)
    .join('\n');

  let debates: { challenger_id: AgentId; defender_id: AgentId; topic: string }[] = [];
  try {
    const debateRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: `Here are all 9 agent reports:\n${reportSummaryForChair}\n\nIdentify the 2 biggest disagreements. For each, name the challenger and defender. Return valid JSON only:\n{ "debates": [{ "challenger_id": "agent_id", "defender_id": "agent_id", "topic": "what they disagree on" }] }`,
    });
    console.log(`[decision_chair] debates: ${debateRaw.length} chars`);
    const parsed = parseJSON<{ debates: typeof debates }>(debateRaw);
    debates = (parsed.debates || []).slice(0, 2);
  } catch (error) {
    console.error('Debate pairing failed:', error);
  }

  for (const debate of debates) {
    let challengerAgent: AgentConfig;
    let defenderAgent: AgentConfig;
    try {
      challengerAgent = getAgentById(debate.challenger_id);
      defenderAgent = getAgentById(debate.defender_id);
    } catch {
      continue;
    }

    const defenderReport = allReports.find((r) => r.agent_id === debate.defender_id);
    const challengerReport = allReports.find((r) => r.agent_id === debate.challenger_id);

    // Challenger attacks
    try {
      const challengeReport = await callAgent(
        challengerAgent,
        `You said "${challengerReport?.key_argument || 'your position'}". The ${defenderAgent.name} said "${defenderReport?.key_argument || 'their position'}". The debate topic: ${debate.topic}. Challenge the defender's position directly. Respond with valid JSON only.`,
      );
      allReports.push(challengeReport);
      yield { event: 'agent_complete', data: challengeReport };
    } catch (err) {
      console.error(`[${debate.challenger_id}] challenge failed:`, err);
    }

    // Defender responds
    try {
      const defenseReport = await callAgent(
        defenderAgent,
        `The ${challengerAgent.name} challenged your position on: ${debate.topic}. Their argument: "${challengerReport?.key_argument || 'disagreement'}". Defend or update your position. If you changed your mind, say so. Respond with valid JSON only.`,
      );
      allReports.push(defenseReport);
      yield { event: 'agent_complete', data: defenseReport };
    } catch (err) {
      console.error(`[${debate.defender_id}] defense failed:`, err);
    }
  }

  yield { event: 'consensus_update', data: calculateConsensus(allReports) };

  // ━━ ROUND 9 — CONVERGENCE (all 9 specialists, parallel) ━━

  yield { event: 'phase_start', data: { phase: 'convergence', status: 'active' } };

  const finalReports: AgentReport[] = [];
  const convergencePromises = specialistAgents().map((agent) => {
    const lastReport = [...allReports].reverse().find((r) => r.agent_id === agent.id);
    return callAgent(
      agent,
      `The debate is concluding. Your original position was "${lastReport?.position || 'unknown'}" with confidence ${lastReport?.confidence || 5}. After hearing all arguments, declare your FINAL position. If you changed your mind, explain why in one sentence. Respond with valid JSON only.`,
      256,
    ).catch((err) => {
      console.error(`[${agent.id}] convergence failed:`, err);
      return null;
    });
  });

  const convergenceResults = await Promise.allSettled(convergencePromises);
  for (const result of convergenceResults) {
    if (result.status === 'fulfilled' && result.value) {
      finalReports.push(result.value);
      allReports.push(result.value);
      yield { event: 'agent_complete', data: result.value };
    }
  }

  yield { event: 'consensus_update', data: calculateConsensus(finalReports) };

  // ━━ ROUND 10 — VERDICT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  yield { event: 'phase_start', data: { phase: 'verdict', status: 'active' } };

  const finalSummary = finalReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}", risks=[${r.risks_identified.join(', ')}]`)
    .join('\n');

  try {
    const verdictRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: `QUESTION: ${question}\n\nFINAL AGENT POSITIONS:\n${finalSummary}\n\nFULL DEBATE HISTORY (${allReports.length} total reports across all rounds):\n${reportSummaryForChair}\n\nSynthesize ALL agent positions into a final Decision Object. Weight by confidence and evidence quality.\n\nRespond with valid JSON only:\n{\n  "recommendation": "proceed" | "proceed_with_conditions" | "delay" | "abandon",\n  "probability": 0-100,\n  "main_risk": "the single biggest risk",\n  "leverage_point": "the one thing that changes everything",\n  "next_action": "specific, actionable, doable this week",\n  "grade": "A" | "B+" | "B" | "C" | "D" | "F",\n  "grade_score": 0-100,\n  "citations": [{ "id": 1, "agent_id": "agent_id", "agent_name": "name", "claim": "specific claim", "confidence": 1-10 }]\n}`,
      maxTokens: 2048,
    });
    console.log(`[decision_chair] verdict: ${verdictRaw.length} chars`);
    const verdict = parseJSON<DecisionObject>(verdictRaw);
    yield { event: 'verdict_artifact', data: verdict };
  } catch (error) {
    console.error('Verdict synthesis failed:', error);
    // Emit a fallback verdict
    yield {
      event: 'verdict_artifact',
      data: {
        recommendation: 'delay',
        probability: 50,
        main_risk: 'Insufficient data to reach high-confidence decision',
        leverage_point: 'Gather more specific data on the key unknowns identified by agents',
        next_action: 'Review the individual agent reports and address their specific concerns',
        grade: 'C',
        grade_score: 55,
        citations: finalReports.slice(0, 3).map((r, i) => ({
          id: i + 1,
          agent_id: r.agent_id,
          agent_name: r.agent_name,
          claim: r.key_argument,
          confidence: r.confidence,
        })),
      },
    };
  }

  // Follow-up suggestions
  try {
    const followupRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: `Based on the analysis of "${question}", suggest 4 follow-up questions the user should explore next. Make them specific and actionable. Return a JSON array of strings only: ["question 1", "question 2", "question 3", "question 4"]`,
      maxTokens: 512,
    });
    console.log(`[decision_chair] followups: ${followupRaw.length} chars`);
    const followups = parseJSON<string[]>(followupRaw);
    yield { event: 'followup_suggestions', data: followups };
  } catch (error) {
    console.error('Follow-up generation failed:', error);
    yield { event: 'followup_suggestions', data: ['What are the key risks I should investigate further?', 'What would change this decision from delay to proceed?', 'What is the minimum viable test I can run this week?', 'Who should I talk to before making this decision?'] };
  }

  yield { event: 'complete', data: { simulation_id: `sim_${Date.now()}` } };
}
