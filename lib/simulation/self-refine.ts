// ── Self-Evolving #13 — Generate → Critique → Refine ─────────
// Verdict goes through quality critique and optional refinement pass

import { callClaude, parseJSON } from './claude';
import type { DecisionObject } from '../agents/types';
import type { SimulationState } from './state';

// ── Types ──────────────────────────────────────────────────

export type VerdictCritique = {
  overall_assessment: string;
  strengths: string[];
  weaknesses: string[];
  missing_perspectives: string[];
  confidence_calibration: string;
  actionability_score: number;
  should_refine: boolean;
};

// ── Critique ───────────────────────────────────────────────

export async function critiqueVerdict(
  question: string,
  verdict: DecisionObject,
  state: SimulationState,
): Promise<VerdictCritique> {
  const agentSummary = Array.from(state.latest_reports.entries())
    .map(
      ([, report]) =>
        `${report.agent_name}: ${report.position} (${report.confidence}/10) — ${report.key_argument.substring(0, 80)}`,
    )
    .join('\n');

  const response = await callClaude({
    systemPrompt: `You are the Quality Critic for Octux AI. You evaluate Decision Objects synthesized from multi-agent adversarial debates.

You are harsh but fair. You check:
1. COHERENCE: Does the recommendation match the evidence? If 8/10 agents said "delay" but verdict says "proceed", flag it.
2. SPECIFICITY: Are the risk, leverage point, and next action concrete or vague?
3. CALIBRATION: Is the probability well-justified by agent confidence levels and evidence?
4. COMPLETENESS: Were any critical perspectives missed?
5. ACTIONABILITY: Can someone actually DO the next action this week with available resources?

Respond with valid JSON only.`,
    userMessage: `QUESTION: "${question}"

AGENT DEBATE SUMMARY:
${agentSummary}

VERDICT TO CRITIQUE:
- Recommendation: ${verdict.recommendation}
- Probability: ${verdict.probability}%
- Grade: ${verdict.grade} (${verdict.grade_score}/100)
- Main Risk: ${verdict.main_risk}
- Leverage Point: ${verdict.leverage_point}
- Next Action: ${verdict.next_action}

Critique this verdict. JSON:
{
  "overall_assessment": "1-2 sentence summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "missing_perspectives": ["missed angle"],
  "confidence_calibration": "Is the probability justified given agent positions?",
  "actionability_score": 0-10,
  "should_refine": true/false
}`,
    maxTokens: 1024,
  });

  try {
    return parseJSON<VerdictCritique>(response);
  } catch {
    return {
      overall_assessment: 'Could not critique verdict',
      strengths: [],
      weaknesses: [],
      missing_perspectives: [],
      confidence_calibration: 'Unknown',
      actionability_score: 5,
      should_refine: false,
    };
  }
}

// ── Refine ─────────────────────────────────────────────────

export async function refineVerdict(
  question: string,
  originalVerdict: DecisionObject,
  critique: VerdictCritique,
  state: SimulationState,
  consensusData?: { position: string; percent: number },
): Promise<DecisionObject> {
  if (!critique.should_refine) return originalVerdict;

  const agentSummary = Array.from(state.latest_reports.entries())
    .map(
      ([, report]) =>
        `${report.agent_name}: ${report.position} (${report.confidence}/10) — ${report.key_argument.substring(0, 80)}`,
    )
    .join('\n');

  const consensusRule = consensusData
    ? `\nCRITICAL RULE: ${consensusData.percent}% of agents recommend "${consensusData.position}". The refined verdict MUST keep the recommendation as "${consensusData.position}". You can improve probability calibration, risk analysis, and next_action specificity — but do NOT flip the recommendation against agent consensus. The agents debated for 9 rounds — respect their conclusion.`
    : '';

  const consensusMsg = consensusData
    ? `\nAGENT CONSENSUS: ${consensusData.percent}% of agents recommended "${consensusData.position}". Your refined verdict MUST respect this consensus direction.\n`
    : '';

  const response = await callClaude({
    systemPrompt: `You are the Decision Chair performing a REFINEMENT pass. A quality critic identified weaknesses. Produce an IMPROVED verdict that:
- Fixes the specific weaknesses identified
- Makes next_action MORE specific and actionable (include WHO does WHAT by WHEN)
- Recalibrates probability if the critique says it's wrong
- Adds missing perspectives into risk/leverage analysis
- Improves the grade slightly if refinement is meaningful${consensusRule}
Respond with valid JSON only matching the DecisionObject schema.`,
    userMessage: `QUESTION: "${question}"

AGENT DEBATE:
${agentSummary}
${consensusMsg}
ORIGINAL VERDICT:
${JSON.stringify(originalVerdict, null, 2)}

CRITIQUE:
${JSON.stringify(critique, null, 2)}

Produce a REFINED verdict. JSON:
{
  "recommendation": "proceed" | "proceed_with_conditions" | "delay" | "abandon",
  "probability": 0-100,
  "main_risk": "refined risk",
  "leverage_point": "refined leverage",
  "next_action": "MORE specific — WHO does WHAT by WHEN",
  "grade": "A-F",
  "grade_score": 0-100,
  "citations": []
}`,
    maxTokens: 1024,
  });

  try {
    const refined = parseJSON<DecisionObject>(response);
    // Preserve traceable citations from original
    refined.citations = originalVerdict.citations;
    return refined;
  } catch {
    return originalVerdict;
  }
}
