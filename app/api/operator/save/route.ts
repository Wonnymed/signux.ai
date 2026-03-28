import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { ensureUserSubscription } from '@/lib/billing/usage';
import { normalizeOperatorProfile } from '@/lib/operator/defaults';
import { validateRequired } from '@/lib/operator/validation';
import { createClient } from '@supabase/supabase-js';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const claimReward = Boolean(body?.claimReward);
    const rawProfile = body?.profile as unknown;
    const profile = normalizeOperatorProfile(rawProfile);
    const { percent } = (await import('@/lib/operator/completeness')).calculateCompleteness(profile);

    const row = {
      user_id: user.id,
      profile: profile as unknown as Record<string, unknown>,
      operator_type: profile.operatorType,
      completeness: percent,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await auth.from('operator_profiles').upsert(row, { onConflict: 'user_id' });
    if (upErr) {
      console.error('operator save upsert:', upErr);
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    if (!claimReward) {
      return NextResponse.json({ saved: true, reward: 'none' as const });
    }

    const svc = serviceSupabase();
    if (!svc) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    await ensureUserSubscription(user.id);

    const { data: existing, error: readErr } = await svc
      .from('operator_profiles')
      .select('reward_claimed, profile')
      .eq('user_id', user.id)
      .maybeSingle();

    if (readErr) {
      console.error('operator save claim read:', readErr);
      return NextResponse.json({ saved: true, reward: 'error' as const });
    }

    if (existing?.reward_claimed) {
      return NextResponse.json({ saved: true, reward: 'already_claimed' as const });
    }

    const merged = normalizeOperatorProfile(existing?.profile ?? profile);
    Object.assign(merged, profile);
    const validation = validateRequired(merged);
    if (!validation.complete) {
      return NextResponse.json({
        saved: true,
        reward: 'incomplete' as const,
        missing: validation.missing,
      });
    }

    const { data: marked, error: markErr } = await svc
      .from('operator_profiles')
      .update({
        reward_claimed: true,
        reward_claimed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('reward_claimed', false)
      .select('user_id');

    if (markErr || !marked?.length) {
      return NextResponse.json({ saved: true, reward: 'already_claimed' as const });
    }

    const { data: sub } = await svc
      .from('user_subscriptions')
      .select('bonus_tokens')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ saved: true, reward: 'claimed' as const, tokensAdded: 1 });
    }

    const bonus = typeof sub.bonus_tokens === 'number' ? sub.bonus_tokens : 0;
    const { error: bonusErr } = await svc
      .from('user_subscriptions')
      .update({ bonus_tokens: bonus + 1 })
      .eq('user_id', user.id);

    if (bonusErr) {
      console.error('operator save bonus:', bonusErr);
    }

    return NextResponse.json({ saved: true, reward: 'claimed' as const, tokensAdded: 1 });
  } catch (e) {
    console.error('operator save:', e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
