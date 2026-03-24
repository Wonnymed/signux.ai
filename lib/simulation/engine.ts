import { callClaude, parseJSON } from './claude';
import { AGENTS, getAgentById } from '../agents/prompts';
import { generateAdvisorPersonas, runCrowdWisdom } from '../agents/advisors';
import { createKernel, type OctuxKernel } from './kernel';
import { createAudit, addRound, finalizeAudit, type SimulationAudit, type AuditRound } from './audit';
import { createInitialState, transitionPhase, addAgentReport, selectDebatePairs, recordHandoff, checkEarlyConsensus, type SimulationState } from './state';
import type { AdvisorPersona, AdvisorReport as CrowdAdvisorReport, CrowdWisdomResult } from '../agents/advisors';
import type { AgentId, AgentConfig, AgentReport, SimulationPlan, DecisionObject, Citation } from '../agents/types';

export type SimulationSSEEvent =
  | { event: 'phase_start'; data: { phase: string; status: string } }
  | { event: 'plan_complete'; data: SimulationPlan }
  | { event: 'agent_complete'; data: AgentReport }
  | { event: 'consensus_update'; data: { proceed: number; delay: number; abandon: number; avg_confidence: number } }
  | { event: 'verdict_artifact'; data: DecisionObject }
  | { event: 'followup_suggestions'; data: string[] }
  | { event: 'crowd_personas'; data: AdvisorPersona[] }
  | { event: 'crowd_advisor_complete'; data: CrowdAdvisorReport }
  | { event: 'crowd_complete'; data: CrowdWisdomResult }
  | { event: 'audit_complete'; data: SimulationAudit }
  | { event: 'state_summary'; data: any }
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

// ── AutoGen #9 — Termination Conditions ────────────────────

function shouldTerminate(reports: AgentReport[], kernel: OctuxKernel): boolean {
  if (reports.length < kernel.config.minAgentsForVerdict) return false;

  // Check convergence: if enough agents agree, we can skip remaining rounds
  const total = reports.length;
  const positions = { proceed: 0, delay: 0, abandon: 0 };
  for (const r of reports) {
    if (r.position in positions) positions[r.position as keyof typeof positions]++;
  }
  const maxAgreement = Math.max(positions.proceed, positions.delay, positions.abandon) / total;
  return maxAgreement >= kernel.config.convergenceThreshold;
}

// ── Audited callAgent wrapper ──────────────────────────────

async function callAgent(
  agent: AgentConfig,
  userMessage: string,
  maxTokens = 1024,
  audit?: SimulationAudit,
  roundNum?: number,
  phase?: string,
): Promise<AgentReport> {
  const start = Date.now();
  let success = true;
  let error: string | undefined;
  let raw: string;

  try {
    raw = await callClaude({
      systemPrompt: agent.systemPrompt,
      userMessage,
      maxTokens,
    });
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    if (audit && roundNum !== undefined && phase) {
      const latency = Date.now() - start;
      // Estimate tokens (rough: 4 chars ≈ 1 token)
      const inputTokens = Math.ceil((agent.systemPrompt.length + userMessage.length) / 4);
      const outputTokens = success ? Math.ceil((raw!?.length || 0) / 4) : 0;
      addRound(audit, {
        round: roundNum,
        phase,
        agent_id: agent.id,
        model: 'claude-sonnet-4-20250514',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latency,
        success,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`[${agent.id}] response: ${raw!.length} chars`);
  const parsed = parseJSON<Partial<AgentReport>>(raw!);
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

export async function* runSimulation(
  question: string,
  engine: string,
  options?: { enableCrowdWisdom?: boolean },
): AsyncGenerator<SimulationSSEEvent> {
  const kernel = createKernel();
  const simId = `sim_${Date.now()}`;
  const audit = createAudit(simId, question, engine);
  const state = createInitialState(simId, question, engine, 'free');

  // ━━ INPUT GUARDRAILS (OpenAI Agents SDK #8) ━━━━━━━━━━━━━━
  for (const filter of kernel.inputFilters) {
    const result = filter.run(question);
    if (!result.pass) {
      console.warn(`[guardrail:${filter.name}] blocked: ${result.reason}`);
      yield { event: 'phase_start', data: { phase: 'verdict', status: 'active' } };
      yield {
        event: 'verdict_artifact',
        data: {
          recommendation: 'abandon',
          probability: 0,
          main_risk: result.reason || 'Input validation failed',
          leverage_point: 'Rephrase your question',
          next_action: 'Submit a clearer, more specific question',
          grade: 'F',
          grade_score: 0,
          citations: [],
        },
      };
      finalizeAudit(audit);
      yield { event: 'audit_complete', data: audit };
      yield { event: 'complete', data: { simulation_id: simId } };
      return;
    }
  }

  const chair = getAgentById('decision_chair');
  const allReports: AgentReport[] = [];

  // ━━ ROUND 1 — PLANNING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  transitionPhase(state, 'planning');
  yield { event: 'phase_start', data: { phase: 'planning', status: 'active' } };

  let plan: SimulationPlan;
  try {
    const planStart = Date.now();
    const planPrompt = `QUESTION: ${question}\n\nENGINE: ${engine}\n\nDecompose this decision into 5-8 specific sub-tasks. For each task, assign the most relevant agent from this list:\n${agentListForChair()}\n\nReturn valid JSON only:\n{ "tasks": [{ "description": "...", "assigned_agent": "agent_id" }], "estimated_rounds": 10 }`;
    const planRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: planPrompt,
    });
    addRound(audit, {
      round: 1, phase: 'planning', agent_id: 'decision_chair',
      model: 'claude-sonnet-4-20250514',
      input_tokens: Math.ceil((chair.systemPrompt.length + planPrompt.length) / 4),
      output_tokens: Math.ceil(planRaw.length / 4),
      latency_ms: Date.now() - planStart, success: true,
      timestamp: new Date().toISOString(),
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

  state.plan = plan;
  yield { event: 'plan_complete', data: plan };

  // ━━ ROUND 2-4 — DEEP ANALYSIS (5 agents, parallel) ━━━━━━━

  transitionPhase(state, 'opening');
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
      kernel.config.maxTokensPerAgent,
      audit, 2, 'opening',
    ).catch((err) => {
      console.error(`[${agent.id}] deep analysis failed:`, err);
      return null;
    }),
  );

  const deepResults = await Promise.allSettled(deepPromises);
  for (const result of deepResults) {
    if (result.status === 'fulfilled' && result.value) {
      // Apply agent filters
      let report = result.value;
      let filtered = false;
      for (const filter of kernel.agentFilters) {
        const check = filter.run(report);
        if (!check.pass) { filtered = true; console.warn(`[filter:${filter.name}] rejected ${report.agent_id}: ${check.reason}`); break; }
        if (check.patched) report = check.patched;
      }
      if (!filtered) {
        allReports.push(report);
        addAgentReport(state, report);
        yield { event: 'agent_complete', data: report };
      }
    }
  }

  const deepConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'opening', ...deepConsensus });
  yield { event: 'consensus_update', data: deepConsensus };

  // ━━ ROUND 5 — QUICK TAKES (remaining agents, parallel) ━━━

  const quickAgents = specialistAgents().filter((a) => !seenIds.has(a.id));
  const summary = summarizeReports(allReports);

  // AutoGen #9: Check early termination before quick takes
  if (shouldTerminate(allReports, kernel)) {
    console.log('[autogen] early convergence detected after deep analysis — skipping quick takes');
  } else {
    transitionPhase(state, 'quick_takes');

    const quickPromises = quickAgents.map((agent) =>
      callAgent(
        agent,
        `Question: ${question}\n\nOther agents have analyzed this. Here is a brief summary: ${summary}\n\nAs ${agent.role}, add your perspective in under 100 words. Focus on what others MISSED. Respond with valid JSON only.`,
        512,
        audit, 5, 'opening',
      ).catch((err) => {
        console.error(`[${agent.id}] quick take failed:`, err);
        return null;
      }),
    );

    const quickResults = await Promise.allSettled(quickPromises);
    for (const result of quickResults) {
      if (result.status === 'fulfilled' && result.value) {
        let report = result.value;
        let filtered = false;
        for (const filter of kernel.agentFilters) {
          const check = filter.run(report);
          if (!check.pass) { filtered = true; console.warn(`[filter:${filter.name}] rejected ${report.agent_id}: ${check.reason}`); break; }
          if (check.patched) report = check.patched;
        }
        if (!filtered) {
          allReports.push(report);
          addAgentReport(state, report);
          yield { event: 'agent_complete', data: report };
        }
      }
    }
  }

  const quickConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'quick_takes', ...quickConsensus });
  yield { event: 'consensus_update', data: quickConsensus };

  // ━━ EARLY CONSENSUS CHECK (AutoGen #3 + LangGraph #2) ━━━━

  const reportSummaryForChair = allReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}"`)
    .join('\n');

  let finalReports: AgentReport[] = [];

  if (checkEarlyConsensus(state)) {
    console.log('[state] Early consensus detected — skipping adversarial + convergence (saves ~6-8 API calls)');
    // Use latest reports as final reports for verdict
    finalReports = Array.from(state.latest_reports.values());
    transitionPhase(state, 'verdict');
  } else {
    // ━━ ROUND 6-8 — ADVERSARIAL DEBATE (AutoGen #3 smart pairing) ━━

    transitionPhase(state, 'adversarial');
    yield { event: 'phase_start', data: { phase: 'adversarial', status: 'active' } };

    // AutoGen #3: Algorithmic pair selection based on disagreement scores
    const pairs = selectDebatePairs(state, 2);

    if (pairs.length === 0) {
      console.log('[state] Low disagreement (< 0.2) — skipping adversarial debate');
    } else {
      for (const pair of pairs) {
        let challengerAgent: AgentConfig;
        let defenderAgent: AgentConfig;
        try {
          challengerAgent = getAgentById(pair.challenger_id as AgentId);
          defenderAgent = getAgentById(pair.defender_id as AgentId);
        } catch {
          continue;
        }

        recordHandoff(state, pair.challenger_id, pair.defender_id, pair.topic, 7);

        const defenderReport = allReports.find((r) => r.agent_id === pair.defender_id);
        const challengerReport = allReports.find((r) => r.agent_id === pair.challenger_id);

        // Challenger attacks
        try {
          const challengeReport = await callAgent(
            challengerAgent,
            `Original question: ${question}\n\nYou said "${challengerReport?.key_argument || 'your position'}". The ${defenderAgent.name} said "${defenderReport?.key_argument || 'their position'}". The debate topic: ${pair.topic}. Challenge the defender's position directly. Respond with valid JSON only.`,
            kernel.config.maxTokensPerAgent,
            audit, 7, 'adversarial',
          );
          allReports.push(challengeReport);
          addAgentReport(state, challengeReport);
          yield { event: 'agent_complete', data: challengeReport };
        } catch (err) {
          console.error(`[${pair.challenger_id}] challenge failed:`, err);
        }

        // Defender responds
        try {
          const defenseReport = await callAgent(
            defenderAgent,
            `Original question: ${question}\n\nThe ${challengerAgent.name} challenged your position on: ${pair.topic}. Their argument: "${challengerReport?.key_argument || 'disagreement'}". Defend or update your position. If you changed your mind, say so. Respond with valid JSON only.`,
            kernel.config.maxTokensPerAgent,
            audit, 8, 'adversarial',
          );
          allReports.push(defenseReport);
          addAgentReport(state, defenseReport);
          yield { event: 'agent_complete', data: defenseReport };
        } catch (err) {
          console.error(`[${pair.defender_id}] defense failed:`, err);
        }
      }
    }

    const adversarialConsensus = calculateConsensus(allReports);
    state.consensus_history.push({ phase: 'adversarial', ...adversarialConsensus });
    yield { event: 'consensus_update', data: adversarialConsensus };

    // ━━ ROUND 9 — CONVERGENCE (all 10 specialists, parallel) ━━

    transitionPhase(state, 'convergence');
    yield { event: 'phase_start', data: { phase: 'convergence', status: 'active' } };

    const convergencePromises = specialistAgents().map((agent) => {
      const lastReport = [...allReports].reverse().find((r) => r.agent_id === agent.id);
      return callAgent(
        agent,
        `Original question: ${question}\n\nThe debate is concluding. Your original position was "${lastReport?.position || 'unknown'}" with confidence ${lastReport?.confidence || 5}. After hearing all arguments, declare your FINAL position. If you changed your mind, explain why in one sentence. Respond with valid JSON only.`,
        256,
        audit, 9, 'convergence',
      ).catch((err) => {
        console.error(`[${agent.id}] convergence failed:`, err);
        return null;
      });
    });

    const convergenceResults = await Promise.allSettled(convergencePromises);
    for (const result of convergenceResults) {
      if (result.status === 'fulfilled' && result.value) {
        let report = result.value;
        let filtered = false;
        for (const filter of kernel.agentFilters) {
          const check = filter.run(report);
          if (!check.pass) { filtered = true; break; }
          if (check.patched) report = check.patched;
        }
        if (!filtered) {
          finalReports.push(report);
          allReports.push(report);
          addAgentReport(state, report);
          yield { event: 'agent_complete', data: report };
        }
      }
    }

    const convergenceConsensus = calculateConsensus(finalReports);
    state.consensus_history.push({ phase: 'convergence', ...convergenceConsensus });
    yield { event: 'consensus_update', data: convergenceConsensus };

    transitionPhase(state, 'verdict');
  } // end of else (non-early-consensus path)

  // ━━ ROUND 10 — VERDICT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  yield { event: 'phase_start', data: { phase: 'verdict', status: 'active' } };

  // If early consensus skipped convergence, finalReports is already set from latest_reports
  const finalSummary = finalReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}", risks=[${r.risks_identified.join(', ')}]`)
    .join('\n');

  let verdict: DecisionObject;
  try {
    const verdictStart = Date.now();
    const verdictPrompt = `QUESTION: ${question}\n\nFINAL AGENT POSITIONS:\n${finalSummary}\n\nFULL DEBATE HISTORY (${allReports.length} total reports across all rounds):\n${reportSummaryForChair}\n\nSynthesize ALL agent positions into a final Decision Object. Weight by confidence and evidence quality.\n\nRespond with valid JSON only:\n{\n  "recommendation": "proceed" | "proceed_with_conditions" | "delay" | "abandon",\n  "probability": 0-100,\n  "main_risk": "the single biggest risk",\n  "leverage_point": "the one thing that changes everything",\n  "next_action": "specific, actionable, doable this week",\n  "grade": "A" | "B+" | "B" | "C" | "D" | "F",\n  "grade_score": 0-100,\n  "citations": [{ "id": 1, "agent_id": "agent_id", "agent_name": "name", "claim": "specific claim", "confidence": 1-10 }]\n}`;
    const verdictRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: verdictPrompt,
      maxTokens: 2048,
    });
    addRound(audit, {
      round: 10, phase: 'verdict', agent_id: 'decision_chair',
      model: 'claude-sonnet-4-20250514',
      input_tokens: Math.ceil((chair.systemPrompt.length + verdictPrompt.length) / 4),
      output_tokens: Math.ceil(verdictRaw.length / 4),
      latency_ms: Date.now() - verdictStart, success: true,
      timestamp: new Date().toISOString(),
    });
    console.log(`[decision_chair] verdict: ${verdictRaw.length} chars`);
    verdict = parseJSON<DecisionObject>(verdictRaw);
  } catch (error) {
    console.error('Verdict synthesis failed:', error);
    verdict = {
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
    };
  }

  // Apply output filters (Semantic Kernel #19)
  for (const filter of kernel.outputFilters) {
    const check = filter.run(verdict);
    if (check.patched) {
      console.log(`[filter:${filter.name}] patched verdict: ${check.reason}`);
      verdict = check.patched;
    }
  }

  state.verdict = verdict;
  yield { event: 'verdict_artifact', data: verdict };

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

  // ━━ CROWD WISDOM PHASE (optional, MAX tier only) ━━━━━━━━━━

  if (options?.enableCrowdWisdom) {
    transitionPhase(state, 'crowd_wisdom');
    yield { event: 'phase_start', data: { phase: 'crowd_wisdom', status: 'active' } };

    try {
      // Step 1: Generate 20 contextual personas
      console.log('[crowd_wisdom] generating personas...');
      const personas = await generateAdvisorPersonas(question);
      yield { event: 'crowd_personas', data: personas };

      // Step 2: Build verdict summary for advisor context
      const verdictSummary = `The 10 specialist agents recommend "${verdict.recommendation}" with ${verdict.probability}% probability. Main risk: ${verdict.main_risk}. Suggested next action: ${verdict.next_action}`;

      // Step 3: Run all 20 advisors in parallel
      console.log('[crowd_wisdom] running', personas.length, 'advisors...');
      const crowdResult = await runCrowdWisdom(question, personas, verdictSummary);

      // Step 4: Stream individual advisor results for progressive UI
      for (const advisor of crowdResult.advisors) {
        yield { event: 'crowd_advisor_complete', data: advisor };
      }

      // Step 5: Final crowd result with sentiment + key insight
      yield { event: 'crowd_complete', data: crowdResult };
      console.log(`[crowd_wisdom] complete: ${crowdResult.advisors.length} advisors, quality=${crowdResult.quality_score}/100, ${crowdResult.audit_trail.duration_ms}ms`);
    } catch (error) {
      console.error('[crowd_wisdom] failed:', error);
      // Non-fatal — crowd wisdom failure doesn't break the simulation
    }
  }

  // ━━ FINALIZE AUDIT (Palantir #4) ━━━━━━━━━━━━━━━━━━━━━━━━━
  finalizeAudit(audit);
  console.log(`[audit] ${audit.rounds.length} calls, ${audit.total_input_tokens}+${audit.total_output_tokens} tokens, $${audit.total_cost_usd.toFixed(4)}, ${audit.total_duration_ms}ms`);
  yield { event: 'audit_complete', data: audit };

  // ━━ STATE SUMMARY (LangGraph #2) ━━━━━━━━━━━━━━━━━━━━━━━━━
  transitionPhase(state, 'complete');
  yield { event: 'state_summary', data: {
    phases_completed: state.phase_history.filter((p) => p.completed_at).length,
    phases_skipped: state.phase_history.filter((p) => p.skipped).length,
    total_agent_reports: Array.from(state.agent_reports.values()).reduce((sum, reports) => sum + reports.length, 0),
    unique_agents: state.latest_reports.size,
    debate_pairs: state.debate_pairs.length,
    debate_intensity: state.debate_pairs.map((p) => ({ agents: `${p.challenger_id} vs ${p.defender_id}`, intensity: p.intensity.toFixed(2) })),
    handoffs: state.handoffs.length,
    early_consensus: !state.phase_history.some((p) => p.phase === 'adversarial' && p.completed_at && !p.skipped),
    consensus_history: state.consensus_history,
  } };

  yield { event: 'complete', data: { simulation_id: simId } };
}
