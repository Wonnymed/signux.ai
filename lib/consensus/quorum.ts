/**
 * Quorum calculation — BFT threshold for Octux consensus.
 *
 * quorum_threshold = floor(2 * total_nodes / 3) + 1
 * Tolerates up to floor(n/3) Byzantine (malicious) nodes.
 */

import type { Vote, Proposal, Node } from './types';

/**
 * Calculate BFT quorum threshold.
 * For n nodes, need floor(2n/3) + 1 "yes" votes.
 */
export function calculateQuorumThreshold(totalNodes: number): number {
  if (totalNodes <= 0) return 1;
  return Math.floor((2 * totalNodes) / 3) + 1;
}

/**
 * Check if a proposal has reached quorum.
 */
export function hasQuorumReached(proposal: Proposal, activeNodeCount: number): boolean {
  const threshold = calculateQuorumThreshold(activeNodeCount);
  const yesVotes = countVotesByType(proposal, 'yes');
  return yesVotes >= threshold;
}

/**
 * Count votes of a specific type for a proposal.
 */
export function countVotesByType(proposal: Proposal, voteType: string): number {
  let count = 0;
  for (const vote of proposal.votes.values()) {
    if (vote.type === voteType) count++;
  }
  return count;
}

/**
 * Calculate agreement percentage (yes votes / active nodes).
 */
export function calculateAgreementPct(proposal: Proposal, activeNodeCount: number): number {
  if (activeNodeCount === 0) return 0;
  const yesVotes = countVotesByType(proposal, 'yes');
  return (yesVotes / activeNodeCount) * 100;
}

/**
 * Calculate participation percentage (total votes cast / active nodes).
 */
export function calculateParticipationPct(proposal: Proposal, activeNodeCount: number): number {
  if (activeNodeCount === 0) return 0;
  const totalVotes = Array.from(proposal.votes.values()).filter(v => v.type !== 'pending').length;
  return (totalVotes / activeNodeCount) * 100;
}

/**
 * Calculate global consensus score using weighted average.
 *
 * global_consensus = weighted_average(
 *   agreement_pct    * 0.40,
 *   participation    * 0.25,
 *   block_stability  * 0.25,
 *   (1 - state_divergence) * 0.10
 * )
 */
export function calculateGlobalConsensus(
  agreementPct: number,
  participationPct: number,
  blockStability: number,
  stateDivergence: number,
): number {
  return (
    agreementPct * 0.40 +
    participationPct * 0.25 +
    blockStability * 100 * 0.25 +
    (1 - stateDivergence) * 100 * 0.10
  );
}

/**
 * Calculate state divergence (divergent nodes / active nodes).
 */
export function calculateStateDivergence(nodes: Node[]): number {
  if (nodes.length === 0) return 0;
  const divergent = nodes.filter(n => n.status === 'lag' || n.status === 'offline').length;
  return divergent / nodes.length;
}
