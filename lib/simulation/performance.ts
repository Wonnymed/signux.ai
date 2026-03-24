// ── Agno #11 — Per-Agent Performance Tracking ──────────────
// Scores each agent's contribution quality within a simulation

import type { AgentReport } from '../agents/types';
import type { SimulationState } from './state';
import type { EnrichedCitation } from './citations';

// ── Types ──────────────────────────────────────────────────

export type AgentPerformance = {
  agent_id: string;
  agent_name: string;
  simulation_id: string;
  confidence_accuracy: number;
  position_consistency: boolean;
  evidence_quality: number;
  argument_specificity: number;
  unique_contribution: number;
  debate_impact: number;
  overall_score: number; // 0-100
};

// ── Per-Agent Scorer ───────────────────────────────────────

export function scoreAgentPerformance(
  agentId: string,
  state: SimulationState,
  citations: EnrichedCitation[],
): AgentPerformance {
  const reports = state.agent_reports.get(agentId) || [];
  const latestReport = state.latest_reports.get(agentId);

  if (!latestReport || reports.length === 0) {
    return {
      agent_id: agentId,
      agent_name: agentId,
      simulation_id: state.simulation_id,
      confidence_accuracy: 0,
      position_consistency: true,
      evidence_quality: 0,
      argument_specificity: 0,
      unique_contribution: 0,
      debate_impact: 0,
      overall_score: 0,
    };
  }

  // Position consistency: did the agent hold their position across rounds?
  const positions = reports.map((r) => r.position);
  const position_consistency = new Set(positions).size === 1;

  // Evidence quality: how many evidence items (0-1, ideal ≥ 3)
  const evidence = latestReport.evidence || [];
  const evidence_quality = Math.min(1, evidence.length * 0.33);

  // Argument specificity: does the argument contain numbers, timeframes, named entities?
  const arg = latestReport.key_argument || '';
  const hasNumbers = /\d+%|\$[\d,]+|\d+\.\d+|\d{2,}/.test(arg);
  const hasTimeframe = /week|month|year|day|quarter|Q[1-4]/i.test(arg);
  const hasSpecificEntity =
    /[A-Z][a-z]+\s+(Station|District|City|Street|Market|Inc|Corp)/i.test(arg);
  const argument_specificity =
    [hasNumbers, hasTimeframe, hasSpecificEntity].filter(Boolean).length / 3;

  // Unique contribution: citation strength if cited, baseline 0.2 otherwise
  const agentCitation = citations.find((c) => c.agent_id === agentId);
  const unique_contribution = agentCitation ? agentCitation.citation_strength : 0.2;

  // Debate impact: did this agent's challenge cause the opponent to change position?
  const debatePair = state.debate_pairs.find(
    (p) => p.challenger_id === agentId || p.defender_id === agentId,
  );
  let debate_impact = 0.3; // baseline for agents not in debate
  if (debatePair) {
    const opposingId =
      debatePair.challenger_id === agentId
        ? debatePair.defender_id
        : debatePair.challenger_id;
    const opposingReports = state.agent_reports.get(opposingId) || [];
    if (opposingReports.length > 1) {
      const opposingChanged =
        new Set(opposingReports.map((r) => r.position)).size > 1;
      debate_impact = opposingChanged ? 0.9 : 0.5;
    }
  }

  // Confidence accuracy: how close is confidence to evidence backing?
  const confidence = latestReport.confidence / 10;
  const confidence_accuracy = 1 - Math.abs(confidence - evidence_quality);

  // Overall: weighted sum → 0-100
  const overall_score = Math.round(
    confidence_accuracy * 15 +
      (position_consistency ? 10 : 0) +
      evidence_quality * 25 +
      argument_specificity * 20 +
      unique_contribution * 15 +
      debate_impact * 15,
  );

  return {
    agent_id: agentId,
    agent_name: latestReport.agent_name || agentId,
    simulation_id: state.simulation_id,
    confidence_accuracy,
    position_consistency,
    evidence_quality,
    argument_specificity,
    unique_contribution,
    debate_impact,
    overall_score,
  };
}

// ── Score All Agents ───────────────────────────────────────

export function scoreAllAgents(
  state: SimulationState,
  citations: EnrichedCitation[],
): AgentPerformance[] {
  const scores: AgentPerformance[] = [];
  state.latest_reports.forEach((_, agentId) => {
    scores.push(scoreAgentPerformance(agentId, state, citations));
  });
  scores.sort((a, b) => b.overall_score - a.overall_score);
  return scores;
}
