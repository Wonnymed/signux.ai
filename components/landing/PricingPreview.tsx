'use client';

import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/ui';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try the basics',
    features: ['10 Ink chats/day', '3 Deep sims/month', 'Basic verdict'],
    cta: 'Start free',
    popular: false,
    color: 'text-txt-secondary',
  },
  {
    name: 'Pay-as-go',
    price: '$1.50',
    period: 'per Deep sim',
    description: 'No commitment',
    features: ['Unlimited Ink chat', 'Deep sims at $1.50 each', 'Full verdicts + citations'],
    cta: 'Get started',
    popular: false,
    color: 'text-txt-secondary',
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'For serious decisions',
    features: ['Unlimited Ink + Deep', '1 Kraken token/month', 'Agent chat + memory', 'Boardroom reports'],
    cta: 'Go Pro',
    popular: true,
    color: 'text-accent',
  },
  {
    name: 'Max',
    price: '$39',
    period: '/month',
    description: 'For power users',
    features: ['Unlimited everything', 'Priority Kraken', 'Custom agents', 'API access', 'Team sharing'],
    cta: 'Go Max',
    popular: false,
    color: 'text-tier-max',
  },
];

interface PricingPreviewProps {
  onSignIn: () => void;
}

export default function PricingPreview({ onSignIn }: PricingPreviewProps) {
  return (
    <section className="py-20 sm:py-28 px-6 bg-surface-1/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-medium text-txt-primary mb-3">
            Simple pricing
          </h2>
          <p className="text-sm text-txt-tertiary">
            Start free. Pay when you need depth.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl border p-5 flex flex-col transition-all duration-normal',
                tier.popular
                  ? 'border-accent/30 bg-accent-subtle/30 ring-1 ring-accent/10'
                  : 'border-border-subtle bg-surface-1',
              )}
            >
              {tier.popular && (
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Most popular</span>
              )}
              <h3 className={cn('text-base font-medium mb-1', tier.color)}>{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-bold text-txt-primary">{tier.price}</span>
                <span className="text-xs text-txt-tertiary">{tier.period}</span>
              </div>
              <p className="text-xs text-txt-tertiary mb-4">{tier.description}</p>

              <div className="space-y-2 mb-6 flex-1">
                {tier.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-verdict-proceed shrink-0 mt-0.5">
                      <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                    </svg>
                    <span className="text-xs text-txt-secondary">{f}</span>
                  </div>
                ))}
              </div>

              <OctButton
                variant={tier.popular ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={onSignIn}
              >
                {tier.cta}
              </OctButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
