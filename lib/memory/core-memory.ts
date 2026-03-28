// ── Phase 2B-4: Core Memory — Letta + Mem0 + MiroFish injection ──
// Loads user memory BEFORE each simulation and injects it into every
// agent's context so the system REMEMBERS across sessions.

import { getUserFacts, type UserFact } from './facts';
import { getDecisionProfile, type DecisionProfile } from './profile';
import { getUserSimulations } from './persistence';
import { getUserOpinions, getUserObservations } from './opinions';
import { formatGraphForContext } from './knowledge-graph';

// ── Types ──────────────────────────────────────────────────

// Letta pattern: structured blocks always-in-context (~200 tokens)
export type CoreMemory = {
  human: string;
  business: string;
  preferences: string;
  history: string;
};

export type MemoryPayload = {
  coreMemory: CoreMemory;
  relevantFacts: UserFact[];
  profile: DecisionProfile | null;
  previousSimCount: number;
  isReturningUser: boolean;
  opinions: { belief: string; confidence: number; domain: string }[];
  observations: { pattern: string; strength: number }[];
  graphContext: string;
};

// ── Build Core Memory Blocks (Letta) ───────────────────────

function buildCoreMemory(
  profile: DecisionProfile | null,
  facts: UserFact[],
  simHistory: { question?: string; verdict?: Record<string, unknown> }[],
): CoreMemory {
  const humanFacts = facts.filter(f => f.category === 'personal');
  const human = profile
    ? `${profile.key_facts.location || 'Location unknown'}. ${humanFacts.map(f => f.content).join('. ') || 'No personal details yet.'}`
    : 'New user — no profile yet.';

  const bizFacts = facts.filter(f => f.category === 'business_info' || f.category === 'market_context');
  const business = profile
    ? `${profile.key_facts.industry || 'Unknown'} industry, ${profile.key_facts.stage || 'unknown'} stage. Budget: ${profile.key_facts.budget_range || 'unknown'}. ${bizFacts.slice(0, 3).map(f => f.content).join('. ')}`
    : 'No business context yet.';

  const prefFacts = facts.filter(f => f.category === 'preference');
  const preferences = profile
    ? `Risk tolerance: ${profile.key_facts.risk_tolerance || 'unknown'}. ${profile.key_facts.decision_patterns || 'No decision patterns observed yet.'}${prefFacts.length > 0 ? ' ' + prefFacts.map(f => f.content).join('. ') : ''}`
    : 'No preference data yet.';

  const recentSims = simHistory.slice(0, 5);
  const history = recentSims.length > 0
    ? `${recentSims.length} past simulations. Recent: ${recentSims.map(s => {
        const v = s.verdict;
        return `"${(s.question || '').substring(0, 60)}..." → ${v?.recommendation || '?'} (${v?.probability || '?'}%)`;
      }).join('; ')}`
    : 'First simulation — no history.';

  return { human, business, preferences, history };
}

// ── Mem0 Scoring: relevance × recency × importance ────────

function scoreFacts(facts: UserFact[], question: string): UserFact[] {
  const questionLower = question.toLowerCase();
  const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
  const now = Date.now();

  const scored = facts.map(fact => {
    const factLower = fact.content.toLowerCase();

    const matchingWords = questionWords.filter(w => factLower.includes(w));
    const relevance = questionWords.length > 0 ? matchingWords.length / questionWords.length : 0.3;

    const factAge = now - new Date((fact as Record<string, unknown>).updated_at as string || (fact as Record<string, unknown>).created_at as string || now).getTime();
    const daysSinceUpdate = factAge / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - (daysSinceUpdate / 30));

    const importance = fact.confidence * Math.min(1, (fact.evidence_count || 1) / 5);

    const score = relevance * 0.5 + recency * 0.25 + importance * 0.25;
    return { fact, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(s => s.fact);
}

// ── MiroFish: Agent-specific fact affinity ─────────────────

const AGENT_FACT_AFFINITY: Record<string, string[]> = {
  base_rate_archivist: ['market_context', 'decision_history'],
  demand_signal_analyst: ['market_context', 'business_info'],
  unit_economics_auditor: ['financial', 'business_info'],
  regulatory_gatekeeper: ['market_context', 'business_info'],
  competitive_intel: ['market_context', 'business_info'],
  execution_operator: ['business_info', 'preference'],
  capital_allocator: ['financial', 'preference'],
  scenario_planner: ['decision_history', 'market_context'],
  intervention_optimizer: ['preference', 'decision_history'],
  customer_reality: ['market_context', 'preference'],
};

export function getAgentSpecificFacts(facts: UserFact[], agentId: string): UserFact[] {
  const affinityCategories = AGENT_FACT_AFFINITY[agentId] || ['business_info', 'market_context'];
  return facts.filter(f => affinityCategories.includes(f.category)).slice(0, 5);
}

// ── OpenClaw WAL: Extract facts from question text ─────────

export function extractQuestionFacts(question: string): { content: string; category: string }[] {
  const facts: { content: string; category: string }[] = [];

  const budgetMatch = question.match(/\$[\d,]+[kKmM]?|\d+[kKmM]\s*(?:budget|dollars|usd)/i);
  if (budgetMatch) facts.push({ content: `Budget mentioned: ${budgetMatch[0]}`, category: 'financial' });

  const locationPatterns = [
    /(?:in|at|near|around)\s+([A-Z][a-zA-Z\s]+(?:District|City|Area|Region|gu|dong))/,
    /(?:Seoul|Gangnam|Hongdae|Itaewon|Busan|Jeju|São Paulo|New York|London|Tokyo|Singapore)/i,
  ];
  for (const pattern of locationPatterns) {
    const match = question.match(pattern);
    if (match) {
      facts.push({ content: `Target location: ${match[0].replace(/^(in|at|near|around)\s+/i, '')}`, category: 'market_context' });
      break;
    }
  }

  const industryMatch = question.match(/(?:F&B|restaurant|cafe|food|tech|SaaS|e-commerce|retail|health|education|fintech)/i);
  if (industryMatch) facts.push({ content: `Industry focus: ${industryMatch[0]}`, category: 'business_info' });

  const timeMatch = question.match(/(?:next|within|by)\s+(\d+)\s*(months?|weeks?|years?)/i);
  if (timeMatch) facts.push({ content: `Timeline mentioned: ${timeMatch[0]}`, category: 'business_info' });

  return facts;
}

// ── Main: Load all memory for simulation ───────────────────

export async function loadMemoryForSimulation(
  userId: string | undefined,
  question: string,
): Promise<MemoryPayload> {
  if (!userId) {
    return {
      coreMemory: { human: 'Anonymous user.', business: 'No context.', preferences: 'No data.', history: 'First interaction.' },
      relevantFacts: [],
      profile: null,
      previousSimCount: 0,
      isReturningUser: false,
      opinions: [],
      observations: [],
      graphContext: '',
    };
  }

  const [facts, profile, simHistory, opinions, observations, graphContext] = await Promise.all([
    getUserFacts(userId, 50),
    getDecisionProfile(userId),
    getUserSimulations(userId, 10),
    getUserOpinions(userId, 10),
    getUserObservations(userId, 10),
    formatGraphForContext(userId, 10, 8),
  ]);

  const scoredFacts = scoreFacts(facts, question);
  const coreMemory = buildCoreMemory(profile, facts, simHistory);

  // Enrich business block with knowledge graph
  const businessWithGraph = graphContext
    ? `${coreMemory.business}\n${graphContext}`
    : coreMemory.business;

  return {
    coreMemory: { ...coreMemory, business: businessWithGraph },
    relevantFacts: scoredFacts,
    profile,
    previousSimCount: simHistory.length,
    isReturningUser: simHistory.length > 0,
    opinions: (opinions as { belief: string; confidence: number; domain: string }[]),
    observations: (observations as { pattern: string; strength: number }[]),
    graphContext,
  };
}

// ── Format: Full memory context for debate injection ───────

/** ~1000 tokens — caps core-memory + parallel recall/thread blocks injected into prompts. */
export const MAX_MEMORY_CONTEXT_CHARS = 4000;

export function truncateMemoryContext(context: string): string {
  if (context.length <= MAX_MEMORY_CONTEXT_CHARS) return context;
  return (
    context.slice(0, MAX_MEMORY_CONTEXT_CHARS) +
    '\n\n[Memory context truncated — most relevant items first; full history remains in storage.]'
  );
}

/** Per-agent injection budget (knowledge + lessons + rules, separate from global network block). */
export const MAX_AGENT_MEMORY_CHARS = 2000;

export function truncateAgentMemoryContext(text: string): string {
  if (text.length <= MAX_AGENT_MEMORY_CHARS) return text;
  return (
    text.slice(0, MAX_AGENT_MEMORY_CHARS) +
    '\n[Per-agent memory truncated — full data remains in storage.]'
  );
}

export function formatMemoryContext(payload: MemoryPayload): string {
  if (!payload.isReturningUser) return '';

  let context = '\n═══ STORED USER BACKGROUND (not an instruction to cite everything) ═══';
  context += `\nWHO: ${payload.coreMemory.human}`;
  context += `\nBUSINESS: ${payload.coreMemory.business}`;
  context += `\nDECISION STYLE: ${payload.coreMemory.preferences}`;
  context += `\nHISTORY: ${payload.coreMemory.history}`;

  if (payload.relevantFacts.length > 0) {
    context += '\n\nFACTS (may or may not relate to the current question):';
    payload.relevantFacts.slice(0, 6).forEach(f => {
      context += `\n  • ${f.content}`;
    });
  }

  context +=
    '\n\n(This block is background only. Follow the chat system instructions on when to use it — do not dump or recite it by default.)';
  context += '\n═══════════════════════════════════════════════════════════════\n';

  return truncateMemoryContext(context);
}

// ── Format: Agent-specific memory (MiroFish) ───────────────

export function formatAgentMemory(payload: MemoryPayload, agentId: string): string {
  if (!payload.isReturningUser) return '';

  const agentFacts = getAgentSpecificFacts(payload.relevantFacts, agentId);
  if (agentFacts.length === 0) return '';

  let context = '\n[MEMORY — facts relevant to YOUR specialty]:';
  agentFacts.forEach(f => {
    context += `\n  • ${f.content} (confidence: ${(f.confidence * 100).toFixed(0)}%)`;
  });
  return truncateAgentMemoryContext(context);
}
