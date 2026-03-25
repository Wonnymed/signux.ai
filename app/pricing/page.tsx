'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/ui';
import { TIERS, type TierType } from '@/lib/billing/tiers';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (tier: TierType) => {
    setLoading(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* noop */ } finally { setLoading(null); }
  };

  const handlePortal = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* noop */ }
  };

  const tiers = Object.values(TIERS);

  return (
    <div className="min-h-screen bg-surface-0 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-medium text-txt-primary mb-3">Simple, transparent pricing</h1>
          <p className="text-sm text-txt-tertiary max-w-md mx-auto">
            Start free. Upgrade when you need depth. Cancel anytime.
          </p>
        </div>

        {/* Dollar anchor */}
        <p className="text-center text-xs text-txt-disabled mb-12">
          A $50K McKinsey engagement. Or 60 seconds on Octux &mdash; starting free.
        </p>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {tiers.map(tier => (
            <div
              key={tier.id}
              className={cn(
                'rounded-xl border p-6 flex flex-col transition-all duration-normal',
                tier.popular ? 'border-accent/30 bg-accent-subtle/20 ring-1 ring-accent/10 scale-[1.02]' : 'border-border-subtle bg-surface-1',
              )}
            >
              {tier.popular && (
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">MOST POPULAR</span>
              )}
              <h3 className={cn('text-lg font-medium mb-1', tier.color)}>{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-txt-primary">{tier.priceLabel}</span>
                <span className="text-xs text-txt-tertiary">{tier.period}</span>
              </div>
              <p className="text-xs text-txt-tertiary mb-2">{tier.description}</p>
              <p className="text-xs text-txt-secondary font-medium mb-5">{tier.tagline}</p>

              <div className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    {f.included ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-verdict-proceed shrink-0 mt-0.5"><path d="M3 7l3 3 5-5" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-disabled shrink-0 mt-0.5"><path d="M4 4l6 6M10 4l-6 6" /></svg>
                    )}
                    <span className={cn('text-xs', f.included ? 'text-txt-secondary' : 'text-txt-disabled', f.highlight && 'font-medium text-txt-primary')}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              <OctButton
                variant={tier.popular ? 'primary' : 'secondary'}
                size="md"
                fullWidth
                loading={loading === tier.id}
                onClick={() => {
                  if (tier.id === 'free') window.location.href = '/c';
                  else handleCheckout(tier.id);
                }}
              >
                {tier.id === 'free' ? 'Start free' : `Go ${tier.name}`}
              </OctButton>
            </div>
          ))}
        </div>

        {/* Manage subscription link */}
        <div className="text-center">
          <button onClick={handlePortal} className="text-xs text-txt-tertiary hover:text-accent transition-colors">
            Already subscribed? Manage billing &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
