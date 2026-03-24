// ── MagenticOne #9 — Dual Ledger System ──────────────────────
// Decision Chair maintains Task Ledger (what we know) and
// Progress Ledger (are we progressing) across debate rounds.

import type { AgentReport } from '../agents/types';
import type { SimulationState } from './state';
import { callClaude, parseJSON } from './claude';

// ── Types ──────────────────────────────────────────────────

export type TaskLedger = {
  verified_facts: string[];
  assumptions: string[];
  derived_insights: string[];
  open_questions: string[];
  plan_adjustments: string[];
};

export type ProgressLedger = {
  round: number;
  is_progressing: boolean;
  stall_counter: number;
  new_arguments_this_round: number;
  positions_changed_this_round: number;
  key_disagreements: string[];
  resolved_disagreements: string[];
  next_focus: string;
};

// ── Factories ──────────────────────────────────────────────

export function createTaskLedger(): TaskLedger {
  return {
    verified_facts: [],
    assumptions: [],
    derived_insights: [],
    open_questions: [],
    plan_adjustments: [],
  };
}

export function createProgressLedger(): ProgressLedger {
  return {
    round: 0,
    is_progressing: true,
    stall_counter: 0,
    new_arguments_this_round: 0,
    positions_changed_this_round: 0,
    key_disagreements: [],
    resolved_disagreements: [],
    next_focus: '',
  };
}

// ── Task Ledger Update (Claude call) ───────────────────────

export async function updateTaskLedger(
  question: string,
  currentLedger: TaskLedger,
  recentReports: AgentReport[],
  _state: SimulationState,
): Promise<TaskLedger> {
  const reportsStr = recentReports
    .map(
      (r) =>
        `${r.agent_name} (${r.position}, ${r.confidence}/10): ${r.key_argument}` +
        (r.evidence && r.evidence.length > 0
          ? ` [Evidence: ${r.evidence.join('; ')}]`
          : ''),
    )
    .join('\n');

  const response = await callClaude({
    systemPrompt: `You maintain a Task Ledger for an adversarial debate. Analyze new agent reports and update the ledger.

Rules:
- A fact is VERIFIED only if 2+ agents cite specific evidence for it.
- An ASSUMPTION is a claim stated without concrete evidence.
- A DERIVED INSIGHT is something that emerged from the debate that nobody explicitly asked about — a synthesis across agents.
- An OPEN QUESTION is critical to the decision but remains unaddressed by any agent.
- A PLAN ADJUSTMENT is a change in strategy suggested by the debate dynamics.

Merge with the existing ledger. Do not duplicate entries. Remove items that are no longer relevant.

Respond with valid JSON only.`,
    userMessage: `QUESTION: "${question}"

CURRENT LEDGER:
${JSON.stringify(currentLedger, null, 2)}

NEW AGENT REPORTS THIS ROUND:
${reportsStr}

Update the ledger. JSON:
{
  "verified_facts": ["fact backed by 2+ agents with evidence"],
  "assumptions": ["claim without hard evidence"],
  "derived_insights": ["synthesis that emerged from cross-agent debate"],
  "open_questions": ["critical unanswered question"],
  "plan_adjustments": ["suggested change based on debate"]
}`,
    maxTokens: 1024,
  });

  try {
    const updated = parseJSON<TaskLedger>(response);
    return {
      verified_facts: updated.verified_facts || currentLedger.verified_facts,
      assumptions: updated.assumptions || currentLedger.assumptions,
      derived_insights: updated.derived_insights || currentLedger.derived_insights,
      open_questions: updated.open_questions || currentLedger.open_questions,
      plan_adjustments: updated.plan_adjustments || currentLedger.plan_adjustments,
    };
  } catch {
    return currentLedger;
  }
}

// ── Progress Assessment (pure logic, no API) ───────────────

export function assessProgress(
  state: SimulationState,
  previousLedger: ProgressLedger,
  recentReports: AgentReport[],
): ProgressLedger {
  // Count new arguments: compare to all previous key_arguments
  const allPreviousArgs: string[] = [];
  state.agent_reports.forEach((reports) => {
    for (const r of reports) {
      // Exclude reports from the current batch
      if (!recentReports.some((rr) => rr.agent_id === r.agent_id && rr.key_argument === r.key_argument)) {
        allPreviousArgs.push(r.key_argument.substring(0, 50).toLowerCase());
      }
    }
  });

  let newArgs = 0;
  for (const report of recentReports) {
    const argPrefix = report.key_argument.substring(0, 50).toLowerCase();
    const isDuplicate = allPreviousArgs.some((prev) => prev === argPrefix);
    if (!isDuplicate) newArgs++;
  }

  // Count position changes: agents whose position differs from previous report
  let positionsChanged = 0;
  for (const report of recentReports) {
    const history = state.agent_reports.get(report.agent_id) || [];
    // Find the report BEFORE the current one
    const previousReports = history.filter(
      (r) => r.key_argument !== report.key_argument || r.position !== report.position,
    );
    if (previousReports.length > 0) {
      const lastPrev = previousReports[previousReports.length - 1];
      if (lastPrev.position !== report.position) positionsChanged++;
    }
  }

  const isProgressing = newArgs > 0 || positionsChanged > 0;
  const stallCounter = isProgressing ? 0 : previousLedger.stall_counter + 1;

  // Build key disagreements from current positions
  const latestPositions: Record<string, string[]> = { proceed: [], delay: [], abandon: [] };
  state.latest_reports.forEach((r) => {
    if (r.position in latestPositions) {
      latestPositions[r.position].push(r.agent_name);
    }
  });

  const keyDisagreements: string[] = [];
  if (latestPositions.proceed.length > 0 && latestPositions.delay.length > 0) {
    keyDisagreements.push(
      `${latestPositions.proceed.join(', ')} (proceed) vs ${latestPositions.delay.join(', ')} (delay)`,
    );
  }
  if (latestPositions.proceed.length > 0 && latestPositions.abandon.length > 0) {
    keyDisagreements.push(
      `${latestPositions.proceed.join(', ')} (proceed) vs ${latestPositions.abandon.join(', ')} (abandon)`,
    );
  }
  if (latestPositions.delay.length > 0 && latestPositions.abandon.length > 0) {
    keyDisagreements.push(
      `${latestPositions.delay.join(', ')} (delay) vs ${latestPositions.abandon.join(', ')} (abandon)`,
    );
  }

  // Resolved disagreements: previous ones that no longer exist
  const resolvedDisagreements = previousLedger.key_disagreements.filter(
    (d) => !keyDisagreements.includes(d),
  );

  // Next focus directive
  let nextFocus: string;
  if (stallCounter >= 1) {
    nextFocus = 'Debate stalling \u2014 force new angles';
  } else if (keyDisagreements.length > 0) {
    nextFocus = `Resolve: ${keyDisagreements[0]}`;
  } else {
    nextFocus = 'Continue deepening with specific evidence';
  }

  return {
    round: previousLedger.round + 1,
    is_progressing: isProgressing,
    stall_counter: stallCounter,
    new_arguments_this_round: newArgs,
    positions_changed_this_round: positionsChanged,
    key_disagreements: keyDisagreements,
    resolved_disagreements: resolvedDisagreements,
    next_focus: nextFocus,
  };
}

// ── Replan Debate (called when stalled) ────────────────────

export async function replanDebate(
  question: string,
  taskLedger: TaskLedger,
  progressLedger: ProgressLedger,
  _state: SimulationState,
): Promise<string[]> {
  const response = await callClaude({
    systemPrompt: `You are the Decision Chair. The adversarial debate has STALLED — agents are repeating themselves without adding new evidence or changing positions.

Look at the open questions, unverified assumptions, and unresolved disagreements. Suggest 2-3 specific NEW angles that break the deadlock. Each directive should force agents to explore something they haven't considered.

Respond with a JSON array of directive strings only.`,
    userMessage: `QUESTION: "${question}"

TASK LEDGER:
- Verified facts: ${taskLedger.verified_facts.join('; ') || 'None yet'}
- Assumptions (unverified): ${taskLedger.assumptions.join('; ') || 'None'}
- Open questions: ${taskLedger.open_questions.join('; ') || 'None'}

PROGRESS:
- Stall counter: ${progressLedger.stall_counter} rounds without new arguments
- Key disagreements: ${progressLedger.key_disagreements.join('; ') || 'None'}
- New arguments last round: ${progressLedger.new_arguments_this_round}
- Position changes last round: ${progressLedger.positions_changed_this_round}

Suggest 2-3 NEW angles to break the deadlock. JSON array:
["directive 1", "directive 2", "directive 3"]`,
    maxTokens: 512,
  });

  try {
    const directives = parseJSON<string[]>(response);
    if (Array.isArray(directives) && directives.length > 0) return directives;
    return ['Challenge the strongest assumption', 'What critical information is missing?'];
  } catch {
    return ['Challenge the strongest assumption', 'What critical information is missing?'];
  }
}
