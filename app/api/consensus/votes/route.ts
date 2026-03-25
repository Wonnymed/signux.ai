import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** POST /api/consensus/votes — Cast a vote */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const tracker = getTracker();

  try {
    tracker.castVote({
      nodeId: body.nodeId,
      proposalId: body.proposalId,
      round: body.round || tracker.getCurrentRound(),
      type: body.type || 'yes',
      timestamp: new Date(),
      signature: new Uint8Array(0), // Signature verification handled at transport layer
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
