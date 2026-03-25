/**
 * Consensus Tracker Types — pBFT adapted for Octux protocol.
 *
 * Quorum: floor(2n/3) + 1
 * Phases: PREPARE → PRE-COMMIT → COMMIT
 * Rounds numbered sequentially; epochs group rounds for checkpointing.
 */

// ═══ NODE ═══

export type NodeStatus = 'sync' | 'lag' | 'offline';

export interface Node {
  id: string;
  name: string;
  status: NodeStatus;
  latencyMs: number;
  lastSeen: Date;
  publicKey: string;
}

// ═══ VOTE ═══

export type VoteType = 'yes' | 'no' | 'abstain' | 'pending';

export interface Vote {
  nodeId: string;
  proposalId: string;
  round: number;
  type: VoteType;
  timestamp: Date;
  signature: Uint8Array;
}

// ═══ PROPOSAL ═══

export type ProposalStatus = 'voting' | 'passed' | 'rejected' | 'pending' | 'expired';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  round: number;
  createdAt: Date;
  expiresAt: Date;
  status: ProposalStatus;
  votes: Map<string, Vote>; // nodeId → Vote
}

// ═══ CONSENSUS STATE ═══

export interface ConsensusState {
  epoch: number;
  round: number;
  activeNodes: Node[];
  proposals: Proposal[];
  globalConsensus: number;   // 0–100
  bftAgreement: number;      // 0–100
  participation: number;     // 0–100
  blockStability: number;    // 0–1
  stateDivergence: number;   // 0–1
  quorumReached: boolean;
  updatedAt: Date;
}

// ═══ EVENTS ═══

export type EventType =
  | 'node.joined'
  | 'node.left'
  | 'node.lagging'
  | 'vote.cast'
  | 'proposal.passed'
  | 'proposal.rejected'
  | 'quorum.reached'
  | 'round.started'
  | 'round.completed'
  | 'epoch.checkpoint'
  | 'state.divergence';

export type EventHandler = (event: ConsensusEvent) => void;

export interface ConsensusEvent {
  type: EventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

// ═══ AGREEMENT MATRIX ═══

export type AgreementLevel = 'agree' | 'partial' | 'conflict' | 'self';

export interface AgreementMatrix {
  nodeIds: string[];
  matrix: AgreementLevel[][];
}

// ═══ METRICS ═══

export interface ConsensusMetrics {
  globalConsensusPct: number;
  bftAgreementPct: number;
  participationPct: number;
  blockStabilityPct: number;
  stateDivergence: number;
  nodesActiveTotal: number;
  nodesLaggingTotal: number;
  nodesOfflineTotal: number;
  proposalsActiveTotal: number;
  roundsTotal: number;
  votesTotal: Record<VoteType, number>;
  quorumReachedTotal: number;
  nodeLatencies: Record<string, number>;
}

// ═══ CONFIG ═══

export interface ConsensusConfig {
  lagThresholdMs: number;
  offlineTimeoutS: number;
  roundDurationS: number;
  proposalTtlRounds: number;
  minQuorumPct: number;
  matrixWindowRounds: number;
}

// ═══ TRACKER INTERFACE ═══

export interface TrackerInterface {
  // Node management
  registerNode(node: Node): void;
  updateNodeStatus(nodeId: string, status: NodeStatus, latencyMs: number): void;
  removeNode(nodeId: string): void;
  getActiveNodes(): Node[];

  // Proposal management
  submitProposal(proposal: Proposal): void;
  castVote(vote: Vote): void;
  getProposal(proposalId: string): Proposal | null;
  listProposals(status?: ProposalStatus): Proposal[];

  // Consensus state
  getConsensusState(): ConsensusState;
  computeConsensus(): number;
  isQuorumReached(proposalId: string): boolean;

  // Events
  subscribe(eventType: EventType, handler: EventHandler): string;
  unsubscribe(subscriptionId: string): void;
}
