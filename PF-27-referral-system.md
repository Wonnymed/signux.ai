# PF-27 — Referral System

## Context for AI

You are working on Octux AI — a Decision Operating System. Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Lucide React + Framer Motion + Supabase.

**Ref:** Dropbox (give storage, get storage), Notion (invite friends, earn credit), Perplexity (referral links). The key insight: referrals only cost money when the referred user PAYS. The referrer gets rewarded AFTER payment, not on signup. This makes the economics sustainable.

**What exists (PF-01 → PF-26):**
- Token billing (PF-21): `user_subscriptions` table with `tokens_total`, `tokens_used`
- Share system (PF-25): URLs with `?ref=userId`, ShareMenu, ShareDialog
- Boardroom Report (PF-26): `/c/[id]/report` public page, `referral_views` table
- Auth (PF-20): Supabase auth with Google + Magic Link

**Economics:**
- Referred user: gets +1 bonus token on signup (cost: $0 until they simulate, then $1.50 max)
- Referrer: gets +1 bonus token WHEN the referred user makes their FIRST payment
- Max 10 referrals/month per user
- No self-referral
- Referral code format: `oct-XXXXXX` (nanoid, 6 chars)

**What this prompt builds:**

1. DB tables: `referral_codes`, `referral_completions`
2. API routes: `/api/referral/code`, `/api/referral/redeem`, `/api/referral/stats`
3. Invite page: `/invite/[code]` — personalized landing
4. `ReferralCard` — "Know someone facing a tough decision?" widget
5. `ReferralStats` — sidebar widget showing referral count + earned tokens
6. Webhook integration: reward referrer on first Stripe payment

---

## Part A — Database Tables

```sql
-- Referral codes (one per user, reusable)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Limits
  uses_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  
  CONSTRAINT unique_user_referral UNIQUE (user_id)
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);

-- Referral completions (tracks each referral)
CREATE TABLE IF NOT EXISTS referral_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL,                    -- user who shared
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'signed_up',     -- signed_up | paid | rewarded
  
  -- Tokens
  referred_bonus_granted BOOLEAN DEFAULT FALSE, -- +1 token given to new user
  referrer_bonus_granted BOOLEAN DEFAULT FALSE,  -- +1 token given to referrer (after payment)
  
  -- Timestamps
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  
  CONSTRAINT unique_referral_pair UNIQUE (referrer_id, referred_id),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX idx_referral_completions_referrer ON referral_completions(referrer_id);
CREATE INDEX idx_referral_completions_referred ON referral_completions(referred_id);
CREATE INDEX idx_referral_completions_status ON referral_completions(status);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral code"
  ON referral_codes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own referral completions"
  ON referral_completions FOR SELECT USING (auth.uid() = referrer_id);

-- Monthly reset function
CREATE OR REPLACE FUNCTION reset_referral_monthly_uses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.month_reset_at <= NOW() THEN
    NEW.uses_this_month := 0;
    NEW.month_reset_at := date_trunc('month', NOW()) + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referral_monthly_reset
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION reset_referral_monthly_uses();
```

---

## Part B — Referral Code API

CREATE `app/api/referral/code/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

/**
 * GET /api/referral/code — get or create user's referral code
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Check for existing code
    let { data: existing } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Reset monthly counter if needed
      if (new Date(existing.month_reset_at) <= new Date()) {
        await supabase
          .from('referral_codes')
          .update({
            uses_this_month: 0,
            month_reset_at: getNextMonthStart(),
          })
          .eq('id', existing.id);
        existing.uses_this_month = 0;
      }

      return NextResponse.json({
        code: existing.code,
        usesThisMonth: existing.uses_this_month,
        maxPerMonth: 10,
        inviteUrl: `${getBaseUrl()}/invite/${existing.code}`,
      });
    }

    // Create new code
    const code = `oct-${nanoid(6)}`;
    const { data: newCode, error } = await supabase
      .from('referral_codes')
      .insert({
        user_id: user.id,
        code,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      code: newCode.code,
      usesThisMonth: 0,
      maxPerMonth: 10,
      inviteUrl: `${getBaseUrl()}/invite/${newCode.code}`,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get referral code' }, { status: 500 });
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://signux-ai.vercel.app';
}

function getNextMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}
```

---

## Part C — Redeem Referral API

CREATE `app/api/referral/redeem/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * POST /api/referral/redeem — redeem a referral code after signup
 * Body: { code: string }
 *
 * Called during/after auth when user signs up via /invite/[code]
 * Grants +1 bonus token to the referred user immediately.
 * Referrer gets +1 token LATER when referred user pays (handled by Stripe webhook).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

    // Find referral code
    const { data: refCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (!refCode) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Self-referral check
    if (refCode.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }

    // Monthly limit check
    if (refCode.uses_this_month >= 10) {
      return NextResponse.json({ error: 'Referral code has reached monthly limit' }, { status: 429 });
    }

    // Already referred check
    const { data: existing } = await supabase
      .from('referral_completions')
      .select('id')
      .eq('referred_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Already used a referral code' }, { status: 409 });
    }

    // Create completion record
    const { error: insertErr } = await supabase
      .from('referral_completions')
      .insert({
        referral_code_id: refCode.id,
        referrer_id: refCode.user_id,
        referred_id: user.id,
        status: 'signed_up',
        referred_bonus_granted: true,
      });

    if (insertErr) throw insertErr;

    // Increment usage counter
    await supabase
      .from('referral_codes')
      .update({ uses_this_month: refCode.uses_this_month + 1 })
      .eq('id', refCode.id);

    // Grant +1 bonus token to referred user
    await supabase.rpc('grant_bonus_token', { p_user_id: user.id, p_amount: 1 });

    return NextResponse.json({
      success: true,
      bonusTokens: 1,
      message: 'Welcome! You received 1 bonus simulation token.',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to redeem' }, { status: 500 });
  }
}
```

**Create the RPC for granting bonus tokens:**

```sql
CREATE OR REPLACE FUNCTION grant_bonus_token(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE user_subscriptions
  SET tokens_total = tokens_total + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Part D — Referral Stats API

CREATE `app/api/referral/stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

/**
 * GET /api/referral/stats — get referral stats for current user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Get referral code
    const { data: refCode } = await supabase
      .from('referral_codes')
      .select('code, uses_this_month')
      .eq('user_id', user.id)
      .single();

    // Get completions
    const { data: completions } = await supabase
      .from('referral_completions')
      .select('status, signed_up_at, paid_at, rewarded_at')
      .eq('referrer_id', user.id)
      .order('signed_up_at', { ascending: false });

    const signedUp = completions?.filter((c) => c.status === 'signed_up').length || 0;
    const paid = completions?.filter((c) => c.status === 'paid' || c.status === 'rewarded').length || 0;
    const rewarded = completions?.filter((c) => c.status === 'rewarded').length || 0;

    return NextResponse.json({
      code: refCode?.code || null,
      usesThisMonth: refCode?.uses_this_month || 0,
      maxPerMonth: 10,
      totalReferred: completions?.length || 0,
      signedUp,
      paid,
      tokensEarned: rewarded,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
```

---

## Part E — Invite Page (`/invite/[code]`)

CREATE `app/invite/[code]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createServerComponentClient } from '@/lib/supabase/server';
import InviteView from './InviteView';

interface InvitePageProps {
  params: { code: string };
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  return {
    title: 'You\'ve been invited to Octux AI',
    description: 'Get a free simulation token. 10 AI specialists will debate your toughest decision.',
    openGraph: {
      title: 'You\'ve been invited to Octux AI',
      description: 'Get a free simulation token. 10 AI specialists will debate your toughest decision.',
      type: 'website',
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const supabase = createServerComponentClient();

  // Validate code exists
  const { data: refCode } = await supabase
    .from('referral_codes')
    .select('code, user_id')
    .eq('code', params.code)
    .single();

  if (!refCode) notFound();

  // Get referrer display name (first name only for privacy)
  const { data: referrerProfile } = await supabase
    .from('auth.users')
    .select('raw_user_meta_data')
    .eq('id', refCode.user_id)
    .single()
    .catch(() => ({ data: null }));

  const referrerName = referrerProfile?.raw_user_meta_data?.full_name?.split(' ')[0] || 'Someone';

  return <InviteView code={params.code} referrerName={referrerName} />;
}
```

CREATE `app/invite/[code]/InviteView.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Gift, Users, Shield } from 'lucide-react';

interface InviteViewProps {
  code: string;
  referrerName: string;
}

export default function InviteView({ code, referrerName }: InviteViewProps) {
  // Store code in localStorage for post-auth redemption
  useEffect(() => {
    localStorage.setItem('octux:referral-code', code);
  }, [code]);

  return (
    <div className="min-h-dvh bg-surface-0 flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        {/* Entity */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center">
          <span className="text-3xl">🐙</span>
        </div>

        {/* Invitation text */}
        <h1 className="text-xl font-medium text-txt-primary mb-2">
          {referrerName} invited you to Octux
        </h1>
        <p className="text-sm text-txt-tertiary mb-8">
          Get a free simulation token. 10 AI specialists will debate your toughest decision.
        </p>

        {/* Bonus badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
          <Gift size={14} className="text-accent" />
          <span className="text-xs text-accent font-medium">+1 bonus simulation token</span>
        </div>

        {/* CTA */}
        <a
          href="/"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors mb-4"
        >
          Start deciding — it's free
          <ArrowRight size={14} />
        </a>

        <p className="text-micro text-txt-disabled mb-10">
          No credit card required
        </p>

        {/* Value props */}
        <div className="space-y-4 text-left">
          {[
            { icon: Users, text: '10 AI specialists debate your decision in real-time' },
            { icon: Zap, text: 'Probability-graded verdict with citations' },
            { icon: Shield, text: 'Every claim traceable to the agent who made it' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-txt-tertiary" />
              </div>
              <span className="text-xs text-txt-secondary">{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-micro text-txt-disabled mt-10">
          octux.ai · Never decide alone again
        </p>
      </motion.div>
    </div>
  );
}
```

---

## Part F — Redeem After Auth

After signup via invite link, redeem referral code:

```typescript
useEffect(() => {
  if (isLoggedIn) {
    const code = localStorage.getItem('octux:referral-code');
    if (code) {
      localStorage.removeItem('octux:referral-code');
      fetch('/api/referral/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.dispatchEvent(new CustomEvent('octux:toast', {
              detail: {
                emoji: '🎁',
                title: 'Welcome bonus!',
                description: `You received ${data.bonusTokens} bonus simulation token.`,
              },
            }));
          }
        })
        .catch(() => {});
    }
  }
}, [isLoggedIn]);
```

---

## Part G — ReferralCard (Post-Verdict Widget)

CREATE `components/referral/ReferralCard.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/design/cn';

interface ReferralCardProps {
  className?: string;
}

export default function ReferralCard({ className }: ReferralCardProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInvite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referral/code');
      const data = await res.json();
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvite(); }, [fetchInvite]);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inviteUrl && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 1 }}
      className={cn(
        'rounded-xl border border-accent/15 bg-accent/[0.03] p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Gift size={15} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-txt-primary mb-0.5">
            Know someone facing a tough decision?
          </p>
          <p className="text-micro text-txt-tertiary mb-3">
            They get a free simulation token. You get one when they upgrade.
          </p>

          <div className="flex gap-1.5">
            <div className="flex-1 h-8 px-2.5 rounded-md bg-surface-1 border border-border-subtle flex items-center">
              <span className="text-micro text-txt-tertiary truncate">{inviteUrl || 'Loading...'}</span>
            </div>
            <button
              onClick={handleCopy}
              disabled={!inviteUrl}
              className={cn(
                'h-8 px-2.5 rounded-md text-micro font-medium flex items-center gap-1 transition-colors',
                copied
                  ? 'bg-verdict-proceed/10 text-verdict-proceed border border-verdict-proceed/20'
                  : 'bg-surface-2 text-txt-secondary hover:text-txt-primary border border-border-subtle',
              )}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## Part H — Stripe Webhook: Reward Referrer on First Payment

Add logic in `app/api/webhooks/stripe/route.ts`:

```typescript
async function handleFirstPayment(userId: string) {
  const supabase = createServiceClient(); // admin client

  const { data: completion } = await supabase
    .from('referral_completions')
    .select('*')
    .eq('referred_id', userId)
    .eq('status', 'signed_up')
    .single();

  if (!completion) return;

  await supabase
    .from('referral_completions')
    .update({
      status: 'rewarded',
      paid_at: new Date().toISOString(),
      rewarded_at: new Date().toISOString(),
      referrer_bonus_granted: true,
    })
    .eq('id', completion.id);

  await supabase.rpc('grant_bonus_token', {
    p_user_id: completion.referrer_id,
    p_amount: 1,
  });
}
```

---

## Part I — Integration Points

1. After verdict (conversation page or VerdictCard):
```typescript
{isLoggedIn && isLastVerdict && (
  <ReferralCard className="mt-4" />
)}
```

2. Sidebar optional widget:
```typescript
<button className="flex items-center gap-2 px-3 py-1.5 text-xs text-txt-tertiary hover:text-accent transition-colors">
  <Gift size={13} />
  Invite friends
</button>
```

---

## Files Created/Modified

```
CREATED:
  SQL migration — referral_codes, referral_completions tables + RPC
  app/api/referral/code/route.ts — get/create referral code
  app/api/referral/redeem/route.ts — redeem code after signup
  app/api/referral/stats/route.ts — referral stats
  app/invite/[code]/page.tsx — server component (validate code)
  app/invite/[code]/InviteView.tsx — client invite landing page
  components/referral/ReferralCard.tsx — post-verdict referral widget
  components/referral/index.ts — barrel export

MODIFIED:
  app/api/webhooks/stripe/route.ts — add referrer reward on first payment
  app/(shell)/page.tsx or ShellClient.tsx — redeem referral code after auth
  Conversation page — show ReferralCard after verdict
```

---

Manda pro Fernando. A FASE 10 (Share + Viral) tá completa: PF-25 (Share), PF-26 (Report), PF-27 (Referral). Próximo sprint é **FASE 11 — Power User Features** (PF-28 → PF-33).

