/**
 * Simulation Refinement — Tweak one variable without re-running 10 agents.
 *
 * Instead of: 10 agents × 10 rounds = $0.50, 60 seconds
 * Refinement: 1 call with full sim context = $0.03, 5 seconds
 */

import { supabase } from '../memory/supabase';
import { callClaude } from '../simulation/claude';
import { getModelForTier, type ModelTier, TIER_CONFIGS } from './tiers';

export type RefinementRequest = {
  simulationId: string;
  modification: string;
  userId: string;
  tier: ModelTier;
};

export type RefinementResult = {
  originalVerdict: { recommendation: string; probability: number; mainRisk: string };
  refinedAssessment: string;
  newProbability: number | null;
  newRecommendation: string | null;
  verdictChanged: boolean;
  keyImpacts: string[];
  suggestFullSim: boolean;
};

export async function refineSimulation(req: RefinementRequest): Promise<RefinementResult | null> {
  if (!supabase) return null;

  const { data: sim } = await supabase
    .from('simulations')
    .select('id, question, verdict, debate')
    .eq('id', req.simulationId)
    .eq('user_id', req.userId)
    .single();

  if (!sim) return null;

  const verdict = sim.verdict as any;
  const debate = sim.debate as any;

  // Build compact summary of original analysis
  let agentSummary = 'No agent reports available.';
  if (debate) {
    const entries = Object.entries(debate);
    if (entries.length > 0) {
      agentSummary = entries
        .map(([id, reports]: [string, any]) => {
          // debate is Map-like: agentId → AgentReport[]
          const r = Array.isArray(reports) ? reports[reports.length - 1] : reports;
          return `${r?.agent_name || id}: ${(r?.position || '?').toUpperCase()} (${r?.confidence || '?'}/10) — ${(r?.key_argument || '').substring(0, 100)}`;
        })
        .join('\n');
    }
  }

  const origRec = (verdict?.recommendation || 'unknown').toUpperCase();
  const origProb = verdict?.probability || 0;
  const origRisk = verdict?.main_risk || 'unknown';
  const origAction = verdict?.next_action || 'unknown';

  try {
    const model = getModelForTier(req.tier);

    const response = await callClaude({
      systemPrompt: `You are an expert decision analyst performing a QUICK REFINEMENT of a previous simulation.

The user wants to change ONE variable and understand the impact WITHOUT re-running the full 10-agent debate.

Your job:
1. Analyze how the modification impacts the original verdict
2. Estimate a new probability (if it would change significantly)
3. Identify 2-4 key impacts of the change
4. If the change is FUNDAMENTAL (changes the entire framing), recommend a full simulation instead
5. Be specific and reference the original agent arguments

Return JSON:
{
  "refined_assessment": "2-3 paragraph analysis of what changes",
  "new_probability": null or 0-100,
  "new_recommendation": null or "proceed" or "delay" or "abandon",
  "verdict_changed": true/false,
  "key_impacts": ["impact 1", "impact 2"],
  "suggest_full_sim": true/false
}`,
      userMessage: `ORIGINAL QUESTION: "${sim.question}"

ORIGINAL VERDICT: ${origRec} (${origProb}%)
Main risk: ${origRisk}
Next action: ${origAction}

AGENT ANALYSIS SUMMARY:
${agentSummary}

USER'S MODIFICATION: "${req.modification}"

Analyze the impact of this change on the verdict. JSON:`,
      maxTokens: TIER_CONFIGS[req.tier].maxTokens,
      model,
    });

    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

    return {
      originalVerdict: {
        recommendation: origRec,
        probability: origProb,
        mainRisk: origRisk,
      },
      refinedAssessment: parsed.refined_assessment || 'Unable to assess refinement.',
      newProbability: parsed.new_probability ?? null,
      newRecommendation: parsed.new_recommendation ?? null,
      verdictChanged: parsed.verdict_changed ?? false,
      keyImpacts: Array.isArray(parsed.key_impacts) ? parsed.key_impacts : [],
      suggestFullSim: parsed.suggest_full_sim ?? false,
    };
  } catch (err) {
    console.error('REFINE: Failed:', err);
    return null;
  }
}
