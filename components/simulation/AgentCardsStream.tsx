'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { cn } from '@/lib/design/cn';
import { useSimulationStore } from '@/lib/store/simulation';
import { verdictColors } from '@/lib/design/tokens';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import AgentCard from './AgentCard';

const MAX_VISIBLE = 6;

// ═══ SKELETON PLACEHOLDER ═══

function AgentCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-border-subtle/50 bg-surface-1/30 p-3"
    >
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-7 h-7 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    </motion.div>
  );
}

// ═══ HIDDEN AGENTS BAR ═══

function HiddenAgentsBar({
  hiddenAgents,
}: {
  hiddenAgents: { position?: string; agent_name: string }[];
}) {
  const grouped = useMemo(() => {
    const g: Record<string, number> = { proceed: 0, delay: 0, abandon: 0 };
    for (const a of hiddenAgents) {
      if (a.position && g[a.position] !== undefined) g[a.position]++;
    }
    return g;
  }, [hiddenAgents]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-3 py-2 px-3 rounded-lg bg-surface-1/50 border border-border-subtle/50"
    >
      <span className="text-micro text-txt-disabled">
        +{hiddenAgents.length} more
      </span>
      <div className="flex gap-1">
        {Object.entries(grouped)
          .filter(([, count]) => count > 0)
          .map(([position, count]) => {
            const colors = verdictColors[position as keyof typeof verdictColors];
            return (
              <span
                key={position}
                className="text-micro font-medium tabular-nums"
                style={{ color: colors?.solid }}
              >
                {count}
              </span>
            );
          })}
      </div>
    </motion.div>
  );
}

// ═══ MAIN COMPONENT ═══

export default function AgentCardsStream() {
  const agents = useSimulationStore((s) => s.agents);
  const status = useSimulationStore((s) => s.status);

  // Sort: streaming → complete → pending
  const sortedAgents = useMemo(() => {
    const arr = Array.from(agents.values());
    const order: Record<string, number> = { streaming: 0, complete: 1, pending: 2 };
    return arr.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
  }, [agents]);

  const agentCount = sortedAgents.length;
  const visibleAgents = sortedAgents.slice(0, MAX_VISIBLE);
  const hiddenAgents = sortedAgents.slice(MAX_VISIBLE);
  const completedCount = sortedAgents.filter((a) => a.status === 'complete').length;

  // Show skeletons during early phases
  const showSkeletons =
    agentCount === 0 &&
    status !== 'idle' &&
    status !== 'complete' &&
    status !== 'error';

  if (status === 'idle') return null;

  return (
    <div className="space-y-2">
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-2">
        <Users size={14} className="text-txt-tertiary" />
        <span className="text-xs font-medium text-txt-secondary">
          Agent Reports
        </span>
        {agentCount > 0 && (
          <span className="text-micro text-txt-disabled tabular-nums ml-auto">
            {completedCount}/{agentCount}
          </span>
        )}
      </div>

      {/* ─── CARDS ─── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleAgents.map((agent, i) => (
            <AgentCard key={agent.agent_id} agent={agent} index={i} />
          ))}
        </AnimatePresence>

        {showSkeletons && (
          <>
            <AgentCardSkeleton index={0} />
            <AgentCardSkeleton index={1} />
            <AgentCardSkeleton index={2} />
          </>
        )}

        {hiddenAgents.length > 0 && <HiddenAgentsBar hiddenAgents={hiddenAgents} />}
      </div>
    </div>
  );
}
