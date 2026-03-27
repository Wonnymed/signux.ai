import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { getServiceSupabase } from '@/lib/user/service-client';

const CONFIRM = 'DELETE MY ACCOUNT';

async function purgeUserData(userId: string) {
  const supabase = getServiceSupabase();

  const { data: convos } = await supabase.from('conversations').select('id').eq('user_id', userId);
  const convoIds = (convos || []).map((c: { id: string }) => c.id);
  if (convoIds.length) {
    await supabase.from('conversation_messages').delete().in('conversation_id', convoIds);
  }
  await supabase.from('conversations').delete().eq('user_id', userId);

  await supabase.from('user_facts').delete().eq('user_id', userId);
  await supabase.from('simulations').delete().eq('user_id', userId);
  await supabase.from('decision_profiles').delete().eq('user_id', userId);

  try {
    await supabase.from('behavioral_profiles').delete().eq('user_id', userId);
  } catch {
    /* optional table */
  }

  try {
    await supabase.from('token_log').delete().eq('user_id', userId);
    await supabase.from('token_balance').delete().eq('user_id', userId);
  } catch {
    /* optional */
  }

  await supabase.from('user_subscriptions').delete().eq('user_id', userId);

  try {
    await supabase.from('saved_panels').delete().eq('user_id', userId);
  } catch {
    /* optional */
  }
  try {
    await supabase.from('user_custom_agents').delete().eq('user_id', userId);
  } catch {
    /* optional */
  }
  try {
    await supabase.from('user_agents').delete().eq('user_id', userId);
  } catch {
    /* optional */
  }
}

/** Permanently delete the authenticated user and associated application data. */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== CONFIRM) {
      return NextResponse.json({ error: 'Confirmation phrase does not match' }, { status: 400 });
    }

    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    await purgeUserData(userId);

    const supabase = getServiceSupabase();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error('admin.deleteUser:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE account:', e);
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 });
  }
}
