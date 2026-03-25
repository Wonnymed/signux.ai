'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';
import { OctTabs, OctBadge, OctAvatar, OctButton, OctCard } from '@/components/ui';
import { CircularProgress } from '@/components/ui';
import { CitatedText, CitationFootnotes } from '@/components/citations';
import { verdictColors } from '@/lib/design/tokens';
import type { VerdictData, AgentScore, HeatmapClaim } from './VerdictCompact';
import type { Citation } from '@/lib/citations/types';

interface VerdictExpandedProps {
  verdict: VerdictData;
  simulationId?: string;
  conversationId?: string;
  onCollapse: () => void;
  onShare: () => void;
  onRefine?: (modification: string) => void;
  onAgentChat?: (agentId: string, agentName: string) => void;
}

export default function VerdictExpanded({
  verdict, simulationId, conversationId,
  onCollapse, onShare, onRefine, onAgentChat,
}: VerdictExpandedProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const rec = (verdict.recommendation || 'proceed').toLowerCase();
  const vColor = verdictColors[rec as keyof typeof verdictColors] || verdictColors.proceed;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'agents', label: 'Agents', badge: verdict.agent_scores?.length },
    { id: 'risk', label: 'Risk Matrix', badge: verdict.confidence_heatmap?.length },
    { id: 'actions', label: 'Actions' },
    { id: 'citations', label: 'Sources', badge: verdict.citations?.length },
  ];

  return (
    <div className="rounded-xl border border-accent/15 bg-surface-1 overflow-hidden shadow-md animate-scale-in">
      {/* Header with verdict ring */}
      <div className="p-5 bg-accent-subtle/30 border-b border-border-subtle">
        <div className="flex items-start gap-5">
          <CircularProgress value={verdict.probability || 0} size={88} strokeWidth={6} color={vColor.solid} trackColor="var(--surface-2)">
            <div className="text-center">
              <span className="text-2xl font-bold tabular-nums" style={{ color: vColor.solid }}>{verdict.probability}%</span>
            </div>
          </CircularProgress>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <OctBadge verdict={rec as any} size="md">{rec.toUpperCase()}</OctBadge>
              {verdict.grade && <OctBadge grade={verdict.grade} size="md">{verdict.grade}</OctBadge>}
              {verdict.calibration_adjusted && (
                <OctBadge variant="outline" size="xs">{verdict.calibration_note || 'Calibrated'}</OctBadge>
              )}
            </div>
            <CitatedText
              text={verdict.one_liner || verdict.summary || ''}
              citations={verdict.citations}
              onAgentChat={onAgentChat}
              className="text-sm text-txt-primary leading-relaxed"
              as="p"
            />
          </div>

          <OctButton variant="ghost" size="xs" onClick={onCollapse}>Collapse</OctButton>
        </div>
      </div>

      {/* Tabs */}
      <OctTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} size="sm" className="px-5" />

      {/* Tab content */}
      <div className="p-5 min-h-[200px]">
        {activeTab === 'summary' && <SummaryTab verdict={verdict} onAgentChat={onAgentChat} />}
        {activeTab === 'agents' && <AgentsTab agents={verdict.agent_scores || []} onAgentChat={onAgentChat} />}
        {activeTab === 'risk' && <RiskTab claims={verdict.confidence_heatmap || []} />}
        {activeTab === 'actions' && <ActionsTab verdict={verdict} onAgentChat={onAgentChat} />}
        {activeTab === 'citations' && <CitationsTab citations={verdict.citations || []} onAgentChat={onAgentChat} />}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
        <OctButton variant="ghost" size="xs" onClick={onShare}>Share report</OctButton>
        <OctButton variant="ghost" size="xs" onClick={() => window.open(`/c/${conversationId}/report`, '_blank')}>
          Boardroom view
        </OctButton>
        {onRefine && (
          <OctButton variant="accent" size="xs" onClick={() => onRefine('What if...?')}>What if...?</OctButton>
        )}
        {verdict.disclaimer && (
          <span className="ml-auto text-micro text-txt-disabled">{verdict.disclaimer}</span>
        )}
      </div>
    </div>
  );
}

// ═══ TAB COMPONENTS ═══

function SummaryTab({ verdict, onAgentChat }: { verdict: VerdictData; onAgentChat?: (id: string, name: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {verdict.main_risk && (
          <OctCard variant="outline" padding="sm" className="border-verdict-abandon/20">
            <span className="text-micro font-medium text-verdict-abandon">KEY RISK</span>
            <CitatedText text={verdict.main_risk} citations={verdict.citations} onAgentChat={onAgentChat} className="text-xs text-txt-secondary mt-1 block" as="p" />
          </OctCard>
        )}
        {verdict.next_action && (
          <OctCard variant="outline" padding="sm" className="border-verdict-proceed/20">
            <span className="text-micro font-medium text-verdict-proceed">NEXT ACTION</span>
            <CitatedText text={verdict.next_action} citations={verdict.citations} onAgentChat={onAgentChat} className="text-xs text-txt-secondary mt-1 block" as="p" />
          </OctCard>
        )}
      </div>

      {verdict.agent_scores && verdict.agent_scores.length > 0 && (
        <div>
          <span className="text-micro font-medium text-txt-tertiary mb-2 block">Agent Consensus</span>
          <div className="flex flex-wrap gap-1.5">
            {verdict.agent_scores.map((a) => (
              <button
                key={a.agent_id}
                onClick={() => onAgentChat?.(a.agent_id, a.agent_name)}
                className="cursor-pointer hover:ring-1 hover:ring-accent/30 rounded-sm transition-shadow"
              >
                <OctBadge verdict={a.position?.toLowerCase() as any} size="xs">
                  {a.agent_name.split(' ').map(w => w[0]).join('')} {a.confidence}/10
                </OctBadge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentsTab({ agents, onAgentChat }: { agents: AgentScore[]; onAgentChat?: (id: string, name: string) => void }) {
  const sorted = [...agents].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_80px_60px_60px] gap-2 px-3 py-1.5 text-micro font-medium text-txt-tertiary border-b border-border-subtle">
        <span>Agent</span>
        <span>Position</span>
        <span className="text-right">Conf.</span>
        <span className="text-right">Action</span>
      </div>

      {sorted.map((agent, i) => (
        <div
          key={agent.agent_id}
          className="grid grid-cols-[1fr_80px_60px_60px] gap-2 px-3 py-2 rounded-md hover:bg-surface-2/50 transition-colors duration-normal items-center"
        >
          <div className="flex items-center gap-2 min-w-0">
            <OctAvatar
              type="agent"
              category={(agent.category as any) || 'business'}
              agentIndex={i}
              name={agent.agent_name}
              size="xs"
            />
            <div className="min-w-0">
              <span className="text-xs text-txt-primary truncate block">{agent.agent_name}</span>
              {agent.key_argument && (
                <span className="text-micro text-txt-tertiary truncate block">{agent.key_argument}</span>
              )}
            </div>
          </div>
          <OctBadge verdict={agent.position?.toLowerCase() as any} size="xs">
            {agent.position?.toUpperCase()}
          </OctBadge>
          <div className="text-right">
            <OctBadge
              confidence={agent.confidence >= 7 ? 'high' : agent.confidence >= 4 ? 'medium' : 'low'}
              size="xs"
            >
              {agent.confidence}/10
            </OctBadge>
          </div>
          <div className="text-right">
            <button
              onClick={() => onAgentChat?.(agent.agent_id, agent.agent_name)}
              className="text-micro text-accent hover:text-accent-hover transition-colors"
            >
              Chat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskTab({ claims }: { claims: HeatmapClaim[] }) {
  if (claims.length === 0) {
    return <p className="text-xs text-txt-tertiary">No confidence heatmap available for this simulation.</p>;
  }

  const gradeConfig: Record<string, { bg: string; border: string; label: string }> = {
    consensus: { bg: 'bg-confidence-high/8', border: 'border-confidence-high/20', label: 'Consensus' },
    majority: { bg: 'bg-confidence-medium/8', border: 'border-confidence-medium/20', label: 'Majority' },
    contested: { bg: 'bg-confidence-contested/8', border: 'border-confidence-contested/20', label: 'Contested' },
    unsupported: { bg: 'bg-surface-2', border: 'border-border-subtle', label: 'Unsupported' },
  };

  const sortOrder: Record<string, number> = { contested: 0, unsupported: 1, majority: 2, consensus: 3 };
  const sorted = [...claims].sort((a, b) => (sortOrder[a.grade] ?? 4) - (sortOrder[b.grade] ?? 4));

  return (
    <div className="space-y-2">
      <p className="text-micro text-txt-tertiary mb-3">Claims ranked by agent agreement level. Contested claims need attention.</p>
      {sorted.map((claim, i) => {
        const config = gradeConfig[claim.grade] || gradeConfig.unsupported;
        return (
          <div key={i} className={cn('px-3 py-2.5 rounded-lg border', config.bg, config.border)}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-txt-primary leading-relaxed flex-1">{claim.claim}</p>
              <OctBadge
                confidence={claim.grade === 'consensus' ? 'high' : claim.grade === 'majority' ? 'medium' : 'contested'}
                size="xs"
                className="shrink-0"
              >
                {config.label}
              </OctBadge>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-micro text-txt-disabled">{claim.agent_count} agents</span>
              {claim.contesting_agents && claim.contesting_agents.length > 0 && (
                <span className="text-micro text-confidence-contested">
                  Disputed by: {claim.contesting_agents.join(', ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionsTab({ verdict, onAgentChat }: { verdict: VerdictData; onAgentChat?: (id: string, name: string) => void }) {
  const actionText = verdict.next_action || 'No specific actions recommended.';
  const steps = actionText.split(/\d+\.\s+/).filter(Boolean);

  return (
    <div className="space-y-4">
      <OctCard variant="accent" padding="sm">
        <span className="text-micro font-medium text-accent">RECOMMENDED NEXT STEP</span>
        <p className="text-sm text-txt-primary mt-1">{steps[0] || actionText}</p>
      </OctCard>

      {steps.length > 1 && (
        <div className="space-y-2">
          <span className="text-micro font-medium text-txt-tertiary">Follow-up actions</span>
          {steps.slice(1).map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className="w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center text-micro text-txt-tertiary shrink-0">
                {i + 2}
              </span>
              <p className="text-xs text-txt-secondary leading-relaxed">{step.trim()}</p>
            </div>
          ))}
        </div>
      )}

      {verdict.main_risk && (
        <OctCard variant="outline" padding="sm" className="border-verdict-abandon/20">
          <span className="text-micro font-medium text-verdict-abandon">RISK TO MONITOR</span>
          <CitatedText text={verdict.main_risk} citations={verdict.citations} onAgentChat={onAgentChat} className="text-xs text-txt-secondary mt-1 block" as="p" />
        </OctCard>
      )}

      {verdict.action_urgency && (
        <p className="text-micro text-accent border-l-2 border-accent/30 pl-2">{verdict.action_urgency}</p>
      )}
    </div>
  );
}

function CitationsTab({ citations, onAgentChat }: { citations: Citation[]; onAgentChat?: (id: string, name: string) => void }) {
  if (citations.length === 0) {
    return <p className="text-xs text-txt-tertiary">No citations available.</p>;
  }

  return (
    <CitationFootnotes citations={citations} defaultOpen={true} onAgentChat={onAgentChat} className="border-0 pt-0 mt-0" />
  );
}
