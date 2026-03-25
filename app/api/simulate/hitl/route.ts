import { NextRequest, NextResponse } from 'next/server';
import { hitlStore } from '@/lib/simulation/hitl-store';
import type { HITLResponse } from '@/lib/simulation/hitl';

export async function POST(req: NextRequest) {
  try {
    const { simulationId, action, correction } = await req.json();

    if (!simulationId || !action) {
      return NextResponse.json({ error: 'Missing simulationId or action' }, { status: 400 });
    }

    const pending = hitlStore.get(simulationId);
    if (!pending) {
      return NextResponse.json({ error: 'No pending checkpoint for this simulation' }, { status: 404 });
    }

    clearTimeout(pending.timeout);

    const response: HITLResponse = {
      action: action as 'confirm' | 'correct' | 'skip',
      correction: action === 'correct' ? String(correction || '').substring(0, 2000) : undefined,
      timestamp: Date.now(),
    };

    pending.resolve(response);
    hitlStore.delete(simulationId);

    return NextResponse.json({ success: true, action: response.action });
  } catch (err) {
    console.error('HITL API error:', err);
    return NextResponse.json({ error: 'Failed to process HITL response' }, { status: 500 });
  }
}
