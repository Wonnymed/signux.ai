import { callClaude, parseJSON, DEFAULT_MODEL } from './claude';
import { AGENTS, getAgentById } from '../agents/prompts';
import { generateAdvisorPersonas } from '../agents/advisors';
import { selectRelevantAdvisors, runFieldScan, formatFieldIntelligence, type FieldScan } from './field-intelligence';
import { createKernel, type OctuxKernel } from './kernel';
import { createAudit, addRound, finalizeAudit, type SimulationAudit, type AuditRound } from './audit';
import { createInitialState, transitionPhase, addAgentReport, selectDebatePairs, recordHandoff, type SimulationState } from './state';
import { buildCitations, type EnrichedCitation } from './citations';
import { scoreAllAgents, type AgentPerformance } from './performance';
import { critiqueVerdict, refineVerdict, type VerdictCritique } from './self-refine';
import { createTaskLedger, createProgressLedger, updateTaskLedger, assessProgress, replanDebate, type TaskLedger, type ProgressLedger } from './ledger';
import { processDelegations, type DelegationResponse } from './delegation';
import { generateCounterFactualFlip, detectBlindSpots, type CounterFactualFlip, type BlindSpotAnalysis } from './verdict-insights';
import { evaluateSimulation, type SimulationEval } from './evals';
import { saveSimulation } from '../memory/persistence';
import { extractAndSaveFacts, applyFactActions, parseQuestionForFacts } from '../memory/facts';
import { maybeRegenerateProfile } from '../memory/profile';
import { loadMemoryForSimulation, formatMemoryContext, formatAgentMemory, type MemoryPayload } from '../memory/core-memory';
import { saveExperience, getUserExperiences, formatExperiencesForContext } from '../memory/experiences';
import { cognify } from '../memory/knowledge-graph';
import { buildAllAgentKnowledge } from '../memory/agent-knowledge';
import { extractOpinionsAndObservations, applyOpinionActions, saveObservations, getUserOpinions, getUserObservations, formatOpinionsForContext, formatObservationsForContext } from '../memory/opinions';
import { getTopKMemories } from '../memory/recall';
import {
  getOrCreateThread,
  saveSessionSummary,
  accumulateThreadContext,
  saveToWorkingBuffer,
  clearWorkingBuffer,
} from '../memory/session';
import { reflectOnExperiences, shouldReflect } from '../memory/reflect';
import type { AdvisorPersona } from '../agents/advisors';
import type { AgentId, AgentConfig, AgentReport, SimulationPlan, DecisionObject, Citation } from '../agents/types';

export type SimulationSSEEvent =
  | { event: 'phase_start'; data: { phase: string; status: string } }
  | { event: 'round_start'; data: { round: number; title: string; description: string; total_rounds: number } }
  | { event: 'round_complete'; data: { round: number } }
  | { event: 'plan_complete'; data: SimulationPlan }
  | { event: 'agent_complete'; data: AgentReport }
  | { event: 'consensus_update'; data: { proceed: number; delay: number; abandon: number; avg_confidence: number } }
  | { event: 'verdict_artifact'; data: DecisionObject }
  | { event: 'followup_suggestions'; data: string[] }
  | { event: 'crowd_personas'; data: AdvisorPersona[] }
  | { event: 'field_scan'; data: FieldScan }
  | { event: 'audit_complete'; data: SimulationAudit }
  | { event: 'citations_enriched'; data: EnrichedCitation[] }
  | { event: 'agent_scores'; data: AgentPerformance[] }
  | { event: 'verdict_critique'; data: VerdictCritique }
  | { event: 'ledger_update'; data: { task_ledger: TaskLedger; progress_ledger: ProgressLedger } }
  | { event: 'stall_replan'; data: { stall_counter: number; directives: string[] } }
  | { event: 'delegation'; data: DelegationResponse }
  | { event: 'counter_factual'; data: CounterFactualFlip }
  | { event: 'blind_spots'; data: BlindSpotAnalysis }
  | { event: 'evaluation'; data: SimulationEval }
  | { event: 'memory_loaded'; data: { isReturningUser: boolean; factCount: number; hasProfile: boolean; previousSimCount: number; hasRecalledMemories: boolean; hasThreadHistory: boolean; threadId: string | null } }
  | { event: 'knowledge_graph_started'; data: { simulation_id: string } }
  | { event: 'reflect_triggered'; data: { sim_count: number } }
  | { event: 'state_summary'; data: any }
  | { event: 'complete'; data: { simulation_id: string } };

// ── Helpers ──────────────────────────────────────────────────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Snapshot current agent positions for working buffer. */
function getCurrentPositions(state: SimulationState): Record<string, string> {
  const positions: Record<string, string> = {};
  for (const [agentId, report] of state.latest_reports.entries()) {
    positions[agentId] = report.position || 'unknown';
  }
  return positions;
}

// Retry wrapper for rate-limited calls
async function callAgentWithRetry(
  agent: AgentConfig,
  userMessage: string,
  maxTokens: number,
  audit: SimulationAudit | undefined,
  roundNum: number,
  phase: string,
  retries = 2,
): Promise<AgentReport | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAgent(agent, userMessage, maxTokens, audit, roundNum, phase);
    } catch (err) {
      const isRateLimit = err instanceof Error && (err.message.includes('429') || err.message.includes('rate_limit'));
      if (isRateLimit && attempt < retries) {
        const backoff = 1000 * (attempt + 1);
        console.warn(`[${agent.id}] rate limited, retry ${attempt + 1}/${retries} after ${backoff}ms`);
        await wait(backoff);
        continue;
      }
      console.error(`[${agent.id}] failed after ${attempt + 1} attempts:`, err);
      return null;
    }
  }
  return null;
}

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

// ── AutoGen v2: Growing debate context ──────────────────────
// Each agent receives: debate history + their own previous positions + active conflicts

function buildDebateContext(
  state: SimulationState,
  currentAgentId: string,
  progressLedger?: ProgressLedger,
  chairDirectives?: string[],
  fieldScans?: FieldScan[],
  memory?: MemoryPayload,
  networkMemory?: string,
  agentKnowledge?: string,
): string {
  // Memory injection — FIRST in context so agents always see it
  let memorySection = '';
  if (memory && memory.isReturningUser) {
    memorySection = formatMemoryContext(memory);
    memorySection += formatAgentMemory(memory, currentAgentId);
    if (networkMemory) memorySection += networkMemory;
  }
  // Per-agent knowledge (MiroFish individual memory) — after shared, before debate
  if (agentKnowledge) {
    memorySection += agentKnowledge;
  }

  const reports = Array.from(state.latest_reports.entries());
  if (reports.length === 0) return memorySection + 'No other agents have reported yet. You are among the first to analyze this decision.';

  // Build summary of what other agents said (exclude current agent's own reports)
  const otherReports = reports
    .filter(([id]) => id !== currentAgentId)
    .map(([, report]) => `\u2022 ${report.agent_name} (${report.position.toUpperCase()}, ${report.confidence}/10): ${report.key_argument}`)
    .join('\n');

  // Current consensus
  const positions = { proceed: 0, delay: 0, abandon: 0 };
  reports.forEach(([, r]) => { if (r.position in positions) positions[r.position as keyof typeof positions]++; });
  const total = reports.length;
  const consensusSummary = `Current consensus: ${positions.proceed}/${total} proceed, ${positions.delay}/${total} delay, ${positions.abandon}/${total} abandon`;

  // Identify active conflicts
  const conflicts: string[] = [];
  if (positions.proceed > 0 && positions.delay > 0) {
    conflicts.push('ACTIVE CONFLICT: Some agents recommend proceeding while others recommend delay');
  }
  if (positions.proceed > 0 && positions.abandon > 0) {
    conflicts.push('MAJOR CONFLICT: Some agents recommend proceeding while others recommend abandoning');
  }
  if (positions.delay > 0 && positions.abandon > 0) {
    conflicts.push('CONFLICT: Disagreement between delay and abandon');
  }

  // Check if current agent already reported (for convergence round)
  const ownPreviousReports = state.agent_reports.get(currentAgentId) || [];
  let ownHistory = '';
  if (ownPreviousReports.length > 0) {
    const prev = ownPreviousReports[ownPreviousReports.length - 1];
    ownHistory = `\n\nYOUR PREVIOUS POSITION: ${prev.position.toUpperCase()} (${prev.confidence}/10) \u2014 "${prev.key_argument}"
Consider whether the debate has changed your view. If you changed your mind, explain WHY.`;
  }

  // Chair directive from Progress Ledger (stall detection / replan)
  let chairSection = '';
  if (progressLedger && !progressLedger.is_progressing) {
    chairSection += `\n\nCHAIR DIRECTIVE: The debate is stalling (${progressLedger.stall_counter} rounds without new arguments). ${progressLedger.next_focus}`;
  }
  if (chairDirectives && chairDirectives.length > 0) {
    chairSection += `\n\nFRESH ANGLES FROM CHAIR:\n${chairDirectives.map((d) => `\u2022 ${d}`).join('\n')}`;
  }

  // CrewAI #7: Include delegation data if any exists
  let delegationSection = '';
  if (state.delegations && state.delegations.length > 0) {
    const delegationText = state.delegations
      .map(d => `\u2022 [Data Request] ${d.request.requesting_agent} asked ${d.request.target_agent}: "${d.request.question}" \u2192 Response: ${d.response.substring(0, 150)}`)
      .join('\n');
    delegationSection = `\n\nDATA SHARED BETWEEN AGENTS:\n${delegationText}`;
  }

  // Field Intelligence: ground-level data from Haiku advisors
  const fieldSection = fieldScans ? formatFieldIntelligence(fieldScans) : '';

  return `${memorySection}DEBATE SO FAR:
${otherReports}

${consensusSummary}
${conflicts.length > 0 ? '\n' + conflicts.join('\n') : ''}${ownHistory}${chairSection}${delegationSection}${fieldSection}

IMPORTANT: React to what other agents said. If you agree with someone, say why. If you disagree, challenge their specific claim. Do NOT repeat what others already covered \u2014 add NEW information or challenge EXISTING arguments.`;
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
        model: DEFAULT_MODEL,
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
  let parsed: Partial<AgentReport>;
  try {
    parsed = parseJSON<Partial<AgentReport>>(raw!);
  } catch (parseErr) {
    console.warn(`[${agent.id}] JSON parse failed, extracting from raw text`);
    // Attempt to salvage partial data from truncated JSON
    const posMatch = raw!.match(/"position"\s*:\s*"(proceed|delay|abandon)"/);
    const confMatch = raw!.match(/"confidence"\s*:\s*(\d+)/);
    const argMatch = raw!.match(/"key_argument"\s*:\s*"([^"]{10,})"/);
    parsed = {
      position: (posMatch?.[1] as AgentReport['position']) || 'delay',
      confidence: confMatch ? Number(confMatch[1]) : 5,
      key_argument: argMatch?.[1] || raw!.substring(0, 200).replace(/[{}"]/g, '').trim() || `Analysis from ${agent.name}`,
    };
  }
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
  options?: { enableCrowdWisdom?: boolean; advisorGuidance?: string; advisorCount?: number; tier?: string; userId?: string; threadId?: string },
): AsyncGenerator<SimulationSSEEvent> {
  const kernel = createKernel();
  const simId = `sim_${Date.now()}`;
  const audit = createAudit(simId, question, engine);
  const state = createInitialState(simId, question, engine, options?.tier || 'free');

  // ═══ MEMORY: Load user context (Letta + Mem0 + Agno) ═══
  const memory = await loadMemoryForSimulation(options?.userId, question);

  if (memory.isReturningUser) {
    console.log(`[memory] Loaded: ${memory.relevantFacts.length} facts, profile: ${memory.profile ? 'yes' : 'no'}, sims: ${memory.previousSimCount}`);
  }

  // Load 4-network memory (Hindsight pattern)
  let networkMemoryText = '';
  if (options?.userId) {
    try {
      const [experiences, opinions, observations] = await Promise.all([
        getUserExperiences(options.userId, 5),
        getUserOpinions(options.userId, 8),
        getUserObservations(options.userId, 5),
      ]);

      networkMemoryText = [
        formatExperiencesForContext(experiences),
        formatOpinionsForContext(opinions),
        formatObservationsForContext(observations),
      ].filter(Boolean).join('\n');

      if (networkMemoryText) {
        console.log(`[memory:4net] ${experiences.length} experiences, ${opinions.length} opinions, ${observations.length} observations`);
      }
    } catch (err) {
      console.error('[memory:4net] Load failed (non-blocking):', err);
    }
  }

  // ═══ PER-AGENT KNOWLEDGE (MiroFish individual memory) ═══
  let agentKnowledgeMap = new Map<string, string>();
  if (options?.userId) {
    try {
      agentKnowledgeMap = await buildAllAgentKnowledge(options.userId);
      if (agentKnowledgeMap.size > 0) {
        console.log(`[memory:agent-knowledge] Loaded personalized context for ${agentKnowledgeMap.size} agents`);
      }
    } catch (err) {
      console.error('[memory:agent-knowledge] Load failed (non-blocking):', err);
    }
  }

  // ═══ MULTI-STRATEGY RECALL (Mem0 + RRF fusion) ═══
  let recalledMemoryText = '';
  if (options?.userId) {
    try {
      recalledMemoryText = await getTopKMemories(options.userId, question, 15);
      if (recalledMemoryText) {
        networkMemoryText = recalledMemoryText + (networkMemoryText ? '\n' + networkMemoryText : '');
        console.log(`[memory:recall] Multi-strategy recall loaded for question`);
      }
    } catch (err) {
      console.error('[memory:recall] Recall failed (non-blocking):', err);
    }
  }

  // ═══ SESSION THREAD CONTEXT (Agno per-thread memory) ═══
  let threadContext = '';
  let activeThreadId = '';
  if (options?.userId) {
    try {
      activeThreadId = await getOrCreateThread(
        options.userId,
        options.threadId || null,
        question
      );
      threadContext = await accumulateThreadContext(activeThreadId);
      if (threadContext) {
        networkMemoryText = networkMemoryText
          ? networkMemoryText + '\n' + threadContext
          : threadContext;
        console.log(`SESSION: Thread context loaded for thread ${activeThreadId}`);
      }
    } catch (err) {
      console.error('Session thread load failed (non-blocking):', err);
    }
  }

  // OpenClaw WAL: Parse question for facts BEFORE sim runs (Claude-powered)
  if (options?.userId) {
    try {
      const walFacts = await parseQuestionForFacts(options.userId, question);
      if (walFacts.length > 0) {
        await applyFactActions(options.userId, `wal_${simId}`, walFacts);
        console.log(`[memory:wal] Pre-extracted ${walFacts.length} facts from question`);
      }
    } catch (err) {
      console.error('[memory:wal] Extraction failed (non-blocking):', err);
    }
  }

  yield { event: 'memory_loaded', data: {
    isReturningUser: memory.isReturningUser,
    factCount: memory.relevantFacts.length,
    hasProfile: !!memory.profile,
    previousSimCount: memory.previousSimCount,
    hasRecalledMemories: !!recalledMemoryText,
    hasThreadHistory: !!threadContext,
    threadId: activeThreadId || null,
  }};

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

  // MagenticOne #9: Dual Ledger System
  let taskLedger = createTaskLedger();
  let progressLedger = createProgressLedger();
  let chairDirectives: string[] = [];

  // CrewAI #7: Delegations tracked on state.delegations

  // ━━ ROUND 1 — PLANNING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  transitionPhase(state, 'planning');
  yield { event: 'phase_start', data: { phase: 'planning', status: 'active' } };
  yield { event: 'round_start', data: { round: 1, title: 'Planning', description: 'Decision Chair decomposes your question into research tasks', total_rounds: 10 } };

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
      model: DEFAULT_MODEL,
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

  // Force ALL 10 specialists into the plan (Problem 1 fix)
  const allSpecialistIds = AGENTS.filter((a) => a.id !== 'decision_chair').map((a) => a.id);
  const assignedIds = new Set(plan.tasks.map((t) => t.assigned_agent));
  for (const id of allSpecialistIds) {
    if (!assignedIds.has(id)) {
      const agent = getAgentById(id);
      plan.tasks.push({
        description: `Analyze this decision from your perspective as ${agent.role}`,
        assigned_agent: id,
      });
    }
  }

  // Split into deep (first 5) and quick (remaining 5) — guaranteed 10 total
  const deepAgentIds = new Set<AgentId>();
  const deepAgentTasks: { agent: AgentConfig; task: string }[] = [];
  for (const t of plan.tasks) {
    const agentId = t.assigned_agent as AgentId;
    if (deepAgentIds.has(agentId) || agentId === 'decision_chair') continue;
    try {
      const agent = getAgentById(agentId);
      deepAgentTasks.push({ agent, task: t.description });
      deepAgentIds.add(agentId);
    } catch { continue; }
    if (deepAgentTasks.length >= 5) break;
  }
  const quickAgentTasks: { agent: AgentConfig; task: string }[] = [];
  for (const id of allSpecialistIds) {
    if (deepAgentIds.has(id)) continue;
    const agent = getAgentById(id);
    const planTask = plan.tasks.find((t) => t.assigned_agent === id);
    quickAgentTasks.push({ agent, task: planTask?.description || `Analyze this decision from your perspective as ${agent.role}` });
  }

  state.plan = plan;
  yield { event: 'plan_complete', data: plan };

  // Field Intelligence Network: generate advisor personas during planning (if enabled)
  let fieldPersonas: AdvisorPersona[] = [];
  const fieldScans: FieldScan[] = [];
  const queriedAdvisors = new Set<string>();

  if (options?.enableCrowdWisdom) {
    const advisorCount = options?.advisorCount || 20;
    console.log(`[field_intel] generating ${advisorCount} personas during planning...`);
    try {
      fieldPersonas = await generateAdvisorPersonas(question, options?.advisorGuidance, advisorCount);
      yield { event: 'crowd_personas', data: fieldPersonas };
      console.log(`[field_intel] ${fieldPersonas.length} field advisors ready`);
    } catch (err) {
      console.error('[field_intel] persona generation failed (non-fatal):', err);
    }
  }

  yield { event: 'round_complete', data: { round: 1 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 1, 'planning', `Chair planned ${plan.tasks?.length || 0} tasks across specialists`, 'decision_chair');

  // ━━ ROUND 2 — FIELD SCAN BATCH 1 + DEEP ANALYSIS WAVE 1 ━━━━

  transitionPhase(state, 'opening');
  yield { event: 'phase_start', data: { phase: 'opening', status: 'active' } };

  // Split 5 deep agents into 2 waves: [3, 2]
  const deepWave1 = deepAgentTasks.slice(0, 3);
  const deepWave2 = deepAgentTasks.slice(3, 5);

  // ━━ ROUND 2 — FIELD SCAN BATCH 1 (if crowd wisdom enabled) ━━

  if (fieldPersonas.length > 0) {
    const wave1AgentIds = deepWave1.map(d => d.agent.id);
    const batch1Advisors = selectRelevantAdvisors(fieldPersonas, wave1AgentIds, queriedAdvisors);

    if (batch1Advisors.length > 0) {
      yield { event: 'round_start', data: { round: 2, title: 'Field Scan — Batch 1', description: `${batch1Advisors.length} local voices providing ground-level intelligence`, total_rounds: 10 } };

      const focusArea = deepWave1.map(d => d.agent.role).join(', ');
      const scan1 = await runFieldScan(question, batch1Advisors, focusArea, 2);
      fieldScans.push(scan1);
      batch1Advisors.forEach(a => queriedAdvisors.add(a.id));

      yield { event: 'field_scan', data: scan1 };
      console.log(`[field_intel] Scan 1: ${scan1.insights.length} insights from ${scan1.advisors_queried} advisors in ${scan1.scan_duration_ms}ms`);
      yield { event: 'round_complete', data: { round: 2 } };
    }
  } else {
    // No crowd wisdom — round 2 is the first deep analysis round directly
  }

  // ━━ ROUND 3 — DEEP ANALYSIS WAVE 1 (WITH field intelligence) ━━

  yield { event: 'round_start', data: { round: 3, title: 'Deep Analysis — Wave 1', description: `First wave of specialists analyzing${fieldScans.length > 0 ? ' with field intelligence' : ''}`, total_rounds: 10 } };

  {
    const batchPromises = deepWave1.map(({ agent, task }) => {
      const debateCtx = buildDebateContext(state, agent.id, undefined, undefined, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
      return callAgent(
        agent,
        `Question: ${question}\n\nYour task: ${task}\n\n${debateCtx}\n\nAnalyze from your perspective as ${agent.role}. Be specific with data. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, 3, 'opening',
      ).catch((err) => {
        console.error(`[${agent.id}] deep analysis failed:`, err);
        return null;
      });
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
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

  yield { event: 'round_complete', data: { round: 3 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 3, 'deep_analysis', `Deep wave 1: ${allReports.length} reports`, null, getCurrentPositions(state));

  // ━━ ROUND 4 — FIELD SCAN BATCH 2 + DEEP ANALYSIS WAVE 2 ━━

  if (fieldPersonas.length > 0) {
    const wave2AgentIds = deepWave2.map(d => d.agent.id);
    const batch2Advisors = selectRelevantAdvisors(fieldPersonas, wave2AgentIds, queriedAdvisors);

    if (batch2Advisors.length > 0) {
      yield { event: 'round_start', data: { round: 4, title: 'Field Scan — Batch 2', description: `${batch2Advisors.length} more local voices feeding specialists`, total_rounds: 10 } };

      const focusArea = deepWave2.map(d => d.agent.role).join(', ');
      const scan2 = await runFieldScan(question, batch2Advisors, focusArea, 4);
      fieldScans.push(scan2);
      batch2Advisors.forEach(a => queriedAdvisors.add(a.id));

      yield { event: 'field_scan', data: scan2 };
      console.log(`[field_intel] Scan 2: ${scan2.insights.length} insights from ${scan2.advisors_queried} advisors in ${scan2.scan_duration_ms}ms`);
      yield { event: 'round_complete', data: { round: 4 } };
    }
  }

  // ━━ ROUND 5 — DEEP ANALYSIS WAVE 2 (WITH accumulated field intelligence) ━━

  yield { event: 'round_start', data: { round: 5, title: 'Deep Analysis — Wave 2', description: `Second wave of specialists${fieldScans.length > 1 ? ' with accumulated field intelligence' : ''}`, total_rounds: 10 } };

  {
    const batchPromises = deepWave2.map(({ agent, task }) => {
      const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
      return callAgent(
        agent,
        `Question: ${question}\n\nYour task: ${task}\n\n${debateCtx}\n\nAnalyze from your perspective as ${agent.role}. Be specific with data. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, 5, 'opening',
      ).catch((err) => {
        console.error(`[${agent.id}] deep analysis failed:`, err);
        return null;
      });
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
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

  yield { event: 'round_complete', data: { round: 5 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 5, 'deep_analysis', `Deep wave 2: ${allReports.length} total reports`, null, getCurrentPositions(state));

  const deepConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'opening', ...deepConsensus });
  yield { event: 'consensus_update', data: deepConsensus };

  // MagenticOne #9: Ledger update after deep analysis (rounds 2-5)
  {
    const phaseReports = allReports.slice();
    progressLedger = assessProgress(state, progressLedger, phaseReports);
    taskLedger = await updateTaskLedger(question, taskLedger, phaseReports, state);
    yield { event: 'ledger_update', data: { task_ledger: taskLedger, progress_ledger: progressLedger } };
    console.log(`[ledger] After rounds 2-5: progressing=${progressLedger.is_progressing}, stall=${progressLedger.stall_counter}, new_args=${progressLedger.new_arguments_this_round}`);

    if (progressLedger.stall_counter >= 2) {
      chairDirectives = await replanDebate(question, taskLedger, progressLedger, state);
      yield { event: 'stall_replan', data: { stall_counter: progressLedger.stall_counter, directives: chairDirectives } };
      console.log(`[ledger] STALL DETECTED after rounds 2-5, directives:`, chairDirectives);
    }
  }

  // CrewAI #7: Check if any deep analysis agents need data from others
  {
    try {
      const delegationResponses = await processDelegations(allReports, state, question);
      if (delegationResponses.length > 0) {
        console.log('[delegation] After deep analysis:', delegationResponses.map(d =>
          `${d.request.requesting_agent} → ${d.request.target_agent}: ${d.request.question.substring(0, 50)}`
        ).join(', '));
        for (const delegation of delegationResponses) {
          yield { event: 'delegation', data: delegation };
        }
        state.delegations.push(...delegationResponses);
      }
    } catch (err) {
      console.error('[delegation] Deep analysis delegation failed (non-fatal):', err);
    }
  }

  // ━━ ROUND 6 — RAPID ASSESSMENT (remaining 5 agents, WITH all field intelligence) ━━

  transitionPhase(state, 'quick_takes');
  yield { event: 'round_start', data: { round: 6, title: 'Rapid Assessment', description: `Remaining specialists provide quick perspectives${fieldScans.length > 0 ? ' with field intelligence' : ''}`, total_rounds: 10 } };

  // Stagger quick takes to avoid rate limits (2 batches)
  const quickBatch1 = quickAgentTasks.slice(0, 3);
  const quickBatch2 = quickAgentTasks.slice(3);

  const quickBatch1Promises = quickBatch1.map(({ agent, task }) => {
    const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${debateCtx}\n\nAs ${agent.role}, add your perspective. Focus on what others MISSED or got wrong. React to their specific arguments. Respond with valid JSON only.`,
      512, audit, 6, 'quick_takes',
    );
  });
  const quickResults1 = await Promise.allSettled(quickBatch1Promises);

  // Small delay between batches to stay under rate limit
  await wait(500);

  const quickBatch2Promises = quickBatch2.map(({ agent, task }) => {
    const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${debateCtx}\n\nAs ${agent.role}, add your perspective. Focus on what others MISSED or got wrong. React to their specific arguments. Respond with valid JSON only.`,
      512, audit, 6, 'quick_takes',
    );
  });
  const quickResults2 = await Promise.allSettled(quickBatch2Promises);

  const quickResults = [...quickResults1, ...quickResults2];
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
        await wait(200);
      }
    }
  }

  yield { event: 'round_complete', data: { round: 6 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 6, 'rapid_assessment', `Rapid assessment: ${allReports.length} total reports`, null, getCurrentPositions(state));

  const quickConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'quick_takes', ...quickConsensus });
  yield { event: 'consensus_update', data: quickConsensus };

  // MagenticOne #9: Ledger update after rapid assessment (round 6)
  {
    const recentQuickReports = allReports.slice(allReports.length - quickAgentTasks.length);
    progressLedger = assessProgress(state, progressLedger, recentQuickReports);
    taskLedger = await updateTaskLedger(question, taskLedger, recentQuickReports, state);
    yield { event: 'ledger_update', data: { task_ledger: taskLedger, progress_ledger: progressLedger } };
    console.log(`[ledger] After round 6: progressing=${progressLedger.is_progressing}, stall=${progressLedger.stall_counter}, new_args=${progressLedger.new_arguments_this_round}`);

    if (progressLedger.stall_counter >= 2) {
      chairDirectives = await replanDebate(question, taskLedger, progressLedger, state);
      yield { event: 'stall_replan', data: { stall_counter: progressLedger.stall_counter, directives: chairDirectives } };
      console.log(`[ledger] STALL DETECTED after round 6, directives:`, chairDirectives);
    }
  }

  // CrewAI #7: Check if any rapid assessment agents need data from others
  {
    try {
      const recentQuick = allReports.slice(allReports.length - quickAgentTasks.length);
      const delegationResponses = await processDelegations(recentQuick, state, question);
      if (delegationResponses.length > 0) {
        console.log('[delegation] After round 6:', delegationResponses.map(d =>
          `${d.request.requesting_agent} → ${d.request.target_agent}: ${d.request.question.substring(0, 50)}`
        ).join(', '));
        for (const delegation of delegationResponses) {
          yield { event: 'delegation', data: delegation };
        }
        state.delegations.push(...delegationResponses);
      }
    } catch (err) {
      console.error('[delegation] Quick takes delegation failed (non-fatal):', err);
    }
  }

  // Verify all 10 agents participated after rounds 2-6
  const uniqueAgentsAfterR6 = state.latest_reports.size;
  if (uniqueAgentsAfterR6 < 10) {
    console.error(`[engine] WARNING: Only ${uniqueAgentsAfterR6}/10 agents participated in rounds 2-6`);
  } else {
    console.log(`[engine] All 10 agents reported after round 6`);
  }

  const reportSummaryForChair = allReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}"`)
    .join('\n');

  let finalReports: AgentReport[] = [];

  // ━━ ROUNDS 7-8 — ADVERSARIAL DEBATE (field advisors provide ammo to challengers) ━━

  transitionPhase(state, 'adversarial');
  yield { event: 'phase_start', data: { phase: 'adversarial', status: 'active' } };

  const pairs = selectDebatePairs(state, 2);

  // Field scan focused on the CONFLICT area before adversarial debate
  if (fieldPersonas.length > 0 && pairs.length > 0) {
    const conflictFocus = pairs[0].topic;
    const unqueried = fieldPersonas.filter(a => !queriedAdvisors.has(a.id));
    const conflictAdvisors = unqueried.slice(0, 10);

    if (conflictAdvisors.length > 0) {
      const conflictScan = await runFieldScan(question, conflictAdvisors, `Ground truth on: ${conflictFocus}`, 7);
      fieldScans.push(conflictScan);
      conflictAdvisors.forEach(a => queriedAdvisors.add(a.id));
      yield { event: 'field_scan', data: conflictScan };
      console.log(`[field_intel] Conflict scan: ${conflictScan.insights.length} insights on "${conflictFocus}" in ${conflictScan.scan_duration_ms}ms`);
    }
  }

  // Determine majority position for devil's advocate fallback
  const positionCounts: Record<string, number> = { proceed: 0, delay: 0, abandon: 0 };
  for (const r of Array.from(state.latest_reports.values())) {
    if (r.position in positionCounts) positionCounts[r.position]++;
  }
  const majorityPosition = Object.entries(positionCounts).sort((a, b) => b[1] - a[1])[0][0];

  for (let pairIdx = 0; pairIdx < 2; pairIdx++) {
    const roundNum = 7 + pairIdx; // rounds 7, 8
    const pair = pairs[pairIdx];

    if (!pair) {
      yield { event: 'round_start', data: { round: roundNum, title: `Devil's Advocate \u2014 Round ${pairIdx + 1}`, description: `Chair challenges the ${majorityPosition} consensus`, total_rounds: 10 } };

      const debatedAgentIds = new Set(pairs.flatMap((p) => [p.challenger_id, p.defender_id]));
      const availableAgents = specialistAgents().filter((a) => !debatedAgentIds.has(a.id));
      const targetAgent = availableAgents[pairIdx] || availableAgents[0] || specialistAgents()[pairIdx];

      if (targetAgent) {
        try {
          const devilCtx = buildDebateContext(state, targetAgent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(targetAgent.id) || '');
          const devilReport = await callAgent(
            targetAgent,
            `Question: ${question}\n\n${devilCtx}\n\nAll agents currently agree on "${majorityPosition}". The Decision Chair is forcing a devil's advocate round. As ${targetAgent.role}, present the STRONGEST possible argument AGAINST "${majorityPosition}". Reference specific claims from other agents and explain why they're wrong or incomplete. What could go catastrophically wrong? Respond with valid JSON only.`,
            kernel.config.maxTokensPerAgent,
            audit, roundNum, 'adversarial',
          );
          allReports.push(devilReport);
          addAgentReport(state, devilReport);
          yield { event: 'agent_complete', data: devilReport };
        } catch (err) {
          console.error(`[${targetAgent.id}] devil's advocate failed:`, err);
        }
      }

      yield { event: 'round_complete', data: { round: roundNum } };
      continue;
    }

    yield { event: 'round_start', data: { round: roundNum, title: `Adversarial Debate \u2014 Pair ${pairIdx + 1}`, description: `Highest-conflict agents challenge each other directly`, total_rounds: 10 } };

    let challengerAgent: AgentConfig;
    let defenderAgent: AgentConfig;
    try {
      challengerAgent = getAgentById(pair.challenger_id as AgentId);
      defenderAgent = getAgentById(pair.defender_id as AgentId);
    } catch {
      yield { event: 'round_complete', data: { round: roundNum } };
      continue;
    }

    recordHandoff(state, pair.challenger_id, pair.defender_id, pair.topic, roundNum);

    const defenderReport = allReports.find((r) => r.agent_id === pair.defender_id);
    const challengerReport = allReports.find((r) => r.agent_id === pair.challenger_id);

    try {
      const challengerCtx = buildDebateContext(state, pair.challenger_id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(pair.challenger_id) || '');
      const challengeReport = await callAgent(
        challengerAgent,
        `Question: ${question}\n\n${challengerCtx}\n\nYou are CHALLENGING ${defenderAgent.name}'s position. They said: "${defenderReport?.key_argument || 'their position'}"\n\nAttack their weakest point with specific counter-evidence. Reference what other agents said to support your challenge. Be direct. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, roundNum, 'adversarial',
      );
      allReports.push(challengeReport);
      addAgentReport(state, challengeReport);
      yield { event: 'agent_complete', data: challengeReport };
    } catch (err) {
      console.error(`[${pair.challenger_id}] challenge failed:`, err);
    }

    try {
      const defenderCtx = buildDebateContext(state, pair.defender_id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(pair.defender_id) || '');
      const defenseReport = await callAgent(
        defenderAgent,
        `Question: ${question}\n\n${defenderCtx}\n\n${challengerAgent.name} CHALLENGED your position: "${challengerReport?.key_argument || 'disagreement'}"\n\nDefend your position with stronger evidence, or update your position if the challenge is valid. Be honest \u2014 if you changed your mind, say what convinced you. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, roundNum, 'adversarial',
      );
      allReports.push(defenseReport);
      addAgentReport(state, defenseReport);
      yield { event: 'agent_complete', data: defenseReport };
    } catch (err) {
      console.error(`[${pair.defender_id}] defense failed:`, err);
    }

    yield { event: 'round_complete', data: { round: roundNum } };
  }

  const adversarialConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'adversarial', ...adversarialConsensus });
  yield { event: 'consensus_update', data: adversarialConsensus };

  // MagenticOne #9: Ledger update after adversarial debate (rounds 7-8)
  {
    const recentAdversarialReports = allReports.filter((r) => {
      const history = state.agent_reports.get(r.agent_id) || [];
      return history.length > 1;
    }).slice(-4);
    progressLedger = assessProgress(state, progressLedger, recentAdversarialReports);
    taskLedger = await updateTaskLedger(question, taskLedger, recentAdversarialReports, state);
    yield { event: 'ledger_update', data: { task_ledger: taskLedger, progress_ledger: progressLedger } };
    console.log(`[ledger] After rounds 7-8: progressing=${progressLedger.is_progressing}, stall=${progressLedger.stall_counter}, new_args=${progressLedger.new_arguments_this_round}`);

    if (progressLedger.stall_counter >= 2) {
      chairDirectives = await replanDebate(question, taskLedger, progressLedger, state);
      yield { event: 'stall_replan', data: { stall_counter: progressLedger.stall_counter, directives: chairDirectives } };
      console.log(`[ledger] STALL DETECTED after rounds 7-8, directives:`, chairDirectives);
    }
  }

  // ━━ ROUND 9 — CONVERGENCE (all 10 specialists declare final position, ALWAYS runs) ━━

  transitionPhase(state, 'convergence');
  yield { event: 'phase_start', data: { phase: 'convergence', status: 'active' } };
  yield { event: 'round_start', data: { round: 9, title: 'Final Convergence', description: `All 10 specialists declare final positions${fieldScans.length > 0 ? ' informed by field intelligence' : ''}`, total_rounds: 10 } };

  // Stagger convergence into 2 batches of 5 to avoid rate limits
  const specialists = specialistAgents();
  const convBatch1 = specialists.slice(0, 5);
  const convBatch2 = specialists.slice(5);

  const convBatch1Promises = convBatch1.map((agent) => {
    const convergenceCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${convergenceCtx}\n\nThe debate is concluding. Declare your FINAL position. If you changed your mind from your earlier analysis, explain what argument convinced you. Reference specific agents or evidence that influenced your final stance. Respond with valid JSON only.`,
      256, audit, 9, 'convergence',
    );
  });
  const convResults1 = await Promise.allSettled(convBatch1Promises);

  await wait(500);

  const convBatch2Promises = convBatch2.map((agent) => {
    const convergenceCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, agentKnowledgeMap.get(agent.id) || '');
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${convergenceCtx}\n\nThe debate is concluding. Declare your FINAL position. If you changed your mind from your earlier analysis, explain what argument convinced you. Reference specific agents or evidence that influenced your final stance. Respond with valid JSON only.`,
      256, audit, 9, 'convergence',
    );
  });
  const convResults2 = await Promise.allSettled(convBatch2Promises);

  const convergenceResults = [...convResults1, ...convResults2];
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

  // Use latest_reports for consensus if some convergence calls failed
  const consensusReports = finalReports.length >= 8
    ? finalReports
    : Array.from(state.latest_reports.values());
  const convergenceConsensus = calculateConsensus(consensusReports);
  state.consensus_history.push({ phase: 'convergence', ...convergenceConsensus });
  yield { event: 'consensus_update', data: convergenceConsensus };
  yield { event: 'round_complete', data: { round: 9 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 9, 'convergence', `Convergence: ${finalReports.length} final positions`, null, getCurrentPositions(state));

  console.log(`[convergence] ${finalReports.length}/10 convergence reports, using ${consensusReports.length} for consensus`);

  // MagenticOne #9: Final ledger update after convergence (round 9)
  {
    progressLedger = assessProgress(state, progressLedger, consensusReports);
    taskLedger = await updateTaskLedger(question, taskLedger, consensusReports, state);
    yield { event: 'ledger_update', data: { task_ledger: taskLedger, progress_ledger: progressLedger } };
    console.log(`[ledger] After round 9: verified_facts=${taskLedger.verified_facts.length}, assumptions=${taskLedger.assumptions.length}, insights=${taskLedger.derived_insights.length}`);
  }

  // Verify all 10 agents have final reports
  const uniqueAgentsAfterR9 = state.latest_reports.size;
  if (uniqueAgentsAfterR9 < 10) {
    console.warn(`[engine] WARNING: Only ${uniqueAgentsAfterR9}/10 agents have reports after convergence`);
  }

  transitionPhase(state, 'verdict');

  // ━━ COMPUTE AGENT CONSENSUS for verdict alignment ━━━━━━━━━
  const allFinalPositions = consensusReports.map(r => r.position);
  const verdictPositionCounts = { proceed: 0, delay: 0, abandon: 0 };
  allFinalPositions.forEach(p => { if (p in verdictPositionCounts) verdictPositionCounts[p as keyof typeof verdictPositionCounts]++; });
  const totalVerdictAgents = allFinalPositions.length;
  const majorityEntry = Object.entries(verdictPositionCounts).sort((a, b) => b[1] - a[1])[0];
  const agentConsensusPosition = majorityEntry[0];
  const agentConsensusPercent = totalVerdictAgents > 0 ? Math.round((majorityEntry[1] / totalVerdictAgents) * 100) : 0;
  const avgAgentConfidence = totalVerdictAgents > 0
    ? consensusReports.reduce((sum, r) => sum + r.confidence, 0) / totalVerdictAgents
    : 5;
  console.log(`[consensus] ${agentConsensusPercent}% ${agentConsensusPosition}, avg confidence ${avgAgentConfidence.toFixed(1)}`);

  // ━━ ROUND 10 — VERDICT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  yield { event: 'phase_start', data: { phase: 'verdict', status: 'active' } };
  yield { event: 'round_start', data: { round: 10, title: 'Verdict Synthesis', description: 'Decision Chair synthesizes the final verdict', total_rounds: 10 } };

  const finalSummary = consensusReports
    .map((r) => `${r.agent_name} (${r.agent_id}): position=${r.position}, confidence=${r.confidence}, argument="${r.key_argument}", risks=[${(r.risks_identified || []).join(', ')}]`)
    .join('\n');

  let verdict: DecisionObject;
  try {
    const verdictStart = Date.now();
    const taskLedgerSection = `\nTASK LEDGER (verified through multi-agent debate):
- Verified Facts: ${taskLedger.verified_facts.length > 0 ? taskLedger.verified_facts.join('; ') : 'None verified yet'}
- Unverified Assumptions: ${taskLedger.assumptions.length > 0 ? taskLedger.assumptions.join('; ') : 'None'}
- Derived Insights: ${taskLedger.derived_insights.length > 0 ? taskLedger.derived_insights.join('; ') : 'None'}
- Open Questions: ${taskLedger.open_questions.length > 0 ? taskLedger.open_questions.join('; ') : 'None'}
- Plan Adjustments: ${taskLedger.plan_adjustments.length > 0 ? taskLedger.plan_adjustments.join('; ') : 'None'}

DEBATE PROGRESS:
- Total rounds of progress tracking: ${progressLedger.round}
- Currently progressing: ${progressLedger.is_progressing}
- Key disagreements: ${progressLedger.key_disagreements.length > 0 ? progressLedger.key_disagreements.join('; ') : 'Resolved'}
- Resolved disagreements: ${progressLedger.resolved_disagreements.length > 0 ? progressLedger.resolved_disagreements.join('; ') : 'None'}`;

    const consensusDirective = agentConsensusPercent >= 70
      ? `\n\nCRITICAL CONSENSUS CONSTRAINT: ${agentConsensusPercent}% of agents recommend "${agentConsensusPosition}" with average confidence ${avgAgentConfidence.toFixed(1)}/10. Your verdict MUST align with this consensus. The agents debated for 9 rounds — respect their conclusion. If they say "${agentConsensusPosition}", your recommendation must be "${agentConsensusPosition}"${agentConsensusPosition === 'proceed' ? ' or "proceed_with_conditions"' : ''}. Do NOT override the agents.\n`
      : '';

    const memoryForVerdict = memory.isReturningUser
      ? `\n\nDECISION-MAKER CONTEXT:\n${memory.profile ? memory.profile.profile_text : 'Limited user context available.'}\nPast simulations: ${memory.previousSimCount}\nKnown facts: ${memory.relevantFacts.slice(0, 5).map(f => f.content).join('; ')}${networkMemoryText ? '\n' + networkMemoryText : ''}\n`
      : '';

    const verdictPrompt = `QUESTION: ${question}${memoryForVerdict}\n\nFINAL AGENT POSITIONS:\n${finalSummary}\n\nFULL DEBATE HISTORY (${allReports.length} total reports across all rounds):\n${reportSummaryForChair}\n${taskLedgerSection}${consensusDirective}\n\nSynthesize ALL agent positions into a final Decision Object. Tailor your recommendation to the specific decision-maker's context if known. Weight by confidence and evidence quality. Use the Task Ledger to distinguish verified facts from assumptions — your verdict should rely on VERIFIED facts and flag unresolved assumptions as risks.\n\nRespond with valid JSON only:\n{\n  "recommendation": "proceed" | "proceed_with_conditions" | "delay" | "abandon",\n  "probability": 0-100,\n  "main_risk": "the single biggest risk",\n  "leverage_point": "the one thing that changes everything",\n  "next_action": "specific, actionable, doable this week",\n  "grade": "A" | "B+" | "B" | "C" | "D" | "F",\n  "grade_score": 0-100,\n  "citations": [{ "id": 1, "agent_id": "agent_id", "agent_name": "name", "claim": "specific claim", "confidence": 1-10 }]\n}`;
    const verdictRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: verdictPrompt,
      maxTokens: 2048,
    });
    addRound(audit, {
      round: 10, phase: 'verdict', agent_id: 'decision_chair',
      model: DEFAULT_MODEL,
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
      citations: consensusReports.slice(0, 3).map((r, i) => ({
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

  // ━━ Self-Evolving #13: Critique → Refine ━━━━━━━━━━━━━━━━━━
  try {
    const critique = await critiqueVerdict(question, verdict, state);
    yield { event: 'verdict_critique', data: critique };
    console.log(`[self-refine] critique: actionability=${critique.actionability_score}, should_refine=${critique.should_refine}`);

    if (critique.should_refine) {
      const consensusData = agentConsensusPercent >= 70
        ? { position: agentConsensusPosition, percent: agentConsensusPercent }
        : undefined;
      verdict = await refineVerdict(question, verdict, critique, state, consensusData);
      console.log(`[self-refine] verdict REFINED: actionability ${critique.actionability_score} → improved`);
    }
  } catch (err) {
    console.error('[self-refine] critique/refine failed (non-fatal):', err);
    // Non-fatal — original verdict is still valid
  }

  // ━━ CONSENSUS OVERRIDE CHECK — verdict must not contradict agents ━━
  if (agentConsensusPercent >= 70) {
    const verdictAligns = (
      (agentConsensusPosition === 'proceed' && (verdict.recommendation === 'proceed' || verdict.recommendation === 'proceed_with_conditions')) ||
      (agentConsensusPosition === 'delay' && verdict.recommendation === 'delay') ||
      (agentConsensusPosition === 'abandon' && verdict.recommendation === 'abandon')
    );

    if (!verdictAligns) {
      console.warn(`[OVERRIDE] ${agentConsensusPercent}% agents said "${agentConsensusPosition}" but verdict said "${verdict.recommendation}". Correcting.`);

      if (agentConsensusPosition === 'abandon') {
        verdict.recommendation = 'abandon';
        verdict.probability = Math.max(5, Math.round(100 - (avgAgentConfidence * 10)));
      } else if (agentConsensusPosition === 'delay') {
        verdict.recommendation = 'delay';
        verdict.probability = Math.max(10, Math.round(50 - (avgAgentConfidence * 3)));
      } else if (agentConsensusPosition === 'proceed') {
        verdict.recommendation = verdict.recommendation === 'proceed_with_conditions' ? 'proceed_with_conditions' : 'proceed';
        verdict.probability = Math.max(50, Math.round(avgAgentConfidence * 10));
      }
    }
  }

  // ━━ Verdict Insights: Counter-Factual Flip + Blind Spot Detector ━━
  let counterFactual: CounterFactualFlip | null = null;
  let blindSpots: BlindSpotAnalysis | null = null;
  try {
    [counterFactual, blindSpots] = await Promise.all([
      generateCounterFactualFlip(question, verdict, state, taskLedger),
      detectBlindSpots(question, verdict, state, taskLedger),
    ]);
    yield { event: 'counter_factual', data: counterFactual };
    yield { event: 'blind_spots', data: blindSpots };
    console.log(`[verdict-insights] Counter-factual: biggest lever = "${counterFactual.single_biggest_lever}"`);
    console.log(`[verdict-insights] Blind spots: ${blindSpots.blind_spots.length} found, risk: ${blindSpots.overall_blind_spot_risk}`);
  } catch (err) {
    console.error('[verdict-insights] Counter-factual/blind-spots failed (non-fatal):', err);
  }

  // Palantir #4: Build traceable citations from state
  const enrichedCitations = buildCitations(state);

  // Replace Chair-generated citations with algorithmic ones
  if (verdict.citations !== undefined) {
    verdict.citations = enrichedCitations.map((c) => ({
      id: c.id,
      agent_id: c.agent_id as AgentId,
      agent_name: c.agent_name,
      claim: c.claim,
      confidence: c.confidence,
    }));
  }

  state.verdict = verdict;
  yield { event: 'verdict_artifact', data: verdict };
  yield { event: 'round_complete', data: { round: 10 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 10, 'verdict', `Verdict: ${(verdict as Record<string, unknown>)?.recommendation || 'unknown'} (${(verdict as Record<string, unknown>)?.probability || 0}%)`, 'decision_chair', getCurrentPositions(state));

  // Yield enriched citations with full traceability
  yield { event: 'citations_enriched', data: enrichedCitations };

  // Agno #11: Score all agent performances
  const agentScores = scoreAllAgents(state, enrichedCitations);
  yield { event: 'agent_scores', data: agentScores };
  console.log('[perf] Agent scores:', agentScores.map((s) => `${s.agent_name}: ${s.overall_score}/100`).join(', '));

  // Follow-up suggestions
  let followUps: string[] = ['What are the key risks I should investigate further?', 'What would change this decision from delay to proceed?', 'What is the minimum viable test I can run this week?', 'Who should I talk to before making this decision?'];
  try {
    const followupRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: `Based on the analysis of "${question}", suggest 4 follow-up questions the user should explore next. Make them specific and actionable. Return a JSON array of strings only: ["question 1", "question 2", "question 3", "question 4"]`,
      maxTokens: 512,
    });
    console.log(`[decision_chair] followups: ${followupRaw.length} chars`);
    followUps = parseJSON<string[]>(followupRaw);
    yield { event: 'followup_suggestions', data: followUps };
  } catch (error) {
    console.error('Follow-up generation failed:', error);
    yield { event: 'followup_suggestions', data: followUps };
  }

  // ━━ POST-VERDICT VALIDATION (remaining unqueried advisors) ━━
  // If all advisors were queried during the debate → skip
  // If there are unqueried advisors → run them as a quick validation pass
  const unqueriedAdvisors = fieldPersonas.filter(a => !queriedAdvisors.has(a.id));
  if (unqueriedAdvisors.length > 0 && options?.enableCrowdWisdom) {
    console.log(`[field_intel] ${unqueriedAdvisors.length} unqueried advisors remaining — running post-verdict validation`);
    try {
      const verdictSummary = `${verdict.recommendation} (${verdict.probability}%). Main risk: ${verdict.main_risk}`;
      const validationScan = await runFieldScan(
        question,
        unqueriedAdvisors.slice(0, 20), // cap at 20 for post-verdict
        `Validate verdict: ${verdictSummary}`,
        10,
      );
      fieldScans.push(validationScan);
      unqueriedAdvisors.slice(0, 20).forEach(a => queriedAdvisors.add(a.id));
      yield { event: 'field_scan', data: validationScan };
      console.log(`[field_intel] Post-verdict validation: ${validationScan.insights.length} insights in ${validationScan.scan_duration_ms}ms`);
    } catch (err) {
      console.error('[field_intel] Post-verdict validation failed (non-fatal):', err);
    }
  } else if (fieldPersonas.length > 0) {
    console.log(`[field_intel] All ${queriedAdvisors.size} advisors already participated in the debate — skipping post-verdict`);
  }

  // ━━ FINALIZE AUDIT (Palantir #4) ━━━━━━━━━━━━━━━━━━━━━━━━━
  finalizeAudit(audit);
  console.log(`[audit] ${audit.rounds.length} calls, ${audit.total_input_tokens}+${audit.total_output_tokens} tokens, $${audit.total_cost_usd.toFixed(4)}, ${audit.total_duration_ms}ms`);
  yield { event: 'audit_complete', data: audit };

  // ━━ DeepEval #12: Algorithmic Simulation Evaluation ━━━━━━━
  const evaluation = evaluateSimulation(state, audit);
  yield { event: 'evaluation', data: evaluation };

  // Override verdict grade with algorithmic eval grade (more objective)
  if (evaluation.grade && evaluation.overall_score) {
    verdict.grade = evaluation.grade;
    verdict.grade_score = Math.round(evaluation.overall_score);
    // Re-yield updated verdict so frontend gets the final grade
    yield { event: 'verdict_artifact', data: verdict };
  }
  console.log(`[eval] ${evaluation.grade} ${evaluation.overall_score.toFixed(0)}/100`);

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
    delegations: state.delegations.length,
    delegation_details: state.delegations.map((d) => ({
      from: d.request.requesting_agent,
      to: d.request.target_agent,
      question: d.request.question.substring(0, 80),
      urgency: d.request.urgency,
    })),
    field_intelligence: {
      personas_generated: fieldPersonas.length,
      scans_completed: fieldScans.length,
      total_insights: fieldScans.reduce((sum, s) => sum + s.insights.length, 0),
      advisors_queried: queriedAdvisors.size,
    },
    consensus_history: state.consensus_history,
  } };

  // ━━ PERSIST TO SUPABASE (before complete — code after final yield won't run) ━━
  await saveSimulation({
    simulationId: simId,
    userId: options?.userId,
    engine,
    question,
    plan: state.plan,
    debate: Object.fromEntries(state.agent_reports.entries()),
    verdict,
    evaluation,
    citations: enrichedCitations,
    followUps,
    counterFactual,
    blindSpots,
    audit,
    totalTokens: audit.total_input_tokens + audit.total_output_tokens,
    totalCostUsd: audit.total_cost_usd,
    durationMs: audit.total_duration_ms || 0,
  }).then(id => {
    if (id) console.log(`[persistence] Simulation saved: ${id}`);
    else console.warn('[persistence] Simulation save returned null');
  }).catch(err => console.error('[persistence] Save error:', err));

  // Memory: Extract facts (must await — serverless shuts down after generator ends)
  if (options?.userId) {
    try {
      await extractAndSaveFacts(
        options.userId,
        simId,
        question,
        verdict,
        Object.fromEntries(state.agent_reports.entries()),
      );
    } catch (err) {
      console.error('[facts] Extraction error (non-fatal):', err);
    }

    // Memory: Check if Decision Profile needs regeneration (every 3 sims)
    try {
      await maybeRegenerateProfile(options.userId);
    } catch (err) {
      console.error('[profile] Regeneration error (non-fatal):', err);
    }

    // Hindsight Network 2: Save experience
    try {
      await saveExperience(options.userId, simId, question, verdict as Record<string, unknown>);
      console.log(`[hindsight] Experience saved for sim ${simId}`);
    } catch (err) {
      console.error('[hindsight] Experience save error (non-fatal):', err);
    }

    // Hindsight Networks 3 & 4: Extract and apply opinions + observations
    console.log(`[hindsight] Starting opinion/observation extraction for sim ${simId}`);
    try {
      const existingOpinions = await getUserOpinions(options.userId, 20);
      const { opinions, observations } = await extractOpinionsAndObservations(
        options.userId,
        simId,
        question,
        verdict,
        Object.fromEntries(state.agent_reports.entries()),
        existingOpinions.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          belief: o.belief as string,
          confidence: o.confidence as number,
          domain: o.domain as string,
        })),
      );

      if (opinions.length > 0) {
        const applied = await applyOpinionActions(options.userId, simId, opinions);
        console.log(`[hindsight] ${applied} opinion(s) applied`);
      }
      if (observations.length > 0) {
        const saved = await saveObservations(options.userId, simId, observations);
        console.log(`[hindsight] ${saved} observation(s) saved`);
      }
    } catch (err) {
      console.error('[hindsight] Opinion/observation extraction error (non-fatal):', err);
    }
  }

  // ═══ KNOWLEDGE GRAPH — cognify (Cognee pattern) ═══
  if (options?.userId) {
    yield { event: 'knowledge_graph_started', data: { simulation_id: simId } };

    const verdictSummary = verdict
      ? `Recommendation: ${(verdict as Record<string, unknown>).recommendation}. Probability: ${(verdict as Record<string, unknown>).probability}%. Risk: ${(verdict as Record<string, unknown>).main_risk}. Action: ${(verdict as Record<string, unknown>).next_action}.`
      : 'No verdict generated.';

    const agentSummaries = Array.from(state.latest_reports.entries())
      .map(([agentId, report]) =>
        `${report.agent_name || agentId} (${report.position}, ${report.confidence}/10): ${report.key_argument}`
      )
      .join('\n');

    // Must await — serverless shuts down after generator ends
    try {
      const result = await cognify(
        options.userId,
        simId,
        question,
        verdictSummary,
        agentSummaries
      );
      console.log(`[cognify] Complete: ${result.entity_count} entities, ${result.relation_count} relations`);
    } catch (err) {
      console.error('[cognify] Error (non-fatal):', err);
    }
  }

  // ═══ SESSION: Save thread summary + clear buffer ═══
  if (options?.userId && activeThreadId) {
    await saveSessionSummary(
      activeThreadId,
      simId,
      options.userId,
      question,
      verdict,
      state.latest_reports
    ).catch(err => console.error('SESSION summary save error:', err));

    clearWorkingBuffer(simId)
      .catch(err => console.error('BUFFER clear error:', err));
  }

  // ═══ REFLECT: Form opinions + derive patterns every 5 sims (Hindsight) ═══
  if (options?.userId) {
    try {
      const simCount = await shouldReflect(options.userId);
      if (simCount > 0) {
        yield { event: 'reflect_triggered', data: { sim_count: simCount } };
      }
    } catch { /* non-blocking */ }

    reflectOnExperiences(options.userId)
      .then(result => {
        if (result.opinions > 0 || result.observations > 0 || result.misses > 0) {
          console.log(`REFLECT: ${result.opinions} opinions, ${result.observations} observations, ${result.misses} misses`);
        }
      })
      .catch(err => console.error('REFLECT error (non-blocking):', err));
  }

  yield { event: 'complete', data: { simulation_id: simId } };
}
