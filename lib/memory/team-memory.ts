/**
 * Team Memory — Agno pattern for Octux.
 *
 * Insights that emerge from agent INTERACTION, not individual analysis.
 * "When Regulatory and Unit Economics disagree, Regulatory is right 70% of the time."
 * "The team tends to underweight execution risk."
 * "Consensus at 8+ agents correlates with good outcomes."
 *
 * Ref: Agno (#11 — team memory, shared across all specialists)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';

/**
 * Analyze debate dynamics post-sim and extract team-level insights.
 * Runs every 5 sims (same cadence as reflect).
 *
 * Looks at: consensus patterns, recurring disagreements, blind spots,
 * which agent pairings produce the best/worst outcomes.
 */
export async function extractTeamInsights(
  userId: string,
  simulationId: string,
): Promise<number> {
  if (!supabase) return 0;

  // Check if it's time (every 5 sims)
  const { count } = await supabase
    .from('decision_experiences')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!count || count % 5 !== 0) return 0;

  // Load last 10 sims' debate data for pattern detection
  const { data: recentSims } = await supabase
    .from('simulations')
    .select('id, debate, verdict')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentSims || recentSims.length < 3) return 0;

  // Extract debate summaries
  const debateSummaries = recentSims.map(s => {
    const d = s.debate as any;
    const v = s.verdict as any;
    const reports = d?.agent_reports || {};
    const positions = Object.entries(reports)
      .map(([id, r]: [string, any]) => `${id}: ${(r.position || '?').toUpperCase()} (${r.confidence || '?'}/10)`)
      .join(', ');
    return `Sim ${s.id}: Verdict: ${(v?.recommendation || '?').toUpperCase()} (${v?.probability || 0}%) | Positions: ${positions}`;
  }).join('\n');

  // Load existing team insights
  const { data: existing } = await supabase
    .from('team_insights')
    .select('id, insight, insight_type, evidence_count')
    .eq('user_id', userId)
    .eq('is_active', true);

  const existingText = (existing || []).length > 0
    ? (existing || []).map(i => `[${i.id}] "${i.insight}" (type: ${i.insight_type}, evidence: ${i.evidence_count})`).join('\n')
    : 'No existing team insights.';

  try {
    const response = await callClaude({
      systemPrompt: `You analyze DEBATE DYNAMICS across multiple simulations to find TEAM-LEVEL patterns.

Insight types:
- dynamic: How agents interact. "Regulatory and Unit Economics frequently disagree on timeline feasibility."
- consensus: Patterns in agreement. "When 8+ agents agree, outcomes tend to be positive."
- blind_spot: What the team consistently misses. "The team rarely considers execution timeline in F&B decisions."
- strength: What the team does well. "The team excels at identifying regulatory blockers early."

Rules:
- Focus on INTERACTION patterns, not individual agent performance.
- Need evidence from 3+ sims to form a team insight.
- If an existing insight is reinforced, use "action": "reinforce".
- Max 3 new insights per analysis.

Return JSON array. Empty [] if nothing new.`,
      userMessage: `RECENT DEBATES (${recentSims.length} sims):
${debateSummaries}

EXISTING TEAM INSIGHTS:
${existingText}

JSON:
[{
  "action": "create" | "reinforce",
  "insight": "the team-level pattern",
  "insight_type": "dynamic" | "consensus" | "blind_spot" | "strength",
  "existing_insight_id": "uuid if reinforcing"
}]`,
      maxTokens: 500,
    });

    const insights = parseJSON<any[]>(response);
    if (!insights || insights.length === 0) return 0;

    let saved = 0;
    const now = new Date().toISOString();

    for (const item of insights) {
      if (item.action === 'reinforce' && item.existing_insight_id) {
        const ex = (existing || []).find(e => e.id === item.existing_insight_id);
        if (ex) {
          await supabase.from('team_insights').update({
            evidence_count: (ex.evidence_count || 1) + 1,
            updated_at: now,
          }).eq('id', item.existing_insight_id);
          saved++;
        }
      } else if (item.action === 'create') {
        await supabase.from('team_insights').insert({
          user_id: userId,
          insight: item.insight,
          insight_type: item.insight_type || 'dynamic',
          evidence_count: 1,
          source_sims: [simulationId],
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        saved++;
      }
    }

    if (saved > 0) console.log(`TEAM MEMORY: ${saved} team insights extracted/reinforced`);
    return saved;
  } catch (err) {
    console.error('TEAM MEMORY: extractTeamInsights failed:', err);
    return 0;
  }
}

/**
 * Load team insights formatted for injection into ALL agents' context.
 */
export async function injectTeamContext(userId: string, max: number = 5): Promise<string> {
  if (!supabase) return '';

  const { data } = await supabase
    .from('team_insights')
    .select('insight, insight_type, evidence_count')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('evidence_count', { ascending: false })
    .limit(max);

  if (!data || data.length === 0) return '';

  const lines = data.map(i => {
    const tag = i.evidence_count > 3 ? ` [x${i.evidence_count}]` : '';
    const prefix = i.insight_type === 'blind_spot' ? 'WARNING: ' : i.insight_type === 'strength' ? 'STRENGTH: ' : '';
    return `  - ${prefix}${i.insight}${tag}`;
  });

  return [
    '\n-- TEAM DYNAMICS (learned from past debates) --',
    ...lines,
    '------------------------------------------------\n',
  ].join('\n');
}
