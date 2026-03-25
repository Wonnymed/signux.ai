import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, getStripe } from '@/lib/billing/stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TIERS, type TierType, getTierByPrice } from '@/lib/billing/tiers';

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === 'subscription') {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription);
          const priceId = subscription?.items?.data?.[0]?.price?.id;
          const tier = getTierByPrice(priceId || '');
          const tierConfig = TIERS[tier];

          await getSupabase()
            .from('user_subscriptions')
            .update({
              tier,
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer,
              tokens_used: 0,
              tokens_total: tierConfig.limits.tokensPerMonth,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const tier = getTierByPrice(priceId || '');

        await getSupabase()
          .from('user_subscriptions')
          .update({
            tier,
            stripe_price_id: priceId,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('user_id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await getSupabase()
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
            tokens_used: 0,
            tokens_total: TIERS.free.limits.tokensPerMonth,
          })
          .eq('user_id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        await getSupabase()
          .from('user_subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        if (invoice.billing_reason === 'subscription_cycle') {
          const customerId = invoice.customer;
          const { data: sub } = await getSupabase()
            .from('user_subscriptions')
            .select('user_id, tier')
            .eq('stripe_customer_id', customerId)
            .single();

          if (sub) {
            const tierConfig = TIERS[sub.tier as TierType] || TIERS.free;
            await getSupabase()
              .from('user_subscriptions')
              .update({
                tokens_used: 0,
                tokens_total: tierConfig.limits.tokensPerMonth,
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('user_id', sub.user_id);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
