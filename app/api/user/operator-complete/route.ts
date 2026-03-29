import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { grantOperatorOnboardingBonus } from '@/lib/billing/usage';

export type OperatorCompleteBody = {
  name: string;
  location: string;
  operatorType: string;
  industry?: string;
  decisionContext?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Partial<OperatorCompleteBody>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const operatorType = typeof body.operatorType === 'string' ? body.operatorType.trim() : '';
    const industry = typeof body.industry === 'string' ? body.industry.trim() : '';
    const decisionContext = typeof body.decisionContext === 'string' ? body.decisionContext.trim() : '';

    if (!name || !location || !operatorType) {
      return NextResponse.json({ error: 'name, location, and operatorType are required' }, { status: 400 });
    }

    const meta = { ...(user.user_metadata || {}) } as Record<string, unknown>;
    const alreadyRewarded = meta.operator_reward_claimed === true;

    let bonusGranted = false;
    if (!alreadyRewarded) {
      const grant = await grantOperatorOnboardingBonus(user.id);
      if (!grant.ok) {
        return NextResponse.json({ error: grant.error || 'bonus_failed' }, { status: 500 });
      }
      bonusGranted = true;
      meta.operator_reward_claimed = true;
    }

    meta.full_name = name;
    meta.display_name = name;
    meta.operator_location = location;
    meta.operator_type = operatorType;
    meta.operator_industry = industry;
    if (decisionContext) meta.decision_context = decisionContext;
    meta.operator_setup_completed_at = new Date().toISOString();

    const { error } = await supabase.auth.updateUser({ data: meta as Record<string, unknown> });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, bonusGranted });
  } catch (e) {
    console.error('operator-complete:', e);
    return NextResponse.json({ error: 'Failed to save operator profile' }, { status: 500 });
  }
}
