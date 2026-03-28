/**
 * Auto Prompt Optimization — LangMem gradient pattern for Octux.
 *
 * The gradient algorithm:
 *   1. Load trajectory (agent's reports across recent sims + eval scores)
 *   2. CRITIQUE the current prompt (what's the prompt causing the agent to do wrong?)
 *   3. PROPOSE an improved prompt (specific edits to role/goal/backstory/sop)
 *   4. BENCHMARK: run the new prompt on a past question, compare eval scores
 *   5. PROMOTE if the new version scores better (by at least +0.5 points)
 *
 * Safety: old prompts are never deleted. Rollback is always possible.
 * The default prompt (from prompts.ts) is version 0 — always available.
 *
 * Ref: LangMem (#29 — gradient prompt optimization, trajectory → critique → proposal)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type PromptVersion = {
  id: string;
  agent_id: string;
  version: number;
  role: string;
  goal: string;
  backstory: string;
  sop: string | null;
  extra_constraints: string[];
  source: string;
  critique: string | null;
  improvement_summary: string | null;
  avg_eval_score: number | null;
  sim_count: number;
  is_active: boolean;
};

type PromptProposal = {
  role: string;
  goal: string;
  backstory: string;
  sop: string;
  extra_constraints: string[];
  critique: string;
  improvement_summary: string;
};

// ═══════════════════════════════════════════
// getActivePrompt() — Load the best prompt for an agent
// ═══════════════════════════════════════════

/**
 * Get the currently active prompt version for an agent.
 * Falls back to the default prompt from prompts.ts if no optimized version exists.
 *
 * @returns The prompt components, or null (use default from prompts.ts)
 */
export async function getActivePrompt(
  userId: string,
  agentId: string
): Promise<{ role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agent_prompt_versions')
    .select('role, goal, backstory, sop, extra_constraints')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  return {
    role: data.role,
    goal: data.goal,
    backstory: data.backstory,
    sop: data.sop || '',
    extra_constraints: data.extra_constraints || [],
  };
}

/**
 * Load active prompts for ALL agents in one batch query.
 * Returns Map<agentId, promptOverride>. Agents not in the map use defaults.
 */
export async function getAllActivePrompts(
  userId: string
): Promise<Map<string, { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] }>> {
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from('agent_prompt_versions')
    .select('agent_id, role, goal, backstory, sop, extra_constraints')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) return new Map();

  const result = new Map<string, { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] }>();
  for (const row of data) {
    result.set(row.agent_id, {
      role: row.role,
      goal: row.goal,
      backstory: row.backstory,
      sop: row.sop || '',
      extra_constraints: row.extra_constraints || [],
    });
  }

  return result;
}

// ═══════════════════════════════════════════
// optimizePrompt() — LangMem gradient algorithm
// ═══════════════════════════════════════════

/**
 * Full optimization pipeline for one agent:
 *
 *   1. Load trajectory (agent reports + eval scores from last 10-15 sims)
 *   2. Load current prompt (active version or default)
 *   3. CRITIQUE: identify what the current prompt is causing the agent to do poorly
 *   4. PROPOSE: generate an improved prompt addressing the critique
 *   5. BENCHMARK: score the new prompt against a past question
 *   6. PROMOTE: if new score > old score + 0.5, activate the new version
 *
 * Trigger: every 20 sims (called from hooks) or manually.
 *
 * @returns true if a new version was promoted, false otherwise
 */
export async function optimizePrompt(
  userId: string,
  agentId: string,
  defaultPrompt: { role: string; goal: string; backstory: string; sop: string[]; constraints: string[] }
): Promise<boolean> {
  if (!supabase) return false;

  console.log(`PROMPT-OPT: Starting optimization for ${agentId}`);

  // ── 1. Load trajectory ──
  const trajectory = await loadAgentTrajectory(userId, agentId);

  if (trajectory.length < 10) {
    console.log(`PROMPT-OPT: Not enough data for ${agentId} (${trajectory.length} sims, need 10)`);
    return false;
  }

  // ── 2. Load current prompt ──
  const activePrompt = await getActivePrompt(userId, agentId);
  const currentPrompt = activePrompt || {
    role: defaultPrompt.role,
    goal: defaultPrompt.goal,
    backstory: defaultPrompt.backstory,
    sop: defaultPrompt.sop.join('\n'),
    extra_constraints: defaultPrompt.constraints,
  };

  // Calculate current average score
  const currentAvgScore = trajectory.reduce((sum, t) => sum + t.score, 0) / trajectory.length;

  // ── 3. CRITIQUE ──
  const critique = await critiquePrompt(agentId, currentPrompt, trajectory);
  if (!critique) {
    console.log(`PROMPT-OPT: No critique generated for ${agentId} — prompt may already be good`);
    return false;
  }

  // ── 4. PROPOSE ──
  const proposal = await proposeImprovedPrompt(agentId, currentPrompt, critique, trajectory);
  if (!proposal) {
    console.log(`PROMPT-OPT: Failed to generate proposal for ${agentId}`);
    return false;
  }

  // ── 5. BENCHMARK ──
  const benchmarkSim = trajectory[0]; // most recent
  const benchmarkScore = await benchmarkPrompt(
    agentId,
    proposal,
    benchmarkSim.question,
    benchmarkSim.debate_context
  );

  console.log(`PROMPT-OPT: ${agentId} benchmark — current avg: ${currentAvgScore.toFixed(1)}, new: ${benchmarkScore}`);

  // ── 6. PROMOTE if improvement >= 0.5 ──
  const improvement = benchmarkScore - currentAvgScore;

  if (improvement < 0.5) {
    console.log(`PROMPT-OPT: ${agentId} — improvement ${improvement.toFixed(1)} < 0.5 threshold. Keeping current prompt.`);
    return false;
  }

  // Get next version number
  const { data: versions } = await supabase
    .from('agent_prompt_versions')
    .select('version')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1;
  const now = new Date().toISOString();

  // Deactivate current active version
  await supabase
    .from('agent_prompt_versions')
    .update({ is_active: false, updated_at: now })
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true);

  // Insert new version as active
  const { error } = await supabase
    .from('agent_prompt_versions')
    .insert({
      user_id: userId,
      agent_id: agentId,
      version: nextVersion,
      role: proposal.role,
      goal: proposal.goal,
      backstory: proposal.backstory,
      sop: proposal.sop,
      extra_constraints: proposal.extra_constraints,
      source: 'optimized',
      critique: proposal.critique,
      improvement_summary: proposal.improvement_summary,
      avg_eval_score: benchmarkScore,
      sim_count: 0,
      total_eval_score: 0,
      is_active: true,
      promoted_at: now,
      created_at: now,
      updated_at: now,
    });

  if (error) {
    console.error(`PROMPT-OPT: Failed to save new version for ${agentId}:`, error);
    return false;
  }

  console.log(`PROMPT-OPT: ${agentId} v${nextVersion} PROMOTED (improvement: +${improvement.toFixed(1)}, benchmark: ${benchmarkScore})`);
  return true;
}

// ═══════════════════════════════════════════
// INTERNAL: Trajectory loading
// ═══════════════════════════════════════════

type TrajectoryEntry = {
  sim_id: string;
  question: string;
  position: string;
  confidence: number;
  key_argument: string;
  score: number;
  debate_context: string;
};

async function loadAgentTrajectory(
  userId: string,
  agentId: string
): Promise<TrajectoryEntry[]> {
  if (!supabase) return [];

  const { data: sims } = await supabase
    .from('simulations')
    .select('id, question, debate, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!sims) return [];

  const entries: TrajectoryEntry[] = [];

  for (const sim of sims) {
    const debate = sim.debate as any;
    if (!debate) continue;

    const report = extractReport(debate, agentId);
    if (!report) continue;

    entries.push({
      sim_id: sim.id,
      question: sim.question || '',
      position: report.position || 'unknown',
      confidence: report.confidence || 5,
      key_argument: (report.key_argument || report.summary || '').substring(0, 200),
      score: report.eval_score || report.confidence || 5,
      debate_context: formatDebateForBenchmark(debate, agentId),
    });
  }

  return entries;
}

// ═══════════════════════════════════════════
// INTERNAL: Critique current prompt
// ═══════════════════════════════════════════

async function critiquePrompt(
  agentId: string,
  currentPrompt: { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] },
  trajectory: TrajectoryEntry[]
): Promise<string | null> {
  const trajectoryText = trajectory.slice(0, 10).map((t, i) =>
    `Sim ${i + 1}: "${t.question.substring(0, 60)}..." → ${t.position.toUpperCase()} (${t.confidence}/10) — "${t.key_argument.substring(0, 100)}" [score: ${t.score}/10]`
  ).join('\n');

  const lowScoreSims = trajectory.filter(t => t.score < 6);
  const highScoreSims = trajectory.filter(t => t.score >= 8);

  try {
    const response = await callClaude({
      systemPrompt: `You critique an AI agent's system prompt based on its performance trajectory.

Identify what the PROMPT is causing the agent to do POORLY. Focus on:
1. Is the backstory too GENERIC? (should it be specialized for this user's domain?)
2. Is the goal too VAGUE? (should it be more specific about what good analysis looks like?)
3. Is the SOP missing KEY STEPS that the agent consistently forgets?
4. Are there PATTERNS in low-scoring outputs that the prompt could prevent?

Return a concise 2-4 sentence critique. Focus on the HIGHEST-IMPACT change.
If the prompt is already performing well (avg score > 7.5), return "NO_CRITIQUE_NEEDED".`,
      userMessage: `AGENT: ${agentId}

CURRENT PROMPT:
Role: ${currentPrompt.role}
Goal: ${currentPrompt.goal}
Backstory: ${currentPrompt.backstory}
SOP: ${currentPrompt.sop}

TRAJECTORY (${trajectory.length} sims):
${trajectoryText}

Low-scoring sims (< 6/10): ${lowScoreSims.length}
High-scoring sims (>= 8/10): ${highScoreSims.length}
Average score: ${(trajectory.reduce((s, t) => s + t.score, 0) / trajectory.length).toFixed(1)}

Critique:`,
      maxTokens: 300,
    });

    const critique = response.trim();
    if (critique.includes('NO_CRITIQUE_NEEDED')) return null;
    return critique;
  } catch (err) {
    console.error(`PROMPT-OPT: Critique failed for ${agentId}:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════
// INTERNAL: Propose improved prompt
// ═══════════════════════════════════════════

async function proposeImprovedPrompt(
  agentId: string,
  currentPrompt: { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] },
  critique: string,
  trajectory: TrajectoryEntry[]
): Promise<PromptProposal | null> {
  const questions = trajectory.map(t => t.question).join('; ');

  try {
    const response = await callClaude({
      systemPrompt: `You improve an AI agent's system prompt based on a critique.

RULES:
- Keep the agent's CORE IDENTITY (role name, general expertise area)
- SPECIALIZE the backstory to the user's actual domain (based on their questions)
- Make the goal MORE SPECIFIC about what good analysis looks like
- Add CONCRETE steps to the SOP where the agent keeps failing
- Don't make the prompt overly long — quality > quantity
- Keep total prompt under 500 words

Return ONLY JSON:
{
  "role": "improved role description",
  "goal": "improved goal",
  "backstory": "improved backstory specialized to user's domain",
  "sop": "improved standard operating procedure",
  "extra_constraints": ["constraint1", "constraint2"],
  "improvement_summary": "1-2 sentences on what changed and why"
}`,
      userMessage: `AGENT: ${agentId}

CURRENT PROMPT:
Role: ${currentPrompt.role}
Goal: ${currentPrompt.goal}
Backstory: ${currentPrompt.backstory}
SOP: ${currentPrompt.sop}
Constraints: ${(currentPrompt.extra_constraints || []).join('; ')}

CRITIQUE: ${critique}

USER'S QUESTION DOMAINS: ${questions.substring(0, 500)}

Generate the improved prompt. JSON:`,
      maxTokens: 800,
    });

    const parsed = parseJSON<any>(response);
    if (!parsed || !parsed.role || !parsed.goal || !parsed.backstory) return null;

    return {
      role: parsed.role,
      goal: parsed.goal,
      backstory: parsed.backstory,
      sop: parsed.sop || currentPrompt.sop,
      extra_constraints: parsed.extra_constraints || [],
      critique,
      improvement_summary: parsed.improvement_summary || 'Prompt optimized based on trajectory analysis.',
    };
  } catch (err) {
    console.error(`PROMPT-OPT: Proposal failed for ${agentId}:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════
// INTERNAL: Benchmark new prompt
// ═══════════════════════════════════════════

async function benchmarkPrompt(
  agentId: string,
  proposal: PromptProposal,
  question: string,
  debateContext: string
): Promise<number> {
  const systemPrompt = `You are the ${proposal.role}.

GOAL: ${proposal.goal}

BACKSTORY: ${proposal.backstory}

STANDARD OPERATING PROCEDURE:
${proposal.sop}

${proposal.extra_constraints.length > 0 ? 'CONSTRAINTS:\n' + proposal.extra_constraints.map(c => `- ${c}`).join('\n') : ''}`;

  try {
    const reportResponse = await callClaude({
      systemPrompt,
      userMessage: `${debateContext}\n\nQUESTION: "${question}"\n\nProvide your analysis as a JSON object with: position, confidence (1-10), key_argument, evidence[], risks[].`,
      maxTokens: 800,
    });

    const evalResponse = await callClaude({
      systemPrompt: `Score this agent report 1-10 for: specificity, evidence quality, plausibility, relevance, consistency. Return ONLY a number.`,
      userMessage: `QUESTION: "${question}"\nAGENT: ${agentId}\nREPORT:\n${reportResponse.substring(0, 500)}\n\nScore (just the number):`,
      maxTokens: 10,
    });

    const score = parseFloat(evalResponse.trim());
    return isNaN(score) ? 5 : Math.min(10, Math.max(1, score));
  } catch (err) {
    console.error(`PROMPT-OPT: Benchmark failed for ${agentId}:`, err);
    return 5;
  }
}

// ═══════════════════════════════════════════
// recordEvalScore() — Track per-version performance
// ═══════════════════════════════════════════

/**
 * After each simulation, record the eval score for the agent's active prompt version.
 * This builds up avg_eval_score over time for comparison.
 */
export async function recordEvalScore(
  userId: string,
  agentId: string,
  evalScore: number
): Promise<void> {
  if (!supabase) return;

  try {
    const { data: active } = await supabase
      .from('agent_prompt_versions')
      .select('id, sim_count, total_eval_score')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (!active) return;

    const newSimCount = (active.sim_count || 0) + 1;
    const newTotal = (active.total_eval_score || 0) + evalScore;
    const newAvg = newTotal / newSimCount;

    await supabase
      .from('agent_prompt_versions')
      .update({
        sim_count: newSimCount,
        total_eval_score: newTotal,
        avg_eval_score: Math.round(newAvg * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', active.id);
  } catch (err) {
    console.error(`PROMPT-OPT: recordEvalScore failed for ${agentId}:`, err);
  }
}

// ═══════════════════════════════════════════
// rollbackPrompt() — Revert to previous version
// ═══════════════════════════════════════════

/**
 * Rollback an agent's prompt to a specific version (or to default).
 * @param version — version number to rollback to, or 0 for default
 */
export async function rollbackPrompt(
  userId: string,
  agentId: string,
  version: number
): Promise<boolean> {
  if (!supabase) return false;

  const now = new Date().toISOString();

  try {
    // Deactivate all versions
    await supabase
      .from('agent_prompt_versions')
      .update({ is_active: false, updated_at: now })
      .eq('user_id', userId)
      .eq('agent_id', agentId);

    if (version === 0) {
      console.log(`PROMPT-OPT: ${agentId} rolled back to DEFAULT prompt`);
      return true;
    }

    // Activate the specified version
    const { error } = await supabase
      .from('agent_prompt_versions')
      .update({
        is_active: true,
        source: 'rollback',
        promoted_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .eq('version', version);

    if (error) {
      console.error(`PROMPT-OPT: Rollback failed for ${agentId} v${version}:`, error);
      return false;
    }

    console.log(`PROMPT-OPT: ${agentId} rolled back to v${version}`);
    return true;
  } catch (err) {
    console.error(`PROMPT-OPT: Rollback exception:`, err);
    return false;
  }
}

// ═══════════════════════════════════════════
// buildSystemPromptFromOverride() — Construct system prompt from override
// ═══════════════════════════════════════════

/**
 * Build a full system prompt string from a prompt override.
 * Used in engine.ts to replace the default agent.systemPrompt.
 */
export function buildSystemPromptFromOverride(
  override: { role: string; goal: string; backstory: string; sop: string; extra_constraints: string[] },
  agentName: string
): string {
  let prompt = `You are the ${agentName} at Octux AI — a multi-agent adversarial decision system.

ROLE: ${override.role}
GOAL: ${override.goal}

BACKSTORY: ${override.backstory}`;

  if (override.sop) {
    prompt += `\n\nSTANDARD OPERATING PROCEDURE — follow these steps IN ORDER:\n${override.sop}`;
  }

  if (override.extra_constraints.length > 0) {
    prompt += '\n\nADDITIONAL CONSTRAINTS:\n' + override.extra_constraints.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  prompt += `\n\nOUTPUT FORMAT (respond with valid JSON only, no markdown):
{
  "position": "proceed" | "delay" | "abandon",
  "confidence": 1-10,
  "key_argument": "2-3 sentences with specific data points",
  "evidence": ["specific evidence 1", "specific evidence 2"],
  "risks_identified": ["specific risk with concrete consequence"],
  "recommendation": "one sentence, specific, actionable this week"
}

RULES:
- Follow the SOP steps in order — do not skip steps
- Cite specific numbers, percentages, timelines, and dollar amounts when possible
- Acknowledge your own biases when they are relevant to your analysis
- Say "I lack data on X and would need Y to give a better answer" rather than fabricate
- Maximum 200 words total
- Respond with ONLY valid JSON — no explanation outside the JSON object`;

  return prompt;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function extractReport(debate: any, agentId: string): any | null {
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

function formatDebateForBenchmark(debate: any, excludeAgentId: string): string {
  const reports: string[] = [];
  const allReports = debate?.agent_reports || {};

  for (const [id, report] of Object.entries(allReports)) {
    if (id === excludeAgentId) continue;
    const r = report as any;
    reports.push(`${id}: ${(r.position || '?').toUpperCase()} (${r.confidence || '?'}/10) — ${(r.key_argument || '').substring(0, 80)}`);
  }

  return reports.length > 0
    ? 'OTHER AGENTS:\n' + reports.join('\n')
    : 'No other agent reports available.';
}
