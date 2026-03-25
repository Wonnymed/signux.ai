/**
 * Reflect Loop — Hindsight pattern for Octux.
 *
 * The system periodically REASONS about its own memories:
 *   reflectOnExperiences() — orchestrator, runs every 5 sims
 *   formOpinion()          — form/update beliefs with confidence 0-1
 *   deriveObservations()   — extract patterns from accumulated experiences
 *   memoryOfMisses()       — identify wrong predictions, save as observations
 *
 * This is the loop that makes Octux LEARN, not just REMEMBER.
 *
 * Ref: Hindsight (#28 — retain/recall/reflect, opinion confidence evolution,
 *       memory of misses, 91.4% LongMemEval)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

type OpinionAction = {
  action: 'CREATE' | 'STRENGTHEN' | 'WEAKEN' | 'INVALIDATE';
  belief: string;
  domain: string;
  new_confidence: number;
  reason: string;
  existing_opinion_id?: string;
  supporting_evidence?: string[];
  contradicting_evidence?: string[];
};

type ReflectResult = { opinions: number; observations: number; misses: number };

// ═══════════════════════════════════════════
// reflectOnExperiences() — Orchestrator
// ═══════════════════════════════════════════

/** Check if reflect will trigger (every 5th sim). Used for SSE event. */
export async function shouldReflect(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from('decision_experiences')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count && count % 5 === 0) ? count : 0;
}

export async function reflectOnExperiences(
  userId: string,
  forceReflect: boolean = false
): Promise<ReflectResult> {
  if (!supabase) return { opinions: 0, observations: 0, misses: 0 };

  // Check if it's time to reflect
  if (!forceReflect) {
    const { count, error } = await supabase
      .from('decision_experiences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error || !count || count % 5 !== 0) {
      return { opinions: 0, observations: 0, misses: 0 };
    }

    console.log(`REFLECT: Triggering reflection for user ${userId} (${count} sims, every 5th)`);
  }

  // Load recent experiences for reflection
  const { data: experiences } = await supabase
    .from('decision_experiences')
    .select('id, simulation_id, question, verdict_recommendation, verdict_probability, verdict_summary, key_risks, key_opportunities, outcome_status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!experiences || experiences.length < 2) {
    return { opinions: 0, observations: 0, misses: 0 };
  }

  // Load existing opinions for updating
  const { data: existingOpinions } = await supabase
    .from('decision_opinions')
    .select('id, belief, domain, confidence, supporting_evidence, contradicting_evidence, evaluation_count')
    .eq('user_id', userId)
    .eq('status', 'active');

  // Run all 3 reflect operations
  const [opinionsResult, observationsResult, missesResult] = await Promise.all([
    formOpinion(userId, experiences, existingOpinions || []),
    deriveObservations(userId, experiences),
    memoryOfMisses(userId, experiences),
  ]);

  console.log(`REFLECT COMPLETE: ${opinionsResult} opinions, ${observationsResult} observations, ${missesResult} misses`);

  return {
    opinions: opinionsResult,
    observations: observationsResult,
    misses: missesResult,
  };
}

// ═══════════════════════════════════════════
// formOpinion() — Create/update beliefs with confidence
// ═══════════════════════════════════════════

async function formOpinion(
  userId: string,
  experiences: Record<string, unknown>[],
  existingOpinions: Record<string, unknown>[]
): Promise<number> {
  if (!supabase) return 0;

  const experienceText = experiences.map(e =>
    `[${e.id}] "${((e.question as string) || '').substring(0, 80)}" → ${((e.verdict_recommendation as string) || 'unknown').toUpperCase()} (${e.verdict_probability}%)${e.outcome_status !== 'pending' ? ' [outcome: ' + e.outcome_status + ']' : ''} | Risks: ${((e.key_risks as string[]) || []).join(', ')} | Opps: ${((e.key_opportunities as string[]) || []).join(', ')}`
  ).join('\n');

  const opinionsText = existingOpinions.length > 0
    ? existingOpinions.map(o =>
        `[${o.id}] "${o.belief}" (confidence: ${o.confidence}, domain: ${o.domain}, evaluated ${o.evaluation_count}x)`
      ).join('\n')
    : 'No existing opinions yet.';

  try {
    const response = await callClaude({
      systemPrompt: `You are the Reflect engine for a decision system. You analyze accumulated experiences and form/update BELIEFS (opinions).

RULES:
- CREATE a new opinion only if 2+ experiences support it. Confidence starts at 0.5-0.7.
- STRENGTHEN an existing opinion if new evidence supports it. Increase confidence by 0.05-0.15.
- WEAKEN an existing opinion if new evidence contradicts it. Decrease confidence by 0.05-0.20.
- INVALIDATE an opinion only if overwhelming evidence proves it wrong. Set confidence to 0.
- Max confidence: 0.95 (never 1.0 — always leave room for doubt).
- Min confidence before invalidation: 0.15.
- Be CONSERVATIVE. Don't over-interpret limited data. 3 sims is not enough for high confidence.

Return JSON array. Empty [] if no opinion changes needed.`,
      userMessage: `RECENT EXPERIENCES (last 10 sims):
${experienceText}

EXISTING OPINIONS:
${opinionsText}

Analyze. What beliefs should be CREATED, STRENGTHENED, WEAKENED, or INVALIDATED?
JSON array:
[{
  "action": "CREATE|STRENGTHEN|WEAKEN|INVALIDATE",
  "belief": "the belief statement",
  "domain": "market|regulatory|financial|operational|strategic|general",
  "new_confidence": 0.0-0.95,
  "reason": "why this action based on evidence",
  "existing_opinion_id": "uuid if updating existing",
  "supporting_evidence": ["brief evidence 1", "brief evidence 2"],
  "contradicting_evidence": ["brief counter-evidence"]
}]`,
      maxTokens: 800,
    });

    const actions = parseJSON<OpinionAction[]>(response);
    if (!actions || actions.length === 0) return 0;

    let appliedCount = 0;
    const now = new Date().toISOString();

    for (const action of actions) {
      try {
        switch (action.action) {

          case 'CREATE': {
            const { error } = await supabase
              .from('decision_opinions')
              .insert({
                user_id: userId,
                belief: action.belief,
                domain: action.domain || 'general',
                confidence: Math.min(action.new_confidence, 0.95),
                confidence_history: [{
                  confidence: action.new_confidence,
                  reason: action.reason,
                  timestamp: now,
                  action: 'created',
                }],
                supporting_evidence: action.supporting_evidence || [],
                contradicting_evidence: action.contradicting_evidence || [],
                evaluation_count: 1,
                status: 'active',
                valid_from: now,
                created_at: now,
                updated_at: now,
              });
            if (!error) {
              appliedCount++;
              console.log(`REFLECT OPINION: Created "${action.belief}" (${action.new_confidence})`);
            }
            break;
          }

          case 'STRENGTHEN':
          case 'WEAKEN': {
            if (!action.existing_opinion_id) break;

            const { data: current } = await supabase
              .from('decision_opinions')
              .select('confidence, confidence_history, supporting_evidence, contradicting_evidence, evaluation_count')
              .eq('id', action.existing_opinion_id)
              .single();

            if (!current) break;

            const newConfidence = Math.min(Math.max(action.new_confidence, 0.05), 0.95);
            const history = Array.isArray(current.confidence_history) ? current.confidence_history : [];
            history.push({
              confidence: newConfidence,
              previous: current.confidence,
              reason: action.reason,
              timestamp: now,
              action: action.action.toLowerCase(),
            });

            const supporting = [...(current.supporting_evidence || []), ...(action.supporting_evidence || [])].slice(-10);
            const contradicting = [...(current.contradicting_evidence || []), ...(action.contradicting_evidence || [])].slice(-10);

            const { error } = await supabase
              .from('decision_opinions')
              .update({
                confidence: newConfidence,
                confidence_history: history,
                supporting_evidence: supporting,
                contradicting_evidence: contradicting,
                evaluation_count: (current.evaluation_count || 1) + 1,
                updated_at: now,
              })
              .eq('id', action.existing_opinion_id);

            if (!error) {
              appliedCount++;
              console.log(`REFLECT OPINION: ${action.action} "${action.belief}" ${current.confidence} → ${newConfidence}`);
            }
            break;
          }

          case 'INVALIDATE': {
            if (!action.existing_opinion_id) break;

            const { data: current } = await supabase
              .from('decision_opinions')
              .select('confidence_history')
              .eq('id', action.existing_opinion_id)
              .single();

            const history = Array.isArray(current?.confidence_history) ? current.confidence_history : [];
            history.push({
              confidence: 0,
              reason: action.reason,
              timestamp: now,
              action: 'invalidated',
            });

            const { error } = await supabase
              .from('decision_opinions')
              .update({
                confidence: 0,
                confidence_history: history,
                status: 'invalidated',
                valid_until: now,
                updated_at: now,
              })
              .eq('id', action.existing_opinion_id);

            if (!error) {
              appliedCount++;
              console.log(`REFLECT OPINION: Invalidated "${action.belief}" — ${action.reason}`);
            }
            break;
          }
        }
      } catch (err) {
        console.error(`REFLECT: formOpinion action failed:`, err);
      }
    }

    return appliedCount;
  } catch (err) {
    console.error('REFLECT: formOpinion failed:', err);
    return 0;
  }
}

// ═══════════════════════════════════════════
// deriveObservations() — Extract patterns from experiences
// ═══════════════════════════════════════════

async function deriveObservations(
  userId: string,
  experiences: Record<string, unknown>[]
): Promise<number> {
  if (!supabase) return 0;
  if (experiences.length < 3) return 0;

  const { data: existingObs } = await supabase
    .from('decision_observations')
    .select('id, pattern, domain, strength, evidence_count')
    .eq('user_id', userId)
    .eq('status', 'active');

  const experienceText = experiences.map(e =>
    `"${((e.question as string) || '').substring(0, 80)}" → ${((e.verdict_recommendation as string) || '?').toUpperCase()} (${e.verdict_probability}%) | Risks: ${((e.key_risks as string[]) || []).slice(0, 3).join(', ')} | Opps: ${((e.key_opportunities as string[]) || []).slice(0, 3).join(', ')}${e.outcome_status !== 'pending' ? ' | Outcome: ' + e.outcome_status : ''}`
  ).join('\n');

  const existingText = (existingObs || []).length > 0
    ? (existingObs || []).map(o => `[${o.id}] "${o.pattern}" (strength: ${o.strength}, evidence: ${o.evidence_count})`).join('\n')
    : 'No existing patterns.';

  try {
    const response = await callClaude({
      systemPrompt: `You analyze decision experiences to find PATTERNS — recurring themes that would help future decisions.

Good patterns are:
- Specific and actionable: "Regulatory questions consistently delay first-time businesses by 2-3 months"
- Evidence-based: supported by 2+ experiences
- Domain-labeled: market, regulatory, financial, operational, strategic

Bad patterns:
- Too vague: "Things can go wrong" (useless)
- Single-instance: based on only 1 experience (not a pattern yet)
- Already exists: if an existing pattern covers it, SKIP

Return JSON array. Empty [] if no NEW patterns found.
If an existing pattern is REINFORCED by new evidence, include it with "action": "reinforce" and its ID.`,
      userMessage: `RECENT EXPERIENCES:
${experienceText}

EXISTING PATTERNS:
${existingText}

Find new patterns or reinforce existing ones.
JSON array:
[{
  "action": "create" | "reinforce",
  "pattern": "the pattern statement",
  "domain": "market|regulatory|financial|operational|strategic|general",
  "strength": 0.3-0.8,
  "applicability": "when this pattern applies",
  "derived_from_sim_indices": [0, 2, 5],
  "existing_observation_id": "uuid if reinforcing"
}]`,
      maxTokens: 600,
    });

    const patterns = parseJSON<Record<string, unknown>[]>(response);
    if (!patterns || patterns.length === 0) return 0;

    let appliedCount = 0;
    const now = new Date().toISOString();

    for (const p of patterns) {
      try {
        if (p.action === 'reinforce' && p.existing_observation_id) {
          const existing = (existingObs || []).find(o => o.id === p.existing_observation_id);
          if (!existing) continue;

          const newStrength = Math.min((existing.strength || 0.5) + 0.1, 0.95);
          const { error } = await supabase
            .from('decision_observations')
            .update({
              strength: newStrength,
              evidence_count: (existing.evidence_count || 1) + 1,
              updated_at: now,
            })
            .eq('id', p.existing_observation_id);

          if (!error) {
            appliedCount++;
            console.log(`REFLECT PATTERN: Reinforced "${existing.pattern}" → strength ${newStrength}`);
          }
        } else if (p.action === 'create') {
          const simIds = ((p.derived_from_sim_indices as number[]) || [])
            .map((i: number) => (experiences[i] as Record<string, unknown>)?.simulation_id)
            .filter(Boolean);

          const { error } = await supabase
            .from('decision_observations')
            .insert({
              user_id: userId,
              pattern: p.pattern,
              domain: (p.domain as string) || 'general',
              strength: Math.min((p.strength as number) || 0.5, 0.8),
              evidence_count: simIds.length || 1,
              derived_from_simulations: simIds,
              applicability: (p.applicability as string) || '',
              status: 'active',
              valid_from: now,
              created_at: now,
              updated_at: now,
            });

          if (!error) {
            appliedCount++;
            console.log(`REFLECT PATTERN: Created "${p.pattern}" (strength: ${p.strength})`);
          }
        }
      } catch (err) {
        console.error('REFLECT: deriveObservations action failed:', err);
      }
    }

    return appliedCount;
  } catch (err) {
    console.error('REFLECT: deriveObservations failed:', err);
    return 0;
  }
}

// ═══════════════════════════════════════════
// memoryOfMisses() — Track wrong predictions
// ═══════════════════════════════════════════

async function memoryOfMisses(
  userId: string,
  experiences: Record<string, unknown>[]
): Promise<number> {
  if (!supabase) return 0;

  const misses = experiences.filter(e => {
    if (!e.outcome_status || e.outcome_status === 'pending') return false;

    const rec = ((e.verdict_recommendation as string) || '').toLowerCase();
    const outcome = (e.outcome_status as string).toLowerCase();

    if (rec === 'proceed' && outcome === 'failure') return true;
    if ((rec === 'delay' || rec === 'abandon') && outcome === 'success') return true;
    if (((e.verdict_probability as number) || 0) > 75 && outcome === 'failure') return true;
    if (((e.verdict_probability as number) || 0) < 30 && outcome === 'success') return true;

    return false;
  });

  if (misses.length === 0) return 0;

  const missText = misses.map(m =>
    `SIM [${m.simulation_id}]: "${((m.question as string) || '').substring(0, 80)}" → Recommended: ${((m.verdict_recommendation as string) || '?').toUpperCase()} (${m.verdict_probability}%) | Actual outcome: ${m.outcome_status} | Risks flagged: ${((m.key_risks as string[]) || []).join(', ')} | Opportunities flagged: ${((m.key_opportunities as string[]) || []).join(', ')}`
  ).join('\n');

  try {
    const response = await callClaude({
      systemPrompt: `You analyze prediction MISSES — cases where the decision system got it wrong.
For each miss, identify:
1. WHAT went wrong (over-estimated a factor? under-estimated a risk?)
2. WHY it was wrong (what signal was missed? what assumption was bad?)
3. The LESSON for future predictions (specific, actionable)

Return JSON array. One entry per miss.`,
      userMessage: `PREDICTION MISSES:
${missText}

For each, extract the lesson. JSON array:
[{
  "simulation_id": "uuid",
  "lesson": "specific lesson learned",
  "domain": "market|regulatory|financial|operational|strategic",
  "what_went_wrong": "brief description",
  "missed_signal": "what we should have seen"
}]`,
      maxTokens: 500,
    });

    const lessons = parseJSON<Record<string, unknown>[]>(response);
    if (!lessons || lessons.length === 0) return 0;

    let savedCount = 0;
    const now = new Date().toISOString();

    for (const lesson of lessons) {
      try {
        const pattern = `MISS LESSON: ${lesson.lesson}${lesson.what_went_wrong ? ' (Error: ' + lesson.what_went_wrong + ')' : ''}`;

        const { error } = await supabase
          .from('decision_observations')
          .insert({
            user_id: userId,
            pattern,
            domain: (lesson.domain as string) || 'general',
            strength: 0.7,
            evidence_count: 1,
            derived_from_simulations: lesson.simulation_id ? [lesson.simulation_id] : [],
            applicability: (lesson.missed_signal as string) || '',
            status: 'active',
            valid_from: now,
            created_at: now,
            updated_at: now,
          });

        if (!error) {
          savedCount++;
          console.log(`REFLECT MISS: "${lesson.lesson}" (${lesson.domain})`);
        }
      } catch (err) {
        console.error('REFLECT: memoryOfMisses save failed:', err);
      }
    }

    return savedCount;
  } catch (err) {
    console.error('REFLECT: memoryOfMisses failed:', err);
    return 0;
  }
}
