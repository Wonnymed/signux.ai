import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile, setUserOverride, removeUserOverride } from '@/lib/memory/behavioral';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

/**
 * GET — Read user's behavioral profile (inferred + overrides)
 * POST — Set or remove a user override
 */

export async function GET(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrCreateProfile(userId);

  return NextResponse.json({
    profile,
    labels: {
      risk_tolerance: profile.risk_tolerance < 0.3 ? 'Conservative' : profile.risk_tolerance > 0.7 ? 'Aggressive' : 'Moderate',
      speed_preference: profile.speed_preference < 0.3 ? 'Deliberate' : profile.speed_preference > 0.7 ? 'Action-biased' : 'Balanced',
      evidence_threshold: profile.evidence_threshold < 0.3 ? 'Intuitive' : profile.evidence_threshold > 0.7 ? 'Data-driven' : 'Balanced',
      optimism_bias: profile.optimism_bias < 0.3 ? 'Pessimistic' : profile.optimism_bias > 0.7 ? 'Optimistic' : 'Balanced',
      detail_preference: profile.detail_preference < 0.3 ? 'Executive summary' : profile.detail_preference > 0.7 ? 'Deep analysis' : 'Balanced',
      confidence_calibration: profile.confidence_calibration < 0.4 ? 'Overconfident (adjusting down)' : profile.confidence_calibration > 0.6 ? 'Too cautious (adjusting up)' : 'Well calibrated',
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const validParams = ['risk_tolerance', 'speed_preference', 'evidence_threshold', 'optimism_bias', 'detail_preference'];

  // confidence_calibration is NOT user-overridable — purely objective from Brier
  if (body.param === 'confidence_calibration') {
    return NextResponse.json({ error: 'Confidence calibration is auto-adjusted from outcome data and cannot be manually set.' }, { status: 400 });
  }

  if (body.action === 'set' && validParams.includes(body.param) && typeof body.value === 'number') {
    const updated = await setUserOverride(userId, body.param, body.value);
    return NextResponse.json({ success: true, profile: updated });
  }

  if (body.action === 'remove' && validParams.includes(body.param)) {
    await removeUserOverride(userId, body.param);
    const updated = await getOrCreateProfile(userId);
    return NextResponse.json({ success: true, profile: updated });
  }

  return NextResponse.json({ error: 'Invalid action or param' }, { status: 400 });
}
