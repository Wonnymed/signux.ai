/**
 * Simulation Confidence Heatmap — Octux OVERKILL innovation.
 *
 * Decomposes a verdict into individual CLAIMS, each graded:
 *   GREEN:  High confidence — 3+ agents agree, evidence cited
 *   YELLOW: Moderate — 2 agents agree or single agent with evidence
 *   RED:    Low confidence — single agent, no evidence, or contested
 *
 * This transforms "PROCEED (72%)" from a black box into a transparent breakdown
 * where the user can SEE which parts of the analysis are solid vs shaky.
 */

import { callClaude, parseJSON } from './claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type VerdictClaim = {
  claim: string;
  confidence_grade: 'green' | 'yellow' | 'red';
  confidence_score: number;
  supporting_agents: string[];
  contested_by: string[];
  evidence_quality: 'strong' | 'moderate' | 'weak' | 'none';
  category: 'market' | 'financial' | 'regulatory' | 'competitive' | 'operational' | 'risk';
};

export type ConfidenceHeatmap = {
  total_claims: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  overall_confidence: number;
  weakest_claim: string;
  strongest_claim: string;
  claims: VerdictClaim[];
};

/**
 * Extract individual claims from the verdict and grade each one.
 */
export async function extractVerdictClaims(
  question: string,
  verdict: any,
  agentReports: Map<string, any>
): Promise<ConfidenceHeatmap> {
  const reports: string[] = [];
  for (const [id, report] of agentReports.entries()) {
    if (id === 'decision_chair') continue;
    const r = report as any;
    reports.push(
      `${id}: ${(r.position || '?').toUpperCase()} (${r.confidence || '?'}/10) — ${(r.key_argument || '').substring(0, 150)} | Evidence: ${formatEvidence(r)} | Risks: ${formatRisks(r)}`
    );
  }

  const verdictText = verdict
    ? `${(verdict.recommendation || 'unknown').toUpperCase()} (${verdict.probability || 0}%). Risk: ${verdict.main_risk || 'unknown'}. Action: ${verdict.next_action || 'unknown'}.`
    : 'No verdict';

  try {
    const response = await callClaude({
      systemPrompt: `You decompose a decision verdict into individual CLAIMS and grade each one.

For each claim in the verdict:
1. Identify the specific factual or analytical claim
2. Count how many agents SUPPORT it (mentioned similar point)
3. Count how many agents CONTEST it (disagreed or raised counter-evidence)
4. Assess evidence quality:
   - strong: multiple agents cited specific data/sources
   - moderate: 1-2 agents cited data
   - weak: asserted without evidence
   - none: pure assumption
5. Grade confidence:
   - green: 3+ agents agree + evidence strong/moderate
   - yellow: 2 agents agree OR 1 agent with strong evidence
   - red: 1 agent only + weak/no evidence, OR actively contested
6. Assign a score 0-1 and a category

Return 5-10 claims. Focus on the most important ones.
Return JSON array.`,
      userMessage: `QUESTION: "${question}"

VERDICT: ${verdictText}

AGENT REPORTS:
${reports.join('\n\n')}

JSON array of claims:
[{
  "claim": "specific claim text",
  "confidence_grade": "green|yellow|red",
  "confidence_score": 0.0-1.0,
  "supporting_agents": ["agent_id_1"],
  "contested_by": ["agent_id_2"],
  "evidence_quality": "strong|moderate|weak|none",
  "category": "market|financial|regulatory|competitive|operational|risk"
}]`,
      maxTokens: 800,
    });

    const claims = parseJSON<VerdictClaim[]>(response);

    if (!claims || claims.length === 0) {
      return emptyHeatmap();
    }

    const green = claims.filter(c => c.confidence_grade === 'green');
    const yellow = claims.filter(c => c.confidence_grade === 'yellow');
    const red = claims.filter(c => c.confidence_grade === 'red');

    const avgConfidence = claims.reduce((s, c) => s + (c.confidence_score || 0.5), 0) / claims.length;

    const sorted = [...claims].sort((a, b) => (a.confidence_score || 0) - (b.confidence_score || 0));
    const weakest = sorted[0]?.claim || 'unknown';
    const strongest = sorted[sorted.length - 1]?.claim || 'unknown';

    const heatmap: ConfidenceHeatmap = {
      total_claims: claims.length,
      green_count: green.length,
      yellow_count: yellow.length,
      red_count: red.length,
      overall_confidence: Math.round(avgConfidence * 100) / 100,
      weakest_claim: weakest,
      strongest_claim: strongest,
      claims,
    };

    console.log(`HEATMAP: ${claims.length} claims — ${green.length} green, ${yellow.length} yellow, ${red.length} red (overall: ${(avgConfidence * 100).toFixed(0)}%)`);

    return heatmap;
  } catch (err) {
    console.error('HEATMAP: extraction failed:', err);
    return emptyHeatmap();
  }
}

function emptyHeatmap(): ConfidenceHeatmap {
  return {
    total_claims: 0, green_count: 0, yellow_count: 0, red_count: 0,
    overall_confidence: 0.5, weakest_claim: '', strongest_claim: '', claims: [],
  };
}

function formatEvidence(r: any): string {
  if (!r.evidence || !Array.isArray(r.evidence)) return 'none';
  return r.evidence.slice(0, 2).map((e: any) => typeof e === 'string' ? e.substring(0, 50) : (e.description || '').substring(0, 50)).join('; ') || 'none';
}

function formatRisks(r: any): string {
  if (!r.risks || !Array.isArray(r.risks)) return 'none';
  return r.risks.slice(0, 2).map((rk: any) => typeof rk === 'string' ? rk.substring(0, 50) : (rk.description || '').substring(0, 50)).join('; ') || 'none';
}
