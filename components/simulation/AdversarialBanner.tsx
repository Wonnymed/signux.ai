'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/design/cn';
import type { ChallengeEvent } from '@/lib/hooks/useSimulationStream';

interface AdversarialBannerProps {
  challenges: ChallengeEvent[];
  className?: string;
}

export default function AdversarialBanner({ challenges, className }: AdversarialBannerProps) {
  const [visible, setVisible] = useState<ChallengeEvent | null>(null);

  // Show latest challenge for 4 seconds, then fade
  useEffect(() => {
    if (challenges.length === 0) return;
    const latest = challenges[challenges.length - 1];
    setVisible(latest);
    const timer = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(timer);
  }, [challenges.length]);

  if (!visible) return null;

  return (
    <div className={cn(
      'px-3 py-2 rounded-radius-md border border-verdict-abandon/20 bg-verdict-abandon/5',
      'flex items-center gap-2 animate-slide-in-up',
      className,
    )}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--verdict-abandon)" strokeWidth="1.5" className="shrink-0">
        <path d="M7 1l6 12H1L7 1z" />
        <path d="M7 5v3M7 10v0.5" />
      </svg>
      <p className="text-xs text-txt-secondary flex-1">
        <span className="font-medium text-txt-primary">{visible.challenger_name}</span>
        {' challenges '}
        <span className="font-medium text-txt-primary">{visible.challenged_name}</span>
        {visible.topic && (
          <span className="text-txt-tertiary">: {visible.topic}</span>
        )}
      </p>
      <span className="text-micro text-txt-disabled shrink-0">Round {visible.round}</span>
    </div>
  );
}
