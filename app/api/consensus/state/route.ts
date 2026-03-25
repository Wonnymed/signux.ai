import { NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** GET /api/consensus/state — Current consensus state */
export async function GET() {
  const tracker = getTracker();
  const state = tracker.getConsensusState();

  return NextResponse.json({
    epoch: state.epoch,
    round: state.round,
    activeNodes: state.activeNodes.length,
    proposals: state.proposals.length,
    globalConsensus: state.globalConsensus,
    bftAgreement: state.bftAgreement,
    participation: state.participation,
    blockStability: state.blockStability,
    stateDivergence: state.stateDivergence,
    quorumReached: state.quorumReached,
    updatedAt: state.updatedAt.toISOString(),
  });
}
