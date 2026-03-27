import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { createPortalSession } from '@/lib/billing/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let returnPath = '/settings/billing';
    try {
      const body = await request.json().catch(() => ({}));
      if (typeof body?.returnUrl === 'string' && body.returnUrl.startsWith('/')) {
        returnPath = body.returnUrl;
      }
    } catch {
      /* use default */
    }
    const url = await createPortalSession(sub.stripe_customer_id, `${origin}${returnPath}`);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
