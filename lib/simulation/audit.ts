// ── Palantir #4 — Audit Trail ──────────────────────────────
// Full traceability for every Claude call made during simulation

export type AuditRound = {
  round: number;
  phase: string;
  agent_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  success: boolean;
  error?: string;
  timestamp: string;
};

export type SimulationAudit = {
  simulation_id: string;
  question: string;
  engine: string;
  started_at: string;
  ended_at: string | null;
  rounds: AuditRound[];
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
};

// ── Helpers ────────────────────────────────────────────────

const COST_PER_INPUT_TOKEN = 0.003 / 1000;  // Sonnet pricing
const COST_PER_OUTPUT_TOKEN = 0.015 / 1000;

export function createAudit(simulationId: string, question: string, engine: string): SimulationAudit {
  return {
    simulation_id: simulationId,
    question,
    engine,
    started_at: new Date().toISOString(),
    ended_at: null,
    rounds: [],
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
    total_duration_ms: 0,
  };
}

export function addRound(audit: SimulationAudit, round: AuditRound): void {
  audit.rounds.push(round);
  audit.total_input_tokens += round.input_tokens;
  audit.total_output_tokens += round.output_tokens;
  audit.total_cost_usd +=
    round.input_tokens * COST_PER_INPUT_TOKEN +
    round.output_tokens * COST_PER_OUTPUT_TOKEN;
}

export function finalizeAudit(audit: SimulationAudit): void {
  audit.ended_at = new Date().toISOString();
  audit.total_duration_ms =
    new Date(audit.ended_at).getTime() - new Date(audit.started_at).getTime();
}
