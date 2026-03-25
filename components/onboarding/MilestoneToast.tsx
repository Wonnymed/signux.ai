'use client';

import { cn } from '@/lib/design/cn';
import { MILESTONES, type MilestoneId } from '@/lib/onboarding/milestones';

interface MilestoneToastProps {
  milestoneId: MilestoneId | null;
}

export default function MilestoneToast({ milestoneId }: MilestoneToastProps) {
  if (!milestoneId) return null;

  const milestone = MILESTONES[milestoneId];
  if (!milestone || milestone.celebration === 'none') return null;

  const isToast = milestone.celebration === 'toast';

  return (
    <div className={cn(
      'fixed z-[90] animate-slide-in-up',
      isToast ? 'bottom-6 left-1/2 -translate-x-1/2' : 'bottom-6 right-6',
    )}>
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl',
        'bg-surface-raised border',
        isToast ? 'border-accent/20' : 'border-border-subtle',
      )}>
        <span className="text-xl shrink-0">{milestone.emoji}</span>
        <div>
          <p className={cn(
            'text-sm font-medium',
            isToast ? 'text-accent' : 'text-txt-primary',
          )}>
            {milestone.title}
          </p>
          <p className="text-micro text-txt-tertiary">{milestone.description}</p>
        </div>
      </div>
    </div>
  );
}
