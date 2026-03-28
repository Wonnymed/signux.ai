'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Zap } from 'lucide-react';
import { SettingSection, Divider, SettingSkeleton } from '../_components';
import { useAuth } from '@/components/auth/AuthProvider';
import { getTierConfig, type TierType } from '@/lib/billing/tiers';
import { cn } from '@/lib/design/cn';

type Balance = {
  tokensUsed: number;
  tokensTotal: number;
  tokensRemaining: number;
  tier: TierType;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
};

export default function SettingsBillingPage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/billing/balance');
        if (!res.ok) throw new Error('bad');
        const data = await res.json();
        if (!cancelled) setBalance(data);
      } catch {
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/settings/billing' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
    } catch {
      /* ignore */
    } finally {
      setPortalLoading(false);
    }
  }

  if (!isAuthenticated) {
    return <p className="text-sm text-txt-tertiary">Sign in to view billing.</p>;
  }

  if (loading) {
    return <SettingSkeleton />;
  }

  if (!balance) {
    return <p className="text-sm text-txt-tertiary">Unable to load billing.</p>;
  }

  const tier = balance.tier;
  const tierConfig = getTierConfig(tier);
  const pct =
    balance.tokensTotal > 0
      ? Math.min(100, Math.round((balance.tokensUsed / balance.tokensTotal) * 100))
      : 0;
  const renewal =
    balance.currentPeriodEnd &&
    new Date(balance.currentPeriodEnd).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  const paid = tier !== 'free' && !!balance.stripeCustomerId;

  return (
    <div className="mx-auto max-w-container-narrow space-y-10 pb-8">
      <SettingSection title="Current plan" description="Your active subscription.">
        <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden>
              <Zap size={22} strokeWidth={1.75} />
            </span>
            <div>
              <p className={cn('text-lg font-semibold', tierConfig.color)}>{tierConfig.name}</p>
              <p className="text-sm text-txt-tertiary">
                {tierConfig.priceLabel} <span className="text-txt-disabled">/ {tierConfig.period}</span>
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-txt-primary transition-colors hover:bg-white/[0.06]"
          >
            Adjust plan
          </Link>
        </div>
      </SettingSection>

      <Divider />

      <SettingSection title="Token usage" description="Simulation tokens used this billing period.">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-txt-secondary">
              <span className="font-medium text-txt-primary">{balance.tokensUsed}</span>
              {' of '}
              <span className="font-medium text-txt-primary">{balance.tokensTotal}</span>
              {' tokens used'}
            </span>
            {renewal && (
              <span className="text-xs text-txt-disabled">Renews {renewal}</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </SettingSection>

      {paid && (
        <>
          <Divider />
          <SettingSection title="Payment method" description="Update card and invoices in Stripe.">
            <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CreditCard size={22} className="text-txt-tertiary" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-txt-primary">Managed by Stripe</p>
                  <p className="text-xs text-txt-disabled">Secure billing portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-2 px-4 py-2 text-sm font-medium text-txt-primary hover:bg-surface-2/80 disabled:opacity-50"
              >
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            </div>
          </SettingSection>
        </>
      )}
    </div>
  );
}
