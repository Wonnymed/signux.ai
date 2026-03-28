// ── Verdict Insights: Counter-Factual Flip + Blind Spot Detector ──
// Two unique features that no competitor has. Both run in Round 10
// after the verdict is generated, transforming flat verdicts into
// actionable conditional paths and unknown-unknown detection.

import { callClaude, parseJSON } from './claude';
import type { DecisionObject } from '../agents/types';
import type { SimulationState } from './state';
import type { TaskLedger } from './ledger';

// ── COUNTER-FACTUAL FLIP ANALYSIS ──────────────────────────
// Shows the user: "This decision becomes PROCEED IF..." and
// "This decision becomes ABANDON IF..."

export type FlipCondition = {
  condition: string;          // "Monthly rent below ₩8M AND Korean partner confirmed"
  probability_if_met: number; // What the probability would become
  feasibility: 'easy' | 'moderate' | 'hard';
  timeframe: string;          // "2 weeks", "3 months"
};

export type CounterFactualFlip = {
  current_verdict: string;
  current_probability: number;
  flip_to_proceed: FlipCondition[];
  flip_to_abandon: FlipCondition[];
  single_biggest_lever: string;
};

export async function generateCounterFactualFlip(
  question: string,
  verdict: DecisionObject,
  state: SimulationState,
  taskLedger?: TaskLedger,
): Promise<CounterFactualFlip> {
  const agentSummary = Array.from(state.latest_reports.entries())
    .map(([, report]) => `${report.agent_name} (${report.position}, ${report.confidence}/10): ${report.key_argument.substring(0, 100)}`)
    .join('\n');

  const response = await callClaude({
    systemPrompt: `You are the Counter-Factual Analyst for Octux AI. Your job is to identify the SPECIFIC CONDITIONS that would FLIP this decision.

This is the most valuable part of the analysis — transforming "no" into "not yet, unless..." Users don't want a flat verdict. They want: "Here's exactly what would need to change."

RULES:
- Be EXTREMELY specific. Not "if market conditions improve" but "if monthly rent is below ₩8M/month AND a Korean co-founder joins the team"
- Each condition must be VERIFIABLE — the user can check if it's true or false
- Include feasibility: can they realistically make this happen?
- Include timeframe: how long would it take to verify or achieve this condition?
- The single_biggest_lever should be the ONE condition that, if met, changes the verdict most dramatically
- Respond with valid JSON only`,
    userMessage: `QUESTION: "${question}"

CURRENT VERDICT: ${verdict.recommendation} (${verdict.probability}%)
MAIN RISK: ${verdict.main_risk}
LEVERAGE POINT: ${verdict.leverage_point}

AGENT DEBATE SUMMARY:
${agentSummary}

${taskLedger ? `VERIFIED FACTS: ${taskLedger.verified_facts.join('; ')}\nUNVERIFIED ASSUMPTIONS: ${taskLedger.assumptions.join('; ')}\nOPEN QUESTIONS: ${taskLedger.open_questions.join('; ')}` : ''}

Generate counter-factual flip analysis. JSON:
{
  "current_verdict": "${verdict.recommendation}",
  "current_probability": ${verdict.probability},
  "flip_to_proceed": [
    { "condition": "specific condition that would make this a PROCEED", "probability_if_met": 65-85, "feasibility": "easy|moderate|hard", "timeframe": "X weeks/months" }
  ],
  "flip_to_abandon": [
    { "condition": "specific condition that would make this an ABANDON", "probability_if_met": 5-15, "feasibility": "easy|moderate|hard", "timeframe": "X weeks/months" }
  ],
  "single_biggest_lever": "The ONE thing that changes everything — be specific"
}

Generate 2-3 flip_to_proceed conditions and 1-2 flip_to_abandon conditions.`,
    maxTokens: 1024,
  });

  try {
    return parseJSON<CounterFactualFlip>(response);
  } catch {
    return {
      current_verdict: verdict.recommendation,
      current_probability: verdict.probability,
      flip_to_proceed: [],
      flip_to_abandon: [],
      single_biggest_lever: verdict.leverage_point || 'Could not determine',
    };
  }
}

// ── BLIND SPOT DETECTOR ────────────────────────────────────
// After 10 agents report, asks: "What is CRITICALLY important
// that NOBODY mentioned?" Captures unknown unknowns.

export type BlindSpot = {
  blind_spot: string;
  why_critical: string;
  which_agent_should_have_caught_it: string;
  severity: 'low' | 'medium' | 'high';
};

export type BlindSpotAnalysis = {
  blind_spots: BlindSpot[];
  coverage_assessment: string;
  overall_blind_spot_risk: 'low' | 'medium' | 'high';
};

export async function detectBlindSpots(
  question: string,
  verdict: DecisionObject,
  state: SimulationState,
  taskLedger?: TaskLedger,
): Promise<BlindSpotAnalysis> {
  const agentSummary = Array.from(state.latest_reports.entries())
    .map(([, report]) => `${report.agent_name}: covered ${report.key_argument.substring(0, 80)}`)
    .join('\n');

  const agentNames = Array.from(state.latest_reports.values())
    .map(r => r.agent_name)
    .join(', ');

  const response = await callClaude({
    systemPrompt: `You are the Blind Spot Detector for Octux AI. After 10 specialist agents debated a decision, your job is to identify what they ALL MISSED.

This is about UNKNOWN UNKNOWNS — the risks and factors that nobody thought to analyze.

RULES:
- Think about what a REAL entrepreneur would encounter that these analysts wouldn't predict
- Consider: cultural factors, timing/seasonality, personal factors, black swan risks, second-order effects, emotional/psychological factors, relationship dynamics
- Each blind spot must be SPECIFIC to this question — not generic risks
- Name which agent SHOULD have caught this but didn't — this creates accountability
- Be honest about severity — not everything missed is high severity
- Respond with valid JSON only`,
    userMessage: `QUESTION: "${question}"

VERDICT: ${verdict.recommendation} (${verdict.probability}%)

THE 10 AGENTS COVERED:
${agentSummary}

AGENTS WHO PARTICIPATED: ${agentNames}

${taskLedger ? `OPEN QUESTIONS (already identified): ${taskLedger.open_questions.join('; ')}` : ''}

What did ALL of these agents MISS? What blind spots exist in this analysis?

JSON:
{
  "blind_spots": [
    {
      "blind_spot": "Specific thing that was missed",
      "why_critical": "Why this matters for the decision",
      "which_agent_should_have_caught_it": "Agent Name",
      "severity": "low|medium|high"
    }
  ],
  "coverage_assessment": "1-2 sentence overall assessment of what was well-covered vs missed",
  "overall_blind_spot_risk": "low|medium|high"
}

Generate 2-4 blind spots.`,
    maxTokens: 1024,
  });

  try {
    return parseJSON<BlindSpotAnalysis>(response);
  } catch {
    return {
      blind_spots: [],
      coverage_assessment: 'Could not assess blind spots',
      overall_blind_spot_risk: 'medium',
    };
  }
}
