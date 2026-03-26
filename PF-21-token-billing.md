# PF-21 — Token Billing System (Stripe + Database)

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion + Supabase + Stripe.

**Ref:** Linear (simple per-seat pricing), Perplexity (usage-based with clear limits), Claude.ai (tier selector inline)

**What exists:**
- `useBillingStore` (PF-03): tier, tokensRemaining, tokensTotal, consumeTokens, canAfford
- Token pricing decided: Free(1t/$0), Pro(8t/$29), Max(25t/$99), Octopus(70t/$249)
- 1 token = 1 Deep sim, 8 tokens = 1 Kraken sim
- ChatInput tier pills with lock icons on unaffordable tiers (PF-06)
- UpgradeMessage component renders when tokens depleted (PF-07)
- AuthModal (PF-20) handles sign-in before upgrade
- Sidebar shows "Upgrade to Pro" + token count
- Backend `tierGate` middleware concept exists but not wired

**What this prompt builds:**

Complete billing system:
1. Database: `user_subscriptions` table in Supabase
2. API: `/api/billing/checkout` — create Stripe checkout session
3. API: `/api/billing/portal` — Stripe customer portal (manage/cancel)
4. API: `/api/billing/balance` — GET current token balance
5. API: `/api/webhooks/stripe` — handle subscription events + token reset
6. Middleware: `tierGate()` — check tokens before simulation
7. Component: `TokenBalance` — compact display in sidebar + input
8. Component: `UpgradeModal` — upgrade flow with tier comparison
9. Hydrate `useBillingStore` from API on app load

---

## Part A — Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- User subscriptions and billing
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Tier
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'max', 'octopus')),
  
  -- Tokens
  tokens_total INTEGER NOT NULL DEFAULT 1,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_reset_at TIMESTAMPTZ, -- next reset date (monthly)
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_sub ON user_subscriptions(stripe_subscription_id);

-- Auto-create free subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier, tokens_total, tokens_used, status)
  VALUES (NEW.id, 'free', 1, 0, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- Token consumption function (atomic, prevents race conditions)
CREATE OR REPLACE FUNCTION consume_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_sub user_subscriptions%ROWTYPE;
  v_remaining INTEGER;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_sub FROM user_subscriptions 
  WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No subscription found');
  END IF;
  
  v_remaining := v_sub.tokens_total - v_sub.tokens_used;
  
  IF v_remaining < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient tokens',
      'remaining', v_remaining,
      'required', p_amount
    );
  END IF;
  
  UPDATE user_subscriptions 
  SET tokens_used = tokens_used + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tokens_used', v_sub.tokens_used + p_amount,
    'tokens_total', v_sub.tokens_total,
    'remaining', v_remaining - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only server (service role) can update subscriptions
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Part B — Tier Configuration

CREATE `lib/billing/tiers.ts`:

```typescript
export interface TierConfig {
  id: string;
  name: string;
  price: number;           // monthly USD
  tokens: number;          // tokens per month
  stripePriceId: string;   // Stripe price ID (set in env)
  features: string[];
  limits: {
    inkChatsPerDay: number;
    hasWebSearch: boolean;
    hasCitations: boolean;
    hasAgentChat: boolean;
    hasPdfExport: boolean;
    hasMemory: boolean;
    hasApi: boolean;
    hasCustomAgents: boolean;
  };
}

export const TIERS: Record<string, TierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tokens: 1,
    stripePriceId: '',
    features: ['1 simulation token/month', '5 Ink chats/day', 'Full verdict with probability'],
    limits: {
      inkChatsPerDay: 5,
      hasWebSearch: false,
      hasCitations: false,
      hasAgentChat: false,
      hasPdfExport: false,
      hasMemory: false,
      hasApi: false,
      hasCustomAgents: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    tokens: 8,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    features: ['8 tokens/month (1 Deep = 1 token)', 'Unlimited Ink chat', 'Citations + agent chat'],
    limits: {
      inkChatsPerDay: Infinity,
      hasWebSearch: false,
      hasCitations: true,
      hasAgentChat: true,
      hasPdfExport: false,
      hasMemory: false,
      hasApi: false,
      hasCustomAgents: false,
    },
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 99,
    tokens: 25,
    stripePriceId: process.env.STRIPE_PRICE_MAX || '',
    features: ['25 tokens/month (1 Kraken = 8)', 'Web search + heatmap', 'PDF export + permanent memory'],
    limits: {
      inkChatsPerDay: Infinity,
      hasWebSearch: true,
      hasCitations: true,
      hasAgentChat: true,
      hasPdfExport: true,
      hasMemory: true,
      hasApi: false,
      hasCustomAgents: false,
    },
  },
  octopus: {
    id: 'octopus',
    name: 'Octopus',
    price: 249,
    tokens: 70,
    stripePriceId: process.env.STRIPE_PRICE_OCTOPUS || '',
    features: ['70 tokens/month', 'API access + custom agents', 'All features unlocked'],
    limits: {
      inkChatsPerDay: Infinity,
      hasWebSearch: true,
      hasCitations: true,
      hasAgentChat: true,
      hasPdfExport: true,
      hasMemory: true,
      hasApi: true,
      hasCustomAgents: true,
    },
  },
};

/** Token cost per simulation type */
export const TOKEN_COSTS = {
  deep: 1,
  kraken: 8,
} as const;

/** Get tier config by name */
export function getTier(tier: string): TierConfig {
  return TIERS[tier] || TIERS.free;
}

/** Get suggested upgrade tier based on what user needs */
export function getSuggestedUpgrade(currentTier: string): string {
  if (currentTier === 'free') return 'pro';
  if (currentTier === 'pro') return 'max';
  if (currentTier === 'max') return 'octopus';
  return 'octopus';
}
```

---

## Part C — Stripe Helpers

CREATE `lib/billing/stripe.ts`:

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * Get or create a Stripe customer for a Supabase user.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string,
): Promise<string> {
  // Check if customer already exists in our DB
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = createClient();

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (sub?.stripe_customer_id) {
    return sub.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { supabase_user_id: userId },
  });

  // Save to DB
  await supabase
    .from('user_subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', userId);

  return customer.id;
}
```

---

## Part D — API: Checkout Session

CREATE `app/api/billing/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe, getOrCreateCustomer } from '@/lib/billing/stripe';
import { TIERS } from '@/lib/billing/tiers';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tier } = await req.json();

    if (!tier || !TIERS[tier] || tier === 'free') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const tierConfig = TIERS[tier];
    if (!tierConfig.stripePriceId) {
      return NextResponse.json({ error: 'Stripe price not configured for this tier' }, { status: 500 });
    }

    const customerId = await getOrCreateCustomer(user.id, user.email || '', user.user_metadata?.full_name);

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (existingSub?.stripe_subscription_id) {
      // User already has a subscription — redirect to portal to change plan
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.nextUrl.origin}/`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // Create new checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/?billing=success&tier=${tier}`,
      cancel_url: `${req.nextUrl.origin}/?billing=canceled`,
      metadata: {
        supabase_user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
```

---

## Part E — API: Customer Portal

CREATE `app/api/billing/portal/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
```

---

## Part F — API: Token Balance

CREATE `app/api/billing/balance/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('tier, tokens_total, tokens_used, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .single();

    if (!sub) {
      // Create default free subscription
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: user.id, tier: 'free', tokens_total: 1, tokens_used: 0, status: 'active' })
        .select()
        .single();

      return NextResponse.json({
        tier: 'free',
        tokensTotal: 1,
        tokensUsed: 0,
        tokensRemaining: 1,
        status: 'active',
        periodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return NextResponse.json({
      tier: sub.tier,
      tokensTotal: sub.tokens_total,
      tokensUsed: sub.tokens_used,
      tokensRemaining: sub.tokens_total - sub.tokens_used,
      status: sub.status,
      periodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Balance error:', error);
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
```

---

## Part G — Stripe Webhook

CREATE `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/stripe';
import { TIERS } from '@/lib/billing/tiers';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;
  if (!userId || !tier) return;

  const tierConfig = TIERS[tier];
  if (!tierConfig) return;

  await supabase
    .from('user_subscriptions')
    .update({
      tier,
      tokens_total: tierConfig.tokens,
      tokens_used: 0,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const tier = Object.entries(TIERS).find(([_, t]) => t.stripePriceId === priceId)?.[0] || 'free';
  const tierConfig = TIERS[tier];

  await supabase
    .from('user_subscriptions')
    .update({
      tier,
      tokens_total: tierConfig.tokens,
      stripe_price_id: priceId,
      status: subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  // Downgrade to free
  await supabase
    .from('user_subscriptions')
    .update({
      tier: 'free',
      tokens_total: 1,
      tokens_used: 0,
      stripe_subscription_id: null,
      stripe_price_id: null,
      status: 'active',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Reset tokens on successful payment (monthly renewal)
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('user_id, tier')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!sub) return;

  const tierConfig = TIERS[sub.tier];

  await supabase
    .from('user_subscriptions')
    .update({
      tokens_used: 0,
      tokens_total: tierConfig.tokens,
      tokens_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', sub.user_id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await supabase
    .from('user_subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId);
}
```

---

## Part H — Tier Gate Middleware

CREATE `lib/billing/tierGate.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { TOKEN_COSTS } from '@/lib/billing/tiers';

interface TierGateResult {
  allowed: boolean;
  tier: string;
  tokensRemaining: number;
  tokensRequired: number;
  error?: string;
  suggestedTier?: string;
}

/**
 * Check if user can afford a simulation.
 * Call this BEFORE starting any simulation.
 */
export async function tierGate(
  userId: string,
  simType: 'deep' | 'kraken',
): Promise<TierGateResult> {
  const supabase = createClient();
  const cost = TOKEN_COSTS[simType];

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier, tokens_total, tokens_used, status')
    .eq('user_id', userId)
    .single();

  if (!sub) {
    return {
      allowed: false,
      tier: 'free',
      tokensRemaining: 0,
      tokensRequired: cost,
      error: 'No subscription found',
      suggestedTier: 'pro',
    };
  }

  if (sub.status === 'past_due') {
    return {
      allowed: false,
      tier: sub.tier,
      tokensRemaining: sub.tokens_total - sub.tokens_used,
      tokensRequired: cost,
      error: 'Payment past due. Please update your payment method.',
    };
  }

  const remaining = sub.tokens_total - sub.tokens_used;

  if (remaining < cost) {
    const suggested = sub.tier === 'free' ? 'pro' : sub.tier === 'pro' ? 'max' : 'octopus';
    return {
      allowed: false,
      tier: sub.tier,
      tokensRemaining: remaining,
      tokensRequired: cost,
      error: `Need ${cost} token${cost > 1 ? 's' : ''}, have ${remaining}`,
      suggestedTier: suggested,
    };
  }

  return {
    allowed: true,
    tier: sub.tier,
    tokensRemaining: remaining,
    tokensRequired: cost,
  };
}

/**
 * Consume tokens after successful simulation.
 * Uses atomic SQL function to prevent race conditions.
 */
export async function consumeTokens(
  userId: string,
  simType: 'deep' | 'kraken',
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const supabase = createClient();
  const cost = TOKEN_COSTS[simType];

  const { data, error } = await supabase.rpc('consume_tokens', {
    p_user_id: userId,
    p_amount: cost,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    remaining: data?.remaining,
    error: data?.error,
  };
}
```

---

## Part I — Hydrate Billing Store on App Load

UPDATE `hooks/useHydrate.ts` (or wherever stores are hydrated):

```typescript
// Add billing hydration:
import { useBillingStore } from '@/lib/store/billing';

// Inside the hydration effect:
useEffect(() => {
  if (!isLoggedIn) return;

  // Fetch billing balance
  fetch('/api/billing/balance')
    .then(res => res.json())
    .then(data => {
      if (data.tier) {
        useBillingStore.setState({
          tier: data.tier,
          tokensTotal: data.tokensTotal,
          tokensUsed: data.tokensUsed,
          tokensRemaining: data.tokensRemaining,
          status: data.status,
          periodEnd: data.periodEnd,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        });
      }
    })
    .catch(console.error);
}, [isLoggedIn]);
```

---

## Part J — UpgradeModal Component

CREATE `components/billing/UpgradeModal.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { TIERS, getSuggestedUpgrade } from '@/lib/billing/tiers';
import { useBillingStore } from '@/lib/store/billing';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  suggestedTier?: string;
}

export default function UpgradeModal({ open, onClose, reason, suggestedTier }: UpgradeModalProps) {
  const currentTier = useBillingStore((s) => s.tier);
  const [loading, setLoading] = useState<string | null>(null);

  const recommended = suggestedTier || getSuggestedUpgrade(currentTier);

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        console.error('Checkout error:', error);
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  };

  const upgradeTiers = Object.values(TIERS).filter(t => t.id !== 'free' && t.id !== currentTier);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-surface-overlay/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative z-10 w-full max-w-2xl mx-4"
          >
            <div className="bg-surface-raised border border-border-subtle rounded-2xl shadow-xl overflow-hidden">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-txt-disabled hover:text-txt-tertiary hover:bg-surface-2 transition-colors z-10"
              >
                <X size={16} />
              </button>

              <div className="px-6 pt-8 pb-6">
                <div className="text-center mb-6">
                  <Zap size={24} className="text-accent mx-auto mb-2" />
                  <h2 className="text-lg font-medium text-txt-primary">Unlock more analysis power</h2>
                  {reason && (
                    <p className="text-xs text-txt-tertiary mt-1">{reason}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {upgradeTiers.map((tier) => {
                    const isRecommended = tier.id === recommended;
                    return (
                      <div
                        key={tier.id}
                        className={cn(
                          'rounded-xl border p-4 flex flex-col',
                          isRecommended
                            ? 'border-accent/30 bg-accent-subtle/5'
                            : 'border-border-subtle bg-surface-1',
                        )}
                      >
                        {isRecommended && (
                          <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                            Recommended
                          </span>
                        )}
                        <h3 className={cn('text-sm font-medium', isRecommended ? 'text-accent' : 'text-txt-primary')}>
                          {tier.name}
                        </h3>
                        <div className="flex items-baseline gap-0.5 mt-1 mb-3">
                          <span className="text-xl font-light text-txt-primary">${tier.price}</span>
                          <span className="text-micro text-txt-disabled">/mo</span>
                        </div>

                        <div className="space-y-1.5 flex-1 mb-4">
                          {tier.features.map((f) => (
                            <div key={f} className="flex items-start gap-1.5">
                              <Check size={12} className="text-verdict-proceed shrink-0 mt-0.5" />
                              <span className="text-[11px] text-txt-secondary">{f}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleUpgrade(tier.id)}
                          disabled={!!loading}
                          className={cn(
                            'w-full py-2 rounded-lg text-xs font-medium transition-colors',
                            isRecommended
                              ? 'bg-accent text-white hover:bg-accent-hover'
                              : 'bg-surface-2 text-txt-secondary hover:bg-surface-2/80',
                            loading && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {loading === tier.id ? (
                            <Loader2 size={14} className="animate-spin mx-auto" />
                          ) : (
                            `Go ${tier.name}`
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

---

## Part K — Wire Upgrade Events

Listen for the `octux:show-upgrade` event dispatched by tier pills and UpgradeMessage:

```typescript
// In the root layout or ShellClient, add:
import UpgradeModal from '@/components/billing/UpgradeModal';

const [showUpgrade, setShowUpgrade] = useState(false);
const [upgradeReason, setUpgradeReason] = useState('');
const [upgradeSuggested, setUpgradeSuggested] = useState('pro');

useEffect(() => {
  const handler = (e: CustomEvent) => {
    setUpgradeReason(e.detail?.reason || 'Unlock more simulation tokens');
    setUpgradeSuggested(e.detail?.suggestedTier || 'pro');
    setShowUpgrade(true);
  };
  window.addEventListener('octux:show-upgrade', handler as EventListener);
  return () => window.removeEventListener('octux:show-upgrade', handler as EventListener);
}, []);

// In JSX:
<UpgradeModal
  open={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  reason={upgradeReason}
  suggestedTier={upgradeSuggested}
/>
```

---

## Part L — Environment Variables

Add to `.env.local`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...      # Create in Stripe Dashboard: $29/mo recurring
STRIPE_PRICE_MAX=price_...      # $99/mo recurring
STRIPE_PRICE_OCTOPUS=price_...  # $249/mo recurring
```

---

## Testing

### Test 1 — Free user gets 1 token:
New user signs up → `user_subscriptions` row created with tier=free, tokens_total=1, tokens_used=0.

### Test 2 — Balance API returns correct data:
`GET /api/billing/balance` → `{ tier: "free", tokensTotal: 1, tokensUsed: 0, tokensRemaining: 1 }`

### Test 3 — Tier gate blocks insufficient tokens:
User with 0 tokens tries Deep sim → `tierGate` returns `{ allowed: false, error: "Need 1 token, have 0", suggestedTier: "pro" }`

### Test 4 — Token consumption atomic:
Call `consumeTokens(userId, 'deep')` → tokens_used increments by 1. Race condition safe via SQL function.

### Test 5 — Checkout creates Stripe session:
`POST /api/billing/checkout { tier: "pro" }` → returns `{ url: "https://checkout.stripe.com/..." }`. Redirect works.

### Test 6 — Webhook updates subscription:
Stripe sends `checkout.session.completed` → DB updates: tier=pro, tokens_total=8, tokens_used=0.

### Test 7 — Monthly token reset:
Stripe sends `invoice.paid` → tokens_used reset to 0. User gets full allocation again.

### Test 8 — Cancellation downgrades to free:
Stripe sends `customer.subscription.deleted` → tier=free, tokens_total=1.

### Test 9 — Upgrade modal shows:
Click locked tier pill → UpgradeModal opens with 3 paid tiers, recommended highlighted.

### Test 10 — Billing store hydrated on load:
App loads → `useBillingStore` has correct tier + token count from API.

---

## Files Created/Modified

```
CREATED:
  lib/billing/tiers.ts              — tier config + token costs
  lib/billing/stripe.ts             — Stripe client + customer helpers
  lib/billing/tierGate.ts           — token gate + consumption
  app/api/billing/checkout/route.ts — Stripe checkout session
  app/api/billing/portal/route.ts   — Stripe customer portal
  app/api/billing/balance/route.ts  — GET token balance
  app/api/webhooks/stripe/route.ts  — Stripe webhook handler
  components/billing/UpgradeModal.tsx — upgrade tier selector

MODIFIED:
  hooks/useHydrate.ts — add billing hydration
  ShellClient or root layout — wire UpgradeModal + events

DATABASE:
  user_subscriptions table + RLS + trigger + consume_tokens function
```

---

Manda pro Fernando. Depois do PF-21, próximo é **PF-22** (Onboarding contextual). 🐙

