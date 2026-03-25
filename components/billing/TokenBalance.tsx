'use client';

import { cn } from '@/lib/design/cn';
import { TOKEN_COSTS } from '@/lib/billing/tiers';

interface TokenBalanceProps {
  tokensUsed: number;
  tokensTotal: number;
  tier: string;
  variant?: 'compact' | 'full';
  className?: string;
}

export default function TokenBalance({
  tokensUsed,
  tokensTotal,
  tier,
  variant = 'compact',
  className,
}: TokenBalanceProps) {
  const remaining = Math.max(0, tokensTotal - tokensUsed);
  const pct = tokensTotal > 0 ? (tokensUsed / tokensTotal) * 100 : 0;
  const isLow = remaining <= 2;
  const isEmpty = remaining === 0;

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs', className)}>
        <div className="w-14 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-normal',
              isEmpty ? 'bg-verdict-halt' : isLow ? 'bg-verdict-caution' : 'bg-accent',
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className={cn(
          'font-medium tabular-nums',
          isEmpty ? 'text-verdict-halt' : isLow ? 'text-verdict-caution' : 'text-txt-secondary',
        )}>
          {remaining}/{tokensTotal}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-surface-1 p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-txt-primary">Tokens</span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          isEmpty ? 'text-verdict-halt' : isLow ? 'text-verdict-caution' : 'text-accent',
        )}>
          {remaining} remaining
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-normal',
            isEmpty ? 'bg-verdict-halt' : isLow ? 'bg-verdict-caution' : 'bg-accent',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-txt-tertiary">
        <span>{tokensUsed} used of {tokensTotal}</span>
        <span>
          {remaining >= TOKEN_COSTS.kraken
            ? `${Math.floor(remaining / TOKEN_COSTS.kraken)} Kraken possible`
            : `${remaining} Deep possible`}
        </span>
      </div>

      {isEmpty && (
        <p className="mt-2 text-xs text-verdict-halt">
          No tokens left this month. Upgrade for more.
        </p>
      )}
    </div>
  );
}
