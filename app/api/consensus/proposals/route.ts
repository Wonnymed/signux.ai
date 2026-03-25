import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';
import type { ProposalStatus } from '@/lib/consensus/types';

/** GET /api/consensus/proposals — List proposals (optional ?status=voting) */
export async function GET(req: NextRequest) {
  const tracker = getTracker();
  const status = req.nextUrl.searchParams.get('status') as ProposalStatus | null;
  const proposals = tracker.listProposals(status || undefined);

  return NextResponse.json(proposals.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    proposerId: p.proposerId,
    round: p.round,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt.toISOString(),
    voteCount: p.votes.size,
  })));
}

/** POST /api/consensus/proposals — Submit a new proposal */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const tracker = getTracker();

  try {
    tracker.submitProposal({
      id: body.id || `prop_${Date.now()}`,
      title: body.title,
      description: body.description || '',
      proposerId: body.proposerId,
      round: tracker.getCurrentRound(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min default
      status: 'voting',
      votes: new Map(),
    });
    return NextResponse.json({ ok: true, proposalId: body.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
