/**
 * Memory Hooks — PraisonAI lifecycle pattern for Octux.
 *
 * Three hooks consolidate ALL memory operations:
 *   preSimHook:    Everything that happens BEFORE the simulation runs
 *   postAgentHook: Everything that happens after EACH agent completes a round
 *   postSimHook:   Everything that happens AFTER the simulation completes
 *
 * The engine calls 3 hooks instead of 17+ scattered operations.
 * Adding new memory features = add to the appropriate hook, never touch engine.ts.
 *
 * Ref: PraisonAI (#7 — pre/post execution hooks, lifecycle management)
 */

import { parseQuestionForFacts, applyFactActions, extractAndSaveFacts, extractFactsFromAgentReport } from './facts';
import { resolveContradictions } from './temporal';
import {
  loadMemoryForSimulation,
  truncateMemoryContext,
  truncateAgentMemoryContext,
  MAX_MEMORY_CONTEXT_CHARS,
  type MemoryPayload,
} from './core-memory';
import { getTopKMemories } from './recall';
import {
  getOrCreateThread,
  accumulateThreadContext,
  saveSessionSummary,
  clearWorkingBuffer,
  saveToWorkingBuffer,
  computeAgentBufferRoundNumber,
} from './session';
import { loadAllAgentLessons, evaluateAgentPerformance, persistRoundLearnings, type RoundLearning } from './agent-improvement';
import { buildAllAgentKnowledge } from './agent-knowledge';
import { saveExperience, getUserExperiences, formatExperiencesForContext } from './experiences';
import { extractOpinionsAndObservations, applyOpinionActions, saveObservations, getUserOpinions, formatOpinionsForContext, getUserObservations, formatObservationsForContext } from './opinions';
import { cognify } from './knowledge-graph';
import { maybeRegenerateProfile } from './profile';
import { reflectOnExperiences, shouldReflect } from './reflect';
import { runMemoryOptimization } from './optimize';
import { extractAllAgentRules, loadAllAgentRules } from './procedural';
import { getAllActivePrompts, recordEvalScore } from './prompt-optimizer';
import { optimizeAllAgents, monitorAndRollback } from './multi-optimizer';
import { extractTeamInsights, injectTeamContext } from './team-memory';
import {
  inferBehavioralProfile,
  getOrCreateProfile,
  formatBehavioralContext,
  type BehavioralProfile,
} from './behavioral';
import { supabase } from './supabase';

// Re-export for engine convenience
export { formatRoundDiscoveries, type RoundLearning } from './agent-improvement';

function memErr(fn: string, err: unknown, ctx: { userId: string; simulationId?: string }): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[MEMORY:ERROR] ${fn} failed:`, msg, ctx);
}

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

/** Everything the engine needs from the pre-sim hook. */
export type PreSimResult = {
  memory: MemoryPayload;
  networkMemoryText: string;
  agentKnowledgeMap: Map<string, string>;
  agentLessonsMap: Map<string, string>;
  agentRulesMap: Map<string, string>;
  promptOverrides: Map<string, { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] }>;
  activeThreadId: string;
  // For SSE event
  recalledMemoryText: string;
  threadContext: string;
  walFactsExtracted: number;
  /** Loaded in preSim (same as engine behavioral modulation). */
  behavioralProfile: BehavioralProfile | null;
  behavioralContextText: string;
};

/** When set, postAgentHook persists per-agent buffer rows and incremental facts. */
export type PostAgentMemoryContext = {
  userId: string;
  simulationId: string;
  question: string;
  /** Debate round number (3, 5, 6, 9, …) for this agent completion. */
  debateRound: number;
};

const PRESIM_PARALLEL_LABELS = [
  'networkMemory (experiences/opinions/observations)',
  'buildAllAgentKnowledge',
  'loadAllAgentLessons',
  'loadAllAgentRules',
  'getAllActivePrompts',
  'injectTeamContext',
  'getTopKMemories',
  'getOrCreateThread + accumulateThreadContext',
  'parseQuestionForFacts + applyFactActions (WAL)',
  'getOrCreateProfile + formatBehavioralContext',
] as const;

// ═══════════════════════════════════════════
// preSimHook() — ALL pre-simulation memory operations
// ═══════════════════════════════════════════

/**
 * Consolidates everything that happens BEFORE the simulation runs:
 *
 *   1. Core memory loading (Letta — loadMemoryForSimulation)
 *   2. 4-network memory: experiences, opinions, observations (Hindsight)
 *   3. Per-agent knowledge (MiroFish individual memory)
 *   4. Per-agent lessons (OpenClaw self-improving)
 *   5. Top-K scored recall (Mem0 + RRF)
 *   6. Thread context accumulation (Agno session memory)
 *   7. WAL Protocol — extract facts from question BEFORE sim (OpenClaw)
 *   8. Pre-sim contradiction resolution (Graphiti) — fire-and-forget
 *   9. Combine into networkMemoryText
 *
 * Each operation is independently try/caught — one failure doesn't block others.
 */
export async function preSimHook(
  userId: string,
  question: string,
  simId: string,
  options?: { threadId?: string }
): Promise<PreSimResult> {
  console.log('[MEMORY:PRE] preSimHook called for user:', userId, 'sim:', simId);
  let memory: MemoryPayload = {
    coreMemory: { human: '', business: '', preferences: '', history: '' },
    isReturningUser: false,
    relevantFacts: [],
    profile: null,
    previousSimCount: 0,
    opinions: [],
    observations: [],
    graphContext: '',
  };
  let networkMemoryText = '';
  let agentKnowledgeMap = new Map<string, string>();
  let agentLessonsMap = new Map<string, string>();
  let agentRulesMap = new Map<string, string>();
  let promptOverrides = new Map<string, { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] }>();
  let activeThreadId = '';
  let recalledMemoryText = '';
  let threadContext = '';
  let walFactsExtracted = 0;
  let behavioralProfile: BehavioralProfile | null = null;
  let behavioralContextText = '';

  // 1. Core memory (Letta blocks)
  try {
    memory = await loadMemoryForSimulation(userId, question);
    if (memory.isReturningUser) {
      console.log(`HOOK PRE: Memory loaded — ${memory.relevantFacts.length} facts, profile: ${memory.profile ? 'yes' : 'no'}, sims: ${memory.previousSimCount}`);
    }
  } catch (err) {
    console.error('HOOK PRE: Core memory load failed:', err);
  }

  // 2-7 can run in parallel (independent reads)
  const parallelResults = await Promise.allSettled([
    // 2. 4-network memory (Hindsight pattern)
    (async () => {
      const [experiences, opinions, observations] = await Promise.all([
        getUserExperiences(userId, 5),
        getUserOpinions(userId, 8),
        getUserObservations(userId, 5),
      ]);
      return [
        formatExperiencesForContext(experiences),
        formatOpinionsForContext(opinions),
        formatObservationsForContext(observations),
      ].filter(Boolean).join('\n');
    })(),

    // 3. Per-agent knowledge (MiroFish)
    buildAllAgentKnowledge(userId),

    // 4. Per-agent lessons (OpenClaw)
    loadAllAgentLessons(userId),

    // 4b. Per-agent procedural rules (LangMem)
    loadAllAgentRules(userId),

    // 4c. Active prompt overrides (LangMem prompt optimization)
    getAllActivePrompts(userId),

    // 4d. Team insights (Agno team memory)
    injectTeamContext(userId),

    // 5. Top-K scored recall (Mem0 + RRF)
    getTopKMemories(userId, question, 15),

    // 6. Thread context (Agno session memory)
    (async () => {
      const threadId = await getOrCreateThread(userId, options?.threadId || null, question);
      const context = await accumulateThreadContext(threadId);
      return { threadId, context };
    })(),

    // 7. WAL Protocol — extract facts from question
    (async () => {
      const walFacts = await parseQuestionForFacts(userId, question);
      if (walFacts.length > 0) {
        await applyFactActions(userId, `wal_${simId}`, walFacts);
      }
      return walFacts.length;
    })(),

    // 8b. Behavioral profile (same data engine uses for modulation)
    (async () => {
      const profile = await getOrCreateProfile(userId);
      const text = formatBehavioralContext(profile);
      return { profile, text };
    })(),
  ]);

  parallelResults.forEach((result, i) => {
    if (result.status === 'rejected') {
      memErr(PRESIM_PARALLEL_LABELS[i] || `parallel[${i}]`, result.reason, { userId, simulationId: simId });
    }
  });

  const [
    networkResult,
    knowledgeResult,
    lessonsResult,
    rulesResult,
    promptResult,
    teamResult,
    recallResult,
    threadResult,
    walResult,
    behavioralResult,
  ] = parallelResults;

  // Unpack results (each independently — failures don't cascade)
  if (networkResult.status === 'fulfilled' && networkResult.value) {
    networkMemoryText = networkResult.value;
  }

  if (knowledgeResult.status === 'fulfilled') {
    agentKnowledgeMap = knowledgeResult.value;
    if (agentKnowledgeMap.size > 0) {
      console.log(`HOOK PRE: Agent knowledge for ${agentKnowledgeMap.size} agents`);
    }
  }

  if (lessonsResult.status === 'fulfilled') {
    agentLessonsMap = lessonsResult.value;
    if (agentLessonsMap.size > 0) {
      console.log(`HOOK PRE: Agent lessons for ${agentLessonsMap.size} agents`);
    }
  }

  if (rulesResult.status === 'fulfilled') {
    agentRulesMap = rulesResult.value;
    console.log('[MEMORY:PRE] Loaded', agentRulesMap.size, 'procedural rule sets (agents)');
  }

  if (promptResult.status === 'fulfilled') {
    promptOverrides = promptResult.value;
    if (promptOverrides.size > 0) {
      console.log(`HOOK PRE: Prompt overrides for ${promptOverrides.size} agents`);
    }
  }

  if (teamResult.status === 'fulfilled' && teamResult.value) {
    networkMemoryText = networkMemoryText
      ? networkMemoryText + '\n' + teamResult.value
      : teamResult.value;
    console.log('HOOK PRE: Team insights loaded');
  }

  if (recallResult.status === 'fulfilled' && recallResult.value) {
    recalledMemoryText = recallResult.value;
    const bulletMatches = recalledMemoryText.match(/  •/g);
    console.log(
      '[MEMORY:PRE] Recalled top-K memory block (~',
      bulletMatches?.length ?? 0,
      'bullets,',
      recalledMemoryText.length,
      'chars)',
    );
    networkMemoryText = recalledMemoryText + (networkMemoryText ? '\n' + networkMemoryText : '');
  }

  if (threadResult.status === 'fulfilled') {
    activeThreadId = threadResult.value.threadId;
    threadContext = threadResult.value.context;
    if (threadContext) {
      networkMemoryText = networkMemoryText
        ? networkMemoryText + '\n' + threadContext
        : threadContext;
    }
  }

  if (walResult.status === 'fulfilled') {
    walFactsExtracted = walResult.value;
    if (walFactsExtracted > 0) {
      console.log(`HOOK PRE: WAL extracted ${walFactsExtracted} facts`);
    }
  }

  if (behavioralResult.status === 'fulfilled' && behavioralResult.value) {
    behavioralProfile = behavioralResult.value.profile;
    behavioralContextText = behavioralResult.value.text;
    console.log(
      '[MEMORY:PRE] Behavioral profile loaded, inference_confidence:',
      behavioralProfile?.inference_confidence ?? 'n/a',
    );
  }

  // 8. Pre-sim contradiction resolution (fire-and-forget)
  resolveContradictions(userId)
    .then((n) => {
      if (n > 0) console.log(`HOOK PRE: ${n} contradictions resolved`);
    })
    .catch((err) => memErr('resolveContradictions', err, { userId, simulationId: simId }));

  const rawNetworkLen = networkMemoryText.length;
  networkMemoryText = truncateMemoryContext(networkMemoryText);
  if (networkMemoryText.length < rawNetworkLen) {
    console.log(
      `[MEMORY:PRE] networkMemoryText truncated: ${rawNetworkLen} → ${networkMemoryText.length} chars (max ${MAX_MEMORY_CONTEXT_CHARS})`,
    );
  }

  console.log(
    `[MEMORY:PRE] Complete — returningUser: ${memory.isReturningUser}, knowledge agents: ${agentKnowledgeMap.size}, lessons: ${agentLessonsMap.size}, thread: ${activeThreadId || 'none'}`,
  );

  return {
    memory,
    networkMemoryText,
    agentKnowledgeMap,
    agentLessonsMap,
    agentRulesMap,
    promptOverrides,
    activeThreadId,
    recalledMemoryText,
    threadContext,
    walFactsExtracted,
    behavioralProfile,
    behavioralContextText,
  };
}

// ═══════════════════════════════════════════
// postAgentHook() — After EACH agent completes a round
// ═══════════════════════════════════════════

/**
 * Runs after each agent produces a report in a round:
 *   1. Persist round learnings — extract key facts/claims for inter-round sharing
 *
 * Returns the RoundLearning for accumulation.
 * When `memoryCtx` is set: incremental fact extraction (Haiku) + per-agent working-buffer row (non-blocking).
 */
export function postAgentHook(
  agentId: string,
  agentName: string,
  report: any,
  memoryCtx?: PostAgentMemoryContext,
): RoundLearning {
  const rl = persistRoundLearnings(agentId, agentName, report);

  const uid = memoryCtx?.userId;
  if (!uid || uid === 'anon') {
    return rl;
  }

  const simId = memoryCtx.simulationId;
  const bufRound = computeAgentBufferRoundNumber(memoryCtx.debateRound, agentId);
  const summary = `${agentName}: ${String(report?.key_argument ?? '').slice(0, 1800)}`;

  void saveToWorkingBuffer(simId, uid, bufRound, `agent_r${memoryCtx.debateRound}`, summary, agentId, null, null)
    .then(() => {
      console.log('[MEMORY:POST-AGENT] Saved to working buffer', agentName, 'bufRound', bufRound);
    })
    .catch((err) => memErr('saveToWorkingBuffer', err, { userId: uid, simulationId: simId }));

  void extractFactsFromAgentReport(uid, simId, memoryCtx.question, agentName, report as Record<string, unknown>)
    .then((n) => {
      if (n > 0) {
        console.log('[MEMORY:POST-AGENT] Extracted', n, 'applied fact(s) from', agentName);
      }
    })
    .catch((err) => memErr('extractFactsFromAgentReport', err, { userId: uid, simulationId: simId }));

  return rl;
}

// ═══════════════════════════════════════════
// postSimHook() — ALL post-simulation memory operations
// ═══════════════════════════════════════════

/**
 * Post-sim order (sequential 1–4 must stay in order):
 *   1. saveExperience — other steps may assume the row exists for counts / reflect
 *   2. extractAndSaveFacts
 *   3. extractOpinionsAndObservations + apply
 *   4. cognify
 *   Then fire-and-forget: evaluate (incl. writeAgentLessons), session, team, procedural,
 *   reflect, runMemoryOptimization, optimizeAllAgents, monitorAndRollback, behavioral snapshot.
 *   Finally: maybeRegenerateProfile (awaited last).
 *
 * NOTE: saveSimulation() is NOT included — engine calls it separately.
 *
 * Returns reflectSimCount for SSE: non-zero when experience count is a multiple of 5
 * (after the row from saveExperience is visible — call only after step 1 completes).
 */
export type PostSimHookResult = { reflectSimCount: number };

export async function postSimHook(
  userId: string,
  simId: string,
  question: string,
  verdict: unknown,
  agentReports: Map<string, any>,
  activeThreadId: string
): Promise<PostSimHookResult> {
  const reportsObj = Object.fromEntries(agentReports.entries());
  const ctx = { userId, simulationId: simId };

  console.log('[MEMORY:POST-SIM] postSimHook starting', ctx);

  let factApplied = 0;
  let opinionsApplied = 0;
  let observationsSaved = 0;
  let reflectSimCount = 0;

  // ── 1. saveExperience (FIRST) ──
  try {
    console.log('[MEMORY:POST-SIM] Saving experience…');
    await saveExperience(userId, simId, question, verdict as Record<string, unknown>);
    console.log('[MEMORY:POST-SIM] Experience saved');
  } catch (err) {
    console.error('HOOK POST: Experience save failed:', err);
  }

  // ── 1b. Reflect cadence — must run after experience row exists ──
  try {
    reflectSimCount = await shouldReflect(userId);
    console.log('[MEMORY:POST-SIM] Reflection due count (after save):', reflectSimCount);
  } catch (err) {
    memErr('shouldReflect (post-save)', err, ctx);
  }

  // ── 2. Extract and save facts (full simulation) ──
  try {
    console.log('[MEMORY:POST-SIM] Extracting facts from full simulation…');
    factApplied = await extractAndSaveFacts(userId, simId, question, verdict, reportsObj);
    console.log('[MEMORY:POST-SIM] Full-run facts applied:', factApplied);
  } catch (err) {
    console.error('HOOK POST: Fact extraction failed:', err);
  }

  // ── 3. Opinions + observations ──
  try {
    console.log('[MEMORY:POST-SIM] Extracting opinions / observations…');
    const existingOpinions = await getUserOpinions(userId, 20);
    const { opinions, observations } = await extractOpinionsAndObservations(
      userId,
      simId,
      question,
      verdict,
      reportsObj,
      existingOpinions.map((o: Record<string, unknown>) => ({
        id: o.id as string,
        belief: o.belief as string,
        confidence: o.confidence as number,
        domain: o.domain as string,
      })),
    );
    if (opinions.length > 0) {
      opinionsApplied = await applyOpinionActions(userId, simId, opinions);
      console.log(`HOOK POST: ${opinionsApplied} opinion(s) applied`);
    }
    if (observations.length > 0) {
      observationsSaved = await saveObservations(userId, simId, observations);
      console.log(`HOOK POST: ${observationsSaved} observation(s) saved`);
    }
  } catch (err) {
    console.error('HOOK POST: Opinion/observation extraction failed:', err);
  }

  // ── 4. Cognify — knowledge graph ──
  try {
    console.log('[MEMORY:POST-SIM] Running cognify (knowledge graph)…');
    const v = verdict as Record<string, unknown> | null;
    const verdictSummary = v
      ? `Recommendation: ${v.recommendation}. Probability: ${v.probability}%. Risk: ${v.main_risk}. Action: ${v.next_action}.`
      : 'No verdict generated.';
    const agentSummaries = Array.from(agentReports.entries())
      .map(([id, r]) => `${r.agent_name || id} (${r.position}, ${r.confidence}/10): ${r.key_argument}`)
      .join('\n');
    const result = await cognify(userId, simId, question, verdictSummary, agentSummaries);
    console.log(
      `HOOK POST: Cognify — ${result.entity_count} entities, ${result.relation_count} relations, ${result.triplet_count} triplets`,
    );
  } catch (err) {
    memErr('cognify', err, ctx);
  }

  console.log(
    '[MEMORY:POST-SIM] Pipeline critical path done. facts:',
    factApplied,
    'opinions:',
    opinionsApplied,
    'observations:',
    observationsSaved,
  );

  // ── BACKGROUND (fire-and-forget) — ordered where dependencies matter ──

  // 5. evaluateAgentPerformance → writeAgentLessons (internal) + recordEvalScore
  evaluateAgentPerformance(userId, simId, question, agentReports, verdict)
    .then((evaluations) => {
      for (const eval_ of evaluations) {
        recordEvalScore(userId, eval_.agent_id, eval_.score).catch((err) =>
          memErr('recordEvalScore', err, { userId, simulationId: simId }),
        );
      }
    })
    .catch((err) => memErr('evaluateAgentPerformance (includes writeAgentLessons)', err, ctx));

  // Session + buffer (after critical persistence)
  if (activeThreadId) {
    saveSessionSummary(activeThreadId, simId, userId, question, verdict, agentReports).catch((err) =>
      memErr('saveSessionSummary', err, ctx),
    );
  }
  clearWorkingBuffer(simId).catch((err) => memErr('clearWorkingBuffer', err, ctx));

  // 6. Team insights
  extractTeamInsights(userId, simId)
    .then((n) => {
      if (n > 0) console.log(`HOOK POST: Team memory — ${n} insight(s) extracted/reinforced`);
    })
    .catch((err) => memErr('extractTeamInsights', err, ctx));

  // 7. Procedural rules
  extractAllAgentRules(userId)
    .then((n) => {
      if (n > 0) console.log(`HOOK POST: Procedural — ${n} rule(s) extracted/updated`);
    })
    .catch((err) => memErr('extractAllAgentRules', err, ctx));

  // 8. Reflect (needs experiences including this sim)
  reflectOnExperiences(userId)
    .then((r) => {
      if (r.opinions > 0 || r.observations > 0 || r.misses > 0) {
        console.log(`HOOK POST: Reflect — ${r.opinions} opinions, ${r.observations} observations, ${r.misses} misses`);
      }
    })
    .catch((err) => memErr('reflectOnExperiences', err, ctx));

  // Memory optimization (batch hygiene)
  runMemoryOptimization(userId)
    .then((r) => {
      if (r.consolidated > 0 || r.pruned > 0) {
        console.log(`HOOK POST: Optimize — consolidated=${r.consolidated}, pruned=${r.pruned}, strengthened=${r.strengthened}, derived=${r.derived}`);
      }
    })
    .catch((err) => memErr('runMemoryOptimization', err, ctx));

  // 9. Multi-prompt optimization (uses eval scores from step 5)
  optimizeAllAgents(userId)
    .then((results) => {
      const promoted = results.filter((r) => r.action === 'promoted');
      if (promoted.length > 0) {
        console.log(`HOOK POST: Multi-opt — ${promoted.length} agents promoted: ${promoted.map((r) => r.agentId).join(', ')}`);
      }
    })
    .catch((err) => memErr('optimizeAllAgents', err, ctx));

  monitorAndRollback(userId)
    .then((rolledBack) => {
      if (rolledBack.length > 0) {
        console.log(`HOOK POST: Rollback — ${rolledBack.join(', ')} reverted to previous version`);
      }
    })
    .catch((err) => memErr('monitorAndRollback', err, ctx));

  // Behavioral re-inference (simulation count)
  if (supabase) {
    supabase
      .from('simulations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count: simCount, error }) => {
        if (error) {
          memErr('inferBehavioralProfile(precheck simulations count)', error, ctx);
          return;
        }
        if (simCount && simCount % 10 === 0 && simCount >= 5) {
          inferBehavioralProfile(userId)
            .then(() => console.log(`HOOK POST: Behavioral profile re-inferred after ${simCount} sims`))
            .catch((err) => memErr('inferBehavioralProfile', err, ctx));
        }
      })
      .catch((err) => memErr('simulations count query (behavioral)', err, ctx));
  }

  // 10. Profile regen LAST (awaited — uses new facts / opinions / graph)
  try {
    await maybeRegenerateProfile(userId);
  } catch (err) {
    memErr('maybeRegenerateProfile', err, ctx);
  }

  return { reflectSimCount };
}

// ═══════════════════════════════════════════
// HELPER: Build full agent context (knowledge + lessons)
// ═══════════════════════════════════════════

/**
 * Combine per-agent knowledge and per-agent lessons into one context string.
 * Convenience function so the engine doesn't have to do this manually.
 */
export function buildAgentContext(
  agentId: string,
  agentKnowledgeMap: Map<string, string>,
  agentLessonsMap: Map<string, string>,
  agentRulesMap?: Map<string, string>
): string {
  const knowledge = agentKnowledgeMap.get(agentId) || '';
  const lessons = agentLessonsMap.get(agentId) || '';
  const rules = agentRulesMap?.get(agentId) || '';
  const combined = [knowledge, lessons, rules].filter(Boolean).join('\n');
  return truncateAgentMemoryContext(combined);
}
