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

import { parseQuestionForFacts, applyFactActions, extractAndSaveFacts } from './facts';
import { resolveContradictions } from './temporal';
import { loadMemoryForSimulation, formatMemoryContext, formatAgentMemory, type MemoryPayload } from './core-memory';
import { getTopKMemories } from './recall';
import { getOrCreateThread, accumulateThreadContext, saveSessionSummary, clearWorkingBuffer } from './session';
import { loadAllAgentLessons, evaluateAgentPerformance, persistRoundLearnings, type RoundLearning } from './agent-improvement';
import { buildAllAgentKnowledge } from './agent-knowledge';
import { saveExperience, getUserExperiences, formatExperiencesForContext } from './experiences';
import { extractOpinionsAndObservations, applyOpinionActions, saveObservations, getUserOpinions, formatOpinionsForContext, getUserObservations, formatObservationsForContext } from './opinions';
import { cognify } from './knowledge-graph';
import { maybeRegenerateProfile } from './profile';
import { reflectOnExperiences } from './reflect';
import { runMemoryOptimization } from './optimize';
import { extractAllAgentRules, loadAllAgentRules } from './procedural';
import { getAllActivePrompts, recordEvalScore } from './prompt-optimizer';
import { optimizeAllAgents, monitorAndRollback } from './multi-optimizer';
import { extractTeamInsights, injectTeamContext } from './team-memory';
import { inferBehavioralProfile } from './behavioral';
import { supabase } from './supabase';

// Re-export for engine convenience
export { formatRoundDiscoveries, type RoundLearning } from './agent-improvement';

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
};

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
  const [networkResult, knowledgeResult, lessonsResult, rulesResult, promptResult, teamResult, recallResult, threadResult, walResult] = await Promise.allSettled([
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
  ]);

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
    if (agentRulesMap.size > 0) {
      console.log(`HOOK PRE: Procedural rules for ${agentRulesMap.size} agents`);
    }
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

  // 8. Pre-sim contradiction resolution (fire-and-forget)
  resolveContradictions(userId)
    .then(n => { if (n > 0) console.log(`HOOK PRE: ${n} contradictions resolved`); })
    .catch(() => {});

  console.log(`HOOK PRE: Complete — memory: ${memory.isReturningUser ? 'returning' : 'new'}, knowledge: ${agentKnowledgeMap.size}, lessons: ${agentLessonsMap.size}`);

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
 * Always non-blocking — failures don't affect the sim.
 */
export function postAgentHook(
  agentId: string,
  agentName: string,
  report: any,
): RoundLearning {
  return persistRoundLearnings(agentId, agentName, report);
}

// ═══════════════════════════════════════════
// postSimHook() — ALL post-simulation memory operations
// ═══════════════════════════════════════════

/**
 * Consolidates everything that happens AFTER the simulation completes:
 *
 *   1. Extract and save facts (AWAITED — critical)
 *   2. Regenerate profile if needed (AWAITED — every 3 sims)
 *   3. Save experience (AWAITED — needed for reflect)
 *   4. Extract opinions + observations (AWAITED)
 *   5. Cognify — knowledge graph extraction (AWAITED — serverless)
 *   6. Evaluate agent performance (fire-and-forget)
 *   7. Save session summary + clear buffer (fire-and-forget)
 *   8. Reflect loop — every 5 sims (fire-and-forget)
 *   9. Memory optimization — every 10 sims (fire-and-forget)
 *
 * NOTE: saveSimulation() is NOT included — engine calls it separately.
 */
export async function postSimHook(
  userId: string,
  simId: string,
  question: string,
  verdict: unknown,
  agentReports: Map<string, any>,
  activeThreadId: string
): Promise<void> {
  const reportsObj = Object.fromEntries(agentReports.entries());

  // ── CRITICAL (awaited — serverless may shut down after generator ends) ──

  // 1. Extract and save facts
  try {
    await extractAndSaveFacts(userId, simId, question, verdict, reportsObj);
  } catch (err) {
    console.error('HOOK POST: Fact extraction failed:', err);
  }

  // 2. Regenerate profile if needed
  try {
    await maybeRegenerateProfile(userId);
  } catch (err) {
    console.error('HOOK POST: Profile regen failed:', err);
  }

  // 3. Save experience
  try {
    await saveExperience(userId, simId, question, verdict as Record<string, unknown>);
  } catch (err) {
    console.error('HOOK POST: Experience save failed:', err);
  }

  // 4. Extract opinions + observations (Hindsight Networks 3 & 4)
  try {
    const existingOpinions = await getUserOpinions(userId, 20);
    const { opinions, observations } = await extractOpinionsAndObservations(
      userId, simId, question, verdict, reportsObj,
      existingOpinions.map((o: Record<string, unknown>) => ({
        id: o.id as string,
        belief: o.belief as string,
        confidence: o.confidence as number,
        domain: o.domain as string,
      })),
    );
    if (opinions.length > 0) {
      const applied = await applyOpinionActions(userId, simId, opinions);
      console.log(`HOOK POST: ${applied} opinion(s) applied`);
    }
    if (observations.length > 0) {
      const saved = await saveObservations(userId, simId, observations);
      console.log(`HOOK POST: ${saved} observation(s) saved`);
    }
  } catch (err) {
    console.error('HOOK POST: Opinion/observation extraction failed:', err);
  }

  // 5. Cognify — knowledge graph extraction
  try {
    const v = verdict as Record<string, unknown> | null;
    const verdictSummary = v
      ? `Recommendation: ${v.recommendation}. Probability: ${v.probability}%. Risk: ${v.main_risk}. Action: ${v.next_action}.`
      : 'No verdict generated.';
    const agentSummaries = Array.from(agentReports.entries())
      .map(([id, r]) => `${r.agent_name || id} (${r.position}, ${r.confidence}/10): ${r.key_argument}`)
      .join('\n');
    const result = await cognify(userId, simId, question, verdictSummary, agentSummaries);
    console.log(`HOOK POST: Cognify — ${result.entity_count} entities, ${result.relation_count} relations`);
  } catch (err) {
    console.error('HOOK POST: Cognify failed:', err);
  }

  // ── BACKGROUND (fire-and-forget) ──

  // 6. Evaluate agent performance + write lessons + record eval scores per prompt version
  evaluateAgentPerformance(userId, simId, question, agentReports, verdict)
    .then(evaluations => {
      for (const eval_ of evaluations) {
        recordEvalScore(userId, eval_.agent_id, eval_.score)
          .catch(() => {});
      }
    })
    .catch(err => console.error('HOOK POST: Agent eval failed:', err));

  // 7. Save session summary + clear buffer
  if (activeThreadId) {
    saveSessionSummary(activeThreadId, simId, userId, question, verdict, agentReports)
      .catch(err => console.error('HOOK POST: Session summary failed:', err));
  }
  clearWorkingBuffer(simId)
    .catch(err => console.error('HOOK POST: Buffer clear failed:', err));

  // 8. Team insights — every 5 sims (Agno team memory)
  extractTeamInsights(userId, simId)
    .then(n => {
      if (n > 0) console.log(`HOOK POST: Team memory — ${n} insight(s) extracted/reinforced`);
    })
    .catch(err => console.error('HOOK POST: Team memory failed:', err));

  // 9. Reflect loop — every 5 sims
  reflectOnExperiences(userId)
    .then(r => {
      if (r.opinions > 0 || r.observations > 0 || r.misses > 0) {
        console.log(`HOOK POST: Reflect — ${r.opinions} opinions, ${r.observations} observations, ${r.misses} misses`);
      }
    })
    .catch(err => console.error('HOOK POST: Reflect failed:', err));

  // 9. Memory optimization — every 10 sims
  runMemoryOptimization(userId)
    .then(r => {
      if (r.consolidated > 0 || r.pruned > 0) {
        console.log(`HOOK POST: Optimize — consolidated=${r.consolidated}, pruned=${r.pruned}, strengthened=${r.strengthened}, derived=${r.derived}`);
      }
    })
    .catch(err => console.error('HOOK POST: Optimize failed:', err));

  // 10. Procedural rule extraction — every 10 sims (LangMem)
  extractAllAgentRules(userId)
    .then(n => {
      if (n > 0) console.log(`HOOK POST: Procedural — ${n} rule(s) extracted/updated`);
    })
    .catch(err => console.error('HOOK POST: Procedural rules failed:', err));

  // 11. Multi-prompt optimization — every 20 sims (LangMem coordinated)
  // Replaces P19's per-agent loop with coordinated batch
  optimizeAllAgents(userId)
    .then(results => {
      const promoted = results.filter(r => r.action === 'promoted');
      if (promoted.length > 0) {
        console.log(`HOOK POST: Multi-opt — ${promoted.length} agents promoted: ${promoted.map(r => r.agentId).join(', ')}`);
      }
    })
    .catch(err => console.error('HOOK POST: Multi-opt failed:', err));

  // 12. Regression monitoring — check if recently promoted agents are underperforming
  // Cheap — just DB checks, no LLM calls. Runs every sim.
  monitorAndRollback(userId)
    .then(rolledBack => {
      if (rolledBack.length > 0) {
        console.log(`HOOK POST: Rollback — ${rolledBack.join(', ')} reverted to previous version`);
      }
    })
    .catch(err => console.error('HOOK POST: Monitor/rollback failed:', err));

  // 13. Behavioral profile inference — every 10 sims
  if (supabase) {
    Promise.resolve(supabase.from('simulations').select('id', { count: 'exact', head: true }).eq('user_id', userId))
      .then(({ count: simCount }) => {
        if (simCount && simCount % 10 === 0 && simCount >= 5) {
          inferBehavioralProfile(userId)
            .then(() => console.log(`HOOK POST: Behavioral profile re-inferred after ${simCount} sims`))
            .catch(err => console.error('HOOK POST: Behavioral inference failed:', err));
        }
      })
      .catch(() => {});
  }
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
  return [knowledge, lessons, rules].filter(Boolean).join('\n');
}
