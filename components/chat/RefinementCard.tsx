'use client';

import { cn } from '@/lib/design/cn';
import { OctCard, OctBadge } from '@/components/ui';

interface RefinementCardProps {
  data: any;
}

export default function RefinementCard({ data }: RefinementCardProps) {
  if (!data) return null;

  const assessment = data.assessment || 'nuance';
  const assessmentColors: Record<string, { badge: string; border: string }> = {
    agree: { badge: 'bg-verdict-proceed-muted text-verdict-proceed', border: 'border-verdict-proceed/20' },
    disagree: { badge: 'bg-verdict-abandon-muted text-verdict-abandon', border: 'border-verdict-abandon/20' },
    nuance: { badge: 'bg-verdict-delay-muted text-verdict-delay', border: 'border-verdict-delay/20' },
  };
  const colors = assessmentColors[assessment] || assessmentColors.nuance;

  return (
    <div className="mb-4 animate-fade-in">
      <OctCard variant="outline" padding="md" className={cn('border', colors.border)}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-txt-secondary">Refinement Analysis</span>
          <span className={cn('text-micro px-1.5 py-0.5 rounded-sm font-medium', colors.badge)}>
            {assessment.toUpperCase()}
          </span>
        </div>

        {data.explanation && (
          <p className="text-sm text-txt-primary leading-relaxed mb-3">{data.explanation}</p>
        )}

        {data.adjustments && data.adjustments.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-micro font-medium text-txt-tertiary">Adjustments:</span>
            {data.adjustments.map((adj: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-txt-secondary">
                <span className="text-accent mt-0.5 shrink-0">&rarr;</span>
                <span>{adj}</span>
              </div>
            ))}
          </div>
        )}

        {data.updated_probability !== undefined && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-3">
            <span className="text-xs text-txt-tertiary">Updated probability:</span>
            <OctBadge size="sm" className="bg-accent-muted text-accent font-bold">
              {data.updated_probability}%
            </OctBadge>
          </div>
        )}
      </OctCard>
    </div>
  );
}
