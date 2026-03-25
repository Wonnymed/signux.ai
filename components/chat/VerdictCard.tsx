'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';
import { OctBadge, OctButton, OctCard } from '@/components/ui';
import { CircularProgress } from '@/components/ui';
import { CitationHover } from '@/components/ui';
import { verdictColors, gradeColors } from '@/lib/design/tokens';

interface VerdictCardProps {
  verdict: any;
  simulationId?: string | null;
  conversationId?: string;
  onRefine?: (modification: string) => void;
}

export default function VerdictCard({ verdict, simulationId, conversationId, onRefine }: VerdictCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!verdict) return null;

  const recommendation = (verdict.recommendation || 'proceed').toLowerCase();
  const probability = verdict.probability || 0;
  const grade = verdict.grade || 'C';
  const vColor = verdictColors[recommendation as keyof typeof verdictColors] || verdictColors.proceed;
  const gColor = gradeColors[grade] || gradeColors['C'];

  return (
    <div className="mb-4 animate-scale-in">
      <OctCard variant="elevated" padding="none" className="overflow-hidden border-accent/10">
        {/* Main verdict section */}
        <div className="p-5 flex items-start gap-5">
          {/* Probability ring */}
          <div className="shrink-0">
            <CircularProgress
              value={probability}
              size={72}
              strokeWidth={5}
              color={vColor.solid}
              trackColor="var(--surface-2)"
            >
              <div className="text-center">
                <span className="text-lg font-bold" style={{ color: vColor.solid }}>{probability}%</span>
              </div>
            </CircularProgress>
          </div>

          {/* Verdict content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <OctBadge verdict={recommendation as any} size="md">
                {recommendation.toUpperCase()}
              </OctBadge>
              <OctBadge grade={grade} size="sm">{grade}</OctBadge>
              {verdict.calibration_adjusted && (
                <OctBadge variant="outline" size="xs">Calibrated</OctBadge>
              )}
            </div>

            {/* One-liner with citations */}
            <p className="text-sm text-txt-primary leading-relaxed mb-2">
              {renderWithCitations(verdict.one_liner || verdict.summary || '', verdict.citations)}
            </p>

            {/* Risk + Action */}
            <div className="space-y-1.5">
              {verdict.main_risk && (
                <div className="flex items-start gap-2">
                  <span className="text-micro font-medium text-verdict-abandon shrink-0 mt-0.5">RISK</span>
                  <span className="text-xs text-txt-secondary">{verdict.main_risk}</span>
                </div>
              )}
              {verdict.next_action && (
                <div className="flex items-start gap-2">
                  <span className="text-micro font-medium text-verdict-proceed shrink-0 mt-0.5">ACTION</span>
                  <span className="text-xs text-txt-secondary">{verdict.next_action}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
          <OctButton variant="ghost" size="xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Collapse' : 'Expand'}
          </OctButton>
          <OctButton
            variant="ghost"
            size="xs"
            onClick={() => {
              const url = `${window.location.origin}/c/${conversationId}/report`;
              navigator.clipboard.writeText(url);
            }}
          >
            Share
          </OctButton>
          {onRefine && (
            <OctButton variant="accent" size="xs" onClick={() => onRefine('What if the budget was 2× larger?')}>
              What if...?
            </OctButton>
          )}
          {verdict.disclaimer && (
            <span className="ml-auto text-micro text-txt-disabled">{verdict.disclaimer}</span>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-5 py-4 border-t border-border-subtle space-y-4 animate-slide-in-up">
            {/* Agent scoreboard */}
            {verdict.agent_scores && (
              <div>
                <h4 className="text-xs font-medium text-txt-secondary mb-2">Agent Scoreboard</h4>
                <div className="space-y-1">
                  {verdict.agent_scores.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-txt-secondary w-36 truncate">{a.agent_name}</span>
                      <OctBadge verdict={a.position?.toLowerCase()} size="xs">{a.position}</OctBadge>
                      <span className="text-txt-tertiary">{a.confidence}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Heatmap claims */}
            {verdict.confidence_heatmap && (
              <div>
                <h4 className="text-xs font-medium text-txt-secondary mb-2">Confidence Heatmap</h4>
                <div className="space-y-1.5">
                  {verdict.confidence_heatmap.map((claim: any, i: number) => (
                    <div key={i} className={cn(
                      'px-3 py-2 rounded-md text-xs border',
                      claim.grade === 'consensus' && 'bg-confidence-high/5 border-confidence-high/20 text-txt-primary',
                      claim.grade === 'majority' && 'bg-confidence-medium/5 border-confidence-medium/20 text-txt-primary',
                      claim.grade === 'contested' && 'bg-confidence-contested/5 border-confidence-contested/20 text-txt-primary',
                      claim.grade === 'unsupported' && 'bg-surface-1 border-border-subtle text-txt-tertiary',
                    )}>
                      <span>{claim.claim}</span>
                      <OctBadge
                        confidence={claim.grade === 'consensus' ? 'high' : claim.grade === 'majority' ? 'medium' : 'contested'}
                        size="xs"
                        className="ml-2"
                      >
                        {claim.grade}
                      </OctBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </OctCard>
    </div>
  );
}

// Render text with [1][2] citation references
function renderWithCitations(text: string, citations?: any[]) {
  if (!citations || citations.length === 0) return text;

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(\d+)\]/);
    if (match && citations) {
      const idx = parseInt(match[1]) - 1;
      const citation = citations[idx];
      if (citation) {
        return (
          <CitationHover
            key={i}
            citation={{
              id: idx + 1,
              agent_name: citation.agent_name || 'Agent',
              round: citation.round || 0,
              confidence: citation.confidence || 5,
              claim: citation.claim || '',
              evidence: citation.supporting_data,
            }}
          >
            <button className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[10px] font-medium bg-accent-muted text-accent hover:bg-accent-glow cursor-pointer align-super mx-0.5 transition-colors duration-normal">
              {idx + 1}
            </button>
          </CitationHover>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}
