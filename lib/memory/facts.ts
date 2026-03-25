// ── Phase 2B-2: Mem0 Pattern — Extract & Store User Facts ────
// After each simulation, Haiku extracts business facts about the
// user and persists them to Supabase for future context injection.

import { callClaude, parseJSON } from '../simulation/claude';
import { supabase } from './supabase';
import { addFact, invalidateFact, temporalUpdateFact, resolveContradictions } from './temporal';

// ── Types ──────────────────────────────────────────────────

export type UserFact = {
  id?: string;
  user_id: string;
  content: string;
  category: 'business_info' | 'market_context' | 'financial' | 'personal' | 'preference' | 'decision_history';
  confidence: number;
  evidence_count: number;
  source_simulation: string;
  metadata: Record<string, unknown>;
};

export type FactAction = {
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP';
  fact: string;
  category: UserFact['category'];
  confidence: number;
  reason: string;
  existing_fact_id?: string;
};

// ── Extract ────────────────────────────────────────────────

export async function extractFacts(
  userId: string,
  simulationId: string,
  question: string,
  verdict: unknown,
  agentReports: Record<string, unknown>,
): Promise<FactAction[]> {
  const existingFacts = await getUserFacts(userId);
  const existingFactsText = existingFacts
    .map(f => `[${f.id}] ${f.content} (${f.category}, confidence: ${f.confidence})`)
    .join('\n');

  const agentSummary = Object.entries(agentReports)
    .map(([id, reports]) => {
      const latest = Array.isArray(reports) ? reports[reports.length - 1] : reports;
      return `${(latest as Record<string, string>).agent_name || id}: ${(latest as Record<string, string>).key_argument || ''}`;
    })
    .join('\n');

  const response = await callClaude({
    systemPrompt: `You are a fact extraction system for Octux AI. After each simulation, you extract BUSINESS FACTS about the user that would be useful in future simulations.

WHAT TO EXTRACT:
- Business details: industry, location, target market, business model
- Financial info: budget, revenue, runway, funding stage
- Market context: competitors mentioned, market size, geographic focus
- Personal context: role, experience level, risk tolerance
- Preferences: what they value (speed vs quality, growth vs profit)
- Decision history: what they decided before, what worked/failed

RULES:
- Extract 3-8 facts per simulation (not more)
- Each fact must be a SPECIFIC, CONCRETE statement — not vague
- For each fact, decide: ADD (new fact), UPDATE (modify existing), DELETE (contradicted), or NOOP (already known)
- Confidence: 0.9 if explicitly stated by user, 0.7 if strongly implied, 0.5 if inferred
- Category must be one of: business_info, market_context, financial, personal, preference, decision_history
- If a fact contradicts an existing one, UPDATE the existing fact
- Return valid JSON array only`,
    userMessage: `USER'S QUESTION: "${question}"

VERDICT: ${JSON.stringify(verdict)}

AGENT ANALYSIS SUMMARY:
${agentSummary}

EXISTING USER FACTS:
${existingFactsText || 'No existing facts — this is a new user.'}

Extract facts. JSON array:
[
  {
    "action": "ADD|UPDATE|DELETE|NOOP",
    "fact": "specific fact statement",
    "category": "business_info|market_context|financial|personal|preference|decision_history",
    "confidence": 0.5-0.9,
    "reason": "why this fact matters for future simulations",
    "existing_fact_id": "uuid if UPDATE or DELETE"
  }
]`,
    maxTokens: 1024,
  });

  try {
    return parseJSON<FactAction[]>(response);
  } catch {
    console.error('[facts] Failed to parse fact extraction response');
    return [];
  }
}

// ── Apply ──────────────────────────────────────────────────

export async function applyFactActions(
  userId: string,
  simulationId: string,
  actions: FactAction[],
): Promise<number> {
  let appliedCount = 0;

  for (const action of actions) {
    try {
      switch (action.action) {
        case 'ADD': {
          const newId = await addFact(
            userId,
            action.fact,
            action.category || 'business_info',
            action.confidence || 0.8,
            simulationId
          );
          if (newId) appliedCount++;
          break;
        }

        case 'UPDATE': {
          if (action.existing_fact_id) {
            const newId = await temporalUpdateFact(
              userId,
              action.existing_fact_id,
              action.fact,
              action.confidence || 0.8,
              action.category || 'business_info',
              simulationId
            );
            if (newId) appliedCount++;
          }
          break;
        }

        case 'DELETE': {
          if (action.existing_fact_id) {
            const success = await invalidateFact(
              action.existing_fact_id,
              action.reason || 'Retracted by fact extraction'
            );
            if (success) appliedCount++;
          }
          break;
        }

        case 'NOOP':
        default:
          break;
      }
    } catch (err) {
      console.error(`[temporal] Failed to apply ${action.action}:`, err);
    }
  }

  // After all actions, resolve contradictions (fire-and-forget)
  if (appliedCount > 0) {
    resolveContradictions(userId, simulationId)
      .then(n => { if (n > 0) console.log(`[temporal] ${n} contradiction(s) auto-resolved`); })
      .catch(err => console.error('[temporal] resolve error (non-blocking):', err));
  }

  return appliedCount;
}

// ── Read ───────────────────────────────────────────────────

export async function getUserFacts(userId: string, limit = 15): Promise<UserFact[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('user_facts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('confidence', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as UserFact[];
}

// ── Format for Context Injection ───────────────────────────

export function formatFactsForContext(facts: UserFact[]): string {
  if (facts.length === 0) return '';

  const grouped: Record<string, UserFact[]> = {};
  for (const fact of facts) {
    if (!grouped[fact.category]) grouped[fact.category] = [];
    grouped[fact.category].push(fact);
  }

  let output = '\nUSER CONTEXT (from previous interactions):';
  for (const [category, categoryFacts] of Object.entries(grouped)) {
    const label = category.replace(/_/g, ' ').toUpperCase();
    output += `\n${label}:`;
    for (const fact of categoryFacts) {
      output += `\n  • ${fact.content} (confidence: ${(fact.confidence * 100).toFixed(0)}%)`;
    }
  }
  output += '\n\nUse this context to make your analysis more relevant and specific to this user. Reference their known situation when applicable.';

  return output;
}

// ── WAL Protocol (OpenClaw) — Extract facts from question BEFORE sim ──

export async function parseQuestionForFacts(
  userId: string,
  question: string,
): Promise<FactAction[]> {
  const existingFacts = await getUserFacts(userId);
  const existingText = existingFacts.length > 0
    ? existingFacts.map(f => `[${f.id}] ${f.content} (${f.category})`).join('\n')
    : 'No existing facts.';

  const response = await callClaude({
    systemPrompt: `You are a fact pre-processor for Octux AI. Before a simulation runs, you scan the user's question for EXPLICIT facts about them or their situation.

EXTRACT ONLY facts that are DIRECTLY STATED in the question:
- Budget amounts: "$50K budget" → ADD financial fact
- Locations: "in Gangnam" → ADD business_info
- Industry: "pet food business" → ADD business_info
- Timeline: "launching in 3 months" → ADD business_info
- Corrections: "actually my budget is $80K not $50K" → UPDATE
- Team size: "just me and a co-founder" → ADD personal

DO NOT extract:
- The question itself (that's not a fact)
- Opinions or hypotheticals ("should I...")
- Things the user is asking ABOUT (not facts about them)

If the question contains NO personal/business facts, return empty array [].
Return valid JSON array only. Be conservative — better to miss a fact than hallucinate one.`,
    userMessage: `USER'S QUESTION: "${question}"

EXISTING USER FACTS:
${existingText}

Extract facts from the question. If a fact contradicts an existing one, use UPDATE with the existing_fact_id. JSON array:
[
  {
    "action": "ADD|UPDATE|DELETE|NOOP",
    "fact": "specific fact",
    "category": "business_info|market_context|financial|personal|preference|decision_history",
    "confidence": 0.9,
    "reason": "directly stated in question",
    "existing_fact_id": "uuid if UPDATE"
  }
]`,
    maxTokens: 512,
  });

  try {
    const actions = parseJSON<FactAction[]>(response);
    return actions.filter(a => a.action !== 'NOOP' && a.confidence >= 0.7);
  } catch {
    return [];
  }
}

// ── Background Entrypoint ──────────────────────────────────

export async function extractAndSaveFacts(
  userId: string,
  simulationId: string,
  question: string,
  verdict: unknown,
  agentReports: Record<string, unknown>,
): Promise<void> {
  try {
    const actions = await extractFacts(userId, simulationId, question, verdict, agentReports);
    if (actions.length > 0) {
      const applied = await applyFactActions(userId, simulationId, actions);
      console.log(`[facts] Extracted ${actions.length} facts, applied ${applied} for user ${userId}`);
    } else {
      console.log(`[facts] No facts extracted for simulation ${simulationId}`);
    }
  } catch (err) {
    console.error('[facts] Extraction failed (non-blocking):', err);
  }
}
