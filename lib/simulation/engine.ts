import { callClaude, callClaudeWithTools, formatSearchCitations, parseJSON, type SearchCitation, type ToolCallResult } from './claude';
import { getModel, type ModelTier } from '@/lib/config/model-tiers';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import { AGENTS, getAgentById } from '../agents/prompts';
import { getAgentsByIds, suggestAgentsForDomain, buildSelfAgent, libraryAgentToConfig, type LibraryAgent } from '../agents/library';
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
import { loadMemoryForSimulation, formatMemoryContext, formatAgentMemory, type MemoryPayload } from '../memory/core-memory';
import { saveToWorkingBuffer } from '../memory/session';
import { runReflectionLoop, agentShouldReflect } from '../memory/agent-reflection';
import {
  preSimHook,
  postAgentHook,
  postSimHook,
  buildAgentContext,
  formatRoundDiscoveries,
  type PreSimResult,
  type RoundLearning,
} from '../memory/hooks';
import { buildSystemPromptFromOverride } from '../memory/prompt-optimizer';
import { searchKnowledge, formatKnowledgeForAgent } from '../knowledge/search';
import { getAgentKnowledgeSources } from '../knowledge/agent-mapping';
import {
  runGodViewMarketPipeline,
  synthesizeCrowdSignal,
  formatCrowdSignal,
  type CrowdSignal,
  type GodViewCrowdSummary,
  type CrowdVote,
} from './crowd';
import { selectRelevantAgents, calculateAgentBudget, type AgentSelection } from './agent-selection';
import { extractVerdictClaims, type ConfidenceHeatmap } from './confidence-heatmap';
import { generateCheckpoint, formatUserCorrection, HITL_CONFIG, type HITLResponse } from './hitl';
import { hitlStore } from './hitl-store';
import { detectDomain, formatDomainConstraints, getDisclaimer, generateShareDigest, type DomainClassification } from './domain';
import {
  getModeVerdictAppendix,
  coerceVerdictCore,
  mergeModeVerdictFields,
  ensureVerdictOneLiner,
} from './mode-verdict';
import { getOrCreateProfile, formatBehavioralContext, applyBehavioralModifiers, type BehavioralProfile } from '../memory/behavioral';
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
  | { event: 'memory_loaded'; data: { isReturningUser: boolean; factCount: number; hasProfile: boolean; previousSimCount: number; hasRecalledMemories: boolean; hasThreadHistory: boolean; threadId: string | null; hasAgentLessons: boolean } }
  | { event: 'knowledge_graph_started'; data: { simulation_id: string } }
  | { event: 'reflect_triggered'; data: { sim_count: number } }
  | { event: 'optimization_triggered'; data: { sim_count: number } }
  | { event: 'agent_reflected'; data: { agent_id: string; iterations: number; original_score: number; final_score: number } }
  | { event: 'agent_searched'; data: { agent_id: string; searches: number; sources: number; domains: string[] } }
  | { event: 'confidence_heatmap'; data: ConfidenceHeatmap }
  | { event: 'agents_selected'; data: { active: { id: string; reason: string; priority: string }[]; skipped: { id: string; reason: string }[]; tokensPerAgent: number } }
  | { event: 'crowd_round_started'; data: { advisorCount: number } }
  | {
      event: 'crowd_voice';
      data: { persona: string; role: string; sentiment: string; statement: string };
    }
  | { event: 'crowd_summary'; data: GodViewCrowdSummary }
  | { event: 'crowd_round_complete'; data: CrowdSignal }
  | { event: 'state_summary'; data: any }
  | { event: 'hitl_checkpoint'; data: { simulationId: string; assumptions: string[]; summary: string; agentPositions: { agent: string; position: string; confidence: number }[]; timeoutMs: number } }
  | { event: 'hitl_resumed'; data: { action: string; hasCorrection: boolean } }
  | { event: 'domain_detected'; data: { domain: string; subdomain: string; disclaimer_required: boolean } }
  | { event: 'behavioral_profile_loaded'; data: { risk_tolerance: number; speed_preference: number; evidence_threshold: number; optimism_bias: number; detail_preference: number; inference_confidence: number } }
  | { event: 'complete'; data: { simulation_id: string } };

// ── Helpers ──────────────────────────────────────────────────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Target count for God's View Haiku market voices (swarm = large; specialist = 50–100). */
function resolveGodViewVoiceTarget(options?: {
  enableCrowdWisdom?: boolean;
  simMode?: SimulationChargeType;
  advisorCount?: number;
}): number {
  if (!options?.enableCrowdWisdom) return 0;
  const raw = options.advisorCount ?? 0;
  const mode = options.simMode;
  if (mode === 'swarm') {
    return Math.min(1000, Math.max(200, raw > 0 ? raw : 500));
  }
  if (mode === 'specialist') {
    const n = raw > 0 ? raw : 75;
    return Math.min(100, Math.max(50, Math.floor(n)));
  }
  if (mode === 'compare') {
    return Math.min(100, Math.max(40, raw > 0 ? raw : 50));
  }
  return 0;
}

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
  useWebSearch = false,
  agentTier: ModelTier = 'specialist',
): Promise<CallAgentResult | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAgent(agent, userMessage, maxTokens, audit, roundNum, phase, useWebSearch, agentTier);
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
  userCorrection?: string,
  domainConstraints?: string,
  behavioralContext?: string,
  ragContext?: string,
): string {
  // RAG knowledge goes FIRST — foundational curated intelligence
  // Domain constraints go SECOND — sets the analysis frame
  // Behavioral context goes THIRD — who is the decision-maker
  let memorySection = (ragContext || '') + (domainConstraints || '') + (behavioralContext || '');
  // Memory injection — early in context so agents always see it
  if (memory && memory.isReturningUser) {
    memorySection += formatMemoryContext(memory);
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
  // Truncate key_argument to limit context growth across rounds
  const otherReports = reports
    .filter(([id]) => id !== currentAgentId)
    .map(([, report]) => {
      const arg = report.key_argument?.length > 200
        ? report.key_argument.substring(0, 197) + '...'
        : report.key_argument;
      return `\u2022 ${report.agent_name} (${report.position.toUpperCase()}, ${report.confidence}/10): ${arg}`;
    })
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

  const correctionSection = userCorrection || '';

  return `${correctionSection}${memorySection}DEBATE SO FAR:
${otherReports}

${consensusSummary}
${conflicts.length > 0 ? '\n' + conflicts.join('\n') : ''}${ownHistory}${chairSection}${delegationSection}${fieldSection}

IMPORTANT: React to what other agents said. If you agree with someone, say why. If you disagree, challenge their specific claim. Do NOT repeat what others already covered \u2014 add NEW information or challenge EXISTING arguments.`;
}

// ── Audited callAgent wrapper ──────────────────────────────

type CallAgentResult = AgentReport & { _searchCitations?: SearchCitation[]; _searchCount?: number };

async function callAgent(
  agent: AgentConfig,
  userMessage: string,
  maxTokens = 1024,
  audit?: SimulationAudit,
  roundNum?: number,
  phase?: string,
  useWebSearch = false,
  agentTier: ModelTier = 'specialist',
): Promise<CallAgentResult> {
  const start = Date.now();
  let success = true;
  let error: string | undefined;
  let raw: string;
  let searchCitations: SearchCitation[] = [];
  let searchCount = 0;

  try {
    if (useWebSearch) {
      const toolResult = await callClaudeWithTools({
        systemPrompt: agent.systemPrompt,
        userMessage,
        agentId: agent.id,
        maxTokens,
        tier: agentTier,
      });
      raw = toolResult.text;
      searchCitations = toolResult.searchCitations;
      searchCount = toolResult.searchCount;
    } else {
      raw = await callClaude({
        systemPrompt: agent.systemPrompt,
        userMessage,
        maxTokens,
        tier: agentTier,
      });
    }
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    if (audit && roundNum !== undefined && phase) {
      const latency = Date.now() - start;
      const inputTokens = Math.ceil((agent.systemPrompt.length + userMessage.length) / 4);
      const outputTokens = success ? Math.ceil((raw!?.length || 0) / 4) : 0;
      addRound(audit, {
        round: roundNum,
        phase,
        agent_id: agent.id,
        model: getModel(agentTier),
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latency,
        success,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`[${agent.id}] response: ${raw!.length} chars${searchCount > 0 ? ` (${searchCount} searches, ${searchCitations.length} sources)` : ''}`);
  let parsed: Partial<AgentReport>;
  try {
    parsed = parseJSON<Partial<AgentReport>>(raw!);
  } catch (parseErr) {
    console.warn(`[${agent.id}] JSON parse failed, extracting from raw text`);
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
    _searchCitations: searchCitations.length > 0 ? searchCitations : undefined,
    _searchCount: searchCount > 0 ? searchCount : undefined,
  };
}

// ── Main Orchestrator ────────────────────────────────────────

export async function* runSimulation(
  question: string,
  engine: string,
  options?: {
    enableCrowdWisdom?: boolean;
    advisorGuidance?: string;
    advisorCount?: number;
    /** Billing tier (free/pro/max). */
    tier?: string;
    /** Simulation mode — swarm uses economy model for agent calls. */
    simMode?: SimulationChargeType;
    userId?: string;
    threadId?: string;
    onHITLCheckpoint?: (checkpoint: any) => Promise<HITLResponse>;
    agentIds?: string[];
    includeSelf?: boolean;
    joker?: Record<string, unknown>;
    agentOverrides?: Record<string, unknown>;
  },
): AsyncGenerator<SimulationSSEEvent> {
  const kernel = createKernel();
  const simId = `sim_${Date.now()}`;
  const agentDebateTier: ModelTier = options?.simMode === 'swarm' ? 'swarm' : 'specialist';
  const audit = createAudit(simId, question, engine);
  const state = createInitialState(simId, question, engine, options?.tier || 'free');
  const roundDiscoveries: RoundLearning[] = [];
  const allSearchCitations: SearchCitation[] = [];

  const crowdSseQueue: SimulationSSEEvent[] = [];
  const enqueueCrowdSse = (e: SimulationSSEEvent) => {
    crowdSseQueue.push(e);
  };
  function* drainCrowdSse(): Generator<SimulationSSEEvent> {
    while (crowdSseQueue.length) yield crowdSseQueue.shift()!;
  }
  let godViewPipeline: Promise<{ votes: CrowdVote[]; summary: GodViewCrowdSummary } | null> | null = null;

  // ═══ MEMORY SYSTEM — Single hook replaces 7+ individual operations ═══
  let preSim: PreSimResult = {
    memory: { coreMemory: { human: '', business: '', preferences: '', history: '' }, isReturningUser: false, relevantFacts: [], profile: null, previousSimCount: 0, opinions: [], observations: [], graphContext: '' },
    networkMemoryText: '', agentKnowledgeMap: new Map(), agentLessonsMap: new Map(), agentRulesMap: new Map(), promptOverrides: new Map(),
    activeThreadId: '', recalledMemoryText: '', threadContext: '', walFactsExtracted: 0,
    behavioralProfile: null,
    behavioralContextText: '',
  };

  if (options?.userId) {
    try {
      preSim = await preSimHook(options.userId, question, simId, { threadId: options.threadId });
    } catch (err) {
      console.error('PRE-SIM HOOK failed (non-blocking):', err);
    }
  } else {
    preSim.memory = await loadMemoryForSimulation(undefined, question);
  }

  const memory = preSim.memory;
  let networkMemoryText = preSim.networkMemoryText;

  yield { event: 'memory_loaded', data: {
    isReturningUser: memory.isReturningUser,
    factCount: memory.relevantFacts.length,
    hasProfile: !!memory.profile,
    previousSimCount: memory.previousSimCount,
    hasRecalledMemories: !!preSim.recalledMemoryText,
    hasThreadHistory: !!preSim.threadContext,
    threadId: preSim.activeThreadId || null,
    hasAgentLessons: preSim.agentLessonsMap.size > 0,
  }};

  // ═══ PROMPT OVERRIDES — Apply optimized prompts (LangMem gradient) ═══
  // Returns a copy of the agent with overridden systemPrompt if one exists, or the original.
  const applyPromptOverride = (agent: AgentConfig): AgentConfig => {
    const override = preSim.promptOverrides.get(agent.id);
    if (!override) return agent;
    console.log(`Using optimized prompt for ${agent.id}`);
    return { ...agent, systemPrompt: buildSystemPromptFromOverride(override, agent.name) };
  };

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

  // ═══ DOMAIN DETECTION — classify question domain ═══
  let domainClassification: DomainClassification = {
    domain: 'general', confidence: 0.5, subdomain: 'general',
    disclaimer_required: false, agent_constraints: [],
  };
  let domainConstraintsText = '';

  try {
    domainClassification = await detectDomain(question);
    domainConstraintsText = formatDomainConstraints(domainClassification);
    console.log(`DOMAIN: ${domainClassification.domain} (${(domainClassification.confidence * 100).toFixed(0)}%) — subdomain: ${domainClassification.subdomain}`);
  } catch (err) {
    console.error('Domain detection failed (non-blocking):', err);
  }

  yield {
    event: 'domain_detected',
    data: {
      domain: domainClassification.domain,
      subdomain: domainClassification.subdomain,
      disclaimer_required: domainClassification.disclaimer_required,
    },
  };

  // ═══ BEHAVIORAL PARAMETERS — user decision personality (prefer preSimHook load) ═══
  let behavioralProfile: BehavioralProfile | null = null;
  let behavioralContextText = '';

  if (options?.userId) {
    try {
      if (preSim.behavioralProfile) {
        behavioralProfile = preSim.behavioralProfile;
        behavioralContextText = preSim.behavioralContextText || '';
      }
      if (!behavioralProfile) {
        behavioralProfile = await getOrCreateProfile(options.userId);
        behavioralContextText = formatBehavioralContext(behavioralProfile);
      }
      if (behavioralProfile && behavioralContextText) {
        console.log(`BEHAVIORAL: Profile loaded — risk: ${(behavioralProfile.risk_tolerance * 100).toFixed(0)}%, confidence: ${(behavioralProfile.inference_confidence * 100).toFixed(0)}%`);
      } else if (behavioralProfile) {
        console.log(
          `BEHAVIORAL: Profile present — inference_confidence: ${(behavioralProfile.inference_confidence * 100).toFixed(0)}% (context suppressed until threshold met)`,
        );
      }
    } catch (err) {
      console.error('Behavioral profile load failed (non-blocking):', err);
    }
  }

  if (behavioralProfile && behavioralProfile.inference_confidence > 0) {
    yield {
      event: 'behavioral_profile_loaded',
      data: {
        risk_tolerance: behavioralProfile.risk_tolerance,
        speed_preference: behavioralProfile.speed_preference,
        evidence_threshold: behavioralProfile.evidence_threshold,
        optimism_bias: behavioralProfile.optimism_bias,
        detail_preference: behavioralProfile.detail_preference,
        inference_confidence: behavioralProfile.inference_confidence,
      },
    };
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
      tier: 'orchestrator',
    });
    addRound(audit, {
      round: 1, phase: 'planning', agent_id: 'decision_chair',
      model: getModel('orchestrator'),
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

  // ═══ DYNAMIC AGENT LIBRARY (P41) — load from DB or fallback to hardcoded ═══
  // Dynamic agent map: keyed by agent ID, stores AgentConfig for both DB and hardcoded agents
  const dynamicAgentMap = new Map<string, AgentConfig>();

  // Populate with hardcoded agents as baseline
  for (const a of AGENTS) {
    dynamicAgentMap.set(a.id, a);
  }

  // Try to load dynamic agents from DB if user specified agentIds or domain-based suggestion
  let usedDynamicAgents = false;
  if (options?.agentIds && options.agentIds.length > 0) {
    try {
      const dbAgents = await getAgentsByIds(options.agentIds);
      if (dbAgents.length > 0) {
        for (const la of dbAgents) {
          dynamicAgentMap.set(la.id, libraryAgentToConfig(la));
        }
        usedDynamicAgents = true;
        console.log(`AGENTS(P41): loaded ${dbAgents.length} user-selected agents from DB: ${dbAgents.map(a => a.id).join(', ')}`);
      }
    } catch (err) {
      console.error('AGENTS(P41): failed to load user-selected agents from DB, using fallback:', err);
    }
  } else {
    // Auto-suggest from DB based on domain
    try {
      const suggested = await suggestAgentsForDomain(domainClassification.domain);
      if (suggested.length > 0) {
        for (const la of suggested) {
          dynamicAgentMap.set(la.id, libraryAgentToConfig(la));
        }
        usedDynamicAgents = true;
        console.log(`AGENTS(P41): auto-suggested ${suggested.length} agents for domain "${domainClassification.domain}": ${suggested.map(a => a.id).join(', ')}`);
      }
    } catch {
      console.log('AGENTS(P41): DB auto-suggest unavailable, using hardcoded agents');
    }
  }

  // Add self-agent if requested
  if (options?.joker && options?.userId) {
    try {
      const jokerName = typeof options.joker.name === 'string' ? options.joker.name : 'The Joker';
      const jokerRole = typeof options.joker.role === 'string' ? options.joker.role : 'Decision-maker perspective';
      const jokerBio = typeof options.joker.bio === 'string' ? options.joker.bio : '';
      const jokerRisk = typeof options.joker.risk_tolerance === 'string' ? options.joker.risk_tolerance : 'moderate';
      const jokerPriorities = Array.isArray(options.joker.priorities) ? options.joker.priorities.join(', ') : '';
      const jokerBiases = typeof options.joker.biases === 'string' ? options.joker.biases : '';
      const jokerId = 'joker' as AgentId;

      dynamicAgentMap.set(jokerId, {
        id: jokerId,
        name: jokerName,
        role: jokerRole || 'Decision-maker perspective',
        icon: '🃏',
        color: '#6B6560',
        goal: 'Represent the real decision-maker context in the debate',
        backstory: `This is the user participating in the simulation.\nContext: ${jokerBio}\nRisk tolerance: ${jokerRisk}\nPriorities: ${jokerPriorities || 'not specified'}\nKnown biases: ${jokerBiases || 'not specified'}`,
        constraints: [
          'Speak from personal context and lived constraints',
          'Be explicit about emotional and practical trade-offs',
          'Challenge specialists when advice conflicts with user goals',
        ],
        sop: [
          '1. State the user context and non-negotiables',
          '2. Evaluate proposals against risk tolerance and priorities',
          '3. Surface practical constraints specialists may miss',
          '4. Clarify what would make the user comfortable proceeding',
          '5. Provide a clear position with confidence and rationale',
        ],
        systemPrompt: `You are ${jokerName}, the decision-maker, participating directly in this simulation.

ROLE: ${jokerRole || 'Decision-maker perspective'}
CONTEXT: ${jokerBio || 'No additional context provided'}
RISK TOLERANCE: ${jokerRisk}
PRIORITIES: ${jokerPriorities || 'not specified'}
KNOWN BIASES: ${jokerBiases || 'not specified'}

Respond with valid JSON only:
{
  "position": "proceed" | "delay" | "abandon",
  "confidence": 1-10,
  "key_argument": "2-3 sentences with concrete reasons",
  "evidence": ["specific evidence 1", "specific evidence 2"],
  "risks_identified": ["specific risk"],
  "recommendation": "one sentence, specific action"
}`,
      });
      console.log('AGENTS(P41): joker agent added to simulation');
    } catch (err) {
      console.error('AGENTS(P41): failed to add joker agent:', err);
    }
  } else if (options?.includeSelf && options?.userId) {
    try {
      const behavioral = await getOrCreateProfile(options.userId);
      const selfAgent = await buildSelfAgent(options.userId, memory.coreMemory, behavioral);
      dynamicAgentMap.set(selfAgent.id, libraryAgentToConfig(selfAgent));
      console.log(`AGENTS(P41): self-agent "${selfAgent.id}" added to simulation`);
    } catch (err) {
      console.error('AGENTS(P41): failed to build self-agent:', err);
    }
  }

  // Helper: resolve agent by ID from dynamic map first, then hardcoded fallback
  const getOverrideForAgent = (id: string): { weight?: number; perspective?: string; notes?: string } | null => {
    const allOverrides = (options?.agentOverrides || {}) as Record<string, { weight?: number; perspective?: string; notes?: string }>;
    return allOverrides[id] || null;
  };

  const resolveAgent = (id: string): AgentConfig => {
    const fromMap = dynamicAgentMap.get(id);
    const base = fromMap || getAgentById(id as AgentId);
    const override = getOverrideForAgent(id);
    if (!override || (!override.perspective && !override.notes && !override.weight)) return base;

    const extraContext = [
      override.perspective ? `CUSTOM PERSPECTIVE: ${override.perspective}` : '',
      override.notes ? `USER NOTES: ${override.notes}` : '',
      override.weight ? `INFLUENCE WEIGHT: ${override.weight}x` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      ...base,
      systemPrompt: `${base.systemPrompt}\n\n${extraContext}`,
    };
  };

  // ═══ RAG: Pre-compute knowledge context for each agent (P43) ═══
  const ragContextMap = new Map<string, string>();
  try {
    const ragPromises = [...dynamicAgentMap.keys()]
      .filter(id => id !== 'decision_chair')
      .map(async (agentId) => {
        const sources = getAgentKnowledgeSources(agentId);
        if (sources.categories.length === 0 && sources.vSeries.length === 0) return;
        try {
          const chunks = await searchKnowledge(question, {
            categories: sources.categories.length > 0 ? sources.categories : undefined,
            vSeries: sources.vSeries.length > 0 ? sources.vSeries : undefined,
            limit: sources.maxChunks,
            minSimilarity: 0.35,
          });
          if (chunks.length > 0) {
            const agentName = dynamicAgentMap.get(agentId)?.name || agentId;
            ragContextMap.set(agentId, formatKnowledgeForAgent(chunks, agentName));
          }
        } catch {}
      });
    await Promise.all(ragPromises);
    if (ragContextMap.size > 0) {
      console.log(`RAG(P43): loaded knowledge for ${ragContextMap.size} agents`);
    }
  } catch (err) {
    console.error('RAG(P43): knowledge pre-load failed (non-blocking):', err);
  }

  // ═══ ADAPTIVE AGENT SELECTION (Free tier: 4-6 agents, Pro/Max: all 10) ═══
  const useAdaptiveSelection = !options?.tier || options.tier === 'free';
  let agentSelection: AgentSelection | null = null;
  let activeAgentIds: Set<string>;

  if (options?.agentIds && options.agentIds.length > 0) {
    // User explicitly chose agents — use those + any self-agent
    activeAgentIds = new Set(options.agentIds);
    if (options?.includeSelf && options?.userId) {
      activeAgentIds.add(`self_${options.userId.substring(0, 12)}`);
    }
    yield { event: 'agents_selected', data: {
      active: [...activeAgentIds].map(id => ({ id, reason: 'user-selected', priority: 'critical' as const })),
      skipped: [],
      tokensPerAgent: calculateAgentBudget(activeAgentIds.size).maxTokens,
    }};
  } else if (usedDynamicAgents) {
    // Domain auto-suggested from DB — use those
    const suggestedIds = [...dynamicAgentMap.keys()].filter(id => id !== 'decision_chair');
    activeAgentIds = new Set(suggestedIds);
    yield { event: 'agents_selected', data: {
      active: suggestedIds.map(id => ({ id, reason: 'domain-suggested', priority: 'important' as const })),
      skipped: [],
      tokensPerAgent: calculateAgentBudget(suggestedIds.length).maxTokens,
    }};
  } else if (useAdaptiveSelection) {
    try {
      agentSelection = await selectRelevantAgents(
        question,
        memory.coreMemory?.human || '',
      );
      activeAgentIds = new Set(agentSelection.selected.map(s => s.agentId));
      yield { event: 'agents_selected', data: {
        active: agentSelection.selected.map(s => ({ id: s.agentId, reason: s.reason, priority: s.priority })),
        skipped: agentSelection.skipped.map(s => ({ id: s.agentId, reason: s.reason })),
        tokensPerAgent: agentSelection.tokensPerAgent,
      }};
    } catch (err) {
      console.error('AGENT SELECT failed, using all agents:', err);
      activeAgentIds = new Set(AGENTS.filter(a => a.id !== 'decision_chair').map(a => a.id));
    }
  } else {
    activeAgentIds = new Set(AGENTS.filter(a => a.id !== 'decision_chair').map(a => a.id));
  }

  const allSpecialistIds = [...activeAgentIds] as AgentId[];

  // Force all active agents into the plan
  const assignedIds = new Set(plan.tasks.map((t) => t.assigned_agent));
  for (const id of allSpecialistIds) {
    if (!assignedIds.has(id)) {
      const agent = resolveAgent(id);
      plan.tasks.push({
        description: `Analyze this decision from your perspective as ${agent.role}`,
        assigned_agent: id,
      });
    }
  }

  // Split active agents into thorough (first half) and quick (second half) passes
  const thoroughPassCount = Math.ceil(allSpecialistIds.length / 2);
  const thoroughPassAgentIds = new Set<AgentId>();
  const thoroughPassAgentTasks: { agent: AgentConfig; task: string }[] = [];
  for (const t of plan.tasks) {
    const agentId = t.assigned_agent as AgentId;
    if (thoroughPassAgentIds.has(agentId) || agentId === 'decision_chair') continue;
    if (!activeAgentIds.has(agentId)) continue;
    try {
      const agent = applyPromptOverride(resolveAgent(agentId));
      thoroughPassAgentTasks.push({ agent, task: t.description });
      thoroughPassAgentIds.add(agentId);
    } catch { continue; }
    if (thoroughPassAgentTasks.length >= thoroughPassCount) break;
  }
  const quickAgentTasks: { agent: AgentConfig; task: string }[] = [];
  for (const id of allSpecialistIds) {
    if (thoroughPassAgentIds.has(id as AgentId)) continue;
    const agent = applyPromptOverride(resolveAgent(id));
    const planTask = plan.tasks.find((t) => t.assigned_agent === id);
    quickAgentTasks.push({ agent, task: planTask?.description || `Analyze this decision from your perspective as ${agent.role}` });
  }

  const activeAgentCount = allSpecialistIds.length;

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

  // ━━ ROUND 2 — FIELD SCAN BATCH 1 + SPECIALIST WAVE 1 (THOROUGH PASS) ━━━━

  transitionPhase(state, 'opening');
  yield { event: 'phase_start', data: { phase: 'opening', status: 'active' } };

  // Split thorough-pass specialists into 2 slices: [3, 2]
  const thoroughWave1 = thoroughPassAgentTasks.slice(0, 3);
  const thoroughWave2 = thoroughPassAgentTasks.slice(3, 5);

  // ━━ ROUND 2 — FIELD SCAN BATCH 1 (if crowd wisdom enabled) ━━

  if (fieldPersonas.length > 0) {
    const wave1AgentIds = thoroughWave1.map(d => d.agent.id);
    const batch1Advisors = selectRelevantAdvisors(fieldPersonas, wave1AgentIds, queriedAdvisors);

    if (batch1Advisors.length > 0) {
      yield { event: 'round_start', data: { round: 2, title: 'Field Scan — Batch 1', description: `${batch1Advisors.length} local voices providing ground-level intelligence`, total_rounds: 10 } };

      const focusArea = thoroughWave1.map(d => d.agent.role).join(', ');
      const scan1 = await runFieldScan(question, batch1Advisors, focusArea, 2);
      fieldScans.push(scan1);
      batch1Advisors.forEach(a => queriedAdvisors.add(a.id));

      yield { event: 'field_scan', data: scan1 };
      console.log(`[field_intel] Scan 1: ${scan1.insights.length} insights from ${scan1.advisors_queried} advisors in ${scan1.scan_duration_ms}ms`);
      yield { event: 'round_complete', data: { round: 2 } };
    }
  } else {
    // No crowd wisdom — round 2 flows straight into specialist wave 1
  }

  // ━━ ROUND 3 — SPECIALIST WAVE 1 (WITH field intelligence) ━━

  yield { event: 'round_start', data: { round: 3, title: 'Specialist round — Wave 1', description: `First wave of specialists analyzing${fieldScans.length > 0 ? ' with field intelligence' : ''}`, total_rounds: 10 } };

  {
    const batchItems = thoroughWave1.map(({ agent, task }) => {
      const debateCtx = buildDebateContext(state, agent.id, undefined, undefined, fieldScans, memory, networkMemoryText, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), undefined, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
      const userMsg = `Question: ${question}\n\nYour task: ${task}\n\n${debateCtx}\n\nAnalyze from your perspective as ${agent.role}. Be specific with data. Respond with valid JSON only.`;
      const promise = callAgent(
        agent, userMsg,
        kernel.config.maxTokensPerAgent,
        audit, 3, 'opening',
        true, // web search enabled for thorough specialist pass
        agentDebateTier,
      ).catch((err) => {
        console.error(`[${agent.id}] specialist pass failed:`, err);
        return null;
      });
      return { agent, debateCtx, promise };
    });

    const batchResults = await Promise.allSettled(batchItems.map(b => b.promise));
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const { agent, debateCtx } = batchItems[i];
      if (result.status === 'fulfilled' && result.value) {
        let report = result.value;
        // Collect search citations from specialist wave 1
        if (report._searchCitations) {
          allSearchCitations.push(...report._searchCitations);
          yield { event: 'agent_searched', data: {
            agent_id: report.agent_id,
            searches: report._searchCount || 0,
            sources: report._searchCitations.length,
            domains: Array.from(new Set(report._searchCitations.map(c => c.source_domain))) as string[],
          }};
        }
        let filtered = false;
        for (const filter of kernel.agentFilters) {
          const check = filter.run(report);
          if (!check.pass) { filtered = true; console.warn(`[filter:${filter.name}] rejected ${report.agent_id}: ${check.reason}`); break; }
          if (check.patched) report = check.patched;
        }
        if (!filtered) {
          // ═══ SELF-REFLECTION (PraisonAI — specialist rounds only) ═══
          if (agentShouldReflect(report.agent_id)) {
            const reflection = await runReflectionLoop(
              report.agent_id, report.agent_name || report.agent_id,
              report, question, agent.systemPrompt, debateCtx
            );
            report = reflection.finalReport;
            if (reflection.wasRevised) {
              yield { event: 'agent_reflected', data: {
                agent_id: report.agent_id,
                iterations: reflection.iterations,
                original_score: reflection.evaluations[0]?.score || 0,
                final_score: reflection.evaluations[reflection.evaluations.length - 1]?.score || 0,
              }};
            }
          }
          allReports.push(report);
          addAgentReport(state, report);
          const rl = postAgentHook(
            report.agent_id,
            report.agent_name || report.agent_id,
            report,
            options?.userId
              ? { userId: options.userId, simulationId: simId, question, debateRound: 3 }
              : undefined,
          );
          if (rl.facts_discovered.length > 0 || rl.key_claims.length > 0) roundDiscoveries.push(rl);
          yield { event: 'agent_complete', data: report };
        }
      }
    }
  }

  yield { event: 'round_complete', data: { round: 3 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 3, 'specialist_analysis', `Specialist wave 1: ${allReports.length} reports`, null, getCurrentPositions(state));

  // ━━ ROUND 4 — FIELD SCAN BATCH 2 + SPECIALIST WAVE 2 (THOROUGH PASS) ━━

  if (fieldPersonas.length > 0) {
    const wave2AgentIds = thoroughWave2.map(d => d.agent.id);
    const batch2Advisors = selectRelevantAdvisors(fieldPersonas, wave2AgentIds, queriedAdvisors);

    if (batch2Advisors.length > 0) {
      yield { event: 'round_start', data: { round: 4, title: 'Field Scan — Batch 2', description: `${batch2Advisors.length} more local voices feeding specialists`, total_rounds: 10 } };

      const focusArea = thoroughWave2.map(d => d.agent.role).join(', ');
      const scan2 = await runFieldScan(question, batch2Advisors, focusArea, 4);
      fieldScans.push(scan2);
      batch2Advisors.forEach(a => queriedAdvisors.add(a.id));

      yield { event: 'field_scan', data: scan2 };
      console.log(`[field_intel] Scan 2: ${scan2.insights.length} insights from ${scan2.advisors_queried} advisors in ${scan2.scan_duration_ms}ms`);
      yield { event: 'round_complete', data: { round: 4 } };
    }
  }

  // ═══ HITL CHECKPOINT — After Round 4 (thorough specialist passes complete) ═══
  let userCorrectionText = '';

  if (HITL_CONFIG.enabled && options?.onHITLCheckpoint && state.latest_reports.size >= HITL_CONFIG.minAgentReports) {
    const checkpoint = await generateCheckpoint(question, state.latest_reports);

    if (checkpoint.assumptions.length > 0) {
      yield {
        event: 'hitl_checkpoint',
        data: {
          simulationId: simId,
          assumptions: checkpoint.assumptions,
          summary: checkpoint.summary,
          agentPositions: checkpoint.agentPositions,
          timeoutMs: HITL_CONFIG.timeoutMs,
        }
      };

      try {
        const userResponse = await Promise.race([
          options.onHITLCheckpoint({ ...checkpoint, _simId: simId }),
          new Promise<HITLResponse>((resolve) =>
            setTimeout(() => resolve({ action: 'skip', timestamp: Date.now() }), HITL_CONFIG.timeoutMs)
          ),
        ]);

        userCorrectionText = formatUserCorrection(userResponse);

        yield {
          event: 'hitl_resumed',
          data: {
            action: userResponse.action,
            hasCorrection: userResponse.action === 'correct',
          }
        };

        if (userResponse.action === 'correct') {
          console.log(`HITL: User correction received: "${(userResponse.correction || '').substring(0, 100)}"`);
        } else {
          console.log(`HITL: User ${userResponse.action} — continuing`);
        }
      } catch (err) {
        console.error('HITL: Checkpoint failed, continuing without:', err);
        yield { event: 'hitl_resumed', data: { action: 'skip', hasCorrection: false } };
      }
    }
  }

  // ━━ ROUND 5 — SPECIALIST WAVE 2 (WITH accumulated field intelligence) ━━

  yield { event: 'round_start', data: { round: 5, title: 'Specialist round — Wave 2', description: `Second wave of specialists${fieldScans.length > 1 ? ' with accumulated field intelligence' : ''}`, total_rounds: 10 } };

  {
    const batchItems2 = thoroughWave2.map(({ agent, task }) => {
      const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryText, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
      const userMsg = `Question: ${question}\n\nYour task: ${task}\n\n${debateCtx}\n\nAnalyze from your perspective as ${agent.role}. Be specific with data. Respond with valid JSON only.`;
      const promise = callAgent(
        agent, userMsg,
        kernel.config.maxTokensPerAgent,
        audit, 5, 'opening',
        true, // web search enabled for thorough specialist pass
        agentDebateTier,
      ).catch((err) => {
        console.error(`[${agent.id}] specialist pass failed:`, err);
        return null;
      });
      return { agent, debateCtx, promise };
    });

    const batchResults = await Promise.allSettled(batchItems2.map(b => b.promise));
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const { agent, debateCtx } = batchItems2[i];
      if (result.status === 'fulfilled' && result.value) {
        let report = result.value;
        // Collect search citations from specialist wave 2
        if (report._searchCitations) {
          allSearchCitations.push(...report._searchCitations);
          yield { event: 'agent_searched', data: {
            agent_id: report.agent_id,
            searches: report._searchCount || 0,
            sources: report._searchCitations.length,
            domains: Array.from(new Set(report._searchCitations.map(c => c.source_domain))) as string[],
          }};
        }
        let filtered = false;
        for (const filter of kernel.agentFilters) {
          const check = filter.run(report);
          if (!check.pass) { filtered = true; console.warn(`[filter:${filter.name}] rejected ${report.agent_id}: ${check.reason}`); break; }
          if (check.patched) report = check.patched;
        }
        if (!filtered) {
          // ═══ SELF-REFLECTION (PraisonAI — specialist rounds only) ═══
          if (agentShouldReflect(report.agent_id)) {
            const reflection = await runReflectionLoop(
              report.agent_id, report.agent_name || report.agent_id,
              report, question, agent.systemPrompt, debateCtx
            );
            report = reflection.finalReport;
            if (reflection.wasRevised) {
              yield { event: 'agent_reflected', data: {
                agent_id: report.agent_id,
                iterations: reflection.iterations,
                original_score: reflection.evaluations[0]?.score || 0,
                final_score: reflection.evaluations[reflection.evaluations.length - 1]?.score || 0,
              }};
            }
          }
          allReports.push(report);
          addAgentReport(state, report);
          const rl = postAgentHook(
            report.agent_id,
            report.agent_name || report.agent_id,
            report,
            options?.userId
              ? { userId: options.userId, simulationId: simId, question, debateRound: 5 }
              : undefined,
          );
          if (rl.facts_discovered.length > 0 || rl.key_claims.length > 0) roundDiscoveries.push(rl);
          yield { event: 'agent_complete', data: report };
        }
      }
    }
  }

  yield { event: 'round_complete', data: { round: 5 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 5, 'specialist_analysis', `Specialist wave 2: ${allReports.length} total reports`, null, getCurrentPositions(state));

  const godTarget = resolveGodViewVoiceTarget(options);
  if (godTarget > 0 && !godViewPipeline) {
    const specSummary =
      Array.from(state.latest_reports.entries())
        .map(([id, r]) => `${id}: ${r.position} (${r.confidence}/10)`)
        .join('; ') || 'Specialist analysis in progress; partial positions forming.';
    enqueueCrowdSse({ event: 'crowd_round_started', data: { advisorCount: godTarget } });
    godViewPipeline = runGodViewMarketPipeline({
      question,
      specialistSummary: specSummary,
      targetCount: godTarget,
      onVoice: (v) =>
        enqueueCrowdSse({
          event: 'crowd_voice',
          data: {
            persona: v.persona,
            role: v.role,
            sentiment: v.sentiment,
            statement: v.statement,
          },
        }),
    })
      .then(({ votes, summary }) => ({ votes, summary }))
      .catch((err) => {
        console.error('[god_view] pipeline failed:', err);
        return null;
      });
  }
  yield* drainCrowdSse();

  // MiroFish PERSIST: discoveries from rounds 1-5 available to rounds 6+
  const discoveryContext = formatRoundDiscoveries(roundDiscoveries, 6);
  const networkMemoryWithDiscoveries = discoveryContext
    ? networkMemoryText + '\n' + discoveryContext
    : networkMemoryText;

  const openingConsensus = calculateConsensus(allReports);
  state.consensus_history.push({ phase: 'opening', ...openingConsensus });
  yield { event: 'consensus_update', data: openingConsensus };

  // MagenticOne #9: Ledger update after thorough specialist rounds (rounds 2-5)
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

  // CrewAI #7: Check if any thorough-pass specialists need data from others
  {
    try {
      const delegationResponses = await processDelegations(allReports, state, question);
      if (delegationResponses.length > 0) {
        console.log('[delegation] After specialist thorough passes:', delegationResponses.map(d =>
          `${d.request.requesting_agent} → ${d.request.target_agent}: ${d.request.question.substring(0, 50)}`
        ).join(', '));
        for (const delegation of delegationResponses) {
          yield { event: 'delegation', data: delegation };
        }
        state.delegations.push(...delegationResponses);
      }
    } catch (err) {
      console.error('[delegation] Specialist-round delegation failed (non-fatal):', err);
    }
  }

  // ━━ ROUND 6 — RAPID ASSESSMENT (remaining 5 agents, WITH all field intelligence) ━━

  transitionPhase(state, 'quick_takes');
  yield { event: 'round_start', data: { round: 6, title: 'Rapid Assessment', description: `Remaining specialists provide quick perspectives${fieldScans.length > 0 ? ' with field intelligence' : ''}`, total_rounds: 10 } };

  // Stagger quick takes to avoid rate limits (2 batches)
  const quickBatch1 = quickAgentTasks.slice(0, 3);
  const quickBatch2 = quickAgentTasks.slice(3);

  const quickBatch1Promises = quickBatch1.map(({ agent, task }) => {
    const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${debateCtx}\n\nAs ${agent.role}, add your perspective. Focus on what others MISSED or got wrong. React to their specific arguments. Respond with valid JSON only.`,
      512, audit, 6, 'quick_takes',
      2,
      false,
      agentDebateTier,
    );
  });
  const quickResults1 = await Promise.allSettled(quickBatch1Promises);

  // Small delay between batches to stay under rate limit
  await wait(500);

  const quickBatch2Promises = quickBatch2.map(({ agent, task }) => {
    const debateCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${debateCtx}\n\nAs ${agent.role}, add your perspective. Focus on what others MISSED or got wrong. React to their specific arguments. Respond with valid JSON only.`,
      512, audit, 6, 'quick_takes',
      2,
      false,
      agentDebateTier,
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
        const rl6 = postAgentHook(
          report.agent_id,
          report.agent_name || report.agent_id,
          report,
          options?.userId
            ? { userId: options.userId, simulationId: simId, question, debateRound: 6 }
            : undefined,
        );
        if (rl6.facts_discovered.length > 0 || rl6.key_claims.length > 0) roundDiscoveries.push(rl6);
        yield { event: 'agent_complete', data: report };
        await wait(200);
      }
    }
  }

  yield { event: 'round_complete', data: { round: 6 } };
  saveToWorkingBuffer(simId, options?.userId || 'anon', 6, 'rapid_assessment', `Rapid assessment: ${allReports.length} total reports`, null, getCurrentPositions(state));
  yield* drainCrowdSse();

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

  // Verify all active agents participated after rounds 2-6
  const uniqueAgentsAfterR6 = state.latest_reports.size;
  if (uniqueAgentsAfterR6 < activeAgentCount) {
    console.error(`[engine] WARNING: Only ${uniqueAgentsAfterR6}/${activeAgentCount} agents participated in rounds 2-6`);
  } else {
    console.log(`[engine] All ${activeAgentCount} agents reported after round 6`);
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
          const devilCtx = buildDebateContext(state, targetAgent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(targetAgent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(targetAgent.id));
          const devilReport = await callAgent(
            targetAgent,
            `Question: ${question}\n\n${devilCtx}\n\nAll agents currently agree on "${majorityPosition}". The Decision Chair is forcing a devil's advocate round. As ${targetAgent.role}, present the STRONGEST possible argument AGAINST "${majorityPosition}". Reference specific claims from other agents and explain why they're wrong or incomplete. What could go catastrophically wrong? Respond with valid JSON only.`,
            kernel.config.maxTokensPerAgent,
            audit, roundNum, 'adversarial',
            false,
            agentDebateTier,
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
      challengerAgent = applyPromptOverride(getAgentById(pair.challenger_id as AgentId));
      defenderAgent = applyPromptOverride(getAgentById(pair.defender_id as AgentId));
    } catch {
      yield { event: 'round_complete', data: { round: roundNum } };
      continue;
    }

    recordHandoff(state, pair.challenger_id, pair.defender_id, pair.topic, roundNum);

    const defenderReport = allReports.find((r) => r.agent_id === pair.defender_id);
    const challengerReport = allReports.find((r) => r.agent_id === pair.challenger_id);

    try {
      const challengerCtx = buildDebateContext(state, pair.challenger_id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(pair.challenger_id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(pair.challenger_id));
      const challengeReport = await callAgent(
        challengerAgent,
        `Question: ${question}\n\n${challengerCtx}\n\nYou are CHALLENGING ${defenderAgent.name}'s position. They said: "${defenderReport?.key_argument || 'their position'}"\n\nAttack their weakest point with specific counter-evidence. Reference what other agents said to support your challenge. Be direct. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, roundNum, 'adversarial',
        false,
        agentDebateTier,
      );
      allReports.push(challengeReport);
      addAgentReport(state, challengeReport);
      yield { event: 'agent_complete', data: challengeReport };
    } catch (err) {
      console.error(`[${pair.challenger_id}] challenge failed:`, err);
    }

    try {
      const defenderCtx = buildDebateContext(state, pair.defender_id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(pair.defender_id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(pair.defender_id));
      const defenseReport = await callAgent(
        defenderAgent,
        `Question: ${question}\n\n${defenderCtx}\n\n${challengerAgent.name} CHALLENGED your position: "${challengerReport?.key_argument || 'disagreement'}"\n\nDefend your position with stronger evidence, or update your position if the challenge is valid. Be honest \u2014 if you changed your mind, say what convinced you. Respond with valid JSON only.`,
        kernel.config.maxTokensPerAgent,
        audit, roundNum, 'adversarial',
        false,
        agentDebateTier,
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
  yield* drainCrowdSse();

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

  // ━━ ROUND 9 — CONVERGENCE (active specialists declare final position, ALWAYS runs) ━━

  transitionPhase(state, 'convergence');
  yield { event: 'phase_start', data: { phase: 'convergence', status: 'active' } };
  yield { event: 'round_start', data: { round: 9, title: 'Final Convergence', description: `All ${activeAgentCount} specialists declare final positions${fieldScans.length > 0 ? ' informed by field intelligence' : ''}`, total_rounds: 10 } };

  // Stagger convergence into 2 batches to avoid rate limits
  const specialists = specialistAgents().filter(a => activeAgentIds.has(a.id));
  const convMid = Math.ceil(specialists.length / 2);
  const convBatch1 = specialists.slice(0, convMid);
  const convBatch2 = specialists.slice(convMid);

  const convBatch1Promises = convBatch1.map((agent) => {
    const convergenceCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${convergenceCtx}\n\nThe debate is concluding. Declare your FINAL position. If you changed your mind from your earlier analysis, explain what argument convinced you. Reference specific agents or evidence that influenced your final stance. Respond with valid JSON only.`,
      256, audit, 9, 'convergence',
      2,
      false,
      agentDebateTier,
    );
  });
  const convResults1 = await Promise.allSettled(convBatch1Promises);

  await wait(500);

  const convBatch2Promises = convBatch2.map((agent) => {
    const convergenceCtx = buildDebateContext(state, agent.id, progressLedger, chairDirectives, fieldScans, memory, networkMemoryWithDiscoveries, buildAgentContext(agent.id, preSim.agentKnowledgeMap, preSim.agentLessonsMap, preSim.agentRulesMap), userCorrectionText, domainConstraintsText, behavioralContextText, ragContextMap.get(agent.id));
    return callAgentWithRetry(
      agent,
      `Question: ${question}\n\n${convergenceCtx}\n\nThe debate is concluding. Declare your FINAL position. If you changed your mind from your earlier analysis, explain what argument convinced you. Reference specific agents or evidence that influenced your final stance. Respond with valid JSON only.`,
      256, audit, 9, 'convergence',
      2,
      false,
      agentDebateTier,
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
        const rl9 = postAgentHook(
          report.agent_id,
          report.agent_name || report.agent_id,
          report,
          options?.userId
            ? { userId: options.userId, simulationId: simId, question, debateRound: 9 }
            : undefined,
        );
        if (rl9.facts_discovered.length > 0 || rl9.key_claims.length > 0) roundDiscoveries.push(rl9);
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
  yield* drainCrowdSse();

  console.log(`[convergence] ${finalReports.length}/${activeAgentCount} convergence reports, using ${consensusReports.length} for consensus`);

  // MagenticOne #9: Final ledger update after convergence (round 9)
  {
    progressLedger = assessProgress(state, progressLedger, consensusReports);
    taskLedger = await updateTaskLedger(question, taskLedger, consensusReports, state);
    yield { event: 'ledger_update', data: { task_ledger: taskLedger, progress_ledger: progressLedger } };
    console.log(`[ledger] After round 9: verified_facts=${taskLedger.verified_facts.length}, assumptions=${taskLedger.assumptions.length}, insights=${taskLedger.derived_insights.length}`);
  }

  // Verify all active agents have final reports
  const uniqueAgentsAfterR9 = state.latest_reports.size;
  if (uniqueAgentsAfterR9 < activeAgentCount) {
    console.warn(`[engine] WARNING: Only ${uniqueAgentsAfterR9}/${activeAgentCount} agents have reports after convergence`);
  }

  // ═══ GOD'S VIEW — await Haiku market voices (started in parallel after round 5) ═══
  let crowdSignalText = '';
  let godViewSummaryForVerdict: GodViewCrowdSummary | undefined;

  if (godViewPipeline) {
    yield* drainCrowdSse();
    const packed = await godViewPipeline;
    yield* drainCrowdSse();
    if (packed && packed.votes.length > 0) {
      godViewSummaryForVerdict = packed.summary;
      const signal = synthesizeCrowdSignal(packed.votes, packed.summary);
      crowdSignalText = formatCrowdSignal(signal);
      yield { event: 'crowd_round_complete', data: signal };
      console.log(
        `[god_view] ${packed.votes.length} voices · +${packed.summary.positive} / -${packed.summary.negative} / ~${packed.summary.neutral}`,
      );
    }
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

    const verdictPrompt = `QUESTION: ${question}${memoryForVerdict}\n\nFINAL AGENT POSITIONS:\n${finalSummary}\n\nFULL DEBATE HISTORY (${allReports.length} total reports across all rounds):\n${reportSummaryForChair}\n${taskLedgerSection}${consensusDirective}${crowdSignalText ? '\n' + crowdSignalText : ''}\n\nSynthesize ALL agent positions into a final Decision Object. Tailor your recommendation to the specific decision-maker's context if known. Weight by confidence and evidence quality. Use the Task Ledger to distinguish verified facts from assumptions — your verdict should rely on VERIFIED facts and flag unresolved assumptions as risks.${crowdSignalText ? ' Consider the crowd signal as an additional data point — it reflects diverse perspectives beyond the specialist panel.' : ''}\n\nRespond with valid JSON only:\n{\n  "recommendation": "proceed" | "proceed_with_conditions" | "delay" | "abandon",\n  "probability": 0-100,\n  "main_risk": "the single biggest risk",\n  "leverage_point": "the one thing that changes everything",\n  "next_action": "specific, actionable, doable this week",\n  "grade": "A" | "B+" | "B" | "C" | "D" | "F",\n  "grade_score": 0-100,\n  "citations": [{ "id": 1, "agent_id": "agent_id", "agent_name": "name", "claim": "specific claim", "confidence": 1-10 }],\n  "one_liner": "optional — one short user-facing headline"\n}${getModeVerdictAppendix(options?.simMode)}`;
    const verdictMaxTokens =
      options?.simMode === 'compare'
        ? 4096
        : options?.simMode === 'stress_test' || options?.simMode === 'premortem'
          ? 3072
          : 2048;
    const verdictRaw = await callClaude({
      systemPrompt: chair.systemPrompt,
      userMessage: verdictPrompt,
      maxTokens: verdictMaxTokens,
      tier: 'orchestrator',
    });
    addRound(audit, {
      round: 10, phase: 'verdict', agent_id: 'decision_chair',
      model: getModel('orchestrator'),
      input_tokens: Math.ceil((chair.systemPrompt.length + verdictPrompt.length) / 4),
      output_tokens: Math.ceil(verdictRaw.length / 4),
      latency_ms: Date.now() - verdictStart, success: true,
      timestamp: new Date().toISOString(),
    });
    console.log(`[decision_chair] verdict: ${verdictRaw.length} chars`);
    const parsedVerdict = parseJSON<Record<string, unknown>>(verdictRaw);
    verdict = coerceVerdictCore(parsedVerdict) as DecisionObject;
    Object.assign(verdict, mergeModeVerdictFields(parsedVerdict, options?.simMode));
    ensureVerdictOneLiner(verdict as Record<string, unknown>, options?.simMode);
    if (godViewSummaryForVerdict) {
      (verdict as Record<string, unknown>).god_view = godViewSummaryForVerdict;
    }
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
      one_liner: 'Insufficient data to reach high-confidence decision',
    };
    if (godViewSummaryForVerdict) {
      (verdict as Record<string, unknown>).god_view = godViewSummaryForVerdict;
    }
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
      const modeSnap = {
        compare_data: verdict.compare_data,
        stress_data: verdict.stress_data,
        failure_analysis: verdict.failure_analysis,
        one_liner: verdict.one_liner,
        risk_matrix: (verdict as Record<string, unknown>).risk_matrix,
        action_plan: (verdict as Record<string, unknown>).action_plan,
      };
      verdict = await refineVerdict(question, verdict, critique, state, consensusData);
      if (modeSnap.compare_data) verdict.compare_data = modeSnap.compare_data;
      if (modeSnap.stress_data) verdict.stress_data = modeSnap.stress_data;
      if (modeSnap.failure_analysis) verdict.failure_analysis = modeSnap.failure_analysis;
      if (modeSnap.risk_matrix) (verdict as Record<string, unknown>).risk_matrix = modeSnap.risk_matrix;
      if (modeSnap.action_plan) (verdict as Record<string, unknown>).action_plan = modeSnap.action_plan;
      verdict.one_liner = verdict.one_liner || modeSnap.one_liner;
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

  // ═══ CONFIDENCE HEATMAP — decompose verdict into graded claims ═══
  try {
    const heatmap = await extractVerdictClaims(question, verdict, state.latest_reports);
    if (heatmap.total_claims > 0) {
      (verdict as any).confidence_heatmap = heatmap;
      yield { event: 'confidence_heatmap', data: heatmap };
    }
  } catch (err) {
    console.error('[heatmap] extraction failed (non-fatal):', err);
  }

  // Apply behavioral modifiers to verdict (probability calibration, risk framing)
  if (behavioralProfile && behavioralProfile.inference_confidence >= 0.2) {
    verdict = applyBehavioralModifiers(behavioralProfile, verdict);
    if ((verdict as any).calibration_adjusted) {
      console.log(`BEHAVIORAL: Verdict probability adjusted — ${(verdict as any).calibration_note}`);
    }
  }

  // Attach domain info, disclaimer, and share digest to verdict
  (verdict as any).domain = domainClassification.domain;
  (verdict as any).disclaimer = getDisclaimer(domainClassification.domain);
  (verdict as any).share_digest = generateShareDigest(
    question,
    verdict,
    domainClassification.domain,
    activeAgentCount || 10
  );

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
      tier: 'orchestrator',
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
  // Attach web search citations to verdict metadata
  const webCitations = formatSearchCitations(allSearchCitations);
  if (webCitations.length > 0) {
    (verdict as any).web_citations = webCitations;
    console.log(`[search] ${webCitations.length} unique web sources from ${allSearchCitations.length} total citations`);
  }

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
    domain: domainClassification.domain,
    shareDigest: (verdict as any).share_digest || null,
    disclaimer: (verdict as any).disclaimer || null,
    isPublic: true,
  }).then(id => {
    if (id) console.log(`[persistence] Simulation saved: ${id}`);
    else console.warn('[persistence] Simulation save returned null');
  }).catch(err => console.error('[persistence] Save error:', err));

  // ═══ POST-SIM — Single hook replaces 9+ individual operations ═══
  // reflect_triggered uses shouldReflect inside postSimHook AFTER saveExperience (no 1-cycle skew).
  if (options?.userId) {
    try {
      const { reflectSimCount } = await postSimHook(
        options.userId,
        simId,
        question,
        verdict,
        state.latest_reports,
        preSim.activeThreadId
      );
      if (reflectSimCount > 0) {
        yield { event: 'reflect_triggered', data: { sim_count: reflectSimCount } };
      }
    } catch (err) {
      console.error('POST-SIM HOOK failed (non-blocking):', err);
    }
  }

  yield { event: 'complete', data: { simulation_id: simId } };
}
