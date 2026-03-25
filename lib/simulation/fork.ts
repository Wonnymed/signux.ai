/**
 * What-If Forking — Octux OVERKILL innovation.
 *
 * "What if budget was $100K instead of $50K?"
 * → Fork the sim → modify the parameter → re-run → compare verdicts
 *
 * The fork INHERITS all memory context from the original sim's point in time.
 * Only the specified parameter changes. Everything else stays the same.
 * This isolates the IMPACT of that one variable.
 */

import { supabase } from '../memory/supabase';

export type ForkModification = {
  parameter: string;
  original_value: string;
  new_value: string;
};

export type ForkComparison = {
  originalSimId: string;
  forkSimId: string;
  question: string;
  modifications: ForkModification[];
  original_verdict: { recommendation: string; probability: number; main_risk: string };
  fork_verdict: { recommendation: string; probability: number; main_risk: string };
  verdict_changed: boolean;
  probability_delta: number;
  risk_changed: boolean;
  key_differences: string[];
};

/**
 * Prepare a forked simulation question by modifying the original.
 * Returns the modified question text for the simulation engine.
 */
export function prepareForkQuestion(
  originalQuestion: string,
  modifications: ForkModification[]
): string {
  const modContext = modifications.map(m =>
    `[MODIFIED: ${m.parameter} changed from "${m.original_value}" to "${m.new_value}"]`
  ).join(' ');

  return `${modContext}\n\n${originalQuestion}`;
}

/**
 * Load the original simulation's question for forking.
 */
export async function prepareForFork(
  originalSimId: string,
  userId: string,
  modifications: ForkModification[]
): Promise<{ modifiedQuestion: string; originalQuestion: string } | null> {
  if (!supabase) return null;

  const { data: sim } = await supabase
    .from('simulations')
    .select('question')
    .eq('id', originalSimId)
    .eq('user_id', userId)
    .single();

  if (!sim) return null;

  return {
    originalQuestion: sim.question,
    modifiedQuestion: prepareForkQuestion(sim.question, modifications),
  };
}

/**
 * Compare original and forked simulation verdicts.
 * Highlights the IMPACT of the parameter change.
 */
export async function compareForkedVerdicts(
  originalSimId: string,
  forkSimId: string
): Promise<ForkComparison | null> {
  if (!supabase) return null;

  const { data: original } = await supabase
    .from('simulations')
    .select('id, question, verdict')
    .eq('id', originalSimId)
    .single();

  const { data: fork } = await supabase
    .from('simulations')
    .select('id, verdict, fork_modifications')
    .eq('id', forkSimId)
    .single();

  if (!original || !fork) return null;

  const origV = original.verdict as any;
  const forkV = fork.verdict as any;

  const origRec = (origV?.recommendation || 'unknown').toLowerCase();
  const forkRec = (forkV?.recommendation || 'unknown').toLowerCase();
  const origProb = origV?.probability || 0;
  const forkProb = forkV?.probability || 0;

  const diffs: string[] = [];
  if (origRec !== forkRec) diffs.push(`Recommendation changed: ${origRec.toUpperCase()} → ${forkRec.toUpperCase()}`);
  if (Math.abs(origProb - forkProb) > 5) diffs.push(`Probability shifted ${origProb}% → ${forkProb}% (${forkProb > origProb ? '+' : ''}${forkProb - origProb}%)`);
  if (origV?.main_risk !== forkV?.main_risk) diffs.push(`Main risk changed: "${origV?.main_risk}" → "${forkV?.main_risk}"`);
  if (origV?.next_action !== forkV?.next_action) diffs.push(`Next action changed: "${origV?.next_action}" → "${forkV?.next_action}"`);

  return {
    originalSimId,
    forkSimId,
    question: original.question || '',
    modifications: (fork.fork_modifications as ForkModification[]) || [],
    original_verdict: {
      recommendation: origRec,
      probability: origProb,
      main_risk: origV?.main_risk || 'unknown',
    },
    fork_verdict: {
      recommendation: forkRec,
      probability: forkProb,
      main_risk: forkV?.main_risk || 'unknown',
    },
    verdict_changed: origRec !== forkRec,
    probability_delta: forkProb - origProb,
    risk_changed: origV?.main_risk !== forkV?.main_risk,
    key_differences: diffs,
  };
}
