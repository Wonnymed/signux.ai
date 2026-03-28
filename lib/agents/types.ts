import type {
  CompareVerdictData,
  StressVerdictData,
  PremortemFailureAnalysis,
  LegacyRiskEntry,
} from '../simulation/mode-verdict';

export type AgentId =
  | 'decision_chair'
  | 'base_rate_archivist'
  | 'demand_signal_analyst'
  | 'unit_economics_auditor'
  | 'regulatory_gatekeeper'
  | 'competitive_intel'
  | 'execution_operator'
  | 'capital_allocator'
  | 'scenario_planner'
  | 'intervention_optimizer'
  | 'customer_reality';

export type AgentConfig = {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  color: string;
  goal: string;
  backstory: string;
  constraints: string[];
  sop: string[];
  systemPrompt: string;
};

export type AgentReport = {
  agent_id: AgentId;
  agent_name: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;
  key_argument: string;
  evidence: string[];
  risks_identified: string[];
  recommendation: string;
};

export type SimulationPlan = {
  tasks: { description: string; assigned_agent: AgentId }[];
  estimated_rounds: number;
};

export type DecisionObject = {
  recommendation: 'proceed' | 'proceed_with_conditions' | 'delay' | 'abandon';
  probability: number;
  main_risk: string;
  leverage_point: string;
  next_action: string;
  grade: string;
  grade_score: number;
  citations: Citation[];
  /** Optional narrative headline for dashboards / VerdictPanel. */
  one_liner?: string;
  compare_data?: CompareVerdictData;
  stress_data?: StressVerdictData;
  failure_analysis?: PremortemFailureAnalysis;
  /** Premortem prevention steps (mirrors VerdictResult.action_plan). */
  action_plan?: string[];
  /** Stress-mode legacy list shape (also used when mapping structured stress vectors). */
  risk_matrix?: LegacyRiskEntry[];
};

export type Citation = {
  id: number;
  agent_id: AgentId;
  agent_name: string;
  claim: string;
  confidence: number;
};
