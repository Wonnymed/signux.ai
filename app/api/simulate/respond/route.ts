import { NextRequest, NextResponse } from 'next/server';
import { resolveChiefInterventionResponse } from '@/lib/simulation/intervention-store';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      simulationId?: string;
      skip?: boolean;
      answer?: string;
    };
    const simulationId = String(body.simulationId || '').trim();
    if (!simulationId) {
      return NextResponse.json({ error: 'Missing simulationId' }, { status: 400 });
    }

    const skip = Boolean(body.skip);
    const answer = skip ? null : String(body.answer || '').trim() || null;

    const ok = resolveChiefInterventionResponse(simulationId, {
      answer,
      skipped: skip || !answer,
    });

    if (!ok) {
      return NextResponse.json({ error: 'No pending Chief check-in for this simulation' }, { status: 404 });
    }

    return NextResponse.json({ success: true, skipped: skip || !answer });
  } catch (err) {
    console.error('Chief respond API error:', err);
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 });
  }
}
