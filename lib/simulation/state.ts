// ── LangGraph #2 State Machine + AutoGen #3 Speaker Selection + OpenAI Agents SDK #8 Handoffs ──

import type { AgentReport, SimulationPlan, DecisionObject } from '../agents/types';
import type { AdvisorPersona, CrowdWisdomResult } from '../agents/advisors';

// ── Types ──────────────────────────────────────────────────

export type PhaseId =
  | 'input'
  | 'planning'
  | 'opening'
  | 'quick_takes'
  | 'adversarial'
  | 'convergence'
  | 'verdict'
  | 'crowd_wisdom'
  | 'complete'
  | 'error';

export type SimulationState = {
  simulation_id: string;
  question: string;
  engine: string;
  tier: 'free' | 'pro' | 'max';

  // LangGraph #2: Phase state machine
  current_phase: PhaseId;
  phase_history: { phase: string; started_at: string; completed_at?: string; skipped?: boolean }[];

  // Agent data accumulates across phases
  agent_reports: Map<string, AgentReport[]>;
  latest_reports: Map<string, AgentReport>;
  plan: SimulationPlan | null;

  // AutoGen #3: Disagreement tracking for smart pairing
  disagreement_matrix: Map<string, Map<string, number>>;
  debate_pairs: { challenger_id: string; defender_id: string; topic: string; intensity: number }[];
  consensus_history: { phase: string; proceed: number; delay: number; abandon: number; avg_confidence: number }[];

  // OpenAI Agents SDK #8: Handoff tracking
  handoffs: { from_agent: string; to_agent: string; reason: string; round: number }[];

  // Results
  verdict: DecisionObject | null;
  follow_ups: string[];
  crowd_personas: AdvisorPersona[] | null;
  crowd_result: CrowdWisdomResult | null;

  // Meta
  total_tokens: number;
  total_cost_usd: number;
  started_at: string;
  completed_at?: string;
};

// ── Legal Phase Transitions (LangGraph #2) ─────────────────

const LEGAL_TRANSITIONS: Record<PhaseId, PhaseId[]> = {
  input:        ['planning', 'error'],
  planning:     ['opening', 'error'],
  opening:      ['quick_takes', 'adversarial', 'error'],
  quick_takes:  ['adversarial', 'error'],
  adversarial:  ['convergence', 'verdict', 'error'],
  convergence:  ['verdict', 'error'],
  verdict:      ['crowd_wisdom', 'complete', 'error'],
  crowd_wisdom: ['complete', 'error'],
  error:        ['complete'],
  complete:     [],
};

// ── Functions ──────────────────────────────────────────────

export function createInitialState(
  simId: string,
  question: string,
  engine: string,
  tier: string,
): SimulationState {
  return {
    simulation_id: simId,
    question,
    engine,
    tier: (tier === 'pro' || tier === 'max' ? tier : 'free') as SimulationState['tier'],

    current_phase: 'input',
    phase_history: [{ phase: 'input', started_at: new Date().toISOString() }],

    agent_reports: new Map(),
    latest_reports: new Map(),
    plan: null,

    disagreement_matrix: new Map(),
    debate_pairs: [],
    consensus_history: [],

    handoffs: [],

    verdict: null,
    follow_ups: [],
    crowd_personas: null,
    crowd_result: null,

    total_tokens: 0,
    total_cost_usd: 0,
    started_at: new Date().toISOString(),
  };
}

export function transitionPhase(
  state: SimulationState,
  nextPhase: SimulationState['current_phase'],
): void {
  const allowed = LEGAL_TRANSITIONS[state.current_phase];

  if (!allowed || !allowed.includes(nextPhase)) {
    console.warn(
      `[state] Invalid phase transition: ${state.current_phase} → ${nextPhase}. ` +
      `Legal targets: [${(allowed || []).join(', ')}]`,
    );
    return;
  }

  // Close current phase
  const current = state.phase_history[state.phase_history.length - 1];
  if (current && !current.completed_at) {
    current.completed_at = new Date().toISOString();
  }

  // Mark skipped phases (opening → adversarial skips quick_takes, etc.)
  const allPhases: PhaseId[] = [
    'input', 'planning', 'opening', 'quick_takes',
    'adversarial', 'convergence', 'verdict', 'crowd_wisdom', 'complete',
  ];
  const currentIdx = allPhases.indexOf(state.current_phase);
  const nextIdx = allPhases.indexOf(nextPhase);

  if (nextPhase !== 'error' && nextIdx > currentIdx + 1) {
    for (let i = currentIdx + 1; i < nextIdx; i++) {
      const skippedPhase = allPhases[i];
      // Only mark as skipped if it wasn't already in history
      if (!state.phase_history.some((p) => p.phase === skippedPhase)) {
        const now = new Date().toISOString();
        state.phase_history.push({
          phase: skippedPhase,
          started_at: now,
          completed_at: now,
          skipped: true,
        });
      }
    }
  }

  // Open new phase
  state.current_phase = nextPhase;
  state.phase_history.push({ phase: nextPhase, started_at: new Date().toISOString() });

  if (nextPhase === 'complete') {
    state.completed_at = new Date().toISOString();
  }
}

export function addAgentReport(state: SimulationState, report: AgentReport): void {
  const id = report.agent_id;

  // Append to history
  const existing = state.agent_reports.get(id);
  if (existing) {
    existing.push(report);
  } else {
    state.agent_reports.set(id, [report]);
  }

  // Update latest
  state.latest_reports.set(id, report);
}

// ── AutoGen #3: Disagreement Scoring ───────────────────────

const POSITION_DISTANCE: Record<string, Record<string, number>> = {
  proceed: { proceed: 0, delay: 0.5, abandon: 1.0 },
  delay:   { proceed: 0.5, delay: 0, abandon: 0.5 },
  abandon: { proceed: 1.0, delay: 0.5, abandon: 0 },
};

export function calculateDisagreement(reportA: AgentReport, reportB: AgentReport): number {
  // Position distance: weighted 0.7
  const positionScore = POSITION_DISTANCE[reportA.position]?.[reportB.position] ?? 0.5;

  // Confidence gap: weighted 0.3
  const confidenceGap = Math.abs(reportA.confidence - reportB.confidence) / 10;

  const score = positionScore * 0.7 + confidenceGap * 0.3;
  return Math.max(0, Math.min(1, score));
}

export function buildDisagreementMatrix(state: SimulationState): void {
  state.disagreement_matrix.clear();

  const agents = Array.from(state.latest_reports.entries());

  for (let i = 0; i < agents.length; i++) {
    const [idA, reportA] = agents[i];
    if (!state.disagreement_matrix.has(idA)) {
      state.disagreement_matrix.set(idA, new Map());
    }

    for (let j = i + 1; j < agents.length; j++) {
      const [idB, reportB] = agents[j];
      if (!state.disagreement_matrix.has(idB)) {
        state.disagreement_matrix.set(idB, new Map());
      }

      const score = calculateDisagreement(reportA, reportB);
      state.disagreement_matrix.get(idA)!.set(idB, score);
      state.disagreement_matrix.get(idB)!.set(idA, score);
    }
  }
}

export function selectDebatePairs(
  state: SimulationState,
  maxPairs = 2,
): SimulationState['debate_pairs'] {
  buildDisagreementMatrix(state);

  // Collect all pairs with scores
  const pairs: { a: string; b: string; score: number }[] = [];
  const agents = Array.from(state.latest_reports.keys());

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const score = state.disagreement_matrix.get(agents[i])?.get(agents[j]) ?? 0;
      pairs.push({ a: agents[i], b: agents[j], score });
    }
  }

  // Sort by disagreement descending
  pairs.sort((x, y) => y.score - x.score);

  // If highest disagreement is too low, skip debate entirely
  if (pairs.length === 0 || pairs[0].score < 0.2) {
    state.debate_pairs = [];
    return [];
  }

  // Greedy selection: pick top pairs ensuring no agent appears twice
  const usedAgents = new Set<string>();
  const selected: SimulationState['debate_pairs'] = [];

  // Count position frequencies to determine minority
  const positionCounts: Record<string, number> = { proceed: 0, delay: 0, abandon: 0 };
  for (const report of state.latest_reports.values()) {
    if (report.position in positionCounts) {
      positionCounts[report.position]++;
    }
  }

  for (const pair of pairs) {
    if (selected.length >= maxPairs) break;
    if (usedAgents.has(pair.a) || usedAgents.has(pair.b)) continue;

    usedAgents.add(pair.a);
    usedAgents.add(pair.b);

    // The agent with the MINORITY position is the challenger
    const reportA = state.latest_reports.get(pair.a)!;
    const reportB = state.latest_reports.get(pair.b)!;
    const countA = positionCounts[reportA.position] || 0;
    const countB = positionCounts[reportB.position] || 0;

    const challengerIsA = countA <= countB;
    const challenger = challengerIsA ? reportA : reportB;
    const defender = challengerIsA ? reportB : reportA;

    // Build topic from the key arguments
    const topic = `${challenger.agent_name} disagrees with ${defender.agent_name}: ` +
      `"${challenger.key_argument.slice(0, 80)}" vs "${defender.key_argument.slice(0, 80)}"`;

    selected.push({
      challenger_id: challenger.agent_id,
      defender_id: defender.agent_id,
      topic,
      intensity: pair.score,
    });
  }

  state.debate_pairs = selected;
  return selected;
}

// ── OpenAI Agents SDK #8: Handoffs ─────────────────────────

export function recordHandoff(
  state: SimulationState,
  from: string,
  to: string,
  reason: string,
  round: number,
): void {
  state.handoffs.push({ from_agent: from, to_agent: to, reason, round });
}

// ── AutoGen #3: Early Consensus Termination ────────────────

export function checkEarlyConsensus(state: SimulationState): boolean {
  const reports = Array.from(state.latest_reports.values());
  if (reports.length < 2) return false;

  const firstPosition = reports[0].position;
  const allAgree = reports.every((r) => r.position === firstPosition);
  if (!allAgree) return false;

  const avgConfidence =
    reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length;
  return avgConfidence > 7;
}
