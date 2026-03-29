import type { SimulationChargeType } from '@/lib/billing/token-costs';

/** Specialist panel rows from Chief (persisted in the sim store for post-verdict chat). */
export type ChiefPanelSnapshot = {
  specialists: { id: string; name: string; role: string; team?: string }[];
  operator: { name: string; highlight: boolean } | null;
};

export type SpecialistBias = 'bullish' | 'bearish' | 'neutral' | 'cautious';

/** Persona sent to the specialist-chat API (client-built from panel + reports). */
export type SpecialistChatPersona = {
  id: string;
  agentId: string;
  name: string;
  role: string;
  team?: string;
  personality: string;
  speaking_style: string;
  bias: SpecialistBias;
  isOperator: boolean;
};

export type SpecialistChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  sources?: { url: string; title: string }[];
};

export type SimulationChatContext = {
  question: string;
  mode: SimulationChargeType;
  yourResponses: string[];
  otherResponses: { agentId: string; name: string; summary: string }[];
  interventionQuestion: string | null;
  interventionAnswer: string | null;
  verdictSummary: string;
  verdictConfidence: number;
  operatorContext: string;
};
