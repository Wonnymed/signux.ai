'use client';

import { cn } from '@/lib/design/cn';
import { OctButton, OctCard } from '@/components/ui';
import { TIERS, type TierType } from '@/lib/billing/tiers';

interface UpgradePromptProps {
  reason: string;
  tokensUsed?: number;
  tokensTotal?: number;
  suggestedTier?: TierType;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function UpgradePrompt({
  reason, tokensUsed, tokensTotal, suggestedTier = 'pro',
  onUpgrade, onDismiss, className,
}: UpgradePromptProps) {
  const tier = TIERS[suggestedTier];

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: suggestedTier }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* noop */ }
    onUpgrade?.();
  };

  return (
    <OctCard variant="accent" padding="md" className={cn('border-accent/20', className)}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
            <path d="M8 2l6 12H2L8 2zM8 6v4M8 12v0.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-txt-primary font-medium mb-1">{reason}</p>
          {tokensUsed !== undefined && tokensTotal !== undefined && (
            <p className="text-xs text-txt-tertiary mb-3">
              Tokens: {tokensUsed}/{tokensTotal} used this month
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <OctButton variant="primary" size="sm" onClick={handleUpgrade}>
              Upgrade to {tier.name} — {tier.limits.tokensPerMonth} tokens{tier.period}
            </OctButton>
            {onDismiss && (
              <OctButton variant="ghost" size="xs" onClick={onDismiss}>
                Maybe later
              </OctButton>
            )}
          </div>
        </div>
      </div>
    </OctCard>
  );
}
