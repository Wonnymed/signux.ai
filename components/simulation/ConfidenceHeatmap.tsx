'use client';

import { cn } from '@/lib/design/cn';

type Claim = {
  claim: string;
  confidence_grade: 'green' | 'yellow' | 'red';
  confidence_score: number;
  supporting_agents: string[];
  contested_by: string[];
  evidence_quality: string;
  category: string;
};

type Heatmap = {
  total_claims: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  overall_confidence: number;
  claims: Claim[];
};

type Props = { heatmap: Heatmap | null };

const gradeStyles: Record<Claim['confidence_grade'], { panel: string; dot: string }> = {
  green: {
    panel: 'border-state-success/40 bg-state-success-muted/15',
    dot: 'bg-state-success',
  },
  yellow: {
    panel: 'border-state-warning/40 bg-state-warning-muted/15',
    dot: 'bg-state-warning',
  },
  red: {
    panel: 'border-state-error/40 bg-state-error-muted/15',
    dot: 'bg-state-error',
  },
};

export default function ConfidenceHeatmap({ heatmap }: Props) {
  if (!heatmap || heatmap.claims.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-txt-primary">Confidence breakdown</div>
        <div className="flex flex-wrap gap-3 text-micro text-txt-tertiary">
          <span>{heatmap.green_count} high</span>
          <span>{heatmap.yellow_count} moderate</span>
          <span>{heatmap.red_count} low</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {heatmap.claims.map((claim, i) => {
          const styles = gradeStyles[claim.confidence_grade] ?? gradeStyles.yellow;
          return (
            <div
              key={i}
              className={cn(
                'rounded-radius-lg border px-4 py-3',
                styles.panel,
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-relaxed text-txt-primary">{claim.claim}</div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-micro text-txt-tertiary">
                    <span>Score: {Math.round(claim.confidence_score * 100)}%</span>
                    <span>Evidence: {claim.evidence_quality}</span>
                    {claim.supporting_agents.length > 0 && (
                      <span>
                        Supported by {claim.supporting_agents.length} agent{claim.supporting_agents.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {claim.contested_by.length > 0 && (
                      <span className="text-state-error">Contested by {claim.contested_by.length}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
