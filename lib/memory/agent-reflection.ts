/**
 * Per-Agent Self-Reflection — PraisonAI pattern for Octux.
 *
 * Evaluator-Optimizer loop:
 *   Agent generates report → Haiku evaluates (score 1-10) → score < threshold?
 *     YES → Haiku writes critique → Agent re-generates with critique → repeat
 *     NO  → Report accepted as-is
 *
 * PHILOSOPHY: Agents dealing with NUMBERS (stats, math, regulations) reflect
 * because hallucinated numbers are dangerous. Agents dealing with OPINIONS
 * (strategy, execution) skip because opinions can't be "wrong" the same way.
 *
 * Cost: ~$0.01-0.02 per reflection iteration (Haiku).
 * Only agents with minReflect > 0 spend extra tokens.
 *
 * Ref: PraisonAI (#7 — reflect_llm, min_reflect, max_reflect, Evaluator-Optimizer)
 */

import { callClaude, parseJSON } from '../simulation/claude';

// ═══════════════════════════════════════════
// REFLECTION CONFIG — Per-agent settings
// ═══════════════════════════════════════════

export type ReflectionConfig = {
  minReflect: number;   // minimum reflection iterations (0 = never reflect)
  maxReflect: number;   // maximum iterations before forced accept
  threshold: number;    // score (1-10) below which report gets revised
};

/**
 * Per-agent configuration.
 *
 * HIGH REFLECTION: verifiable data agents — numbers can be checked
 * MODERATE REFLECTION: mixed data agents — reflect only if evaluator flags issue
 * NO REFLECTION: opinion/action agents — skip entirely
 */
export const AGENT_REFLECTION_CONFIG: Record<string, ReflectionConfig> = {
  // HIGH — deals with verifiable data, numbers, regulations
  base_rate_archivist:    { minReflect: 1, maxReflect: 2, threshold: 7 },
  unit_economics_auditor: { minReflect: 1, maxReflect: 2, threshold: 7 },
  regulatory_gatekeeper:  { minReflect: 1, maxReflect: 2, threshold: 7 },

  // MODERATE — mixed data + opinion, reflect if flagged
  demand_signal_analyst:  { minReflect: 0, maxReflect: 1, threshold: 6 },
  competitive_radar:      { minReflect: 0, maxReflect: 1, threshold: 6 },
  capital_strategist:     { minReflect: 0, maxReflect: 1, threshold: 6 },
  scenario_architect:     { minReflect: 0, maxReflect: 1, threshold: 6 },

  // NONE — qualitative, action-oriented
  execution_engineer:     { minReflect: 0, maxReflect: 0, threshold: 5 },
  intervention_designer:  { minReflect: 0, maxReflect: 0, threshold: 5 },
  customer_reality:       { minReflect: 0, maxReflect: 0, threshold: 5 },

  // CHAIR — orchestrator, never reflects
  decision_chair:         { minReflect: 0, maxReflect: 0, threshold: 0 },
};

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ReflectionResult = {
  originalReport: any;
  finalReport: any;
  wasRevised: boolean;
  iterations: number;
  evaluations: {
    iteration: number;
    score: number;
    critique: string;
    accepted: boolean;
  }[];
};

// ═══════════════════════════════════════════
// reflectOnOwnOutput() — Evaluator step
// ═══════════════════════════════════════════

export async function reflectOnOwnOutput(
  agentId: string,
  agentName: string,
  report: any,
  question: string
): Promise<{ score: number; critique: string; issues: string[] }> {
  const reportText = formatReportForReflection(report);

  try {
    const response = await callClaude({
      systemPrompt: `You evaluate an AI agent's analysis report in a decision simulation.
Assess:
1. SPECIFICITY: "12% growth" vs "the market is growing" (specific = better)
2. EVIDENCE: Claims supported/cited or just asserted?
3. PLAUSIBILITY: Do numbers make sense? Reasoning logical?
4. RELEVANCE: Does analysis address the actual question?
5. CONSISTENCY: Position matches evidence? Confidence matches certainty?

Score 1-10. Be strict — most should score 5-7.
Return ONLY JSON: { "score": N, "critique": "main issue", "issues": ["issue1", "issue2"] }`,
      userMessage: `QUESTION: "${question}"
AGENT: ${agentName} (${agentId})
REPORT:
${reportText}

JSON:`,
      maxTokens: 250,
    });

    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
    return {
      score: Math.min(10, Math.max(1, parsed.score || 5)),
      critique: parsed.critique || 'No specific critique.',
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
    };
  } catch (err) {
    console.error(`REFLECT: Eval failed for ${agentId}:`, err);
    return { score: 8, critique: 'Evaluation failed — accepting report.', issues: [] };
  }
}

// ═══════════════════════════════════════════
// runReflectionLoop() — Full Evaluator-Optimizer loop
// ═══════════════════════════════════════════

export async function runReflectionLoop(
  agentId: string,
  agentName: string,
  initialReport: any,
  question: string,
  agentSystemPrompt: string,
  debateContext: string
): Promise<ReflectionResult> {
  const config = AGENT_REFLECTION_CONFIG[agentId] || { minReflect: 0, maxReflect: 0, threshold: 5 };

  // Skip if no reflection configured
  if (config.maxReflect === 0) {
    return {
      originalReport: initialReport,
      finalReport: initialReport,
      wasRevised: false,
      iterations: 0,
      evaluations: [],
    };
  }

  let currentReport = initialReport;
  const evaluations: ReflectionResult['evaluations'] = [];
  let iterations = 0;

  while (iterations < config.maxReflect) {
    // Evaluate current report
    const evaluation = await reflectOnOwnOutput(agentId, agentName, currentReport, question);
    iterations++;

    const accepted = evaluation.score >= config.threshold && iterations >= config.minReflect;

    evaluations.push({
      iteration: iterations,
      score: evaluation.score,
      critique: evaluation.critique,
      accepted,
    });

    if (accepted) {
      console.log(`REFLECT ${agentId}: ${evaluation.score}/10 — ACCEPTED (iter ${iterations})`);
      break;
    }

    console.log(`REFLECT ${agentId}: ${evaluation.score}/10 — REVISING (iter ${iterations}/${config.maxReflect})`);

    // Hit max? Accept whatever we have
    if (iterations >= config.maxReflect) {
      console.log(`REFLECT ${agentId}: Max iterations — accepting score ${evaluation.score}`);
      break;
    }

    // Re-generate with critique as feedback
    try {
      const revisedResponse = await callClaude({
        systemPrompt: agentSystemPrompt,
        userMessage: `${debateContext}

QUESTION: "${question}"

YOUR PREVIOUS ANALYSIS WAS REVIEWED AND NEEDS IMPROVEMENT:
Score: ${evaluation.score}/10
Critique: ${evaluation.critique}
${evaluation.issues.length > 0 ? 'Specific issues:\n' + evaluation.issues.map(i => `- ${i}`).join('\n') : ''}

Provide an IMPROVED analysis addressing these issues.
Be MORE SPECIFIC. Cite EVIDENCE. Make NUMBERS plausible.
Return the same JSON format as before.`,
        maxTokens: 1000,
      });

      const revised = parseJSON<any>(revisedResponse);
      if (revised) {
        currentReport = revised;
      } else {
        console.error(`REFLECT ${agentId}: Parse failed — keeping previous`);
        break;
      }
    } catch (err) {
      console.error(`REFLECT ${agentId}: Revision failed — keeping previous:`, err);
      break;
    }
  }

  return {
    originalReport: initialReport,
    finalReport: currentReport,
    wasRevised: currentReport !== initialReport,
    iterations,
    evaluations,
  };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function formatReportForReflection(report: any): string {
  const parts: string[] = [];
  if (report.position) parts.push(`Position: ${report.position}`);
  if (report.confidence) parts.push(`Confidence: ${report.confidence}/10`);
  if (report.key_argument) parts.push(`Key argument: ${report.key_argument}`);
  if (report.summary) parts.push(`Summary: ${report.summary}`);
  if (report.evidence && Array.isArray(report.evidence)) {
    parts.push(`Evidence: ${report.evidence.slice(0, 3).map((e: any) => typeof e === 'string' ? e : e.description || e.text || '').join('; ')}`);
  }
  if (report.risks_identified && Array.isArray(report.risks_identified)) {
    parts.push(`Risks: ${report.risks_identified.slice(0, 3).map((r: any) => typeof r === 'string' ? r : r.description || r.risk || '').join('; ')}`);
  }
  if (report.data_points && Array.isArray(report.data_points)) {
    parts.push(`Data: ${report.data_points.slice(0, 3).map((d: any) => typeof d === 'string' ? d : d.value || '').join('; ')}`);
  }
  return parts.join('\n');
}

/** Quick check — does this agent have reflection enabled? */
export function agentShouldReflect(agentId: string): boolean {
  const config = AGENT_REFLECTION_CONFIG[agentId];
  return !!config && config.maxReflect > 0;
}

/** Get config for an agent. Returns no-reflection default if not found. */
export function getReflectionConfig(agentId: string): ReflectionConfig {
  return AGENT_REFLECTION_CONFIG[agentId] || { minReflect: 0, maxReflect: 0, threshold: 5 };
}
