'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useSimulationStore } from '@/lib/store/simulation';
import { verdictColors, AGENT_GRADIENTS } from '@/lib/design/tokens';

// ═══ POSITION GROUPS ═══

const POSITION_ORDER: Array<'proceed' | 'delay' | 'abandon'> = ['proceed', 'delay', 'abandon'];
const POSITION_LABELS: Record<string, string> = {
  proceed: 'Proceed',
  delay: 'Delay',
  abandon: 'Abandon',
};

// ═══ MAIN COMPONENT ═══

export default function AgentScoreboard() {
  const agents = useSimulationStore((s) => s.agents);
  const status = useSimulationStore((s) => s.status);
  const openSpecialistChat = useSimulationStore((s) => s.openSpecialistChat);

  const grouped = useMemo(() => {
    const groups: Record<string, { agent_id: string; agent_name: string; confidence?: number; index: number }[]> = {
      proceed: [],
      delay: [],
      abandon: [],
    };

    const arr = Array.from(agents.values());
    arr.forEach((agent, i) => {
      const pos = agent.position || 'abandon';
      if (groups[pos]) {
        groups[pos].push({
          agent_id: agent.agent_id,
          agent_name: agent.agent_name,
          confidence: agent.confidence,
          index: i,
        });
      }
    });

    return groups;
  }, [agents]);

  const totalAgents = agents.size;

  if (status !== 'complete' || totalAgents === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-radius-lg border border-border-subtle bg-surface-1/50 p-3 space-y-3"
    >
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-2">
        <Trophy size={14} className="text-accent" />
        <span className="text-xs font-medium text-txt-secondary">
          Agent Scoreboard
        </span>
        <span className="text-micro text-txt-disabled ml-auto tabular-nums">
          {totalAgents} agents
        </span>
      </div>

      {/* ─── POSITION GROUPS ─── */}
      <div className="space-y-2">
        {POSITION_ORDER.map((position) => {
          const group = grouped[position];
          if (!group || group.length === 0) return null;

          const colors = verdictColors[position];
          const pct = Math.round((group.length / totalAgents) * 100);

          return (
            <div key={position} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors.solid }}
                  />
                  <span className="text-xs font-medium" style={{ color: colors.solid }}>
                    {POSITION_LABELS[position]}
                  </span>
                  <span className="text-micro text-txt-disabled tabular-nums">
                    {group.length}/{totalAgents}
                  </span>
                </div>
                <span className="text-micro text-txt-disabled tabular-nums">
                  {pct}%
                </span>
              </div>

              {/* Agent dots row */}
              <div className="flex items-center gap-1 ml-4">
                {group.map((agent) => {
                  const gradient = AGENT_GRADIENTS[agent.index % AGENT_GRADIENTS.length];
                  const isChair = agent.agent_id === 'decision_chair';
                  return (
                    <motion.div
                      key={agent.agent_id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="group relative"
                    >
                      <button
                        type="button"
                        disabled={isChair}
                        onClick={() => !isChair && openSpecialistChat(agent.agent_id)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${isChair ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
                      >
                        {agent.agent_name.charAt(0).toUpperCase()}
                      </button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-surface-3 border border-border-subtle rounded text-micro text-txt-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {isChair ? agent.agent_name : `Chat with ${agent.agent_name.split(' ')[0]}`}
                        {agent.confidence != null && ` · ${agent.confidence}%`}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bar */}
              <div className="ml-4 h-1 rounded-full bg-surface-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors.solid }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
