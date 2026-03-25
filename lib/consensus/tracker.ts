/**
 * Consensus Tracker — Core implementation of TrackerInterface.
 *
 * Thread-safe (single-threaded JS, but safe for concurrent async ops).
 * Stateless between instances — state lives in shared storage.
 * Safety over liveness: reject invalid state rather than accept it.
 */

import type {
  TrackerInterface, Node, NodeStatus, Proposal, ProposalStatus,
  Vote, ConsensusState, EventType, EventHandler, ConsensusEvent,
  ConsensusConfig, AgreementMatrix, AgreementLevel,
} from './types';
import {
  calculateQuorumThreshold, hasQuorumReached, countVotesByType,
  calculateAgreementPct, calculateParticipationPct,
  calculateGlobalConsensus, calculateStateDivergence,
} from './quorum';

// Default configuration
const DEFAULT_CONFIG: ConsensusConfig = {
  lagThresholdMs: 200,
  offlineTimeoutS: 30,
  roundDurationS: 15,
  proposalTtlRounds: 10,
  minQuorumPct: 66.7,
  matrixWindowRounds: 10,
};

export class ConsensusTracker implements TrackerInterface {
  private nodes: Map<string, Node> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private subscriptions: Map<string, { eventType: EventType; handler: EventHandler }> = new Map();
  private config: ConsensusConfig;
  private currentRound = 0;
  private currentEpoch = 0;
  private roundsCompleted = 0;
  private failedBlocks = 0;
  private totalBlocksLastEpoch = 0;
  private quorumReachedCount = 0;
  private voteCounters: Record<string, number> = { yes: 0, no: 0, abstain: 0, pending: 0 };

  // Vote history for agreement matrix: round → nodeId → voteType
  private voteHistory: Map<number, Map<string, string>> = new Map();

  constructor(config?: Partial<ConsensusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ═══ NODE MANAGEMENT ═══

  registerNode(node: Node): void {
    if (!node.id || !node.publicKey) {
      throw new Error('Node must have id and publicKey');
    }
    this.nodes.set(node.id, { ...node, lastSeen: new Date() });
    this.emit('node.joined', { nodeId: node.id, name: node.name });
  }

  updateNodeStatus(nodeId: string, status: NodeStatus, latencyMs: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const prevStatus = node.status;

    // Auto-detect lag based on threshold
    let resolvedStatus = status;
    if (status === 'sync' && latencyMs > this.config.lagThresholdMs) {
      resolvedStatus = 'lag';
    }

    node.status = resolvedStatus;
    node.latencyMs = latencyMs;
    node.lastSeen = new Date();

    if (prevStatus !== 'lag' && resolvedStatus === 'lag') {
      this.emit('node.lagging', { nodeId, latencyMs });
    }
  }

  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    this.nodes.delete(nodeId);
    this.emit('node.left', { nodeId, name: node.name });
  }

  getActiveNodes(): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.status !== 'offline');
  }

  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  // ═══ PROPOSAL MANAGEMENT ═══

  submitProposal(proposal: Proposal): void {
    if (!proposal.id) throw new Error('Proposal must have an id');
    if (this.proposals.has(proposal.id)) throw new Error(`Proposal ${proposal.id} already exists`);

    // Ensure votes is a Map
    const stored: Proposal = {
      ...proposal,
      votes: proposal.votes instanceof Map ? new Map(proposal.votes) : new Map(),
      status: 'voting',
      createdAt: new Date(),
    };
    this.proposals.set(proposal.id, stored);
  }

  castVote(vote: Vote): void {
    if (!vote.nodeId || !vote.proposalId) {
      throw new Error('Vote must have nodeId and proposalId');
    }

    const node = this.nodes.get(vote.nodeId);
    if (!node) throw new Error(`Node ${vote.nodeId} not found`);

    const proposal = this.proposals.get(vote.proposalId);
    if (!proposal) throw new Error(`Proposal ${vote.proposalId} not found`);

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${vote.proposalId} is not in voting status`);
    }

    // Record vote
    proposal.votes.set(vote.nodeId, { ...vote, timestamp: new Date() });

    // Track vote counters
    this.voteCounters[vote.type] = (this.voteCounters[vote.type] || 0) + 1;

    // Track vote history for agreement matrix
    const round = vote.round || this.currentRound;
    if (!this.voteHistory.has(round)) {
      this.voteHistory.set(round, new Map());
    }
    this.voteHistory.get(round)!.set(vote.nodeId, vote.type);

    this.emit('vote.cast', { nodeId: vote.nodeId, proposalId: vote.proposalId, voteType: vote.type });

    // Check quorum
    const activeCount = this.getActiveNodes().length;
    if (hasQuorumReached(proposal, activeCount)) {
      proposal.status = 'passed';
      this.quorumReachedCount++;
      this.emit('quorum.reached', { proposalId: proposal.id });
      this.emit('proposal.passed', { proposalId: proposal.id });
    } else {
      // Check if rejection is certain (not enough remaining nodes to reach quorum)
      const yesVotes = countVotesByType(proposal, 'yes');
      const noVotes = countVotesByType(proposal, 'no');
      const abstainVotes = countVotesByType(proposal, 'abstain');
      const votedCount = yesVotes + noVotes + abstainVotes;
      const remaining = activeCount - votedCount;
      const threshold = calculateQuorumThreshold(activeCount);

      if (yesVotes + remaining < threshold) {
        proposal.status = 'rejected';
        this.emit('proposal.rejected', { proposalId: proposal.id });
      }
    }
  }

  getProposal(proposalId: string): Proposal | null {
    return this.proposals.get(proposalId) || null;
  }

  listProposals(status?: ProposalStatus): Proposal[] {
    const all = Array.from(this.proposals.values());
    if (!status) return all;
    return all.filter(p => p.status === status);
  }

  // ═══ CONSENSUS STATE ═══

  getConsensusState(): ConsensusState {
    const activeNodes = this.getActiveNodes();
    const proposals = this.listProposals('voting');
    const globalConsensus = this.computeConsensus();
    const stateDivergence = calculateStateDivergence(Array.from(this.nodes.values()));

    // Calculate aggregate metrics across voting proposals
    let totalAgreement = 0;
    let totalParticipation = 0;
    const votingCount = proposals.length;

    for (const p of proposals) {
      totalAgreement += calculateAgreementPct(p, activeNodes.length);
      totalParticipation += calculateParticipationPct(p, activeNodes.length);
    }

    const avgAgreement = votingCount > 0 ? totalAgreement / votingCount : 0;
    const avgParticipation = votingCount > 0 ? totalParticipation / votingCount : 0;

    const blockStability = this.totalBlocksLastEpoch > 0
      ? 1 - (this.failedBlocks / this.totalBlocksLastEpoch)
      : 1;

    return {
      epoch: this.currentEpoch,
      round: this.currentRound,
      activeNodes,
      proposals,
      globalConsensus,
      bftAgreement: avgAgreement,
      participation: avgParticipation,
      blockStability,
      stateDivergence,
      quorumReached: proposals.some(p => hasQuorumReached(p, activeNodes.length)),
      updatedAt: new Date(),
    };
  }

  computeConsensus(): number {
    const activeNodes = this.getActiveNodes();
    const allNodes = Array.from(this.nodes.values());
    const votingProposals = this.listProposals('voting');

    if (activeNodes.length === 0 || votingProposals.length === 0) return 0;

    // Average agreement and participation across active proposals
    let totalAgreement = 0;
    let totalParticipation = 0;

    for (const p of votingProposals) {
      totalAgreement += calculateAgreementPct(p, activeNodes.length);
      totalParticipation += calculateParticipationPct(p, activeNodes.length);
    }

    const avgAgreement = totalAgreement / votingProposals.length;
    const avgParticipation = totalParticipation / votingProposals.length;

    const blockStability = this.totalBlocksLastEpoch > 0
      ? 1 - (this.failedBlocks / this.totalBlocksLastEpoch)
      : 1;

    const stateDivergence = calculateStateDivergence(allNodes);

    return calculateGlobalConsensus(avgAgreement, avgParticipation, blockStability, stateDivergence);
  }

  isQuorumReached(proposalId: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    return hasQuorumReached(proposal, this.getActiveNodes().length);
  }

  // ═══ ROUNDS & EPOCHS ═══

  startRound(): void {
    this.currentRound++;
    this.emit('round.started', { round: this.currentRound });
    this.expireProposals();
  }

  completeRound(): void {
    this.roundsCompleted++;
    this.emit('round.completed', { round: this.currentRound });

    // Check offline nodes
    const now = Date.now();
    for (const node of this.nodes.values()) {
      if (now - node.lastSeen.getTime() > this.config.offlineTimeoutS * 1000) {
        if (node.status !== 'offline') {
          node.status = 'offline';
          this.emit('node.left', { nodeId: node.id });
        }
      }
    }
  }

  advanceEpoch(): void {
    this.currentEpoch++;
    this.totalBlocksLastEpoch = this.roundsCompleted;
    this.failedBlocks = 0;
    this.emit('epoch.checkpoint', { epoch: this.currentEpoch });
  }

  recordFailedBlock(): void {
    this.failedBlocks++;
  }

  setBlockStats(failed: number, total: number): void {
    this.failedBlocks = failed;
    this.totalBlocksLastEpoch = total;
  }

  // ═══ AGREEMENT MATRIX ═══

  getAgreementMatrix(): AgreementMatrix {
    const nodeIds = Array.from(this.nodes.keys());
    const n = nodeIds.length;
    const matrix: AgreementLevel[][] = Array.from({ length: n }, () => Array(n).fill('agree'));

    // Get recent rounds within window
    const minRound = Math.max(0, this.currentRound - this.config.matrixWindowRounds);
    const relevantRounds: Map<number, Map<string, string>>[] = [];

    for (const [round, votes] of this.voteHistory) {
      if (round > minRound) relevantRounds.push(new Map([[round, votes]]));
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 'self';
          continue;
        }

        const nodeA = nodeIds[i];
        const nodeB = nodeIds[j];
        let agreements = 0;
        let comparisons = 0;

        for (const [round, votes] of this.voteHistory) {
          if (round <= minRound) continue;
          const voteA = votes.get(nodeA);
          const voteB = votes.get(nodeB);
          if (voteA && voteB && voteA !== 'pending' && voteB !== 'pending') {
            comparisons++;
            if (voteA === voteB) agreements++;
          }
        }

        if (comparisons === 0) {
          matrix[i][j] = 'partial'; // no data → neutral
        } else {
          const pct = (agreements / comparisons) * 100;
          if (pct >= 80) matrix[i][j] = 'agree';
          else if (pct >= 40) matrix[i][j] = 'partial';
          else matrix[i][j] = 'conflict';
        }
      }
    }

    return { nodeIds, matrix };
  }

  // ═══ METRICS ═══

  getMetrics() {
    const allNodes = Array.from(this.nodes.values());
    const activeNodes = allNodes.filter(n => n.status === 'sync');
    const lagging = allNodes.filter(n => n.status === 'lag');
    const offline = allNodes.filter(n => n.status === 'offline');

    const state = this.getConsensusState();
    const latencies: Record<string, number> = {};
    for (const n of allNodes) {
      latencies[n.id] = n.latencyMs;
    }

    return {
      globalConsensusPct: state.globalConsensus,
      bftAgreementPct: state.bftAgreement,
      participationPct: state.participation,
      blockStabilityPct: state.blockStability * 100,
      stateDivergence: state.stateDivergence,
      nodesActiveTotal: activeNodes.length,
      nodesLaggingTotal: lagging.length,
      nodesOfflineTotal: offline.length,
      proposalsActiveTotal: this.listProposals('voting').length,
      roundsTotal: this.roundsCompleted,
      votesTotal: { ...this.voteCounters },
      quorumReachedTotal: this.quorumReachedCount,
      nodeLatencies: latencies,
    };
  }

  // ═══ EVENTS ═══

  subscribe(eventType: EventType, handler: EventHandler): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subscriptions.set(id, { eventType, handler });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  private emit(eventType: EventType, data: Record<string, unknown>): void {
    const event: ConsensusEvent = { type: eventType, timestamp: new Date(), data };
    for (const sub of this.subscriptions.values()) {
      if (sub.eventType === eventType) {
        try { sub.handler(event); } catch { /* safety: don't let subscriber errors break tracker */ }
      }
    }
  }

  // ═══ PROPOSAL EXPIRY ═══

  private expireProposals(): void {
    for (const proposal of this.proposals.values()) {
      if (proposal.status !== 'voting') continue;
      const roundsSinceCreation = this.currentRound - proposal.round;
      if (roundsSinceCreation >= this.config.proposalTtlRounds) {
        proposal.status = 'expired';
      }
    }
  }

  // ═══ GETTERS ═══

  getCurrentRound(): number { return this.currentRound; }
  getCurrentEpoch(): number { return this.currentEpoch; }
  getConfig(): ConsensusConfig { return { ...this.config }; }
}
