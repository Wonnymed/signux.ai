'use client';

import { useState, useCallback } from 'react';
import VerdictCompact from '@/components/verdict/VerdictCompact';
import VerdictExpanded from '@/components/verdict/VerdictExpanded';
import type { VerdictData } from '@/components/verdict/VerdictCompact';

interface VerdictCardProps {
  verdict: any;
  simulationId?: string;
  conversationId?: string;
  onRefine?: (modification: string) => void;
}

export default function VerdictCard({ verdict, simulationId, conversationId, onRefine }: VerdictCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!verdict) return null;

  // Normalize verdict data
  const data: VerdictData = {
    recommendation: verdict.recommendation || 'proceed',
    probability: verdict.probability || 0,
    grade: verdict.grade,
    one_liner: verdict.one_liner || verdict.summary,
    summary: verdict.summary,
    main_risk: verdict.main_risk,
    next_action: verdict.next_action,
    citations: verdict.citations || [],
    agent_scores: verdict.agent_scores || [],
    confidence_heatmap: verdict.confidence_heatmap || [],
    disclaimer: verdict.disclaimer,
    calibration_adjusted: verdict.calibration_adjusted,
    calibration_note: verdict.calibration_note,
    action_urgency: verdict.action_urgency,
  };

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/c/${conversationId}/report`;
    if (navigator.share) {
      navigator.share({ title: 'Octux Decision Report', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [conversationId]);

  const handleAgentChat = useCallback((agentId: string, agentName: string) => {
    window.dispatchEvent(new CustomEvent('octux:agent-chat', {
      detail: { agentId, agentName, simulationId, conversationId },
    }));
  }, [simulationId, conversationId]);

  return (
    <div className="mb-4">
      {expanded ? (
        <VerdictExpanded
          verdict={data}
          simulationId={simulationId}
          conversationId={conversationId}
          onCollapse={() => setExpanded(false)}
          onShare={handleShare}
          onRefine={onRefine}
          onAgentChat={handleAgentChat}
        />
      ) : (
        <VerdictCompact
          verdict={data}
          simulationId={simulationId}
          conversationId={conversationId}
          onExpand={() => setExpanded(true)}
          onShare={handleShare}
          onRefine={onRefine}
          onAgentChat={handleAgentChat}
        />
      )}
    </div>
  );
}
