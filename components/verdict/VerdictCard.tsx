'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Share2, MessageSquare,
  RefreshCcw, AlertTriangle, Target, Shield,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { EASE_SPRING, TRANSITION } from '@/lib/motion/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { Separator } from '@/components/ui/shadcn/separator';
import { OctButton } from '@/components/octux';
import { verdictColors, verdictLabels } from '@/lib/design/tokens';
import type { VerdictResult, Citation, RiskEntry } from '@/lib/simulation/events';
import AgentScoreboard from '@/components/simulation/AgentScoreboard';
import ProbabilityRing from './ProbabilityRing';
import RefinementInput from './RefinementInput';

interface VerdictCardProps {
  verdict: VerdictResult;
  simulationId?: string | null;
  conversationId: string;
  onRefine?: (simulationId: string, modification: string) => void;
  onShare?: () => void;
  onAgentChat?: (agentName: string) => void;
  className?: string;
}

export default function VerdictCard({
  verdict, simulationId, conversationId,
  onRefine, onShare, onAgentChat, className,
}: VerdictCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRefine, setShowRefine] = useState(false);

  if (!verdict) return null;

  const rec = verdict.recommendation || 'proceed';
  const color = verdictColors[rec]?.solid || verdictColors.proceed.solid;
  const label = verdictLabels[rec] || 'UNKNOWN';
  const prob = verdict.probability || 0;
  const grade = verdict.grade || '?';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={TRANSITION.reveal}
      className={cn('my-4', className)}
    >
      <div
        className="rounded-radius-xl border-2 overflow-hidden transition-colors duration-normal ease-out shadow-premium"
        style={{ borderColor: `${color}30` }}
      >
        {/* ═══ COMPACT VIEW ═══ */}
        <div className="p-4 sm:p-5" style={{ backgroundColor: `${color}08` }}>
          <div className="flex items-start gap-4">
            <ProbabilityRing
              value={prob}
              color={color}
              size={64}
              className="shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.6,
                    ease: EASE_SPRING,
                  }}
                  className="rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{ color, backgroundColor: `${color}15` }}
                >
                  {label}
                </motion.span>
                <span className="text-lg font-light text-txt-primary tabular-nums">
                  {prob}%
                </span>
                <span
                  className="text-sm font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: '#C75B2A', backgroundColor: 'rgba(124,58,237,0.1)' }}
                >
                  {grade}
                </span>
              </div>

              {verdict.one_liner && (
                <p className="text-sm text-txt-secondary leading-relaxed mb-2">
                  {verdict.one_liner}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs">
                {verdict.main_risk && (
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-verdict-abandon shrink-0" />
                    <span className="text-txt-tertiary">
                      <span className="font-medium text-verdict-abandon">Risk:</span>{' '}
                      {verdict.main_risk}
                    </span>
                  </div>
                )}
                {verdict.next_action && (
                  <div className="flex items-center gap-1.5">
                    <Target size={12} className="text-verdict-proceed shrink-0" />
                    <span className="text-txt-tertiary">
                      <span className="font-medium text-verdict-proceed">Next:</span>{' '}
                      {verdict.next_action}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── ACTION BUTTONS ─── */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <OctButton
              variant="outline"
              size="xs"
              onClick={() => setShowRefine(!showRefine)}
            >
              <RefreshCcw size={12} className="mr-1" />
              What if...?
            </OctButton>

            <OctButton
              variant="outline"
              size="xs"
              onClick={() => {
                if (onShare) onShare();
                else if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}/c/${conversationId}/report`);
                }
              }}
            >
              <Share2 size={12} className="mr-1" />
              Share
            </OctButton>

            {onAgentChat && verdict.agent_scoreboard && verdict.agent_scoreboard.length > 0 && (
              <OctButton
                variant="outline"
                size="xs"
                onClick={() => onAgentChat(verdict.agent_scoreboard![0].agent_name)}
              >
                <MessageSquare size={12} className="mr-1" />
                Talk to agents
              </OctButton>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-micro text-txt-tertiary hover:text-txt-secondary transition-colors"
            >
              {expanded ? 'Collapse' : 'Full analysis'}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* ─── REFINEMENT INPUT ─── */}
        {showRefine && simulationId && onRefine && (
          <RefinementInput
            simulationId={simulationId}
            onRefine={(mod) => {
              onRefine(simulationId, mod);
              setShowRefine(false);
            }}
            onCancel={() => setShowRefine(false)}
          />
        )}

        {/* ═══ EXPANDED VIEW ═══ */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Separator style={{ backgroundColor: `${color}15` }} />
            <ExpandedAnalysis verdict={verdict} onAgentChat={onAgentChat} />
          </motion.div>
        )}

        {/* ─── DISCLAIMER ─── */}
        {verdict.disclaimer && (
          <div className="px-4 sm:px-5 py-2.5 bg-verdict-delay/5 border-t border-verdict-delay/10">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="text-verdict-delay shrink-0 mt-0.5" />
              <p className="text-micro text-verdict-delay leading-relaxed">
                {verdict.disclaimer}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══ EXPANDED ANALYSIS (5 TABS) ═══

function ExpandedAnalysis({
  verdict,
  onAgentChat,
}: {
  verdict: VerdictResult;
  onAgentChat?: (agentName: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-surface-2/50 p-0.5 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="overview" className="text-xs px-3 py-1.5">
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-xs px-3 py-1.5">
            Agents ({verdict.agent_scoreboard?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs px-3 py-1.5">
            Evidence ({verdict.citations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-xs px-3 py-1.5">
            Risks
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs px-3 py-1.5">
            Action Plan
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          <div>
            <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider">Summary</span>
            <p className="text-sm text-txt-primary leading-relaxed mt-1">
              {verdict.one_liner}
            </p>
          </div>
          {verdict.main_risk && (
            <div>
              <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider" style={{ color: 'var(--verdict-abandon)' }}>Primary Risk</span>
              <p className="text-xs text-txt-secondary leading-relaxed mt-1">{verdict.main_risk}</p>
            </div>
          )}
          {verdict.next_action && (
            <div>
              <span className="text-micro font-medium text-txt-disabled uppercase tracking-wider" style={{ color: 'var(--verdict-proceed)' }}>Recommended Action</span>
              <p className="text-xs text-txt-secondary leading-relaxed mt-1">{verdict.next_action}</p>
            </div>
          )}
        </TabsContent>

        {/* Agents */}
        <TabsContent value="agents" className="mt-3">
          {verdict.agent_scoreboard && verdict.agent_scoreboard.length > 0 ? (
            <div className="space-y-3">
              <AgentScoreboard />
              {onAgentChat && (
                <div className="pt-2 border-t border-border-subtle/50">
                  <span className="text-micro text-txt-disabled mb-2 block">
                    Click an agent to discuss their analysis:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {verdict.agent_scoreboard.slice(0, 5).map((agent) => (
                      <button
                        key={agent.agent_name}
                        onClick={() => onAgentChat(agent.agent_name)}
                        className="text-micro px-2 py-1 rounded-md border border-border-subtle text-txt-tertiary hover:text-accent hover:border-accent/30 transition-colors"
                      >
                        {agent.agent_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-txt-disabled">No agent data available</p>
          )}
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence" className="mt-3">
          {verdict.citations && verdict.citations.length > 0 ? (
            <div className="space-y-2.5">
              {verdict.citations.map((cite, i) => (
                <CitationRow key={i} citation={cite} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-txt-disabled">No citations available. Citations are generated during Deep and Kraken simulations.</p>
          )}
        </TabsContent>

        {/* Risks */}
        <TabsContent value="risks" className="mt-3">
          {verdict.risk_matrix && verdict.risk_matrix.length > 0 ? (
            <div className="space-y-2">
              {verdict.risk_matrix.map((risk, i) => (
                <RiskRow key={i} risk={risk} index={i} />
              ))}
            </div>
          ) : verdict.main_risk ? (
            <div className="space-y-2">
              <RiskRow
                risk={{ risk: verdict.main_risk, severity: 'high', agent_source: 'Analysis' }}
                index={0}
              />
            </div>
          ) : (
            <p className="text-xs text-txt-disabled">No risks identified</p>
          )}
        </TabsContent>

        {/* Action Plan */}
        <TabsContent value="actions" className="mt-3">
          {verdict.action_plan && verdict.action_plan.length > 0 ? (
            <div className="space-y-2">
              {verdict.action_plan.map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-micro font-bold text-accent tabular-nums shrink-0 mt-0.5 w-5 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs text-txt-secondary leading-relaxed">{action}</p>
                </motion.div>
              ))}
            </div>
          ) : verdict.next_action ? (
            <div className="flex items-start gap-3">
              <span className="text-micro font-bold text-accent tabular-nums shrink-0 mt-0.5">01</span>
              <p className="text-xs text-txt-secondary leading-relaxed">{verdict.next_action}</p>
            </div>
          ) : (
            <p className="text-xs text-txt-disabled">No action plan available</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══ CITATION ROW ═══

function CitationRow({ citation, index }: { citation: Citation; index: number }) {
  const confColor = citation.confidence >= 7
    ? 'var(--confidence-high)'
    : citation.confidence >= 4
    ? 'var(--confidence-medium)'
    : 'var(--confidence-contested)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/30 border border-border-subtle/50"
    >
      <span className="text-micro font-bold text-accent bg-accent/10 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
        {citation.id || index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-txt-primary">{citation.agent_name}</span>
          <span className="text-micro font-bold tabular-nums" style={{ color: confColor }}>
            {citation.confidence}/10
          </span>
          <span className="text-micro text-txt-disabled">Round {citation.round}</span>
        </div>
        <p className="text-xs text-txt-secondary leading-relaxed">{citation.claim}</p>
        {citation.supporting_data && (
          <p className="text-micro text-txt-disabled mt-1 border-l-2 border-accent/20 pl-2">
            {citation.supporting_data}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ═══ RISK ROW ═══

function RiskRow({ risk, index }: { risk: RiskEntry; index: number }) {
  const severityStyles: Record<string, string> = {
    high: 'bg-verdict-abandon/15 text-verdict-abandon border-verdict-abandon/20',
    medium: 'bg-verdict-delay/15 text-verdict-delay border-verdict-delay/20',
    low: 'bg-surface-2 text-txt-tertiary border-border-subtle',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3"
    >
      <span className={cn(
        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5',
        severityStyles[risk.severity] || severityStyles.low,
      )}>
        {risk.severity}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-txt-secondary">{risk.risk}</p>
        {risk.agent_source && (
          <span className="text-micro text-txt-disabled">Source: {risk.agent_source}</span>
        )}
      </div>
    </motion.div>
  );
}
