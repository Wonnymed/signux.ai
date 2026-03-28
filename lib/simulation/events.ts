/**
 * Typed SSE events from /api/simulate/stream
 *
 * The backend sends JSON objects with { event, data } structure.
 * Each event type has a specific data shape.
 */

import type {
  CompareVerdictData,
  StressVerdictData,
  PremortemFailureAnalysis,
} from './mode-verdict';

export type SSEEvent =
  | PhaseStartEvent
  | PlanCompleteEvent
  | AgentTokenEvent
  | AgentReportEvent
  | AgentCompleteEvent
  | ConsensusUpdateEvent
  | VerdictTokenEvent
  | VerdictEvent
  | SimulationCompleteEvent
  | HITLPauseEvent
  | ErrorEvent;

// ═══ PHASE EVENTS ═══

export interface PhaseStartEvent {
  event: 'phase_start' | 'phase_update';
  data: {
    phase: string;
    description?: string;
  };
}

export interface PlanCompleteEvent {
  event: 'plan_complete';
  data: {
    plan?: SubTask[];
    tasks?: SubTask[];
    question_decomposition?: string[];
  };
}

export interface SubTask {
  task: string;
  assigned?: string;
  priority?: number;
}

// ═══ AGENT EVENTS ═══

export interface AgentTokenEvent {
  event: 'agent_token';
  data: {
    agent_id: string;
    agent_name?: string;
    token: string;
  };
}

export interface AgentReportEvent {
  event: 'agent_report';
  data: {
    agent_id?: string;
    agent_name: string;
    role?: string;
    position: 'proceed' | 'delay' | 'abandon';
    confidence: number;
    key_argument?: string;
    summary?: string;
    analysis?: string;
    round?: number;
  };
}

export interface AgentCompleteEvent {
  event: 'agent_complete';
  data: {
    agent_id: string;
    agent_name: string;
    role?: string;
    position: 'proceed' | 'delay' | 'abandon';
    confidence: number;
    report: AgentReport;
  };
}

export interface AgentReport {
  agent_name: string;
  role: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;
  key_argument: string;
  evidence?: string[];
  risks?: string[];
  round: number;
  trend?: 'up' | 'down' | 'stable';
}

// ═══ CONSENSUS EVENT ═══

export interface ConsensusUpdateEvent {
  event: 'consensus_update';
  data: {
    proceed: number;
    delay: number;
    abandon: number;
    avgConfidence: number;
    positionsChanged: number;
    keyDisagreement?: string;
    round: number;
    totalRounds: number;
  };
}

// ═══ VERDICT EVENTS ═══

export interface VerdictTokenEvent {
  event: 'verdict_token';
  data: {
    token: string;
  };
}

export interface VerdictEvent {
  event: 'verdict';
  data: VerdictResult;
}

export interface SimulationCompleteEvent {
  event: 'simulation_complete';
  data: VerdictResult;
}

/** God's View — Haiku market voice aggregate (optional on verdict). */
export interface GodViewVerdictSlice {
  totalVoices: number;
  positive: number;
  negative: number;
  neutral: number;
  topPositive: string;
  topNegative: string;
}

export interface VerdictResult {
  simulation_id?: string;
  recommendation: 'proceed' | 'proceed_with_conditions' | 'delay' | 'abandon';
  probability: number;
  grade: string;
  /** Headline / summary line for the verdict panel. */
  one_liner?: string;
  main_risk: string;
  next_action: string;
  disclaimer: string;
  citations?: Citation[];
  agent_scoreboard?: AgentScoreEntry[];
  /** Specialist risk rows; stress mode may also carry legacy-shaped rows derived from stress_data. */
  risk_matrix?: RiskEntry[];
  action_plan?: string[];
  god_view?: GodViewVerdictSlice;
  compare_data?: CompareVerdictData;
  stress_data?: StressVerdictData;
  failure_analysis?: PremortemFailureAnalysis;
}

export interface Citation {
  id: number;
  agent_id: string;
  agent_name: string;
  round: number;
  claim: string;
  confidence: number;
  supporting_data?: string;
}

export interface AgentScoreEntry {
  agent_name: string;
  role: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;
  key_argument: string;
}

export interface RiskEntry {
  risk: string;
  severity: 'high' | 'medium' | 'low';
  agent_source: string;
}

// ═══ HITL EVENT ═══

export interface HITLPauseEvent {
  event: 'hitl_pause';
  data: {
    question: string;
    context?: string;
    round: number;
  };
}

// ═══ ERROR EVENT ═══

export interface ErrorEvent {
  event: 'error';
  data: {
    message: string;
    code?: string;
  };
}
