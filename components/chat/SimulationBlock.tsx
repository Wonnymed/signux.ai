'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/design/cn';
import { OctAvatar, OctBadge, OctCard, OctCollapsible, OctSkeleton } from '@/components/ui';
import { SteppedProgress, LinearProgress } from '@/components/ui';

interface SimulationBlockProps {
  question: string;
  streamUrl: string;
  octopusState: string;
  onComplete: (result: any, simulationId: string) => void;
  onStateChange?: (state: string) => void;
}

type Phase = { name: string; status: 'pending' | 'active' | 'complete'; description?: string };
type AgentReport = {
  agent_id: string; agent_name: string; position: string;
  confidence: number; key_argument: string; category?: string;
};
type ConsensusData = { proceed: number; delay: number; abandon: number; total: number };

export default function SimulationBlock({ question, streamUrl, octopusState, onComplete, onStateChange }: SimulationBlockProps) {
  const [phases, setPhases] = useState<Phase[]>([
    { name: 'Planning', status: 'active', description: 'Analyzing question...' },
    { name: 'Opening Analysis', status: 'pending' },
    { name: 'Adversarial Debate', status: 'pending' },
    { name: 'Convergence', status: 'pending' },
    { name: 'Verdict', status: 'pending' },
  ]);
  const [agents, setAgents] = useState<AgentReport[]>([]);
  const [consensus, setConsensus] = useState<ConsensusData>({ proceed: 0, delay: 0, abandon: 0, total: 0 });
  const [currentAgent, setCurrentAgent] = useState<string>('');
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!streamUrl) return;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
      } catch {}
    };

    es.onerror = () => {
      setError('Simulation stream disconnected. Please try again.');
      es.close();
    };

    return () => es.close();
  }, [streamUrl]);

  const handleSSEEvent = (data: any) => {
    switch (data.event || data.type) {
      case 'phase_start':
      case 'phase_started':
      case 'phase_update':
        setPhases(prev => prev.map(p => ({
          ...p,
          status: p.name.toLowerCase().includes((data.data?.phase || data.phase || '').toLowerCase())
            ? 'active'
            : p.status === 'active' ? 'complete' : p.status,
        })));
        onStateChange?.('diving');
        break;

      case 'agent_started':
        setCurrentAgent(data.data?.agent_name || data.agent_name || '');
        setStreamingText('');
        break;

      case 'agent_token':
        setStreamingText(prev => prev + (data.data?.token || data.token || ''));
        break;

      case 'agent_complete':
      case 'agent_report': {
        const report = data.data || data;
        setAgents(prev => [...prev, {
          agent_id: report.agent_id || `agent-${prev.length}`,
          agent_name: report.agent_name || `Agent ${prev.length + 1}`,
          position: report.position || 'analyzing',
          confidence: report.confidence || 0,
          key_argument: report.key_argument || report.summary || '',
          category: report.category,
        }]);
        setCurrentAgent('');
        setStreamingText('');
        updateConsensus(report.position);
        break;
      }

      case 'verdict':
      case 'simulation_complete':
      case 'sim_complete':
        setPhases(prev => prev.map(p => ({ ...p, status: 'complete' })));
        onComplete(data.data || data.result || data, data.data?.simulation_id || '');
        onStateChange?.('resting');
        break;

      case 'error':
        setError(data.data?.message || data.message || 'Simulation failed');
        break;
    }
  };

  const updateConsensus = (position: string) => {
    setConsensus(prev => {
      const next = { ...prev, total: prev.total + 1 };
      const key = position?.toLowerCase();
      if (key === 'proceed') next.proceed++;
      else if (key === 'delay') next.delay++;
      else if (key === 'abandon') next.abandon++;
      return next;
    });
  };

  return (
    <div className="mb-4 animate-slide-in-up">
      <OctCard variant="outline" padding="none" className="overflow-hidden border-accent/20">
        {/* Header */}
        <div className="px-4 py-3 bg-accent-subtle/50 border-b border-border-subtle flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center animate-pulse-accent">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-accent">
              <path d="M6 0L1 3v4l5 3 5-3V3L6 0z" opacity="0.5" />
              <path d="M6 2L3 4v3l3 2 3-2V4L6 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-txt-primary truncate">Deep Simulation</p>
            <p className="text-micro text-txt-tertiary truncate">{question}</p>
          </div>
        </div>

        {/* Progress phases */}
        <div className="px-4 py-3 border-b border-border-subtle">
          <SteppedProgress steps={phases.map(p => ({ label: p.name, status: p.status, description: p.description }))} />
        </div>

        {/* Agent cards */}
        {(agents.length > 0 || currentAgent) && (
          <div className="px-4 py-3 space-y-2 border-b border-border-subtle">
            {agents.map((agent, i) => (
              <AgentReportCard key={agent.agent_id} agent={agent} index={i} />
            ))}

            {/* Currently streaming agent */}
            {currentAgent && (
              <div className="p-3 rounded-lg bg-surface-2/50 border border-border-subtle animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <OctSkeleton variant="avatar" className="w-6 h-6" />
                  <span className="text-xs font-medium text-txt-secondary">{currentAgent}</span>
                  <span className="text-micro text-accent animate-pulse-accent">analyzing...</span>
                </div>
                {streamingText && (
                  <p className="text-xs text-txt-tertiary leading-relaxed">
                    {streamingText}
                    <span className="inline-block w-0.5 h-3 bg-accent animate-pulse-accent ml-0.5 align-text-bottom" />
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Consensus tracker */}
        {consensus.total > 0 && (
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-micro font-medium text-txt-secondary">Consensus</span>
              <span className="text-micro text-txt-disabled">{consensus.total} agents</span>
            </div>
            <div className="space-y-1.5">
              <ConsensusBar label="Proceed" count={consensus.proceed} total={consensus.total} color="bg-verdict-proceed" />
              <ConsensusBar label="Delay" count={consensus.delay} total={consensus.total} color="bg-verdict-delay" />
              <ConsensusBar label="Abandon" count={consensus.abandon} total={consensus.total} color="bg-verdict-abandon" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-verdict-abandon/5 border-t border-verdict-abandon/20">
            <p className="text-xs text-verdict-abandon">{error}</p>
          </div>
        )}
      </OctCard>
    </div>
  );
}

// --- Agent report card ---
function AgentReportCard({ agent, index }: { agent: AgentReport; index: number }) {
  const posColor = agent.position.toLowerCase() === 'proceed' ? 'proceed' :
    agent.position.toLowerCase() === 'delay' ? 'delay' : 'abandon';

  return (
    <OctCollapsible
      trigger={
        <div className="flex items-center gap-2 w-full py-0.5">
          <OctAvatar
            type="agent"
            category={(agent.category as any) || 'business'}
            agentIndex={index}
            name={agent.agent_name}
            size="xs"
          />
          <span className="text-xs font-medium text-txt-primary truncate flex-1">{agent.agent_name}</span>
          <OctBadge verdict={posColor as any} size="xs">{agent.position.toUpperCase()}</OctBadge>
          <OctBadge
            confidence={agent.confidence >= 7 ? 'high' : agent.confidence >= 4 ? 'medium' : 'low'}
            size="xs"
          >
            {agent.confidence}/10
          </OctBadge>
        </div>
      }
      className={cn('p-2.5 rounded-lg bg-surface-1 border border-border-subtle', `stagger-${Math.min(index + 1, 10)} animate-slide-in-up`)}
    >
      <p className="text-xs text-txt-secondary leading-relaxed pl-7">{agent.key_argument}</p>
    </OctCollapsible>
  );
}

// --- Consensus bar ---
function ConsensusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-micro text-txt-tertiary w-14">{label}</span>
      <LinearProgress value={pct} color={color} size="sm" className="flex-1" />
      <span className="text-micro text-txt-disabled w-6 text-right">{count}</span>
    </div>
  );
}
