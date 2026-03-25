import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** GET /api/consensus/proposals/:id — Proposal detail + votes */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tracker = getTracker();
  const proposal = tracker.getProposal(id);

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const votes = Array.from(proposal.votes.entries()).map(([nodeId, v]) => ({
    nodeId,
    type: v.type,
    round: v.round,
    timestamp: v.timestamp.toISOString(),
  }));

  return NextResponse.json({
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    proposerId: proposal.proposerId,
    round: proposal.round,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
    expiresAt: proposal.expiresAt.toISOString(),
    votes,
  });
}
