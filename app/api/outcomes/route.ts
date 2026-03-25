import { NextRequest, NextResponse } from 'next/server';
import { recordOutcome, getCalibrationData } from '@/lib/memory/outcomes';
import { getUserIdFromRequest } from '@/lib/auth/supabase-client';

export async function POST(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  const body = await req.json();

  if (!body.experienceId || !body.outcome) {
    return NextResponse.json({ error: 'Missing experienceId or outcome' }, { status: 400 });
  }

  const validOutcomes = ['success', 'failure', 'partial', 'cancelled'];
  if (!validOutcomes.includes(body.outcome)) {
    return NextResponse.json({ error: 'Invalid outcome. Must be: success, failure, partial, or cancelled' }, { status: 400 });
  }

  try {
    const result = await recordOutcome(userId, {
      experienceId: body.experienceId,
      outcome: body.outcome,
      notes: body.notes ? String(body.notes).substring(0, 1000) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Outcome API error:', err);
    return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);

  try {
    const data = await getCalibrationData(userId);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Calibration API error:', err);
    return NextResponse.json({ error: 'Failed to get calibration data' }, { status: 500 });
  }
}
