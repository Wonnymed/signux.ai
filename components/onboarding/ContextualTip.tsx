'use client';

import { cn } from '@/lib/design/cn';
import { TIPS, type TipId } from '@/lib/onboarding/milestones';

interface ContextualTipProps {
  tipId: TipId | null;
  position?: 'bottom-center' | 'top-right' | 'inline';
  onDismiss: (tipId: TipId) => void;
  className?: string;
}

export default function ContextualTip({ tipId, position, onDismiss, className }: ContextualTipProps) {
  if (!tipId) return null;

  const tip = TIPS[tipId];
  if (!tip) return null;

  const pos = position || tip.position;

  const positionClass = {
    'bottom-center': 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[80]',
    'top-right': 'fixed top-16 right-6 z-[80]',
    'inline': 'relative',
  }[pos];

  return (
    <div className={cn(
      'animate-slide-in-up',
      positionClass,
      className,
    )}>
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-lg',
        'bg-surface-raised border border-accent/20 shadow-lg',
        'max-w-md',
      )}>
        <p className="text-xs text-txt-secondary flex-1">{tip.text}</p>
        {tip.dismissible && (
          <button
            onClick={() => onDismiss(tipId)}
            className="shrink-0 p-1 text-icon-secondary hover:text-icon-primary transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline variant for embedding within chat flow
 */
export function InlineTip({ tipId, onDismiss }: { tipId: TipId | null; onDismiss: (tipId: TipId) => void }) {
  if (!tipId) return null;
  const tip = TIPS[tipId];
  if (!tip || tip.position !== 'inline') return null;

  return (
    <div className="px-4 max-w-3xl mx-auto w-full mb-3 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-subtle/30 border border-accent/10">
        <p className="text-micro text-txt-secondary flex-1">{tip.text}</p>
        <button onClick={() => onDismiss(tipId)} className="text-icon-secondary hover:text-icon-primary p-0.5">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
