import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/billing/stripe';
import { TIERS, type TierType } from '@/lib/billing/tiers';
import { createAuthServerClient } from '@/lib/auth/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { tier } = body as { tier: TierType };

    if (!tier || !TIERS[tier] || tier === 'free') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const config = TIERS[tier];
    if (!config.stripePriceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 400 });
    }

    const customerId = await getOrCreateCustomer(user.id, user.email!);
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const url = await createCheckoutSession({
      customerId,
      priceId: config.stripePriceId,
      userId: user.id,
      mode: 'subscription',
      successUrl: `${origin}/c?checkout=success&tier=${tier}`,
      cancelUrl: `${origin}/pricing?checkout=canceled`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
