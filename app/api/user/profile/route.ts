import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';

export async function GET() {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    return NextResponse.json({
      userId: user.id,
      email: user.email ?? '',
      fullName: typeof meta.full_name === 'string' ? meta.full_name : '',
      displayName: typeof meta.display_name === 'string' ? meta.display_name : '',
      decisionContext: typeof meta.decision_context === 'string' ? meta.decision_context : '',
    });
  } catch (e) {
    console.error('profile GET:', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const fullName = typeof body.fullName === 'string' ? body.fullName : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName : '';
    const decisionContext = typeof body.decisionContext === 'string' ? body.decisionContext : '';

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        display_name: displayName,
        decision_context: decisionContext,
      },
    });

    if (error) {
      console.error('profile PATCH:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('profile PATCH:', e);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
