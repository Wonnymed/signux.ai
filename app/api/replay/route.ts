import { NextRequest, NextResponse } from 'next/server';
import { prepareReplay, compareVerdicts } from '@/lib/simulation/replay';
import { getUserIdFromRequest } from '@/lib/auth/supabase-client';

export async function POST(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  const body = await req.json();
  const { simulationId, action } = body;

  if (!simulationId) {
    return NextResponse.json({ error: 'Missing simulationId' }, { status: 400 });
  }

  if (action === 'prepare') {
    const data = await prepareReplay(userId, simulationId);
    if (!data) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    return NextResponse.json(data);
    // Frontend then calls /api/simulate/stream with the question + replay_of=simulationId
  }

  if (action === 'compare') {
    const { replaySimId } = body;
    if (!replaySimId) {
      return NextResponse.json({ error: 'Missing replaySimId' }, { status: 400 });
    }
    const comparison = await compareVerdicts(simulationId, replaySimId, userId);
    if (!comparison) return NextResponse.json({ error: 'Could not compare verdicts' }, { status: 404 });
    return NextResponse.json(comparison);
  }

  return NextResponse.json({ error: 'Invalid action. Use "prepare" or "compare"' }, { status: 400 });
}
