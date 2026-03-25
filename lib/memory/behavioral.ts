/**
 * Behavioral Parameters — Hindsight-inspired user personality modeling.
 *
 * 6 numeric parameters (0.0 → 1.0) that ACTIVELY modulate:
 *   - How agents analyze (tone, depth, evidence requirements)
 *   - How the verdict is framed (risk-first vs opportunity-first)
 *   - How probabilities are calibrated (based on outcome history)
 *
 * Parameters:
 *   1. risk_tolerance      — conservative ↔ aggressive
 *   2. speed_preference    — deliberate ↔ action-biased
 *   3. evidence_threshold  — gut-feel OK ↔ needs hard data
 *   4. optimism_bias       — pessimist ↔ optimist
 *   5. detail_preference   — executive summary ↔ deep analysis
 *   6. confidence_calibration — auto-adjusted from Brier scores
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type BehavioralProfile = {
  risk_tolerance: number;
  speed_preference: number;
  evidence_threshold: number;
  optimism_bias: number;
  detail_preference: number;
  confidence_calibration: number;
  inference_confidence: number;
  user_overrides: Record<string, boolean>;
};

const DEFAULT_PROFILE: BehavioralProfile = {
  risk_tolerance: 0.5,
  speed_preference: 0.5,
  evidence_threshold: 0.5,
  optimism_bias: 0.5,
  detail_preference: 0.5,
  confidence_calibration: 0.5,
  inference_confidence: 0.0,
  user_overrides: {},
};

const PARAM_KEYS = [
  'risk_tolerance', 'speed_preference', 'evidence_threshold',
  'optimism_bias', 'detail_preference', 'confidence_calibration',
] as const;

type ParamKey = typeof PARAM_KEYS[number];

// ═══════════════════════════════════════════
// getOrCreateProfile() — Load or initialize
// ═══════════════════════════════════════════

export async function getOrCreateProfile(userId: string): Promise<BehavioralProfile> {
  if (!supabase) return { ...DEFAULT_PROFILE };

  const { data } = await supabase
    .from('behavioral_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (data) {
    return {
      risk_tolerance: data.risk_tolerance ?? 0.5,
      speed_preference: data.speed_preference ?? 0.5,
      evidence_threshold: data.evidence_threshold ?? 0.5,
      optimism_bias: data.optimism_bias ?? 0.5,
      detail_preference: data.detail_preference ?? 0.5,
      confidence_calibration: data.confidence_calibration ?? 0.5,
      inference_confidence: data.inference_confidence ?? 0.0,
      user_overrides: (data.user_overrides as Record<string, boolean>) || {},
    };
  }

  // Create default profile
  await supabase.from('behavioral_profiles').insert({
    user_id: userId,
    risk_tolerance: 0.5,
    speed_preference: 0.5,
    evidence_threshold: 0.5,
    optimism_bias: 0.5,
    detail_preference: 0.5,
    confidence_calibration: 0.5,
    user_overrides: {},
    inference_confidence: 0.0,
    sim_count_at_inference: 0,
  }); // ignore duplicate

  return { ...DEFAULT_PROFILE };
}

// ═══════════════════════════════════════════
// inferBehavioralProfile() — Learn from past decisions
// ═══════════════════════════════════════════

export async function inferBehavioralProfile(userId: string): Promise<BehavioralProfile> {
  if (!supabase) return { ...DEFAULT_PROFILE };

  const current = await getOrCreateProfile(userId);

  const [experiences, simulations, calibration] = await Promise.all([
    supabase.from('decision_experiences').select('verdict_recommendation, verdict_probability, outcome_status, brier_score').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('simulations').select('question, verdict, domain').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('calibration_scores').select('overall_brier, total_outcomes').eq('user_id', userId).order('calculated_at', { ascending: false }).limit(1),
  ]);

  const exps = experiences.data || [];
  const sims = simulations.data || [];

  // Need at least 5 experiences to infer meaningfully
  if (exps.length < 5) {
    return current;
  }

  const newParams: Partial<BehavioralProfile> = {};

  // ── RISK TOLERANCE ──
  if (!current.user_overrides.risk_tolerance) {
    const proceedCount = exps.filter(e => (e.verdict_recommendation || '').toLowerCase() === 'proceed').length;
    const proceedRatio = proceedCount / exps.length;
    const successOnProceed = exps.filter(e =>
      (e.verdict_recommendation || '').toLowerCase() === 'proceed' && e.outcome_status === 'success'
    ).length;
    const proceedWithOutcome = exps.filter(e =>
      (e.verdict_recommendation || '').toLowerCase() === 'proceed' && e.outcome_status && e.outcome_status !== 'pending'
    ).length;
    const successRate = proceedWithOutcome > 0 ? successOnProceed / proceedWithOutcome : 0.5;

    newParams.risk_tolerance = clamp(proceedRatio * 0.6 + successRate * 0.4, 0.1, 0.9);
  }

  // ── SPEED PREFERENCE ──
  if (!current.user_overrides.speed_preference) {
    const urgencyWords = ['asap', 'urgent', 'quickly', 'now', 'immediately', 'fast', 'deadline', 'rush', 'this week', 'tomorrow'];
    const urgentSims = sims.filter(s =>
      urgencyWords.some(w => ((s.question || '') as string).toLowerCase().includes(w))
    ).length;
    const urgencyRatio = sims.length > 0 ? urgentSims / sims.length : 0;

    const delayCount = exps.filter(e => (e.verdict_recommendation || '').toLowerCase() === 'delay').length;
    const delayRatio = exps.length > 0 ? delayCount / exps.length : 0.5;

    newParams.speed_preference = clamp(0.3 + urgencyRatio * 0.4 + (1 - delayRatio) * 0.3, 0.1, 0.9);
  }

  // ── EVIDENCE THRESHOLD ──
  if (!current.user_overrides.evidence_threshold) {
    const evidenceWords = ['data', 'proof', 'evidence', 'numbers', 'statistics', 'research', 'source', 'study', 'benchmark', 'survey'];
    const evidenceSims = sims.filter(s =>
      evidenceWords.some(w => ((s.question || '') as string).toLowerCase().includes(w))
    ).length;
    const evidenceRatio = sims.length > 0 ? evidenceSims / sims.length : 0;

    newParams.evidence_threshold = clamp(0.3 + evidenceRatio * 0.7, 0.2, 0.9);
  }

  // ── OPTIMISM BIAS ──
  if (!current.user_overrides.optimism_bias) {
    const outcomes = exps.filter(e => e.outcome_status && e.outcome_status !== 'pending');
    const successCount = outcomes.filter(e => e.outcome_status === 'success' || e.outcome_status === 'partial').length;
    const outcomeOptimism = outcomes.length > 0 ? successCount / outcomes.length : 0.5;

    const avgProbability = exps.reduce((sum, e) => sum + (e.verdict_probability || 50), 0) / exps.length / 100;

    newParams.optimism_bias = clamp(outcomeOptimism * 0.5 + avgProbability * 0.5, 0.15, 0.85);
  }

  // ── DETAIL PREFERENCE ──
  if (!current.user_overrides.detail_preference) {
    const avgQuestionLength = sims.reduce((sum, s) => sum + ((s.question || '') as string).length, 0) / Math.max(sims.length, 1);
    const lengthSignal = clamp((avgQuestionLength - 50) / 200, 0, 1);

    newParams.detail_preference = clamp(0.2 + lengthSignal * 0.6, 0.2, 0.9);
  }

  // ── CONFIDENCE CALIBRATION ──
  const calData = calibration.data?.[0];
  if (calData && calData.total_outcomes >= 3) {
    const brier = calData.overall_brier;
    const proceedFailures = exps.filter(e =>
      (e.verdict_recommendation || '').toLowerCase() === 'proceed' && e.outcome_status === 'failure'
    ).length;
    const totalOutcomes = exps.filter(e => e.outcome_status && e.outcome_status !== 'pending').length;
    const overestimateRatio = totalOutcomes > 0 ? proceedFailures / totalOutcomes : 0;

    if (overestimateRatio > 0.4) {
      newParams.confidence_calibration = clamp(0.5 - (brier * 0.5), 0.2, 0.5);
    } else if (brier < 0.15) {
      newParams.confidence_calibration = 0.5;
    } else {
      newParams.confidence_calibration = clamp(0.5 + (0.25 - brier) * 0.5, 0.5, 0.7);
    }
  }

  const inferenceConfidence = clamp(exps.length / 20, 0.1, 0.95);

  const now = new Date().toISOString();
  await supabase.from('behavioral_profiles').upsert({
    user_id: userId,
    ...current,
    ...newParams,
    inference_confidence: inferenceConfidence,
    inferred_at: now,
    sim_count_at_inference: exps.length,
    user_overrides: current.user_overrides,
    updated_at: now,
  }, { onConflict: 'user_id' });

  const updated = { ...current, ...newParams, inference_confidence: inferenceConfidence };
  console.log(`BEHAVIORAL: Inferred profile for user ${userId} (confidence: ${(inferenceConfidence * 100).toFixed(0)}%) — risk: ${(updated.risk_tolerance * 100).toFixed(0)}, speed: ${(updated.speed_preference * 100).toFixed(0)}, evidence: ${(updated.evidence_threshold * 100).toFixed(0)}, optimism: ${(updated.optimism_bias * 100).toFixed(0)}, detail: ${(updated.detail_preference * 100).toFixed(0)}, calibration: ${(updated.confidence_calibration * 100).toFixed(0)}`);

  return updated;
}

// ═══════════════════════════════════════════
// formatBehavioralContext() — Agent context injection
// ═══════════════════════════════════════════

export function formatBehavioralContext(params: BehavioralProfile): string {
  if (params.inference_confidence < 0.15) {
    return ''; // Not enough data to modulate
  }

  const directives: string[] = [];

  if (params.risk_tolerance < 0.3) {
    directives.push('This decision-maker is RISK-AVERSE. Lead with risks and downside scenarios. A "PROCEED" recommendation needs STRONG evidence. Default toward caution.');
  } else if (params.risk_tolerance > 0.7) {
    directives.push('This decision-maker has HIGH RISK TOLERANCE. They appreciate bold opportunities and are comfortable with uncertainty. Focus on upside potential alongside risks. Be direct about opportunities.');
  }

  if (params.speed_preference < 0.3) {
    directives.push('This decision-maker prefers DELIBERATE decisions. Recommend thorough research phases. "Wait and gather more data" is a valid recommendation.');
  } else if (params.speed_preference > 0.7) {
    directives.push('This decision-maker is ACTION-BIASED. Be concise. Lead with the recommendation and next step. Avoid "research more" unless truly critical. They value speed over exhaustive analysis.');
  }

  if (params.evidence_threshold > 0.7) {
    directives.push('This decision-maker requires HIGH EVIDENCE STANDARDS. Cite specific data points, sources, and benchmarks. Flag when an assertion is an estimate vs a verified data point. They distrust unsupported claims.');
  } else if (params.evidence_threshold < 0.3) {
    directives.push('This decision-maker is comfortable with directional estimates and pattern-based reasoning. You don\'t need to cite everything — focus on the strongest 2-3 data points.');
  }

  if (params.optimism_bias < 0.3) {
    directives.push('This decision-maker tends toward PESSIMISM. They take warnings seriously and appreciate conservative estimates. Don\'t sugarcoat — they prefer honest worst-case analysis.');
  } else if (params.optimism_bias > 0.7) {
    directives.push('This decision-maker tends toward OPTIMISM. While you should still flag real risks, frame the analysis around what CAN work and what opportunities exist. They are energized by possibility.');
  }

  if (params.detail_preference > 0.7) {
    directives.push('This decision-maker values DETAILED analysis. Provide thorough reasoning with multiple sub-arguments. They read everything and appreciate nuance.');
  } else if (params.detail_preference < 0.3) {
    directives.push('This decision-maker prefers CONCISE outputs. Keep your analysis tight — lead with the conclusion, provide 2-3 supporting points maximum. No padding.');
  }

  if (params.confidence_calibration < 0.4) {
    directives.push('CALIBRATION NOTE: The system has historically been OVERCONFIDENT with this user. Reduce probability estimates by 5-10 percentage points from your initial assessment. Be more conservative in certainty claims.');
  } else if (params.confidence_calibration > 0.6) {
    directives.push('CALIBRATION NOTE: The system has historically been TOO CAUTIOUS with this user. Your probability estimates may be slightly low — consider if you\'re being unnecessarily conservative.');
  }

  if (directives.length === 0) return '';

  return `
── DECISION-MAKER PERSONALITY (learned from ${params.inference_confidence > 0.5 ? 'extensive' : 'limited'} interaction history) ──
${directives.join('\n')}
────────────────────────────────────────────────────────────────
`;
}

// ═══════════════════════════════════════════
// applyBehavioralModifiers() — Adjust verdict output
// ═══════════════════════════════════════════

export function applyBehavioralModifiers(
  params: BehavioralProfile,
  verdict: any
): any {
  if (!verdict || params.inference_confidence < 0.2) return verdict;

  const modified = { ...verdict };

  // 1. PROBABILITY CALIBRATION
  if (params.confidence_calibration < 0.4 && modified.probability) {
    const reduction = Math.round((0.5 - params.confidence_calibration) * 15);
    modified.probability = Math.max(5, modified.probability - reduction);
    modified.calibration_adjusted = true;
    modified.calibration_note = `Probability adjusted -${reduction}pp based on historical accuracy with this user.`;
  } else if (params.confidence_calibration > 0.6 && modified.probability) {
    const boost = Math.round((params.confidence_calibration - 0.5) * 10);
    modified.probability = Math.min(95, modified.probability + boost);
    modified.calibration_adjusted = true;
    modified.calibration_note = `Probability adjusted +${boost}pp based on historical accuracy with this user.`;
  }

  // 2. RISK FRAMING
  if (params.risk_tolerance < 0.3 && modified.main_risk && modified.one_liner) {
    if (!modified.one_liner.toLowerCase().includes('risk') && !modified.one_liner.toLowerCase().includes('caution')) {
      modified.one_liner = `Key risk: ${modified.main_risk}. ${modified.one_liner}`;
    }
  }

  // 3. ACTION URGENCY
  if (params.speed_preference > 0.7 && modified.next_action) {
    if (modified.next_action.toLowerCase().includes('research') || modified.next_action.toLowerCase().includes('investigate')) {
      modified.action_urgency = 'Consider acting sooner — you tend to prefer speed over exhaustive research.';
    }
  }

  return modified;
}

// ═══════════════════════════════════════════
// setUserOverride() — User explicitly sets a parameter
// ═══════════════════════════════════════════

export async function setUserOverride(
  userId: string,
  param: ParamKey,
  value: number
): Promise<BehavioralProfile> {
  if (!supabase) return { ...DEFAULT_PROFILE };

  const clamped = clamp(value, 0.0, 1.0);
  const current = await getOrCreateProfile(userId);
  const overrides = { ...current.user_overrides, [param]: true };

  await supabase.from('behavioral_profiles').upsert({
    user_id: userId,
    [param]: clamped,
    user_overrides: overrides,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return { ...current, [param]: clamped, user_overrides: overrides };
}

/**
 * Remove a user override — let inference take over again.
 */
export async function removeUserOverride(
  userId: string,
  param: ParamKey
): Promise<void> {
  if (!supabase) return;

  const current = await getOrCreateProfile(userId);
  const overrides = { ...current.user_overrides };
  delete overrides[param];

  await supabase.from('behavioral_profiles').update({
    user_overrides: overrides,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
}

// ═══════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
