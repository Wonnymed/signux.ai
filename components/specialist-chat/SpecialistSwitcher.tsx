'use client';

import type { AgentStreamState, ChiefAssemblyState } from '@/lib/store/simulation';
import type { ChiefPanelSnapshot } from '@/lib/specialist-chat/types';
import { buildSpecialistChatPersona } from '@/lib/specialist-chat/persona';

export default function SpecialistSwitcher({
  agents,
  currentAgentId,
  chiefAssembly,
  chiefPanelSnapshot,
  onPick,
}: {
  agents: AgentStreamState[];
  currentAgentId: string;
  chiefAssembly: ChiefAssemblyState | null;
  chiefPanelSnapshot: ChiefPanelSnapshot | null;
  onPick: (agentId: string) => void;
}) {
  const complete = agents.filter((a) => a.status === 'complete' && a.agent_id !== 'decision_chair');
  if (complete.length <= 1) return null;

  return (
    <div className="space-y-1 border-t border-white/[0.06] p-3">
      <div className="mb-2 text-[10px] text-white/20">Switch to:</div>
      {complete
        .filter((a) => a.agent_id !== currentAgentId)
        .map((a) => {
          const p = buildSpecialistChatPersona(a, chiefAssembly, chiefPanelSnapshot);
          return (
            <button
              key={a.agent_id}
              type="button"
              onClick={() => onPick(a.agent_id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="min-w-0 text-left">
                <span className="text-[12px] text-white/50">{p.name}</span>
                <span className="ml-2 text-[10px] text-white/15">
                  {p.role.slice(0, 42)}
                  {p.role.length > 42 ? '…' : ''}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                  p.bias === 'bullish'
                    ? 'text-green-400/50'
                    : p.bias === 'bearish'
                      ? 'text-red-400/50'
                      : 'text-amber-400/50'
                }`}
              >
                {p.bias}
              </span>
            </button>
          );
        })}
    </div>
  );
}
