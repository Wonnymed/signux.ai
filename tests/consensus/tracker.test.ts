import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusTracker } from '@/lib/consensus/tracker';
import type { Node, Vote, Proposal, ConsensusEvent } from '@/lib/consensus/types';

function makeNode(id: string, name?: string): Node {
  return {
    id, name: name || id, status: 'sync',
    latencyMs: 10, lastSeen: new Date(), publicKey: `pk_${id}`,
  };
}

function makeVote(nodeId: string, proposalId: string, type: 'yes' | 'no' | 'abstain' = 'yes', round = 1): Vote {
  return {
    nodeId, proposalId, round, type,
    timestamp: new Date(), signature: new Uint8Array(0),
  };
}

function makeProposal(id: string, round = 1): Proposal {
  return {
    id, title: `Proposal ${id}`, description: '', proposerId: 'N1',
    round, createdAt: new Date(), expiresAt: new Date(Date.now() + 60000),
    status: 'voting', votes: new Map(),
  };
}

describe('ConsensusTracker', () => {
  let tracker: ConsensusTracker;

  beforeEach(() => {
    tracker = new ConsensusTracker();
  });

  // ═══ NODE MANAGEMENT ═══

  describe('Node Management', () => {
    it('registers and retrieves nodes', () => {
      tracker.registerNode(makeNode('N1', 'Alpha'));
      tracker.registerNode(makeNode('N2', 'Beta'));
      expect(tracker.getActiveNodes()).toHaveLength(2);
    });

    it('rejects node without id', () => {
      expect(() => tracker.registerNode({ ...makeNode(''), id: '' })).toThrow();
    });

    it('removes nodes', () => {
      tracker.registerNode(makeNode('N1'));
      tracker.removeNode('N1');
      expect(tracker.getActiveNodes()).toHaveLength(0);
    });

    it('throws when removing non-existent node', () => {
      expect(() => tracker.removeNode('N999')).toThrow();
    });
  });

  // ═══ NODE STATUS TRANSITIONS ═══

  describe('Node Status Transitions', () => {
    it('transitions sync → lag when latency exceeds threshold', () => {
      tracker.registerNode(makeNode('N1'));
      tracker.updateNodeStatus('N1', 'sync', 300); // > 200ms default threshold
      const nodes = tracker.getAllNodes();
      expect(nodes[0].status).toBe('lag');
    });

    it('stays sync when latency is below threshold', () => {
      tracker.registerNode(makeNode('N1'));
      tracker.updateNodeStatus('N1', 'sync', 100);
      const nodes = tracker.getAllNodes();
      expect(nodes[0].status).toBe('sync');
    });

    it('sets offline status directly', () => {
      tracker.registerNode(makeNode('N1'));
      tracker.updateNodeStatus('N1', 'offline', 0);
      expect(tracker.getActiveNodes()).toHaveLength(0);
      expect(tracker.getAllNodes()[0].status).toBe('offline');
    });
  });

  // ═══ PROPOSAL MANAGEMENT ═══

  describe('Proposal Management', () => {
    it('submits and retrieves proposals', () => {
      tracker.submitProposal(makeProposal('P1'));
      expect(tracker.getProposal('P1')).not.toBeNull();
      expect(tracker.listProposals('voting')).toHaveLength(1);
    });

    it('rejects duplicate proposal ids', () => {
      tracker.submitProposal(makeProposal('P1'));
      expect(() => tracker.submitProposal(makeProposal('P1'))).toThrow();
    });

    it('filters proposals by status', () => {
      tracker.submitProposal(makeProposal('P1'));
      tracker.submitProposal(makeProposal('P2'));
      expect(tracker.listProposals('voting')).toHaveLength(2);
      expect(tracker.listProposals('passed')).toHaveLength(0);
    });
  });

  // ═══ PROPOSAL EXPIRY ═══

  describe('Proposal Expiry', () => {
    it('expires proposals after TTL rounds', () => {
      tracker.submitProposal(makeProposal('P1', 0));
      // Advance 11 rounds (TTL = 10)
      for (let i = 0; i < 11; i++) tracker.startRound();
      const proposal = tracker.getProposal('P1');
      expect(proposal?.status).toBe('expired');
    });

    it('does not expire proposals within TTL', () => {
      tracker.submitProposal(makeProposal('P1', 0));
      for (let i = 0; i < 5; i++) tracker.startRound();
      const proposal = tracker.getProposal('P1');
      expect(proposal?.status).toBe('voting');
    });
  });

  // ═══ VOTING & QUORUM ═══

  describe('Voting & Quorum', () => {
    it('casts votes and detects quorum', () => {
      // 4 nodes, threshold = 3
      ['N1', 'N2', 'N3', 'N4'].forEach(id => tracker.registerNode(makeNode(id)));
      tracker.submitProposal(makeProposal('P1'));

      tracker.castVote(makeVote('N1', 'P1'));
      expect(tracker.isQuorumReached('P1')).toBe(false);

      tracker.castVote(makeVote('N2', 'P1'));
      expect(tracker.isQuorumReached('P1')).toBe(false);

      tracker.castVote(makeVote('N3', 'P1'));
      expect(tracker.isQuorumReached('P1')).toBe(true);
      expect(tracker.getProposal('P1')?.status).toBe('passed');
    });

    it('rejects vote for non-existent node', () => {
      tracker.submitProposal(makeProposal('P1'));
      expect(() => tracker.castVote(makeVote('N999', 'P1'))).toThrow();
    });

    it('rejects vote for non-existent proposal', () => {
      tracker.registerNode(makeNode('N1'));
      expect(() => tracker.castVote(makeVote('N1', 'P999'))).toThrow();
    });

    it('rejects proposal when impossible to reach quorum', () => {
      // 4 nodes, threshold = 3. If 2 vote no, only 2 remain → can't reach 3
      ['N1', 'N2', 'N3', 'N4'].forEach(id => tracker.registerNode(makeNode(id)));
      tracker.submitProposal(makeProposal('P1'));

      tracker.castVote(makeVote('N1', 'P1', 'no'));
      tracker.castVote(makeVote('N2', 'P1', 'no'));
      expect(tracker.getProposal('P1')?.status).toBe('rejected');
    });
  });

  // ═══ FULL ROUND CYCLE (INTEGRATION) ═══

  describe('Full Round Cycle', () => {
    it('nodes register, vote, proposal passes, state updates', () => {
      const nodes = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'];
      nodes.forEach(id => tracker.registerNode(makeNode(id)));

      tracker.startRound();
      tracker.submitProposal(makeProposal('P1', tracker.getCurrentRound()));

      // 5 of 7 vote yes (threshold = floor(14/3)+1 = 5)
      ['N1', 'N2', 'N3', 'N4', 'N5'].forEach(id =>
        tracker.castVote(makeVote(id, 'P1', 'yes', tracker.getCurrentRound()))
      );

      expect(tracker.getProposal('P1')?.status).toBe('passed');

      const state = tracker.getConsensusState();
      expect(state.quorumReached).toBe(false); // P1 is 'passed', not 'voting' anymore
      expect(state.round).toBe(1);
    });
  });

  // ═══ BFT TOLERANCE (INTEGRATION) ═══

  describe('Byzantine Fault Tolerance', () => {
    it('reaches consensus with floor(n/3) malicious nodes', () => {
      // 7 nodes → can tolerate floor(7/3) = 2 Byzantine
      // threshold = floor(14/3)+1 = 5
      const nodes = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'];
      nodes.forEach(id => tracker.registerNode(makeNode(id)));
      tracker.submitProposal(makeProposal('P1'));

      // 2 Byzantine nodes vote no
      tracker.castVote(makeVote('N1', 'P1', 'no'));
      tracker.castVote(makeVote('N2', 'P1', 'no'));

      // 5 honest nodes vote yes → quorum reached
      ['N3', 'N4', 'N5', 'N6', 'N7'].forEach(id =>
        tracker.castVote(makeVote(id, 'P1'))
      );

      expect(tracker.getProposal('P1')?.status).toBe('passed');
    });

    it('fails to reach consensus when > floor(n/3) are Byzantine', () => {
      // 7 nodes, threshold = 5.
      // 3 Byzantine vote no → yes=0, no=3, voted=3, remaining=4, 0+4=4 < 5 → rejected
      const nodes = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'];
      nodes.forEach(id => tracker.registerNode(makeNode(id)));
      tracker.submitProposal(makeProposal('P1'));

      // 3 Byzantine vote no
      tracker.castVote(makeVote('N1', 'P1', 'no'));
      tracker.castVote(makeVote('N2', 'P1', 'no'));
      tracker.castVote(makeVote('N3', 'P1', 'no'));

      // After 3 no votes: 0 yes + 4 remaining = 4 < threshold(5) → rejected
      expect(tracker.getProposal('P1')?.status).toBe('rejected');
    });
  });

  // ═══ AGREEMENT MATRIX ═══

  describe('Agreement Matrix', () => {
    it('computes correct matrix with known vote history', () => {
      ['N1', 'N2', 'N3'].forEach(id => tracker.registerNode(makeNode(id)));

      // Submit proposals and cast votes across multiple rounds
      for (let r = 1; r <= 5; r++) {
        tracker.startRound();
        const pid = `P${r}`;
        tracker.submitProposal(makeProposal(pid, r));
        // N1 and N2 always agree, N3 always disagrees
        tracker.castVote(makeVote('N1', pid, 'yes', r));
        tracker.castVote(makeVote('N2', pid, 'yes', r));
        tracker.castVote(makeVote('N3', pid, 'no', r));
      }

      const matrix = tracker.getAgreementMatrix();
      expect(matrix.nodeIds).toHaveLength(3);

      const n1i = matrix.nodeIds.indexOf('N1');
      const n2i = matrix.nodeIds.indexOf('N2');
      const n3i = matrix.nodeIds.indexOf('N3');

      // N1-N2: always same → agree
      expect(matrix.matrix[n1i][n2i]).toBe('agree');
      // N1-N3: always different → conflict
      expect(matrix.matrix[n1i][n3i]).toBe('conflict');
      // Diagonal → self
      expect(matrix.matrix[n1i][n1i]).toBe('self');
    });
  });

  // ═══ EVENTS ═══

  describe('Events', () => {
    it('emits and receives events', () => {
      const events: ConsensusEvent[] = [];
      tracker.subscribe('node.joined', (e) => events.push(e));
      tracker.registerNode(makeNode('N1'));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('node.joined');
    });

    it('unsubscribes correctly', () => {
      const events: ConsensusEvent[] = [];
      const subId = tracker.subscribe('node.joined', (e) => events.push(e));
      tracker.registerNode(makeNode('N1'));
      tracker.unsubscribe(subId);
      tracker.registerNode(makeNode('N2'));
      expect(events).toHaveLength(1); // only N1's event
    });

    it('emits quorum.reached on passing', () => {
      const events: ConsensusEvent[] = [];
      tracker.subscribe('quorum.reached', (e) => events.push(e));

      ['N1', 'N2', 'N3', 'N4'].forEach(id => tracker.registerNode(makeNode(id)));
      tracker.submitProposal(makeProposal('P1'));
      ['N1', 'N2', 'N3'].forEach(id => tracker.castVote(makeVote(id, 'P1')));

      expect(events).toHaveLength(1);
    });
  });

  // ═══ METRICS ═══

  describe('Metrics', () => {
    it('returns correct metric counts', () => {
      ['N1', 'N2', 'N3', 'N4', 'N5'].forEach(id => tracker.registerNode(makeNode(id)));
      tracker.updateNodeStatus('N5', 'lag', 300);
      tracker.submitProposal(makeProposal('P1'));
      tracker.castVote(makeVote('N1', 'P1', 'yes'));
      tracker.castVote(makeVote('N2', 'P1', 'no'));

      const metrics = tracker.getMetrics();
      expect(metrics.nodesActiveTotal).toBe(4); // N1-N4 sync
      expect(metrics.nodesLaggingTotal).toBe(1); // N5 lag
      expect(metrics.proposalsActiveTotal).toBe(1); // still voting (5 active, threshold=4, 1 yes)
      expect(metrics.votesTotal.yes).toBe(1);
      expect(metrics.votesTotal.no).toBe(1);
    });
  });

  // ═══ ROUND TIMEOUT ═══

  describe('Round Timeout', () => {
    it('advances rounds even with unresponsive nodes', () => {
      ['N1', 'N2', 'N3'].forEach(id => tracker.registerNode(makeNode(id)));

      tracker.startRound(); // round 1
      tracker.submitProposal(makeProposal('P1', tracker.getCurrentRound()));

      // Only N1 votes, then round completes
      tracker.castVote(makeVote('N1', 'P1'));
      tracker.completeRound();
      tracker.startRound(); // round 2

      expect(tracker.getCurrentRound()).toBe(2);
      // Proposal still voting (no quorum — 1 yes of 3 active, threshold=3)
      expect(tracker.getProposal('P1')?.status).toBe('voting');
    });
  });
});
