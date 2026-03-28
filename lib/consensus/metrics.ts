/**
 * Metrics export — Prometheus-compatible text format.
 *
 * Exports gauges, counters, and histograms for the consensus tracker.
 */

import type { ConsensusTracker } from './tracker';

/**
 * Generate Prometheus-format metrics string from tracker state.
 */
export function exportPrometheusMetrics(tracker: ConsensusTracker): string {
  const m = tracker.getMetrics();
  const lines: string[] = [];

  const gauge = (name: string, help: string, value: number) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  };

  const counter = (name: string, help: string, value: number) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  };

  gauge('octux_consensus_global_pct', 'Consenso global atual (0-100)', round2(m.globalConsensusPct));
  gauge('octux_consensus_bft_agreement_pct', 'Acordo BFT', round2(m.bftAgreementPct));
  gauge('octux_consensus_participation_pct', 'Participacao na rodada', round2(m.participationPct));
  gauge('octux_consensus_block_stability_pct', 'Estabilidade de bloco', round2(m.blockStabilityPct));
  gauge('octux_consensus_state_divergence', 'Divergencia de estado', round2(m.stateDivergence));
  gauge('octux_nodes_active_total', 'Nos em status sync', m.nodesActiveTotal);
  gauge('octux_nodes_lagging_total', 'Nos em status lag', m.nodesLaggingTotal);
  gauge('octux_nodes_offline_total', 'Nos em status offline', m.nodesOfflineTotal);
  gauge('octux_proposals_active_total', 'Propostas em votacao', m.proposalsActiveTotal);

  counter('octux_rounds_total', 'Total de rodadas concluidas', m.roundsTotal);
  counter('octux_quorum_reached_total', 'Total de propostas que atingiram quorum', m.quorumReachedTotal);

  // Votes by type
  lines.push('# HELP octux_votes_total Total de votos por tipo');
  lines.push('# TYPE octux_votes_total counter');
  for (const [type, count] of Object.entries(m.votesTotal)) {
    lines.push(`octux_votes_total{type="${type}"} ${count}`);
  }

  // Node latencies
  lines.push('# HELP octux_node_latency_ms Latencia por no');
  lines.push('# TYPE octux_node_latency_ms gauge');
  for (const [nodeId, latency] of Object.entries(m.nodeLatencies)) {
    lines.push(`octux_node_latency_ms{node_id="${nodeId}"} ${latency}`);
  }

  return lines.join('\n') + '\n';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Get metrics as JSON object (for REST API).
 */
export function exportMetricsJSON(tracker: ConsensusTracker) {
  return tracker.getMetrics();
}
