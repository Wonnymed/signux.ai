/**
 * Outcome Tracking — Close the learning loop.
 * User reports "it worked" / "it failed" → system recalibrates.
 *
 * Refs: Graphiti (#27), Hindsight (#28), Braintrust (#30)
 */

import { supabase } from './supabase';

export type OutcomeReport = {
  experienceId: string;
  outcome: 'success' | 'failure' | 'partial' | 'cancelled';
  notes?: string;
};

/**
 * Record a user-reported outcome for a past simulation.
 * Updates the experience, calculates Brier score, triggers recalibration.
 */
export async function recordOutcome(
  userId: string,
  report: OutcomeReport
): Promise<{ brier: number; recalibrated: boolean }> {
  if (!supabase) throw new Error('Supabase not configured');

  const now = new Date().toISOString();

  // Load the experience
  const { data: exp } = await supabase
    .from('decision_experiences')
    .select('id, verdict_recommendation, verdict_probability, simulation_id')
    .eq('id', report.experienceId)
    .eq('user_id', userId)
    .single();

  if (!exp) throw new Error('Experience not found');

  // Calculate Brier score for this prediction
  // Brier = (forecast_probability - actual_outcome)^2
  const forecast = (exp.verdict_probability || 50) / 100;
  const rec = (exp.verdict_recommendation || '').toLowerCase();

  // Adjust forecast based on recommendation direction
  // "proceed at 80%" means 80% chance of success
  // "delay at 80%" means 80% confidence in delay (i.e., 20% success expected)
  const adjustedForecast = rec === 'proceed' ? forecast : (1 - forecast);

  const actualMap: Record<string, number> = {
    success: 1.0,
    failure: 0.0,
    partial: 0.5,
    cancelled: 0.0,
  };
  const actual = actualMap[report.outcome] ?? 0.5;

  const brier = Math.pow(adjustedForecast - actual, 2);

  // Update experience
  await supabase
    .from('decision_experiences')
    .update({
      outcome_status: report.outcome,
      outcome_notes: report.notes || null,
      outcome_reported_at: now,
      brier_score: Math.round(brier * 1000) / 1000,
    })
    .eq('id', report.experienceId);

  // Recalibrate related opinions/observations
  let recalibrated = false;
  try {
    await recalibrateFromOutcome(userId, exp, report.outcome);
    recalibrated = true;
  } catch (err) {
    console.error('OUTCOME: recalibration failed:', err);
  }

  // Update overall Brier score
  await calculateBrierScore(userId);

  console.log(`OUTCOME: Recorded ${report.outcome} for sim ${exp.simulation_id} (Brier: ${brier.toFixed(3)})`);

  return { brier, recalibrated };
}

/**
 * Calculate overall Brier score across all outcomes.
 * Lower = better. 0 = perfect prediction. 1 = worst possible.
 * Good calibration: < 0.25. Random: 0.25. Bad: > 0.4.
 */
export async function calculateBrierScore(userId: string): Promise<number> {
  if (!supabase) return 0.25;

  const { data: outcomes } = await supabase
    .from('decision_experiences')
    .select('verdict_recommendation, verdict_probability, outcome_status, brier_score')
    .eq('user_id', userId)
    .neq('outcome_status', 'pending')
    .not('brier_score', 'is', null);

  if (!outcomes || outcomes.length === 0) return 0.25;

  const totalBrier = outcomes.reduce((sum, o) => sum + (o.brier_score || 0.25), 0);
  const avgBrier = totalBrier / outcomes.length;

  const correct = outcomes.filter(o => {
    const rec = (o.verdict_recommendation || '').toLowerCase();
    const out = o.outcome_status;
    return (rec === 'proceed' && out === 'success') || (rec === 'delay' && (out === 'cancelled' || out === 'partial'));
  }).length;

  await supabase.from('calibration_scores').insert({
    user_id: userId,
    overall_brier: Math.round(avgBrier * 1000) / 1000,
    total_outcomes: outcomes.length,
    correct_count: correct,
    incorrect_count: outcomes.length - correct,
  });

  return avgBrier;
}

/**
 * When an outcome is reported, adjust related opinions and observations.
 * Success → strengthen supporting opinions. Failure → weaken them.
 */
async function recalibrateFromOutcome(
  userId: string,
  experience: { verdict_recommendation: string; verdict_probability: number; simulation_id: string },
  outcome: string
): Promise<void> {
  if (!supabase) return;

  const isPositive = outcome === 'success' || outcome === 'partial';
  const rec = (experience.verdict_recommendation || '').toLowerCase();

  // Was the recommendation correct?
  const wasCorrect = (rec === 'proceed' && isPositive) || ((rec === 'delay' || rec === 'abandon') && !isPositive);

  // Load active opinions
  const { data: opinions } = await supabase
    .from('decision_opinions')
    .select('id, belief, confidence, confidence_history')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!opinions || opinions.length === 0) return;

  const now = new Date().toISOString();
  const delta = wasCorrect ? 0.05 : -0.10;

  for (const opinion of opinions.slice(0, 10)) {
    const newConfidence = Math.max(0.05, Math.min(0.95, (opinion.confidence || 0.5) + delta));
    const history = Array.isArray(opinion.confidence_history) ? opinion.confidence_history : [];
    history.push({
      confidence: newConfidence,
      previous: opinion.confidence,
      reason: `Outcome ${outcome} on sim ${experience.simulation_id} (prediction was ${wasCorrect ? 'correct' : 'incorrect'})`,
      timestamp: now,
      action: wasCorrect ? 'outcome_confirmed' : 'outcome_contradicted',
    });

    await supabase.from('decision_opinions').update({
      confidence: newConfidence,
      confidence_history: history,
      updated_at: now,
    }).eq('id', opinion.id);
  }

  console.log(`OUTCOME RECALIBRATE: ${wasCorrect ? 'Confirmed' : 'Contradicted'} — ${Math.min(opinions.length, 10)} opinions adjusted by ${delta > 0 ? '+' : ''}${delta}`);
}

/**
 * Get calibration data for dashboard.
 */
export async function getCalibrationData(userId: string): Promise<{
  overallBrier: number;
  totalOutcomes: number;
  correctRate: number;
  recentOutcomes: { question: string; predicted: string; probability: number; outcome: string; brier: number }[];
}> {
  if (!supabase) {
    return { overallBrier: 0.25, totalOutcomes: 0, correctRate: 0, recentOutcomes: [] };
  }

  const { data: latest } = await supabase
    .from('calibration_scores')
    .select('overall_brier, total_outcomes, correct_count')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  const { data: recent } = await supabase
    .from('decision_experiences')
    .select('question, verdict_recommendation, verdict_probability, outcome_status, brier_score')
    .eq('user_id', userId)
    .neq('outcome_status', 'pending')
    .order('outcome_reported_at', { ascending: false })
    .limit(10);

  return {
    overallBrier: latest?.overall_brier || 0.25,
    totalOutcomes: latest?.total_outcomes || 0,
    correctRate: latest?.total_outcomes ? (latest.correct_count || 0) / latest.total_outcomes : 0,
    recentOutcomes: (recent || []).map(r => ({
      question: (r.question || '').substring(0, 80),
      predicted: r.verdict_recommendation || 'unknown',
      probability: r.verdict_probability || 0,
      outcome: r.outcome_status,
      brier: r.brier_score || 0,
    })),
  };
}
