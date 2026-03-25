'use client';

import { cn } from '@/lib/design/cn';
import { OctBadge, OctButton } from '@/components/ui';
import { CircularProgress } from '@/components/ui';
import { CitatedText } from '@/components/citations';
import { verdictColors } from '@/lib/design/tokens';
import type { Citation } from '@/lib/citations/types';

export interface VerdictData {
  recommendation: string;
  probability: number;
  grade?: string;
  one_liner?: string;
  summary?: string;
  main_risk?: string;
  next_action?: string;
  citations?: Citation[];
  agent_scores?: AgentScore[];
  confidence_heatmap?: HeatmapClaim[];
  disclaimer?: string;
  calibration_adjusted?: boolean;
  calibration_note?: string;
  action_urgency?: string;
}

export interface AgentScore {
  agent_id: string;
  agent_name: string;
  position: string;
  confidence: number;
  key_argument?: string;
  category?: string;
}

export interface HeatmapClaim {
  claim: string;
  grade: 'consensus' | 'majority' | 'contested' | 'unsupported';
  agent_count: number;
  supporting_agents?: string[];
  contesting_agents?: string[];
}

interface VerdictCompactProps {
  verdict: VerdictData;
  simulationId?: string;
  conversationId?: string;
  onExpand: () => void;
  onShare: () => void;
  onRefine?: (modification: string) => void;
  onAgentChat?: (agentId: string, agentName: string) => void;
}

export default function VerdictCompact({
  verdict, simulationId, conversationId,
  onExpand, onShare, onRefine, onAgentChat,
}: VerdictCompactProps) {
  const rec = (verdict.recommendation || 'proceed').toLowerCase();
  const vColor = verdictColors[rec as keyof typeof verdictColors] || verdictColors.proceed;
  const prob = verdict.probability || 0;

  return (
    <div className="rounded-xl border border-accent/10 bg-surface-1 overflow-hidden shadow-sm">
      {/* Main section */}
      <div className="p-5 flex items-start gap-5">
        {/* Probability ring */}
        <div className="shrink-0">
          <CircularProgress value={prob} size={72} strokeWidth={5} color={vColor.solid} trackColor="var(--surface-2)">
            <span className="text-lg font-bold tabular-nums" style={{ color: vColor.solid }}>{prob}%</span>
          </CircularProgress>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <OctBadge verdict={rec as any} size="md">{rec.toUpperCase()}</OctBadge>
            {verdict.grade && <OctBadge grade={verdict.grade} size="sm">{verdict.grade}</OctBadge>}
            {verdict.calibration_adjusted && <OctBadge variant="outline" size="xs">Calibrated</OctBadge>}
          </div>

          {/* One-liner with citations */}
          <CitatedText
            text={verdict.one_liner || verdict.summary || ''}
            citations={verdict.citations}
            simulationId={simulationId}
            conversationId={conversationId}
            onAgentChat={onAgentChat}
            className="text-sm text-txt-primary leading-relaxed mb-2"
            as="p"
          />

          {/* Risk + Action */}
          <div className="space-y-1.5">
            {verdict.main_risk && (
              <div className="flex items-start gap-2">
                <span className="text-micro font-medium text-verdict-abandon shrink-0 mt-0.5">RISK</span>
                <CitatedText text={verdict.main_risk} citations={verdict.citations} onAgentChat={onAgentChat} className="text-xs text-txt-secondary" />
              </div>
            )}
            {verdict.next_action && (
              <div className="flex items-start gap-2">
                <span className="text-micro font-medium text-verdict-proceed shrink-0 mt-0.5">ACTION</span>
                <CitatedText text={verdict.next_action} citations={verdict.citations} onAgentChat={onAgentChat} className="text-xs text-txt-secondary" />
              </div>
            )}
            {verdict.action_urgency && (
              <p className="text-micro text-accent italic">{verdict.action_urgency}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
        <OctButton variant="ghost" size="xs" onClick={onExpand}>Expand</OctButton>
        <OctButton variant="ghost" size="xs" onClick={onShare}>Share</OctButton>
        {onRefine && (
          <OctButton variant="accent" size="xs" onClick={() => onRefine('What if...?')}>What if...?</OctButton>
        )}
        {verdict.disclaimer && (
          <span className="ml-auto text-micro text-txt-disabled max-w-[200px] truncate">{verdict.disclaimer}</span>
        )}
      </div>
    </div>
  );
}
