import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';

export async function GET() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ onboarding: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const userId = user.id;

  if (body.milestone) {
    // Add milestone to completed array
    await supabase.rpc('add_onboarding_milestone', {
      p_user_id: userId,
      p_milestone: body.milestone,
    });

    // Set timestamp for key milestones
    const timestampField: Record<string, string> = {
      first_message: 'first_conversation_at',
      first_simulation: 'first_simulation_at',
      first_verdict: 'first_verdict_at',
    };
    if (timestampField[body.milestone]) {
      await supabase
        .from('user_onboarding')
        .update({ [timestampField[body.milestone]]: new Date().toISOString() })
        .eq('user_id', userId);
    }
  }

  if (body.dismissTip) {
    await supabase.rpc('add_onboarding_tip_dismissed', {
      p_user_id: userId,
      p_tip: body.dismissTip,
    });
  }

  if (body.incrementCounter) {
    const counterField: Record<string, string> = {
      conversation: 'conversations_count',
      simulation: 'simulations_count',
      verdict: 'verdicts_seen',
      share: 'shares_count',
    };
    const field = counterField[body.incrementCounter];
    if (field) {
      await supabase.rpc('increment_onboarding_counter', {
        p_user_id: userId,
        p_field: field,
      });
    }
  }

  return NextResponse.json({ success: true });
}
