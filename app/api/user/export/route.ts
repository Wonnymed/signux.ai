import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { getServiceSupabase } from '@/lib/user/service-client';
import { getConversationMessages } from '@/lib/conversation/manager';

export async function GET() {
  try {
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    const userId = user.id;
    const meta = (user.user_metadata || {}) as Record<string, unknown>;

    const { data: convoRows } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    const conversations = [];
    for (const c of convoRows || []) {
      const messages = await getConversationMessages(c.id as string, 500);
      conversations.push({ ...c, messages });
    }

    const { data: simulations } = await supabase
      .from('simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: facts } = await supabase.from('user_facts').select('*').eq('user_id', userId);

    const { data: decisionProfile } = await supabase
      .from('decision_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let behavioralProfile: unknown = null;
    const beh = await supabase
      .from('behavioral_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!beh.error) behavioralProfile = beh.data;

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        metadata: meta,
      },
      conversations,
      simulations: simulations || [],
      userFacts: facts || [],
      decisionProfile: decisionProfile || null,
      behavioralProfile,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="octux-export-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (e) {
    console.error('export:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
