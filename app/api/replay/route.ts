import { NextRequest, NextResponse } from 'next/server';
import { prepareReplay, compareVerdicts } from '@/lib/simulation/replay';

async function getUserId(req: NextRequest): Promise<string> {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'anonymous';
  const ua = req.headers.get('user-agent') || 'unknown';
  const fp = `${ip}-${ua}`.substring(0, 100);

  const encoder = new TextEncoder();
  const data = encoder.encode(fp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 36);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
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
