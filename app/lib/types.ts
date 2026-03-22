export type Attachment = {
  type: "image" | "document";
  name: string;
  preview?: string;
  size: number;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  timestamp?: number;
};

export type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  dismissing?: boolean;
};

export type SimAgent = {
  name: string;
  role?: string;
  category?: string;
  done: boolean;
};

export type UniverseData = {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  probability: number;
  riskLabel: string;
  revenue: string;
  roi: string;
  timeline: string;
  outcome: string;
  trigger: string;
  events: { period: string; text: string; sentiment: string }[];
  keyInsights: string[];
  agentQuotes: { agent: string; role: string; quote: string }[];
};

export type VerdictData = {
  result: "GO" | "CAUTION" | "STOP";
  viabilityScore: number;
  estimatedROI: string;
  confidence: number;
  goVotes: number;
  cautionVotes: number;
  stopVotes: number;
  reasoning: string;
  steerTowardA: string[];
  avoidC: string[];
};

export type SimResult = {
  error?: string;
  report?: string;
  simulation?: any[];
  stages?: {
    graph?: { entities?: any[]; relationships?: any[]; key_variables?: string[]; critical_questions?: string[] };
    agents?: any[];
    simulation_parameters?: any;
  };
  universes?: UniverseData[];
  verdict?: VerdictData;
  metadata?: { agents_count?: number; rounds?: number; total_interactions?: number };
  engineData?: { done: boolean };
};

export type Mode = "chat" | "simulate" | "compete" | "build" | "grow" | "hire" | "protect";

export interface EngineResponse {
  engine: string;
  title: string;
  executive_summary: string;
  confidence: "low" | "medium" | "high";
  status: "clear" | "promising" | "fragile" | "blocked" | "mixed";
  main_recommendation: string;
  key_risks: string[];
  key_opportunities: string[];
  next_actions: string[];
  notes: string[];
  [key: string]: any;
}

export const AGENT_CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  supply: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.25)" },
  logistics: { bg: "rgba(16,185,129,0.08)", color: "#10B981", border: "rgba(16,185,129,0.25)" },
  finance: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.25)" },
  regulatory: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.25)" },
  market: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.25)" },
  legal: { bg: "rgba(236,72,153,0.08)", color: "#EC4899", border: "rgba(236,72,153,0.25)" },
  cultural: { bg: "rgba(20,184,166,0.08)", color: "#14B8A6", border: "rgba(20,184,166,0.25)" },
  operations: { bg: "rgba(99,102,241,0.08)", color: "#6366F1", border: "rgba(99,102,241,0.25)" },
};
export const DEFAULT_CATEGORY_COLOR = { bg: "var(--bg-secondary)", color: "var(--text-secondary)", border: "var(--border-primary)" };

export const ENTITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  product: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
  country: { bg: "rgba(16,185,129,0.08)", color: "#10B981", border: "rgba(16,185,129,0.15)" },
  company: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  market: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  regulation: { bg: "rgba(239,68,68,0.08)", color: "#EF4444", border: "rgba(239,68,68,0.15)" },
  currency: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.15)" },
  person: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
};
export const DEFAULT_ENTITY_COLOR = { bg: "var(--bg-secondary)", color: "var(--text-secondary)", border: "var(--border-primary)" };
