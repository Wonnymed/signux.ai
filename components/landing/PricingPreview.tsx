'use client';

import Link from 'next/link';
import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/sukgo';
import { openAuthModal, POST_AUTH_REDIRECT_KEY } from '@/lib/auth/openAuthModal';
import { useBillingStore } from '@/lib/store/billing';
import type { TierType } from '@/lib/billing/tiers';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try the simulation engine',
    features: [
      '2 simulation tokens/month',
      'Swarm mode (1,000 market voices)',
      'Verdict dashboard + follow-up',
    ],
    cta: 'Start free',
    popular: false,
    color: 'text-txt-secondary',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious business decisions',
    features: [
      '30 simulation tokens/month',
      'Specialist + all advanced modes',
      'PDF export & memory across sims',
    ],
    cta: 'Go Pro',
    popular: true,
    color: 'text-accent',
  },
  {
    name: 'Max',
    price: '$99',
    period: '/month',
    description: 'For power operators and teams',
    features: [
      '120 simulation tokens/month',
      'Everything in Pro',
      'Priority processing & roadmap API',
    ],
    cta: 'Go Max',
    popular: false,
    color: 'text-tier-max',
  },
] as const;

function tierNameFromBilling(t: TierType): 'Free' | 'Pro' | 'Max' {
  if (t === 'free') return 'Free';
  if (t === 'pro') return 'Pro';
  return 'Max';
}

export default function PricingPreview({ forLoggedInUser = false }: { forLoggedInUser?: boolean }) {
  const billingTier = useBillingStore((s) => s.tier);
  const currentPlanName = tierNameFromBilling(billingTier);

  const onTierCta = (tierName: string) => {
    if (tierName === 'Free') {
      openAuthModal({ tab: 'signup' });
      return;
    }
    try {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '/pricing');
    } catch {
      /* private mode */
    }
    openAuthModal({ tab: 'signup' });
  };

  return (
    <section className="py-20 sm:py-28 px-6 bg-surface-1/30">
      <div className="max-w-landing mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-section text-txt-primary mb-3">
            Start simulating for free.
          </h2>
          <p className="text-sm text-txt-tertiary">
            2 free simulations per month. No credit card. Upgrade when you&apos;re hooked.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-octx-4">
          {tiers.map((tier, i) => {
            const isCurrent = forLoggedInUser && tier.name === currentPlanName;
            return (
              <div
                key={i}
                className={cn(
                  'rounded-radius-xl border p-5 flex flex-col transition-colors duration-normal ease-out',
                  isCurrent && 'ring-2 ring-accent/40 border-accent/25',
                  !isCurrent &&
                    (tier.popular
                      ? 'octx-card-premium border-accent/30 bg-accent-subtle/30 ring-1 ring-accent/10'
                      : 'border-border-subtle bg-surface-1 shadow-premium'),
                )}
              >
                {forLoggedInUser && isCurrent ? (
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Current plan</span>
                ) : tier.popular ? (
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Recommended</span>
                ) : (
                  <span className="mb-2 h-[18px]" aria-hidden />
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

                {forLoggedInUser ? (
                  <Link
                    href={isCurrent ? '/settings/billing' : '/pricing'}
                    className={cn(
                      'inline-flex w-full items-center justify-center rounded-radius-md px-4 py-2.5 text-sm font-medium transition-colors',
                      isCurrent
                        ? 'border border-border-default bg-surface-0 text-txt-primary hover:bg-surface-1'
                        : tier.popular
                          ? 'bg-accent text-txt-on-accent hover:bg-accent-hover'
                          : 'border border-border-subtle bg-surface-1 text-txt-primary hover:bg-surface-2',
                    )}
                  >
                    {isCurrent ? 'Manage billing' : 'View plans'}
                  </Link>
                ) : (
                  <OctButton
                    variant={tier.popular ? 'default' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => onTierCta(tier.name)}
                  >
                    {tier.cta}
                  </OctButton>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
