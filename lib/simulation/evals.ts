// ── DeepEval #12 — Simulation Quality Evaluation Framework ──
// Scores simulation quality across multiple dimensions using
// data from the state machine, audit trail, and agent reports.

import type { AgentReport, DecisionObject } from '../agents/types';
import type { SimulationState } from './state';
import type { SimulationAudit } from './audit';

// ── Types ──────────────────────────────────────────────────

export type EvalDimension =
  | 'diversity'
  | 'evidence_quality'
  | 'debate_depth'
  | 'consensus_convergence'
  | 'verdict_coherence'
  | 'cost_efficiency'
  | 'completeness';

export type DimensionScore = {
  dimension: EvalDimension;
  score: number;        // 0-100
  weight: number;       // 0-1, sums to 1.0 across all dimensions
  explanation: string;  // human-readable reason for the score
};

export type SimulationEval = {
  simulation_id: string;
  overall_score: number;         // 0-100 weighted average
  grade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';
  dimensions: DimensionScore[];
  flags: EvalFlag[];             // actionable warnings
  evaluated_at: string;
};

export type EvalFlag = {
  severity: 'info' | 'warning' | 'critical';
  dimension: EvalDimension;
  message: string;
};

// ── Dimension Weights ──────────────────────────────────────

const WEIGHTS: Record<EvalDimension, number> = {
  diversity:             0.15,
  evidence_quality:      0.20,
  debate_depth:          0.15,
  consensus_convergence: 0.15,
  verdict_coherence:     0.20,
  cost_efficiency:       0.05,
  completeness:          0.10,
};

// ── Main Evaluator ─────────────────────────────────────────

export function evaluateSimulation(
  state: SimulationState,
  audit: SimulationAudit,
): SimulationEval {
  const reports = Array.from(state.latest_reports.values());
  const allReports = Array.from(state.agent_reports.values()).flat();
  const flags: EvalFlag[] = [];

  const dimensions: DimensionScore[] = [
    scoreDiversity(reports, flags),
    scoreEvidenceQuality(allReports, flags),
    scoreDebateDepth(state, flags),
    scoreConsensusConvergence(state, flags),
    scoreVerdictCoherence(state, reports, flags),
    scoreCostEfficiency(audit, state, flags),
    scoreCompleteness(state, flags),
  ];

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    simulation_id: state.simulation_id,
    overall_score: overall,
    grade: scoreToGrade(overall),
    dimensions,
    flags,
    evaluated_at: new Date().toISOString(),
  };
}

// ── Dimension Scorers ──────────────────────────────────────

function scoreDiversity(
  reports: AgentReport[],
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'diversity';
  const weight = WEIGHTS[dimension];

  if (reports.length === 0) {
    return { dimension, score: 0, weight, explanation: 'No agent reports' };
  }

  // Position diversity: 3 positions possible (proceed/delay/abandon)
  const positions = new Set(reports.map((r) => r.position));
  const positionDiversity = (positions.size / 3) * 100;

  // Agent coverage: how many of the 10 specialists reported
  const agentCoverage = (reports.length / 10) * 100;

  // Confidence spread: std deviation of confidence values
  const confidences = reports.map((r) => r.confidence);
  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) / confidences.length;
  const stdDev = Math.sqrt(variance);
  // Healthy spread is 1.5-3.0 std dev — too low means groupthink, too high means noise
  const spreadScore = stdDev < 0.5 ? 30 : stdDev > 4 ? 50 : Math.min(100, stdDev * 33);

  const score = Math.round(positionDiversity * 0.4 + agentCoverage * 0.3 + spreadScore * 0.3);

  if (positions.size === 1) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `All ${reports.length} agents chose "${[...positions][0]}" — possible groupthink`,
    });
  }

  if (reports.length < 8) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `Only ${reports.length}/10 specialists reported — incomplete coverage`,
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `${positions.size}/3 positions represented, ${reports.length}/10 agents reported, confidence σ=${stdDev.toFixed(1)}`,
  };
}

function scoreEvidenceQuality(
  allReports: AgentReport[],
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'evidence_quality';
  const weight = WEIGHTS[dimension];

  if (allReports.length === 0) {
    return { dimension, score: 0, weight, explanation: 'No reports to evaluate' };
  }

  let totalEvidenceCount = 0;
  let totalRiskCount = 0;
  let emptyArgumentCount = 0;
  let shortArgumentCount = 0;

  for (const r of allReports) {
    totalEvidenceCount += r.evidence.length;
    totalRiskCount += r.risks_identified.length;
    if (!r.key_argument || r.key_argument.trim().length === 0) emptyArgumentCount++;
    else if (r.key_argument.length < 30) shortArgumentCount++;
  }

  // Average evidence per report (ideal: 2+)
  const avgEvidence = totalEvidenceCount / allReports.length;
  const evidenceScore = Math.min(100, avgEvidence * 50);

  // Average risks identified (ideal: 1+)
  const avgRisks = totalRiskCount / allReports.length;
  const riskScore = Math.min(100, avgRisks * 100);

  // Argument quality: penalize empty or very short arguments
  const emptyPenalty = (emptyArgumentCount / allReports.length) * 100;
  const shortPenalty = (shortArgumentCount / allReports.length) * 50;
  const argumentScore = Math.max(0, 100 - emptyPenalty - shortPenalty);

  const score = Math.round(evidenceScore * 0.4 + riskScore * 0.3 + argumentScore * 0.3);

  if (emptyArgumentCount > 0) {
    flags.push({
      severity: 'critical',
      dimension,
      message: `${emptyArgumentCount} reports had empty key arguments`,
    });
  }

  if (avgEvidence < 1) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `Low evidence density: avg ${avgEvidence.toFixed(1)} per report (target: 2+)`,
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `Avg ${avgEvidence.toFixed(1)} evidence items, ${avgRisks.toFixed(1)} risks per report, ${emptyArgumentCount} empty arguments`,
  };
}

function scoreDebateDepth(
  state: SimulationState,
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'debate_depth';
  const weight = WEIGHTS[dimension];

  const hadAdversarial = state.phase_history.some(
    (p) => p.phase === 'adversarial' && p.completed_at && !p.skipped,
  );

  if (!hadAdversarial) {
    // Early consensus — debate was skipped (legitimate, but lower score)
    const wasEarlyConsensus = state.phase_history.some(
      (p) => p.phase === 'adversarial' && p.skipped,
    );

    if (wasEarlyConsensus) {
      flags.push({
        severity: 'info',
        dimension,
        message: 'Adversarial phase skipped due to early consensus',
      });
      return {
        dimension,
        score: 40,
        weight,
        explanation: 'Debate skipped — early consensus among agents',
      };
    }

    return { dimension, score: 0, weight, explanation: 'No adversarial phase occurred' };
  }

  // Number of debate pairs (0-2 expected)
  const pairCount = state.debate_pairs.length;
  const pairScore = Math.min(100, pairCount * 50);

  // Average debate intensity (0-1)
  const avgIntensity = pairCount > 0
    ? state.debate_pairs.reduce((sum, p) => sum + p.intensity, 0) / pairCount
    : 0;
  const intensityScore = avgIntensity * 100;

  // Position changes: did any agent actually change position during debate?
  let positionChanges = 0;
  for (const [agentId, reports] of state.agent_reports.entries()) {
    if (reports.length < 2) continue;
    const positions = reports.map((r) => r.position);
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] !== positions[i - 1]) positionChanges++;
    }
  }
  // 1-3 changes is healthy debate; 0 means nobody moved; 5+ is chaos
  const changeScore = positionChanges === 0 ? 20 : positionChanges > 4 ? 60 : Math.min(100, positionChanges * 33);

  // Handoff count reflects actual debate exchanges
  const handoffScore = Math.min(100, state.handoffs.length * 25);

  const score = Math.round(
    pairScore * 0.25 + intensityScore * 0.25 + changeScore * 0.25 + handoffScore * 0.25,
  );

  if (positionChanges === 0 && pairCount > 0) {
    flags.push({
      severity: 'warning',
      dimension,
      message: 'No agents changed position during debate — debate may not have been productive',
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `${pairCount} debate pairs, avg intensity ${avgIntensity.toFixed(2)}, ${positionChanges} position changes, ${state.handoffs.length} handoffs`,
  };
}

function scoreConsensusConvergence(
  state: SimulationState,
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'consensus_convergence';
  const weight = WEIGHTS[dimension];

  const history = state.consensus_history;

  if (history.length < 2) {
    return {
      dimension,
      score: 50,
      weight,
      explanation: 'Insufficient consensus snapshots to measure convergence',
    };
  }

  // Measure how dominant position grew over time
  const first = history[0];
  const last = history[history.length - 1];

  const firstMax = Math.max(first.proceed, first.delay, first.abandon);
  const lastMax = Math.max(last.proceed, last.delay, last.abandon);

  // Convergence delta: did the majority grow?
  const convergenceDelta = lastMax - firstMax;
  // +30 or more means strong convergence; negative means divergence
  const convergenceScore = Math.max(0, Math.min(100, 50 + convergenceDelta));

  // Confidence trend: did average confidence increase?
  const confidenceDelta = last.avg_confidence - first.avg_confidence;
  const confidenceScore = Math.max(0, Math.min(100, 50 + confidenceDelta * 10));

  // Final majority strength (> 70% is strong)
  const majorityScore = Math.min(100, lastMax * 1.2);

  const score = Math.round(
    convergenceScore * 0.4 + confidenceScore * 0.3 + majorityScore * 0.3,
  );

  if (lastMax < 50) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `No clear majority in final consensus: ${last.proceed}% proceed, ${last.delay}% delay, ${last.abandon}% abandon`,
    });
  }

  if (confidenceDelta < -1) {
    flags.push({
      severity: 'info',
      dimension,
      message: `Average confidence decreased from ${first.avg_confidence} to ${last.avg_confidence} — debate introduced uncertainty`,
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `Majority ${firstMax}% → ${lastMax}% (Δ${convergenceDelta > 0 ? '+' : ''}${convergenceDelta}), confidence ${first.avg_confidence} → ${last.avg_confidence}`,
  };
}

function scoreVerdictCoherence(
  state: SimulationState,
  latestReports: AgentReport[],
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'verdict_coherence';
  const weight = WEIGHTS[dimension];
  const verdict = state.verdict;

  if (!verdict) {
    return { dimension, score: 0, weight, explanation: 'No verdict produced' };
  }

  // 1. Recommendation aligns with majority position
  const positions = { proceed: 0, delay: 0, abandon: 0 };
  for (const r of latestReports) {
    if (r.position in positions) positions[r.position as keyof typeof positions]++;
  }
  const majorityPosition = (Object.entries(positions) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const recAligns =
    verdict.recommendation === majorityPosition ||
    (verdict.recommendation === 'proceed_with_conditions' && majorityPosition === 'proceed');
  const alignmentScore = recAligns ? 100 : 30;

  // 2. Probability matches recommendation direction
  let probCoherent = true;
  if (verdict.recommendation === 'proceed' && verdict.probability < 50) probCoherent = false;
  if (verdict.recommendation === 'abandon' && verdict.probability > 50) probCoherent = false;
  const probScore = probCoherent ? 100 : 20;

  // 3. Citations reference actual agents
  const validAgentIds = new Set(latestReports.map((r) => r.agent_id));
  const validCitations = verdict.citations.filter((c) => validAgentIds.has(c.agent_id));
  const citationScore = verdict.citations.length > 0
    ? (validCitations.length / verdict.citations.length) * 100
    : 50; // no citations = neutral

  // 4. Fields are non-empty
  const fields = [verdict.main_risk, verdict.leverage_point, verdict.next_action];
  const nonEmptyFields = fields.filter((f) => f && f.trim().length > 10).length;
  const fieldScore = (nonEmptyFields / fields.length) * 100;

  // 5. Grade score matches grade letter
  const gradeMap: Record<string, [number, number]> = {
    'A': [85, 100], 'A-': [80, 89], 'B+': [75, 84], 'B': [65, 79],
    'B-': [60, 69], 'C+': [55, 64], 'C': [45, 59], 'D': [30, 49], 'F': [0, 34],
  };
  const expectedRange = gradeMap[verdict.grade];
  const gradeCoherent = expectedRange
    ? verdict.grade_score >= expectedRange[0] && verdict.grade_score <= expectedRange[1]
    : false;
  const gradeScore = gradeCoherent ? 100 : 40;

  const score = Math.round(
    alignmentScore * 0.30 +
    probScore * 0.20 +
    citationScore * 0.20 +
    fieldScore * 0.15 +
    gradeScore * 0.15,
  );

  if (!recAligns) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `Verdict "${verdict.recommendation}" doesn't match majority position "${majorityPosition}"`,
    });
  }

  if (!probCoherent) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `Probability ${verdict.probability}% conflicts with recommendation "${verdict.recommendation}"`,
    });
  }

  const invalidCitations = verdict.citations.length - validCitations.length;
  if (invalidCitations > 0) {
    flags.push({
      severity: 'critical',
      dimension,
      message: `${invalidCitations} citations reference agents that didn't report`,
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `Recommendation ${recAligns ? 'aligns' : 'misaligns'} with majority, ${validCitations.length}/${verdict.citations.length} valid citations, probability ${probCoherent ? 'coherent' : 'incoherent'}`,
  };
}

function scoreCostEfficiency(
  audit: SimulationAudit,
  state: SimulationState,
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'cost_efficiency';
  const weight = WEIGHTS[dimension];

  const totalCalls = audit.rounds.length;
  const failedCalls = audit.rounds.filter((r) => !r.success).length;
  const successRate = totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls) * 100 : 0;

  // Skipped phases save cost — reward that
  const skippedPhases = state.phase_history.filter((p) => p.skipped).length;
  const efficiencyBonus = skippedPhases * 10;

  // Cost per unique agent report (lower is better)
  const uniqueAgents = state.latest_reports.size;
  const costPerAgent = uniqueAgents > 0 ? audit.total_cost_usd / uniqueAgents : 0;
  // Target: < $0.01 per agent is excellent, > $0.05 is expensive
  const costScore = costPerAgent <= 0.01 ? 100 : costPerAgent >= 0.05 ? 30 : Math.round(100 - (costPerAgent - 0.01) * 1750);

  // Duration efficiency: < 30s is great, > 120s is slow
  const durationS = audit.total_duration_ms / 1000;
  const durationScore = durationS <= 30 ? 100 : durationS >= 120 ? 30 : Math.round(100 - (durationS - 30) * 0.78);

  const score = Math.min(100, Math.round(
    successRate * 0.3 + costScore * 0.3 + durationScore * 0.2 + efficiencyBonus + 20 * 0.2,
  ));

  if (failedCalls > 2) {
    flags.push({
      severity: 'warning',
      dimension,
      message: `${failedCalls}/${totalCalls} API calls failed — possible model instability`,
    });
  }

  if (audit.total_cost_usd > 0.50) {
    flags.push({
      severity: 'info',
      dimension,
      message: `High simulation cost: $${audit.total_cost_usd.toFixed(4)}`,
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `${totalCalls} calls (${failedCalls} failed), $${audit.total_cost_usd.toFixed(4)}, ${durationS.toFixed(1)}s, ${skippedPhases} phases skipped`,
  };
}

function scoreCompleteness(
  state: SimulationState,
  flags: EvalFlag[],
): DimensionScore {
  const dimension: EvalDimension = 'completeness';
  const weight = WEIGHTS[dimension];

  let completedChecks = 0;
  const totalChecks = 7;

  // 1. Plan was generated
  if (state.plan && state.plan.tasks.length > 0) completedChecks++;

  // 2. At least 8 unique agents reported
  if (state.latest_reports.size >= 8) completedChecks++;

  // 3. Adversarial or early consensus occurred
  const hadAdversarialOrConsensus = state.phase_history.some(
    (p) => (p.phase === 'adversarial' && (p.completed_at || p.skipped)) ||
           (p.phase === 'convergence' && p.skipped),
  );
  if (hadAdversarialOrConsensus) completedChecks++;

  // 4. Convergence or skip occurred
  const hadConvergence = state.phase_history.some(
    (p) => p.phase === 'convergence' && (p.completed_at || p.skipped),
  );
  if (hadConvergence) completedChecks++;

  // 5. Verdict was produced
  if (state.verdict) completedChecks++;

  // 6. Follow-ups were generated
  if (state.follow_ups.length > 0) completedChecks++;

  // 7. Simulation completed (not errored)
  if (state.current_phase === 'complete') completedChecks++;

  const score = Math.round((completedChecks / totalChecks) * 100);

  if (state.current_phase === 'error') {
    flags.push({
      severity: 'critical',
      dimension,
      message: 'Simulation ended in error state',
    });
  }

  if (!state.verdict) {
    flags.push({
      severity: 'critical',
      dimension,
      message: 'No verdict was produced',
    });
  }

  return {
    dimension,
    score,
    weight,
    explanation: `${completedChecks}/${totalChecks} completion checks passed`,
  };
}

// ── Helpers ────────────────────────────────────────────────

function scoreToGrade(score: number): SimulationEval['grade'] {
  if (score >= 93) return 'A';
  if (score >= 88) return 'A-';
  if (score >= 83) return 'B+';
  if (score >= 76) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 63) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
