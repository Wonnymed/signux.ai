import { NextRequest, NextResponse } from 'next/server';
import { prepareForFork, compareForkedVerdicts } from '@/lib/simulation/fork';

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
  const { originalSimId, modifications, action } = body;

  if (!originalSimId) {
    return NextResponse.json({ error: 'Missing originalSimId' }, { status: 400 });
  }

  if (action === 'prepare') {
    if (!modifications || !Array.isArray(modifications) || modifications.length === 0) {
      return NextResponse.json({ error: 'Missing or empty modifications array' }, { status: 400 });
    }

    const result = await prepareForFork(originalSimId, userId, modifications);
    if (!result) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });

    return NextResponse.json({
      modifiedQuestion: result.modifiedQuestion,
      originalQuestion: result.originalQuestion,
      forkedFrom: originalSimId,
      modifications,
    });
    // Frontend starts new sim with modifiedQuestion + forked_from + fork_modifications
  }

  if (action === 'compare') {
    const { forkSimId } = body;
    if (!forkSimId) {
      return NextResponse.json({ error: 'Missing forkSimId' }, { status: 400 });
    }
    const comparison = await compareForkedVerdicts(originalSimId, forkSimId);
    if (!comparison) return NextResponse.json({ error: 'Could not compare verdicts' }, { status: 404 });
    return NextResponse.json(comparison);
  }

  return NextResponse.json({ error: 'Invalid action. Use "prepare" or "compare"' }, { status: 400 });
}
