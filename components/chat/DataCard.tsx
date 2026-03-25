'use client';

import { cn } from '@/lib/design/cn';
import { OctCard, OctBadge, OctButton } from '@/components/ui';

interface DataCardProps {
  data: any;
}

export default function DataCard({ data }: DataCardProps) {
  if (!data) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <OctCard variant="default" padding="md">
        {/* Title with category badge */}
        <div className="flex items-center gap-2 mb-3">
          {data.icon && <span className="text-base">{data.icon}</span>}
          <span className="text-sm font-medium text-txt-primary">{data.title || 'Data'}</span>
          {data.category && (
            <OctBadge category={data.category} size="xs">{data.category}</OctBadge>
          )}
        </div>

        {/* Key-value data */}
        {data.fields && (
          <div className="space-y-2 mb-3">
            {data.fields.map((field: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <span className="text-xs text-txt-tertiary shrink-0">{field.label}</span>
                <span className="text-xs text-txt-primary text-right font-medium">{field.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Body text */}
        {data.body && (
          <p className="text-xs text-txt-secondary leading-relaxed mb-3">{data.body}</p>
        )}

        {/* Source */}
        {data.source && (
          <p className="text-micro text-txt-disabled mb-3">Source: {data.source}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
          {data.related_sim && (
            <OctButton variant="ghost" size="xs">
              Related: Sim #{data.related_sim}
            </OctButton>
          )}
          {data.simulatable && (
            <OctButton variant="accent" size="xs">
              Simulate this
            </OctButton>
          )}
        </div>
      </OctCard>
    </div>
  );
}
