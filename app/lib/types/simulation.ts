/* ═══════════════════════════════════════
   Octux AI — Simulation Types
   ═══════════════════════════════════════ */

export type SimulationPhase =
  | "planning"
  | "opening"
  | "adversarial"
  | "convergence"
  | "verdict";

export type Position = "proceed" | "proceed_with_conditions" | "delay" | "abandon";

export type Citation = {
  id: number;
  agent_id?: string;
  agent_name: string;
  round?: number;
  claim: string;
  confidence: number;
};

export type DecisionObject = {
  recommendation: Position;
  probability: number;
  main_risk: string;
  leverage_point: string;
  next_action: string;
  grade: string;
  grade_score: number;
  citations: Citation[];
};

export type AgentReport = {
  agent_id: string;
  agent_name: string;
  position: "proceed" | "delay" | "abandon";
  confidence: number;
  key_argument: string;
  evidence?: string[];
  risks_identified?: string[];
  changed_mind?: boolean;
  change_reason?: string;
};

export type SimulationPlanTask = {
  description: string;
  agent: string;
};

export type SimulationPlan = {
  tasks: SimulationPlanTask[];
  estimated_rounds?: number;
  estimated_duration_seconds?: number;
};

export type ConsensusState = {
  proceed: number;
  delay: number;
  abandon: number;
  avg_confidence: number;
};

/* ═══ SSE Event Types ═══ */

export type SimulationSSE =
  | { event: "phase_start"; data: { phase: SimulationPhase; status: string } }
  | { event: "plan_complete"; data: SimulationPlan }
  | { event: "agent_token"; data: { agent_id: string; token: string } }
  | { event: "agent_complete"; data: AgentReport }
  | { event: "consensus_update"; data: ConsensusState }
  | { event: "verdict_token"; data: { token: string } }
  | { event: "verdict_artifact"; data: DecisionObject }
  | { event: "citation_collection"; data: Citation[] }
  | { event: "evaluation_artifact"; data: Record<string, unknown> }
  | { event: "followup_suggestions"; data: string[] }
  | { event: "complete"; data: { simulation_id: string } };

/* ═══ Request / Response ═══ */

export type SimulationRequest = {
  question: string;
  engine: string;
  userId?: string;
};
