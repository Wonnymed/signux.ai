/**
 * Decision Replay — Octux OVERKILL innovation.
 *
 * Re-run a past simulation with CURRENT memory state.
 * Compare verdicts to prove the system got smarter.
 *
 * "I asked about Gangnam café 3 months ago → DELAY (55%).
 *  Replay today with all accumulated knowledge → PROCEED (78%).
 *  The system learned: permits take 3mo (fact), market grew 12% (fact),
 *  conservative budgets work better (learned rule)."
 */

import { supabase } from '../memory/supabase';

export type VerdictComparison = {
  originalSimId: string;
  replaySimId: string;
  question: string;
  original: {
    recommendation: string;
    probability: number;
    main_risk: string;
    date: string;
  };
  replay: {
    recommendation: string;
    probability: number;
    main_risk: string;
    date: string;
  };
  changed: boolean;
  improvement_factors: string[];
  confidence_delta: number;
};

/**
 * Load the original simulation's question and verdict so the caller
 * can trigger runSimulation with it.
 *
 * Does NOT modify the original simulation.
 */
export async function prepareReplay(
  userId: string,
  originalSimId: string
): Promise<{ question: string; engine: string; originalVerdict: any } | null> {
  if (!supabase) return null;

  const { data: original } = await supabase
    .from('simulations')
    .select('question, engine, verdict, created_at')
    .eq('id', originalSimId)
    .eq('user_id', userId)
    .single();

  if (!original) return null;

  return {
    question: original.question,
    engine: original.engine || 'simulate',
    originalVerdict: original.verdict,
  };
}

/**
 * Compare original and replay verdicts.
 * Identifies what changed and WHY (what new knowledge influenced the change).
 */
export async function compareVerdicts(
  originalSimId: string,
  replaySimId: string,
  userId: string
): Promise<VerdictComparison | null> {
  if (!supabase) return null;

  const { data: original } = await supabase
    .from('simulations')
    .select('id, question, verdict, created_at')
    .eq('id', originalSimId)
    .single();

  const { data: replay } = await supabase
    .from('simulations')
    .select('id, verdict, created_at')
    .eq('id', replaySimId)
    .single();

  if (!original || !replay) return null;

  const origV = original.verdict as any;
  const repV = replay.verdict as any;

  const origRec = (origV?.recommendation || 'unknown').toLowerCase();
  const repRec = (repV?.recommendation || 'unknown').toLowerCase();
  const origProb = origV?.probability || 0;
  const repProb = repV?.probability || 0;

  // Identify what new knowledge was available for the replay
  // (facts learned AFTER the original sim)
  const { data: newFacts } = await supabase
    .from('user_facts')
    .select('content')
    .eq('user_id', userId)
    .eq('is_current', true)
    .gt('learned_at', original.created_at)
    .limit(10);

  const { data: newOpinions } = await supabase
    .from('decision_opinions')
    .select('belief')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('created_at', original.created_at)
    .limit(5);

  const factors: string[] = [];
  if (newFacts) factors.push(...newFacts.map(f => `New fact: ${f.content}`));
  if (newOpinions) factors.push(...newOpinions.map(o => `New belief: ${o.belief}`));

  return {
    originalSimId,
    replaySimId,
    question: original.question || '',
    original: {
      recommendation: origRec,
      probability: origProb,
      main_risk: origV?.main_risk || 'unknown',
      date: original.created_at,
    },
    replay: {
      recommendation: repRec,
      probability: repProb,
      main_risk: repV?.main_risk || 'unknown',
      date: replay.created_at,
    },
    changed: origRec !== repRec,
    improvement_factors: factors.slice(0, 10),
    confidence_delta: repProb - origProb,
  };
}
