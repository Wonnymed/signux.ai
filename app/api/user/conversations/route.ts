import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { getServiceSupabase } from '@/lib/user/service-client';

/** Permanently delete all conversations (and messages) for the authenticated user. */
export async function DELETE() {
  try {
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    const { data: convos } = await supabase.from('conversations').select('id').eq('user_id', user.id);
    const ids = (convos || []).map((c: { id: string }) => c.id);

    if (ids.length) {
      const { error: msgErr } = await supabase.from('conversation_messages').delete().in('conversation_id', ids);
      if (msgErr) console.error('delete messages:', msgErr);
    }

    const { error: cErr } = await supabase.from('conversations').delete().eq('user_id', user.id);
    if (cErr) {
      console.error('delete conversations:', cErr);
      return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedCount: ids.length });
  } catch (e) {
    console.error('DELETE conversations:', e);
    return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
  }
}
