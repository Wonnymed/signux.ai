import type { OperatorProfile } from '@/lib/operator/types';

/** Modes the Chief understands (aligned with billing sim modes). */
export type ChiefSimulationMode = 'simulate' | 'compare' | 'stress_test' | 'premortem';

export type ChiefTier = 'specialist' | 'swarm';

export interface SpecialistPlan {
  id: string;
  name: string;
  role: string;
  expertise: string;
  bias: string;
  personality: string;
  /** Sample sentence showing how they talk */
  speaking_style: string;
  task: string;
  team?: 'A' | 'B';
}

export interface OperatorAgentPlan {
  id: string;
  name: string;
  role: string;
  perspective: string;
  constraints: string;
  speaking_style: string;
  task?: string;
}

export interface CrowdSegment {
  /** Segment label / demographic description */
  segment: string;
  count: number;
  behavior: string;
  income_level?: string;
  context: string;
  sample_voice: string;
}

export interface SpecialistChiefDesign {
  kind: 'specialist';
  specialists: SpecialistPlan[];
  operator: OperatorAgentPlan | null;
}

export interface SwarmChiefDesign {
  kind: 'swarm';
  segments: CrowdSegment[];
  /** Compare swarm: optional split */
  segments_a?: CrowdSegment[];
  segments_b?: CrowdSegment[];
}

export type SimulationDesign = SpecialistChiefDesign | SwarmChiefDesign;

/** Opus Head-to-Head Report (Compare). */
export interface CompareVerdict {
  _mode: 'compare';
  winner: 'A' | 'B' | 'neither';
  confidence: number;
  grade: string;
  headline: string;
  executive_summary: string;
  option_a: {
    score: number;
    label?: string;
    strengths: string[];
    weaknesses: string[];
    specialist_consensus?: string;
    crowd_sentiment?: string;
  };
  option_b: {
    score: number;
    label?: string;
    strengths: string[];
    weaknesses: string[];
    specialist_consensus?: string;
    crowd_sentiment?: string;
  };
  head_to_head: {
    dimension: string;
    winner: 'A' | 'B' | 'tie';
    score_a?: number;
    score_b?: number;
    reason: string;
  }[];
  risks: {
    if_choosing_a?: string[];
    if_choosing_b?: string[];
    if_choosing_neither?: string;
  };
  next_steps: {
    if_a?: { timeframe: string; action: string }[];
    if_b?: { timeframe: string; action: string }[];
  };
  final_word: string;
  sources?: { title: string; url: string }[];
}

/** Opus Vulnerability Audit (Stress test). */
export interface StressOpusVerdict {
  _mode: 'stress_test';
  survival_probability: number;
  grade: string;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  headline: string;
  executive_summary: string;
  breaking_point: {
    description: string;
    probability: number;
    timeframe: string;
  };
  vulnerabilities: {
    id: number;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    likelihood: number;
    impact: string;
    specialist_who_found?: string;
    mitigation: {
      action: string;
      cost: string;
      effectiveness: number;
    };
  }[];
  resilience_scores: {
    dimension: string;
    score: number;
    explanation: string;
  }[];
  worst_case_scenario: {
    narrative: string;
    total_loss: string;
    recovery_time: string;
  };
  best_case_if_patched: {
    narrative: string;
    survival_probability_after_fixes: number;
  };
  immediate_actions: {
    priority: number;
    action: string;
    why: string;
    deadline: string;
  }[];
  kill_switches: {
    trigger: string;
    action: string;
  }[];
  final_word: string;
  sources?: { title: string; url: string }[];
}

/** Opus Failure Autopsy (Pre-mortem). */
export interface PremortemOpusVerdict {
  _mode: 'premortem';
  cause_of_death: string;
  grade: string;
  failure_probability: number;
  headline: string;
  autopsy_narrative: string;
  timeline: {
    month: string;
    event: string;
    warning_sign: string;
    was_preventable: boolean;
  }[];
  point_of_no_return: {
    when: string;
    what_happened: string;
    what_should_have_happened: string;
  };
  contributing_factors: {
    rank: number;
    factor: string;
    specialist_who_predicted?: string;
    weight: number;
    preventable: boolean;
    prevention: string;
  }[];
  what_the_crowd_saw?: {
    early_signal: string;
    ignored_warning: string;
  };
  total_cost_of_failure: {
    financial: string;
    time: string;
    opportunity_cost: string;
    emotional: string;
  };
  how_to_prevent_this: {
    priority: number;
    intervention: string;
    when_to_act: string;
    success_probability_with_fix: number;
  }[];
  revised_probability_if_all_prevented: number;
  final_word: string;
  sources?: { title: string; url: string }[];
}

export type OpusVerdict = CompareVerdict | StressOpusVerdict | PremortemOpusVerdict;

export type { OperatorProfile };
