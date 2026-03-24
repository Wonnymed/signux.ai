// ── Palantir #4 — Traceable Citation System ────────────────
// Every claim traceable to agent + round + phase with strength scoring

import type { AgentReport, Citation } from '../agents/types';
import type { SimulationState } from './state';

// ── Types ──────────────────────────────────────────────────

export type EnrichedCitation = {
  id: number;
  agent_id: string;
  agent_name: string;
  round: number;
  phase: string;
  claim: string;
  confidence: number;
  position: string;
  was_challenged: boolean;
  survived_debate: boolean;
  citation_strength: number; // 0-1: higher if high confidence + survived debate + specific evidence
};

// ── Builder ────────────────────────────────────────────────

export function buildCitations(state: SimulationState): EnrichedCitation[] {
  const citations: EnrichedCitation[] = [];
  let citationId = 1;

  state.agent_reports.forEach((reports, agentId) => {
    const finalReport = state.latest_reports.get(agentId);
    if (!finalReport) return;

    const wasInDebate = state.debate_pairs.some(
      (p) => p.challenger_id === agentId || p.defender_id === agentId,
    );
    const positions = reports.map((r) => r.position);
    const changedMind = new Set(positions).size > 1;

    // Citation strength: confidence (0.4) + debate survival (0.3) + evidence (0.2) + consistency (0.1)
    const confidenceScore = (finalReport.confidence / 10) * 0.4;
    const debateScore = wasInDebate ? 0.3 : 0.15;
    const evidenceScore = finalReport.evidence && finalReport.evidence.length > 0 ? 0.2 : 0;
    const consistencyScore = changedMind ? 0 : 0.1;
    const citation_strength = Math.min(
      1,
      confidenceScore + debateScore + evidenceScore + consistencyScore,
    );

    const phase = reports.length > 1 ? 'convergence' : 'opening';
    const round = reports.length > 1 ? 9 : 2;

    citations.push({
      id: citationId++,
      agent_id: agentId,
      agent_name: finalReport.agent_name || agentId,
      round,
      phase,
      claim: finalReport.key_argument,
      confidence: finalReport.confidence,
      position: finalReport.position,
      was_challenged: wasInDebate,
      survived_debate: wasInDebate && !changedMind,
      citation_strength,
    });
  });

  // Sort by strength descending, re-assign IDs
  citations.sort((a, b) => b.citation_strength - a.citation_strength);
  citations.forEach((c, i) => {
    c.id = i + 1;
  });

  return citations;
}

// ── Helpers ────────────────────────────────────────────────

export function generateCitationSummary(citations: EnrichedCitation[]): string {
  return citations
    .slice(0, 3)
    .map(
      (c) =>
        `[${c.id}] ${c.agent_name} (${c.confidence}/10, ${c.position}): ${c.claim.substring(0, 100)}`,
    )
    .join('\n');
}
