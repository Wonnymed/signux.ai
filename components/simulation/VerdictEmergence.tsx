'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/design/cn';
import { CircularProgress } from '@/components/ui';
import { OctBadge } from '@/components/octux';
import { verdictColors, type VerdictType } from '@/lib/design/tokens';
import type { VerdictState } from '@/lib/hooks/useSimulationStream';
import { getSimulationStatusLabel } from '@/lib/simulation/streamingCopy';

interface VerdictEmergenceProps {
  verdict: VerdictState;
  className?: string;
}

export default function VerdictEmergence({ verdict, className }: VerdictEmergenceProps) {
  const [animatedProb, setAnimatedProb] = useState(0);
  const [showGrade, setShowGrade] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Animate probability from 0 to final value
  useEffect(() => {
    if (!verdict.complete || !verdict.probability) return;
    const target = verdict.probability;
    const duration = 1200; // ms
    const start = Date.now();

    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedProb(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // Stagger reveals
    setTimeout(() => setShowGrade(true), 800);
    setTimeout(() => setShowDetails(true), 1200);
  }, [verdict.complete, verdict.probability]);

  // Still streaming verdict text
  if (verdict.streaming && !verdict.complete) {
    return (
      <div className={cn('px-4 py-3 rounded-radius-lg border border-accent/20 bg-accent-subtle/30 animate-fade-in', className)}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center animate-pulse-accent">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-accent">
              <circle cx="5" cy="5" r="3" />
            </svg>
          </div>
          <span className="text-xs font-medium text-accent">{getSimulationStatusLabel('verdict')}</span>
        </div>
        <p className="text-sm text-txt-primary leading-relaxed">
          {verdict.partial_text}
          <span className="inline-block w-0.5 h-4 bg-accent animate-pulse-accent ml-0.5 align-text-bottom" />
        </p>
      </div>
    );
  }

  if (!verdict.complete) return null;

  const rec = (verdict.recommendation || 'proceed').toLowerCase() as VerdictType;
  const vColor = verdictColors[rec] || verdictColors.proceed;

  return (
    <div className={cn('rounded-radius-xl border border-accent/20 bg-surface-1 overflow-hidden animate-scale-in', className)}>
      {/* Main verdict area */}
      <div className="p-5 flex items-start gap-5">
        {/* Animated probability ring */}
        <div className="shrink-0">
          <CircularProgress
            value={animatedProb}
            size={80}
            strokeWidth={6}
            color={vColor.solid}
            trackColor="var(--surface-2)"
          >
            <div className="text-center">
              <span className="text-xl font-bold tabular-nums" style={{ color: vColor.solid }}>
                {animatedProb}%
              </span>
            </div>
          </CircularProgress>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <OctBadge verdict={rec} size="md">
              {verdict.recommendation?.toUpperCase() || 'ANALYZING'}
            </OctBadge>
            {showGrade && verdict.grade && (
              <OctBadge grade={verdict.grade} size="sm" className="animate-scale-in">
                {verdict.grade}
              </OctBadge>
            )}
            {verdict.calibration_adjusted && showGrade && (
              <OctBadge variant="outline" size="xs" className="animate-fade-in">Calibrated</OctBadge>
            )}
          </div>

          {/* One-liner */}
          <p className="text-sm text-txt-primary leading-relaxed mb-2">
            {verdict.one_liner || verdict.partial_text}
          </p>

          {/* Risk + Action (staggered reveal) */}
          {showDetails && (
            <div className="space-y-1.5 animate-slide-in-up">
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
              {verdict.disclaimer && (
                <p className="text-micro text-txt-disabled mt-2 pt-2 border-t border-border-subtle">
                  {verdict.disclaimer}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
