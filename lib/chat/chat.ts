/**
 * Octux Decision Chat — Memory-powered conversational AI.
 *
 * Every response is informed by the user's COMPLETE decision history,
 * behavioral profile, knowledge graph, and accumulated facts.
 */

import { supabase } from '../memory/supabase';
import { callClaude } from '../simulation/claude';
import { loadMemoryForSimulation, formatMemoryContext } from '../memory/core-memory';
import { getTopKMemories } from '../memory/recall';
import { getOrCreateProfile, formatBehavioralContext } from '../memory/behavioral';
import { formatGraphForContext } from '../memory/knowledge-graph';
import { detectDomain, getDisclaimer } from '../simulation/domain';
import { parseQuestionForFacts, applyFactActions } from '../memory/facts';
import { getModelForTier, type ModelTier, TIER_CONFIGS } from './tiers';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatResponse = {
  response: string;
  tier: ModelTier;
  suggestSimulation: boolean;
  simulationPrompt?: string;
  factsExtracted: number;
  disclaimer?: string;
  relatedSimulations?: { id: string; question: string; verdict: string }[];
};

// ═══════════════════════════════════════════
// buildChatContext() — Assemble full memory context
// ═══════════════════════════════════════════

async function buildChatContext(userId: string, currentMessage: string): Promise<string> {
  const [memoryPayload, topKMemories, behavioralProfile, graphContext] = await Promise.all([
    loadMemoryForSimulation(userId, currentMessage),
    getTopKMemories(userId, currentMessage, 10),
    getOrCreateProfile(userId),
    formatGraphForContext(userId, 10, 8),
  ]);

  const sections: string[] = [];

  // Core memory (who is this person)
  if (memoryPayload) {
    const memCtx = formatMemoryContext(memoryPayload);
    if (memCtx) sections.push(memCtx);
  }

  // Behavioral context (how to communicate with them)
  const behavioralText = formatBehavioralContext(behavioralProfile);
  if (behavioralText) sections.push(behavioralText);

  // Relevant memories (facts, experiences, opinions related to this question)
  if (topKMemories) sections.push(topKMemories);

  // Knowledge graph (entities and relationships)
  if (graphContext) sections.push(graphContext);

  // Recent simulations summary (last 3)
  if (supabase) {
    const { data: recentSims } = await supabase
      .from('simulations')
      .select('id, question, verdict, domain, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentSims && recentSims.length > 0) {
      const simSummary = recentSims.map(s => {
        const v = s.verdict as any;
        const q = (s.question || '').substring(0, 60);
        const rec = (v?.recommendation || '?').toUpperCase();
        const prob = v?.probability || 0;
        return `  • "${q}..." → ${rec} (${prob}%) [${s.domain || 'business'}]`;
      }).join('\n');
      sections.push(`\nRECENT SIMULATIONS:\n${simSummary}`);
    }
  }

  return sections.filter(Boolean).join('\n\n');
}

// ═══════════════════════════════════════════
// chatWithMemory() — Main chat function
// ═══════════════════════════════════════════

export async function chatWithMemory(
  userId: string,
  message: string,
  history: ChatMessage[],
  tier: ModelTier = 'ink'
): Promise<ChatResponse> {
  // 1. Build full memory context
  const memoryContext = await buildChatContext(userId, message);

  // 2. Detect domain for potential disclaimer
  const domain = await detectDomain(message);
  const disclaimer = getDisclaimer(domain.domain);

  // 3. WAL: extract any new facts from the user's message
  let factsExtracted = 0;
  try {
    const walFacts = await parseQuestionForFacts(userId, message);
    if (walFacts.length > 0) {
      await applyFactActions(userId, 'chat', walFacts);
      factsExtracted = walFacts.length;
    }
  } catch {} // non-blocking

  // 4. Build conversation with memory
  const systemPrompt = buildChatSystemPrompt(memoryContext, tier);

  const messages = [
    ...history.slice(-8).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // 5. Call Claude with appropriate model
  const model = getModelForTier(tier);
  const maxTokens = TIER_CONFIGS[tier].maxTokens;

  const response = await callClaude({
    systemPrompt,
    userMessage: messages.map(m => `${m.role === 'user' ? 'User' : 'Octux'}: ${m.content}`).join('\n\n') + '\n\nOctux:',
    maxTokens,
    model,
  });

  // 6. Detect if this question deserves a full simulation
  const simSuggestion = detectSimulationOpportunity(message);

  // 7. Find related past simulations
  const relatedSims = await findRelatedSimulations(userId, message);

  // 8. Save chat messages
  if (supabase) {
    const now = new Date().toISOString();
    await supabase.from('chat_messages').insert([
      { user_id: userId, role: 'user', content: message, model_tier: tier, created_at: now },
      { user_id: userId, role: 'assistant', content: response, model_tier: tier, created_at: now },
    ]);
  }

  return {
    response,
    tier,
    suggestSimulation: simSuggestion.suggest,
    simulationPrompt: simSuggestion.prompt,
    factsExtracted,
    disclaimer: disclaimer || undefined,
    relatedSimulations: relatedSims,
  };
}

// ═══════════════════════════════════════════
// System prompt builder
// ═══════════════════════════════════════════

function buildChatSystemPrompt(memoryContext: string, tier: ModelTier): string {
  const tierLabel = TIER_CONFIGS[tier].label;

  return `You are Octux AI — a Decision Operating System with memory.
You are currently in ${tierLabel} mode (${tier === 'kraken' ? 'maximum reasoning power' : tier === 'deep' ? 'deep analysis' : 'fast and smart'}).

You are NOT a generic chatbot. You are a decision advisor who KNOWS this user personally from accumulated interaction history. Use the context below to give PERSONALIZED responses.

${memoryContext}

BEHAVIOR RULES:
1. ALWAYS reference the user's known context when relevant. "Based on your F&B plans in Gangnam..." not "In general, Gangnam..."
2. If the user mentions NEW facts about themselves (budget change, new plans, etc.), acknowledge them — the system will save these automatically.
3. If the question is SMALL (factual, quick opinion), answer directly. Be concise.
4. If the question is BIG (major decision, multiple factors, high stakes), answer but ALSO suggest: "This looks like a decision worth a full simulation. Want me to run one?" Include a suggested simulation prompt.
5. If the user asks about a PAST simulation, reference the specific verdict, probability, and key risk.
6. If the user wants to TWEAK a past simulation ("what if budget was $100K?"), provide a quick analysis based on the existing simulation data — don't suggest re-running the whole thing unless the change is fundamental.
7. Adapt your tone to the user's behavioral profile (if loaded above).
8. For investment/legal/health questions, always include the appropriate disclaimer.
9. Be warm but professional. You're a trusted advisor, not a sycophant.
10. If you don't know something, say so. Don't hallucinate facts about the user.`;
}

// ═══════════════════════════════════════════
// Simulation upsell detection
// ═══════════════════════════════════════════

function detectSimulationOpportunity(message: string): { suggest: boolean; prompt?: string } {
  const msg = message.toLowerCase();

  const bigDecisionSignals = [
    'should i', 'is it worth', 'pros and cons', 'what do you think about',
    'good idea to', 'bad idea to', 'invest in', 'start a', 'open a',
    'launch', 'hire', 'fire', 'quit', 'accept', 'decline', 'buy', 'sell',
    'move to', 'switch to', 'pivot', 'expand', 'close', 'merge',
  ];

  const isBigDecision = bigDecisionSignals.some(signal => msg.includes(signal));

  if (message.length < 20 || !isBigDecision) {
    return { suggest: false };
  }

  const prompt = message.length > 150 ? message.substring(0, 147) + '...' : message;

  return { suggest: true, prompt };
}

// ═══════════════════════════════════════════
// Find related past simulations
// ═══════════════════════════════════════════

async function findRelatedSimulations(
  userId: string,
  message: string
): Promise<{ id: string; question: string; verdict: string }[]> {
  if (!supabase) return [];

  const { data: sims } = await supabase
    .from('simulations')
    .select('id, question, verdict')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!sims) return [];

  const msgWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  return sims
    .filter(s => {
      const q = ((s.question || '') as string).toLowerCase();
      return msgWords.some(w => q.includes(w));
    })
    .slice(0, 3)
    .map(s => ({
      id: s.id,
      question: ((s.question || '') as string).substring(0, 60),
      verdict: ((s.verdict as any)?.recommendation || 'unknown').toUpperCase(),
    }));
}
