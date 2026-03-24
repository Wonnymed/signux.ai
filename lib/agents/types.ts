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
  | 'intervention_optimizer';

export type AgentConfig = {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  color: string;
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
};

export type Citation = {
  id: number;
  agent_id: AgentId;
  agent_name: string;
  claim: string;
  confidence: number;
};
