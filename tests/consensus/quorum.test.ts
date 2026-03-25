import { describe, it, expect } from 'vitest';
import {
  calculateQuorumThreshold,
  calculateGlobalConsensus,
  calculateStateDivergence,
  calculateAgreementPct,
  calculateParticipationPct,
} from '@/lib/consensus/quorum';
import type { Node, Proposal, Vote } from '@/lib/consensus/types';

describe('Quorum Calculation', () => {
  it('calculates correct threshold for 4 nodes', () => {
    // floor(2*4/3) + 1 = floor(2.666) + 1 = 2 + 1 = 3
    expect(calculateQuorumThreshold(4)).toBe(3);
  });

  it('calculates correct threshold for 7 nodes', () => {
    // floor(2*7/3) + 1 = floor(4.666) + 1 = 4 + 1 = 5
    expect(calculateQuorumThreshold(7)).toBe(5);
  });

  it('calculates correct threshold for 8 nodes', () => {
    // floor(2*8/3) + 1 = floor(5.333) + 1 = 5 + 1 = 6
    expect(calculateQuorumThreshold(8)).toBe(6);
  });

  it('calculates correct threshold for 13 nodes', () => {
    // floor(2*13/3) + 1 = floor(8.666) + 1 = 8 + 1 = 9
    expect(calculateQuorumThreshold(13)).toBe(9);
  });

  it('returns 1 for 0 or negative nodes', () => {
    expect(calculateQuorumThreshold(0)).toBe(1);
    expect(calculateQuorumThreshold(-1)).toBe(1);
  });
});

describe('Consensus Score', () => {
  it('calculates correct global consensus with known values', () => {
    // agreement=80%, participation=100%, blockStability=1.0, stateDivergence=0
    // = 80*0.40 + 100*0.25 + 100*0.25 + 100*0.10 = 32 + 25 + 25 + 10 = 92
    const score = calculateGlobalConsensus(80, 100, 1.0, 0);
    expect(score).toBe(92);
  });

  it('calculates with degraded values', () => {
    // agreement=50%, participation=60%, blockStability=0.8, stateDivergence=0.3
    // = 50*0.40 + 60*0.25 + 80*0.25 + 70*0.10 = 20 + 15 + 20 + 7 = 62
    const score = calculateGlobalConsensus(50, 60, 0.8, 0.3);
    expect(score).toBe(62);
  });

  it('returns 0 for all-zero inputs', () => {
    // 0*0.40 + 0*0.25 + 0*0.25 + 100*0.10 = 10 (1-0=1, *100*0.10=10)
    const score = calculateGlobalConsensus(0, 0, 0, 0);
    expect(score).toBe(10); // (1-0)*100*0.10 = 10
  });
});

describe('State Divergence', () => {
  it('returns 0 for all sync nodes', () => {
    const nodes: Node[] = [
      { id: 'N1', name: 'A', status: 'sync', latencyMs: 10, lastSeen: new Date(), publicKey: 'pk1' },
      { id: 'N2', name: 'B', status: 'sync', latencyMs: 20, lastSeen: new Date(), publicKey: 'pk2' },
    ];
    expect(calculateStateDivergence(nodes)).toBe(0);
  });

  it('returns correct fraction for mixed statuses', () => {
    const nodes: Node[] = [
      { id: 'N1', name: 'A', status: 'sync', latencyMs: 10, lastSeen: new Date(), publicKey: 'pk1' },
      { id: 'N2', name: 'B', status: 'lag', latencyMs: 300, lastSeen: new Date(), publicKey: 'pk2' },
      { id: 'N3', name: 'C', status: 'offline', latencyMs: 0, lastSeen: new Date(), publicKey: 'pk3' },
      { id: 'N4', name: 'D', status: 'sync', latencyMs: 15, lastSeen: new Date(), publicKey: 'pk4' },
    ];
    // 2 divergent / 4 total = 0.5
    expect(calculateStateDivergence(nodes)).toBe(0.5);
  });

  it('returns 0 for empty nodes', () => {
    expect(calculateStateDivergence([])).toBe(0);
  });
});

describe('Agreement & Participation', () => {
  function makeProposal(votes: Record<string, string>): Proposal {
    const voteMap = new Map<string, Vote>();
    for (const [nodeId, type] of Object.entries(votes)) {
      voteMap.set(nodeId, {
        nodeId, proposalId: 'p1', round: 1,
        type: type as any, timestamp: new Date(), signature: new Uint8Array(0),
      });
    }
    return {
      id: 'p1', title: 'Test', description: '', proposerId: 'N1',
      round: 1, createdAt: new Date(), expiresAt: new Date(), status: 'voting', votes: voteMap,
    };
  }

  it('calculates agreement percentage', () => {
    const proposal = makeProposal({ N1: 'yes', N2: 'yes', N3: 'no' });
    // 2 yes / 4 active = 50%
    expect(calculateAgreementPct(proposal, 4)).toBe(50);
  });

  it('calculates participation percentage', () => {
    const proposal = makeProposal({ N1: 'yes', N2: 'no', N3: 'abstain' });
    // 3 non-pending / 5 active = 60%
    expect(calculateParticipationPct(proposal, 5)).toBe(60);
  });
});
