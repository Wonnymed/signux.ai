import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getAgentsByCategory, searchAgents, suggestAgentsForDomain } from '@/lib/agents/library';
import { createAuthServerClient } from '@/lib/auth/supabase-server';

async function getUser() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'profile';

  if (action === 'profile') {
    try {
      const { supabase, user } = await getUser();
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

      let { data } = await supabase
        .from('user_agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!data) {
        const { data: newRow } = await supabase
          .from('user_agents')
          .insert({ user_id: user.id })
          .select('*')
          .single();
        data = newRow;
      }

      return NextResponse.json({ data });
    } catch {
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  }

  if (action === 'categories') {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  }

  if (action === 'agents') {
    const categoryId = searchParams.get('category');
    if (!categoryId) return NextResponse.json({ error: 'category required' }, { status: 400 });
    const agents = await getAgentsByCategory(categoryId);
    return NextResponse.json({ agents });
  }

  if (action === 'search') {
    const query = searchParams.get('q') || '';
    const agents = await searchAgents(query);
    return NextResponse.json({ agents });
  }

  if (action === 'suggest') {
    const domain = searchParams.get('domain') || 'general';
    const agents = await suggestAgentsForDomain(domain);
    return NextResponse.json({ agents });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.joker_name !== undefined) updates.joker_name = body.joker_name;
    if (body.joker_role !== undefined) updates.joker_role = body.joker_role;
    if (body.joker_bio !== undefined) updates.joker_bio = body.joker_bio;
    if (body.joker_risk_tolerance !== undefined) updates.joker_risk_tolerance = body.joker_risk_tolerance;
    if (body.joker_priorities !== undefined) updates.joker_priorities = body.joker_priorities;
    if (body.joker_biases !== undefined) updates.joker_biases = body.joker_biases;
    if (body.joker_enabled !== undefined) updates.joker_enabled = body.joker_enabled;
    if (body.disabled_agents !== undefined) updates.disabled_agents = body.disabled_agents;

    if (body.agent_overrides) {
      const { data: current } = await supabase
        .from('user_agents')
        .select('agent_overrides')
        .eq('user_id', user.id)
        .single();

      updates.agent_overrides = {
        ...((current?.agent_overrides as Record<string, unknown>) || {}),
        ...(body.agent_overrides as Record<string, unknown>),
      };
    }

    const { error } = await supabase
      .from('user_agents')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
