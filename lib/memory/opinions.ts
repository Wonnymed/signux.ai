// ── Hindsight Networks 3 & 4: Opinions + Observations ───────
// Network 3: Beliefs with evolving confidence
// Network 4: Cross-simulation patterns

import { callClaude, parseJSON } from '../simulation/claude';
import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────

export type OpinionAction = {
  action: 'add' | 'update' | 'weaken';
  belief: string;
  domain: string;
  confidence: number;
  reason: string;
  existing_opinion_id?: string;
};

export type ObservationAction = {
  pattern: string;
  domain: string;
  strength: number;
  applicability: string;
};

// ── Extract from Simulation ────────────────────────────────

export async function extractOpinionsAndObservations(
  userId: string,
  simulationId: string,
  question: string,
  verdict: unknown,
  agentReports: Record<string, unknown>,
  existingOpinions: { id: string; belief: string; confidence: number; domain: string }[],
): Promise<{ opinions: OpinionAction[]; observations: ObservationAction[] }> {
  const agentSummary = Object.entries(agentReports)
    .map(([id, reports]) => {
      const latest = Array.isArray(reports) ? reports[reports.length - 1] : reports;
      const r = latest as Record<string, string>;
      return `${r.agent_name || id} (${r.position || '?'}): ${r.key_argument || ''}`;
    })
    .join('\n');

  const existingOpinionText = existingOpinions.length > 0
    ? existingOpinions.map(o => `[${o.id}] "${o.belief}" (confidence: ${o.confidence}, domain: ${o.domain})`).join('\n')
    : 'No existing opinions.';

  const response = await callClaude({
    systemPrompt: `You extract OPINIONS and OBSERVATIONS from a completed decision simulation.

OPINIONS = Beliefs the system should form or update. These are SUBJECTIVE assessments:
- "Gangnam is a viable location for F&B startups" (domain: market)
- "Korean FDA permits take 3-6 months minimum" (domain: regulatory)
- "This user tends to underestimate operational costs" (domain: financial)
Each opinion has a confidence (0.0-1.0) and a domain.

If an existing opinion should be UPDATED (strengthened), use "update" action with the existing ID.
If a new opinion should be FORMED, use "add" action.
If an opinion is CONTRADICTED by this simulation, use "weaken" action.

OBSERVATIONS = Cross-simulation patterns (only form with STRONG evidence):
- "Permit-first strategies succeed more often in regulated markets"
- "User's questions cluster around F&B and Gangnam — likely their core focus"

Return valid JSON only. Be conservative — fewer high-quality items.`,
    userMessage: `QUESTION: "${question}"
VERDICT: ${JSON.stringify(verdict)}
AGENT ANALYSIS:
${agentSummary}

EXISTING OPINIONS:
${existingOpinionText}

Extract opinions and observations. JSON:
{
  "opinions": [
    {
      "action": "add|update|weaken",
      "belief": "the opinion statement",
      "domain": "market|regulatory|financial|operational|general",
      "confidence": 0.5,
      "reason": "why this opinion is justified",
      "existing_opinion_id": "uuid if update/weaken"
    }
  ],
  "observations": [
    {
      "pattern": "the observed pattern",
      "domain": "market|regulatory|financial|operational|general",
      "strength": 0.5,
      "applicability": "when does this pattern apply"
    }
  ]
}`,
    maxTokens: 1024,
  });

  try {
    const result = parseJSON<{ opinions: OpinionAction[]; observations: ObservationAction[] }>(response);
    console.log(`[opinions] Extracted ${result.opinions?.length || 0} opinions, ${result.observations?.length || 0} observations`);
    return result;
  } catch (err) {
    console.error('[opinions] JSON parse failed. Raw response:', response.substring(0, 500), 'Error:', err);
    return { opinions: [], observations: [] };
  }
}

// ── Apply Opinion Actions ──────────────────────────────────

export async function applyOpinionActions(
  userId: string,
  simulationId: string,
  opinions: OpinionAction[],
): Promise<number> {
  if (!supabase) return 0;
  let applied = 0;

  for (const op of opinions) {
    try {
      if (op.action === 'add') {
        const { error } = await supabase.from('decision_opinions').insert({
          user_id: userId,
          belief: op.belief,
          domain: op.domain || 'general',
          confidence: op.confidence || 0.5,
          confidence_history: JSON.stringify([{
            confidence: op.confidence || 0.5,
            sim_id: simulationId,
            reason: op.reason || 'initial formation',
            timestamp: new Date().toISOString(),
          }]),
          supporting_evidence: [op.reason],
          formed_from_simulation: simulationId,
          last_evaluated_simulation: simulationId,
        });
        if (!error) applied++;
        else console.error('[opinions] ADD failed:', error.message);

      } else if (op.action === 'update' && op.existing_opinion_id) {
        const { data: existing } = await supabase
          .from('decision_opinions')
          .select('confidence, confidence_history, supporting_evidence, evaluation_count')
          .eq('id', op.existing_opinion_id)
          .single();

        if (existing) {
          const newConfidence = Math.min(0.95, (existing.confidence || 0.5) + 0.1);
          const history = Array.isArray(existing.confidence_history) ? existing.confidence_history : [];
          history.push({ confidence: newConfidence, sim_id: simulationId, reason: op.reason || 'reinforced', timestamp: new Date().toISOString() });
          const evidence = Array.isArray(existing.supporting_evidence) ? existing.supporting_evidence : [];
          evidence.push(op.reason);

          const { error } = await supabase.from('decision_opinions')
            .update({
              confidence: newConfidence,
              confidence_history: JSON.stringify(history),
              supporting_evidence: evidence.slice(-10),
              last_evaluated_simulation: simulationId,
              evaluation_count: (existing.evaluation_count || 1) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', op.existing_opinion_id);
          if (!error) applied++;
        }

      } else if (op.action === 'weaken' && op.existing_opinion_id) {
        const { data: existing } = await supabase
          .from('decision_opinions')
          .select('confidence, confidence_history, contradicting_evidence, evaluation_count')
          .eq('id', op.existing_opinion_id)
          .single();

        if (existing) {
          const newConfidence = Math.max(0.1, (existing.confidence || 0.5) - 0.15);
          const history = Array.isArray(existing.confidence_history) ? existing.confidence_history : [];
          history.push({ confidence: newConfidence, sim_id: simulationId, reason: op.reason || 'contradicted', timestamp: new Date().toISOString() });
          const contradictions = Array.isArray(existing.contradicting_evidence) ? existing.contradicting_evidence : [];
          contradictions.push(op.reason);
          const status = newConfidence < 0.2 ? 'invalidated' : 'active';

          const { error } = await supabase.from('decision_opinions')
            .update({
              confidence: newConfidence,
              confidence_history: JSON.stringify(history),
              contradicting_evidence: contradictions.slice(-10),
              last_evaluated_simulation: simulationId,
              evaluation_count: (existing.evaluation_count || 1) + 1,
              status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', op.existing_opinion_id);
          if (!error) applied++;
        }
      }
    } catch (err) {
      console.error('[opinions] Action failed:', op.action, err);
    }
  }
  return applied;
}

// ── Save Observations ──────────────────────────────────────

export async function saveObservations(
  userId: string,
  simulationId: string,
  observations: ObservationAction[],
): Promise<number> {
  if (!supabase) return 0;
  let saved = 0;

  for (const obs of observations) {
    try {
      const { error } = await supabase.from('decision_observations').insert({
        user_id: userId,
        pattern: obs.pattern,
        domain: obs.domain || 'general',
        strength: obs.strength || 0.5,
        derived_from_simulations: [simulationId],
        applicability: obs.applicability || '',
      });
      if (!error) saved++;
      else console.error('[observations] Save failed:', error.message);
    } catch (err) {
      console.error('[observations] Save error:', err);
    }
  }
  return saved;
}

// ── Read ───────────────────────────────────────────────────

export async function getUserOpinions(userId: string, limit = 10) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('decision_opinions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

export async function getUserObservations(userId: string, limit = 10) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('decision_observations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('strength', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ── Format for Context Injection ───────────────────────────

export function formatOpinionsForContext(opinions: { belief: string; confidence: number; domain: string }[]): string {
  if (opinions.length === 0) return '';
  const lines = opinions.slice(0, 5).map(o =>
    `  • "${o.belief}" (confidence: ${(o.confidence * 100).toFixed(0)}%, domain: ${o.domain})`,
  );
  return `\nSYSTEM BELIEFS (formed from past analysis):\n${lines.join('\n')}\nChallenge these beliefs if your analysis contradicts them.`;
}

export function formatObservationsForContext(observations: { pattern: string; strength: number }[]): string {
  if (observations.length === 0) return '';
  const lines = observations.slice(0, 3).map(o =>
    `  • ${o.pattern} (strength: ${(o.strength * 100).toFixed(0)}%)`,
  );
  return `\nLEARNED PATTERNS:\n${lines.join('\n')}\nApply these patterns if relevant to the current question.`;
}
