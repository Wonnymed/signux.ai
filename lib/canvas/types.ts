import type { DashboardMode, DashboardTier } from '@/lib/store/dashboard-ui';

export type CanvasSimStatus =
  | 'idle'
  | 'connecting'
  | 'planning'
  | 'opening'
  | 'adversarial'
  | 'converging'
  | 'verdict'
  | 'complete'
  | 'error';

export type AgentPosition = 'proceed' | 'delay' | 'abandon' | 'pending';

export interface AgentNode {
  id: string;
  name: string;
  position: AgentPosition;
  confidence: number;
  argument: string;
  isActive: boolean;
}

export interface CrowdParticle {
  id: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  statement: string;
}

export interface DebateEdge {
  sourceId: string;
  targetId: string;
  type: 'agree' | 'disagree';
  strength: number;
}

export interface VerdictData {
  recommendation: 'proceed' | 'delay' | 'abandon';
  probability: number;
  grade?: string;
  one_liner?: string;
}

/** Snapshot passed into the canvas renderer each frame (from Zustand + derived fields). */
export interface CanvasSnapshot {
  mode: DashboardMode;
  tier: DashboardTier;
  demo: boolean;
  isRunning: boolean;
  simStatus: CanvasSimStatus;
  simError: string | null;
  agents: AgentNode[];
  edges: DebateEdge[];
  consensusTarget: number;
  currentRound: number;
  totalRounds: number;
  verdict: VerdictData | null;
  voiceCount: number;
  elapsedSec: number;
}

export interface SimulationCanvasProps {
  mode: DashboardMode;
  tier: DashboardTier;
  isRunning: boolean;
  currentRound: number;
  totalRounds: number;
  agents: AgentNode[];
  crowdVoices: CrowdParticle[];
  edges: DebateEdge[];
  consensus: number;
  verdict: VerdictData | null;
}
