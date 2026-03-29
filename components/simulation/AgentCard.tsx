'use client';

/** Phase 1.1 — agent debate cards use shared radius + motion tokens. */
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Loader2, User,
} from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible';
import { verdictColors, getConfidenceLevel, AGENT_GRADIENTS } from '@/lib/design/tokens';
import type { AgentStreamState } from '@/lib/store/simulation';
import { useSimulationStore } from '@/lib/store/simulation';

// ═══ POSITION BADGE ═══

const POSITION_LABELS: Record<string, string> = {
  proceed: 'PROCEED',
  delay: 'DELAY',
  abandon: 'ABANDON',
};

function PositionBadge({ position }: { position: string }) {
  const colors = verdictColors[position as keyof typeof verdictColors];
  if (!colors) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="inline-flex items-center px-1.5 py-0.5 rounded-radius-sm text-[10px] font-bold tracking-wider"
      style={{ backgroundColor: colors.muted, color: colors.solid }}
    >
      {POSITION_LABELS[position] || position.toUpperCase()}
    </motion.span>
  );
}

// ═══ TREND ICON ═══

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (!trend || trend === 'stable') return <Minus size={10} className="text-txt-disabled" />;
  if (trend === 'up') return <TrendingUp size={10} className="text-verdict-proceed" />;
  return <TrendingDown size={10} className="text-verdict-abandon" />;
}

// ═══ AVATAR ═══

function AgentAvatar({ index, name }: { index: number; name: string }) {
  const gradient = AGENT_GRADIENTS[index % AGENT_GRADIENTS.length];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {initial || <User size={12} />}
    </div>
  );
}

// ═══ STREAMING CURSOR ═══

function StreamingText({ text }: { text: string }) {
  return (
    <p className="text-xs text-txt-secondary leading-relaxed">
      {text}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[2px] h-3 bg-accent ml-0.5 align-text-bottom"
      />
    </p>
  );
}

// ═══ AGENT CARD ═══

interface AgentCardProps {
  agent: AgentStreamState;
  index: number;
}

function AgentCardInner({ agent, index }: AgentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isComplete = agent.status === 'complete';
  const isStreaming = agent.status === 'streaming';
  const confidenceLevel = agent.confidence != null ? getConfidenceLevel(agent.confidence) : null;

  const simStatus = useSimulationStore((s) => s.status);
  const openSpecialistChat = useSimulationStore((s) => s.openSpecialistChat);
  const specialistChatOpen = useSimulationStore((s) => s.specialistChatOpen);
  const specialistChatAgentId = useSimulationStore((s) => s.specialistChatAgentId);
  const postVerdict = simStatus === 'complete';
  const canFollowUp =
    postVerdict && isComplete && agent.agent_id !== 'decision_chair';
  const isActiveChat = specialistChatOpen && specialistChatAgentId === agent.agent_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        canFollowUp && 'group/card',
        isActiveChat && 'relative z-[1]',
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'rounded-radius-lg border transition-colors duration-normal ease-out overflow-hidden',
            isStreaming && 'border-accent/30 bg-accent-subtle/10 ring-1 ring-inset ring-accent/15 shadow-premium',
            isComplete && 'border-border-subtle bg-surface-1/50',
            !isStreaming && !isComplete && 'border-border-subtle/50 bg-surface-1/30',
            canFollowUp && 'hover:border-white/15',
            isActiveChat && 'ring-2 ring-purple-400/25',
            specialistChatOpen && canFollowUp && !isActiveChat && 'opacity-50',
          )}
        >
          {/* ─── HEADER ─── */}
          <CollapsibleTrigger
            disabled={!isComplete || !agent.report}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-left',
              isComplete && agent.report && 'cursor-pointer hover:bg-surface-2/30',
              !(isComplete && agent.report) && 'cursor-default',
            )}
          >
            <AgentAvatar index={index} name={agent.agent_name} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-txt-primary truncate">
                  {agent.agent_name}
                </span>
                {agent.role && (
                  <span className="text-micro text-txt-disabled truncate hidden sm:block">
                    {agent.role}
                  </span>
                )}
              </div>

              {/* Position + Confidence row */}
              <div className="flex items-center gap-2 mt-0.5">
                {agent.position && <PositionBadge position={agent.position} />}
                {agent.confidence != null && (
                  <span
                    className={cn(
                      'text-micro tabular-nums font-medium',
                      confidenceLevel === 'high' ? 'text-verdict-proceed' :
                      confidenceLevel === 'medium' ? 'text-verdict-delay' :
                      'text-verdict-abandon',
                    )}
                  >
                    {agent.confidence}%
                  </span>
                )}
                {agent.trend && <TrendIcon trend={agent.trend} />}
              </div>
            </div>

            {/* Status indicator */}
            <div className="shrink-0 flex items-center gap-1.5">
              {canFollowUp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSpecialistChat(agent.agent_id);
                  }}
                  className="rounded-md border border-border-subtle/80 px-2 py-0.5 text-[10px] font-medium text-txt-tertiary transition-colors hover:border-accent/30 hover:text-accent"
                  title={`Chat with ${agent.agent_name}`}
                >
                  Chat
                </button>
              )}
              {isStreaming && (
                <Loader2 size={13} className="text-accent animate-spin" />
              )}
              {isComplete && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <CheckCircle2 size={13} className="text-verdict-proceed" />
                </motion.div>
              )}
              {isComplete && agent.report && (
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-txt-disabled transition-transform duration-normal',
                    isOpen && 'rotate-180',
                  )}
                />
              )}
            </div>
          </CollapsibleTrigger>
          {canFollowUp ? (
            <p className="pointer-events-none px-3 pb-1 text-[10px] text-txt-disabled opacity-0 transition-opacity group-hover/card:opacity-100">
              Chat with {agent.agent_name.split(' ')[0] || agent.agent_name}
            </p>
          ) : null}

          {/* ─── STREAMING TEXT ─── */}
          <AnimatePresence>
            {isStreaming && agent.partialResponse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-3 pb-2.5"
              >
                <div className="ml-[38px] max-h-20 overflow-hidden">
                  <StreamingText text={agent.partialResponse.slice(-200)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── EXPANDED REPORT ─── */}
          {isComplete && agent.report && (
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="px-3 pb-3 pt-0"
              >
                <div className="ml-[38px] space-y-2 border-t border-border-subtle/50 pt-2">
                  {agent.report.summary && (
                    <p className="text-xs text-txt-secondary leading-relaxed">
                      {agent.report.summary}
                    </p>
                  )}
                  {agent.report.key_arguments && Array.isArray(agent.report.key_arguments) && (
                    <ul className="space-y-1">
                      {agent.report.key_arguments.map((arg: string, i: number) => (
                        <li key={i} className="text-xs text-txt-tertiary flex gap-1.5">
                          <span className="text-txt-disabled shrink-0">•</span>
                          {arg}
                        </li>
                      ))}
                    </ul>
                  )}
                  {agent.report.risk_flag && (
                    <p className="text-micro text-verdict-abandon">
                      Risk: {agent.report.risk_flag}
                    </p>
                  )}
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </motion.div>
  );
}

const AgentCard = memo(AgentCardInner);
export default AgentCard;
