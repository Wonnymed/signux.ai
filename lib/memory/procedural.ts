/**
 * Procedural Memory — LangMem pattern for Octux.
 *
 * Agents learn RULES (behavioral patterns) from analyzing trajectories
 * across multiple simulations. Unlike P13 lessons (corrective),
 * procedural rules define HOW the agent SHOULD approach problems.
 *
 * extractRules():        Analyze 10+ sim trajectories → derive behavioral rules
 * injectRules():         Load rules → format for SOP injection
 * loadAllAgentRules():   Batch load for all agents (1 query)
 * extractAllAgentRules():Orchestrator — runs per-agent extraction
 *
 * Ref: LangMem (#29 — procedural memory, trajectory → reflection → behavioral rules)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ProceduralRule = {
  id: string;
  agent_id: string;
  rule: string;
  rule_type: 'methodology' | 'checklist' | 'heuristic' | 'avoidance';
  confidence: number;
  evidence_count: number;
  source_sims: string[];
};

type ExtractedRule = {
  rule: string;
  rule_type: 'methodology' | 'checklist' | 'heuristic' | 'avoidance';
  confidence: number;
  reasoning: string;
};

// ═══════════════════════════════════════════
// extractRules() — Trajectory analysis → behavioral rules
// ═══════════════════════════════════════════

export async function extractRules(
  userId: string,
  agentId: string,
  minSims: number = 10
): Promise<number> {
  if (!supabase) return 0;

  // Load the agent's trajectory
  const { data: sims } = await supabase
    .from('simulations')
    .select('id, question, verdict, debate, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!sims || sims.length < minSims) return 0;

  const trajectories: string[] = [];
  const simIds: string[] = [];

  for (const sim of sims) {
    const debate = sim.debate as any;
    if (!debate) continue;

    const report = extractAgentReport(debate, agentId);
    if (!report) continue;

    const verdict = sim.verdict as any;
    const rec = (verdict?.recommendation || 'unknown').toUpperCase();
    const prob = verdict?.probability || 0;

    trajectories.push(
      `SIM [${sim.id}]: "${(sim.question || '').substring(0, 80)}"
Agent position: ${report.position || '?'} (confidence: ${report.confidence || '?'}/10)
Key argument: ${(report.key_argument || report.summary || 'none').substring(0, 150)}
Evidence: ${formatEvidence(report)}
Verdict: ${rec} (${prob}%)`
    );
    simIds.push(sim.id);
  }

  if (trajectories.length < minSims) return 0;

  // Load existing rules to avoid duplicates
  const { data: existingRules } = await supabase
    .from('procedural_rules')
    .select('id, rule, rule_type, confidence, evidence_count')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true);

  // Load outcome data
  const { data: experiences } = await supabase
    .from('decision_experiences')
    .select('simulation_id, verdict_recommendation, outcome_status')
    .eq('user_id', userId)
    .in('simulation_id', simIds);

  const outcomeMap = new Map<string, string>();
  if (experiences) {
    for (const e of experiences) {
      if (e.outcome_status && e.outcome_status !== 'pending') {
        outcomeMap.set(e.simulation_id, e.outcome_status);
      }
    }
  }

  const enrichedTrajectories = trajectories.map((t, i) => {
    const outcome = outcomeMap.get(simIds[i]);
    return outcome ? `${t}\nOutcome: ${outcome}` : t;
  });

  const existingText = (existingRules || []).length > 0
    ? (existingRules || []).map(r => `[${r.id}] "${r.rule}" (type: ${r.rule_type}, confidence: ${r.confidence}, evidence: ${r.evidence_count})`).join('\n')
    : 'No existing rules.';

  try {
    const response = await callClaude({
      systemPrompt: `You analyze an AI agent's performance trajectory across multiple simulations to extract BEHAVIORAL RULES — consistent patterns of HOW the agent should approach analysis.

RULE TYPES:
- methodology: "When analyzing [domain], always: 1) check X, 2) verify Y, 3) compare Z"
- checklist: "Before concluding, verify: 1) numbers are sourced, 2) risks are quantified, 3) timeline is realistic"
- heuristic: "If [condition], then [likely outcome/approach]"
- avoidance: "Never [bad pattern] because [evidence from outcomes]"

GOOD RULES: Specific, supported by 3+ sims, actionable.
BAD RULES: Too vague, single-instance, duplicate of existing.

If an existing rule is CONFIRMED, include with "action": "reinforce".
If CONTRADICTED by outcomes, include with "action": "weaken".

Return JSON array. Empty [] if no new rules or changes needed.`,
      userMessage: `AGENT: ${agentId}

TRAJECTORY (${trajectories.length} simulations, newest first):
${enrichedTrajectories.join('\n\n')}

EXISTING RULES:
${existingText}

Extract NEW rules or REINFORCE/WEAKEN existing ones.
JSON:
[{
  "action": "create" | "reinforce" | "weaken",
  "rule": "the behavioral rule",
  "rule_type": "methodology" | "checklist" | "heuristic" | "avoidance",
  "confidence": 0.5-0.9,
  "reasoning": "why this rule",
  "existing_rule_id": "uuid if reinforce/weaken"
}]`,
      maxTokens: 800,
    });

    const extracted = parseJSON<(ExtractedRule & { action: string; existing_rule_id?: string })[]>(response);
    if (!extracted || extracted.length === 0) return 0;

    let appliedCount = 0;
    const now = new Date().toISOString();

    for (const item of extracted) {
      try {
        if (item.action === 'create') {
          const isDuplicate = (existingRules || []).some(r =>
            calculateSimilarity(item.rule, r.rule) > 0.6
          );
          if (isDuplicate) continue;

          const { error } = await supabase
            .from('procedural_rules')
            .insert({
              user_id: userId,
              agent_id: agentId,
              rule: item.rule,
              rule_type: item.rule_type || 'methodology',
              confidence: Math.min(item.confidence || 0.6, 0.85),
              source_sims: simIds.slice(0, 5),
              evidence_count: Math.min(trajectories.length, 10),
              is_active: true,
              last_validated_at: now,
              created_at: now,
              updated_at: now,
            });

          if (!error) {
            appliedCount++;
            console.log(`PROCEDURAL: Created [${item.rule_type}] "${item.rule.substring(0, 60)}..." for ${agentId}`);
          }
        } else if (item.action === 'reinforce' && item.existing_rule_id) {
          const existing = (existingRules || []).find(r => r.id === item.existing_rule_id);
          if (!existing) continue;

          const newConfidence = Math.min((existing.confidence || 0.6) + 0.08, 0.95);
          await supabase
            .from('procedural_rules')
            .update({
              confidence: newConfidence,
              evidence_count: (existing.evidence_count || 1) + 1,
              last_validated_at: now,
              updated_at: now,
            })
            .eq('id', item.existing_rule_id);

          appliedCount++;
          console.log(`PROCEDURAL: Reinforced "${existing.rule.substring(0, 50)}..." → confidence ${newConfidence} for ${agentId}`);
        } else if (item.action === 'weaken' && item.existing_rule_id) {
          const existing = (existingRules || []).find(r => r.id === item.existing_rule_id);
          if (!existing) continue;

          const newConfidence = Math.max((existing.confidence || 0.6) - 0.15, 0.1);

          if (newConfidence < 0.2) {
            await supabase
              .from('procedural_rules')
              .update({ is_active: false, confidence: newConfidence, updated_at: now })
              .eq('id', item.existing_rule_id);
            console.log(`PROCEDURAL: Deactivated weak rule "${existing.rule.substring(0, 50)}..." for ${agentId}`);
          } else {
            await supabase
              .from('procedural_rules')
              .update({ confidence: newConfidence, updated_at: now })
              .eq('id', item.existing_rule_id);
            console.log(`PROCEDURAL: Weakened "${existing.rule.substring(0, 50)}..." → confidence ${newConfidence} for ${agentId}`);
          }

          appliedCount++;
        }
      } catch (err) {
        console.error(`PROCEDURAL: Action failed for ${agentId}:`, err);
      }
    }

    if (appliedCount > 0) {
      console.log(`PROCEDURAL: ${appliedCount} rule(s) applied for ${agentId}`);
    }

    return appliedCount;
  } catch (err) {
    console.error(`PROCEDURAL: extractRules failed for ${agentId}:`, err);
    return 0;
  }
}

/**
 * Extract rules for ALL specialist agents in one batch.
 * Trigger: every 10 sims.
 */
export async function extractAllAgentRules(
  userId: string,
  minSims: number = 10
): Promise<number> {
  if (!supabase) return 0;

  const { count } = await supabase
    .from('simulations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!count || count < minSims) return 0;
  if (count % 10 !== 0) return 0;

  console.log(`PROCEDURAL: Extracting rules for all agents (${count} sims)`);

  const agentIds = [
    'base_rate_archivist', 'demand_signal_analyst', 'unit_economics_auditor',
    'regulatory_gatekeeper', 'competitive_radar', 'execution_engineer',
    'capital_strategist', 'scenario_architect', 'intervention_designer',
    'customer_reality',
  ];

  let totalRules = 0;
  for (const agentId of agentIds) {
    const rules = await extractRules(userId, agentId, minSims);
    totalRules += rules;
  }

  console.log(`PROCEDURAL: Total ${totalRules} rule(s) extracted/updated across all agents`);
  return totalRules;
}

// ═══════════════════════════════════════════
// loadAllAgentRules() — Batch load for all agents
// ═══════════════════════════════════════════

export async function loadAllAgentRules(
  userId: string,
  maxPerAgent: number = 6
): Promise<Map<string, string>> {
  if (!supabase) return new Map();

  const { data: allRules, error } = await supabase
    .from('procedural_rules')
    .select('agent_id, rule, rule_type, confidence, evidence_count')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false });

  if (error || !allRules || allRules.length === 0) return new Map();

  const byAgent = new Map<string, typeof allRules>();
  for (const r of allRules) {
    const list = byAgent.get(r.agent_id) || [];
    list.push(r);
    byAgent.set(r.agent_id, list);
  }

  const typeLabels: Record<string, string> = {
    methodology: 'METHODOLOGY:',
    checklist: 'CHECKLIST:',
    heuristic: 'HEURISTICS:',
    avoidance: 'AVOID:',
  };

  const result = new Map<string, string>();

  for (const [agentId, rules] of byAgent) {
    const top = rules.slice(0, maxPerAgent);

    const grouped = new Map<string, typeof top>();
    for (const r of top) {
      const list = grouped.get(r.rule_type) || [];
      list.push(r);
      grouped.set(r.rule_type, list);
    }

    const sections: string[] = [];
    for (const [type, typeRules] of grouped) {
      sections.push(typeLabels[type] || `${type.toUpperCase()}:`);
      for (const r of typeRules) {
        const tag = r.evidence_count > 3 ? ` [validated ×${r.evidence_count}]` : '';
        sections.push(`  • ${r.rule}${tag}`);
      }
    }

    result.set(agentId, [
      '\n── PROCEDURAL RULES (learned behavioral patterns) ──',
      'Follow these as standard operating procedure:',
      ...sections,
      '────────────────────────────────────────────────────\n',
    ].join('\n'));
  }

  return result;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function extractAgentReport(debate: any, agentId: string): any | null {
  if (debate?.agent_reports?.[agentId]) return debate.agent_reports[agentId];
  if (Array.isArray(debate?.rounds)) {
    for (const round of [...debate.rounds].reverse()) {
      if (round?.agents?.[agentId]) return round.agents[agentId];
      if (Array.isArray(round?.reports)) {
        const found = round.reports.find((r: any) => r.agent_id === agentId);
        if (found) return found;
      }
    }
  }
  if (debate?.[agentId]) return debate[agentId];
  return null;
}

function formatEvidence(report: any): string {
  if (!report.evidence || !Array.isArray(report.evidence)) return 'none cited';
  return report.evidence.slice(0, 3).map((e: any) =>
    typeof e === 'string' ? e.substring(0, 80) : (e.description || e.text || '').substring(0, 80)
  ).join('; ') || 'none cited';
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.min(wordsA.size, wordsB.size);
}
