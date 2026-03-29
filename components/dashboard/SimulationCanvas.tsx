'use client';

import { useSimulationStore } from '@/lib/store/simulation';
import SpecialistChatHost from '@/components/specialist-chat/SpecialistChatHost';
import { cn } from '@/lib/design/cn';

/**
 * Compact specialist strip + post-verdict chat entry points.
 * Full particle canvas was removed in a prior refactor; this preserves UX hooks for R5.
 */
export default function SimulationCanvas() {
  const status = useSimulationStore((s) => s.status);
  const agents = useSimulationStore((s) => s.agents);
  const openChat = useSimulationStore((s) => s.openSpecialistChat);
  const activeId = useSimulationStore((s) => s.specialistChatAgentId);
  const chatOpen = useSimulationStore((s) => s.specialistChatOpen);
  const threads = useSimulationStore((s) => s.specialistChatsByAgent);

  const postVerdict = status === 'complete';
  const list = [...agents.values()].filter(
    (a) => a.status === 'complete' && a.agent_id !== 'decision_chair',
  );

  return (
    <>
      <div className="flex h-full min-h-[120px] flex-col bg-[#07070b] p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/25">Specialists</p>
        {list.length === 0 ? (
          <p className="text-[11px] text-white/20">
            {status === 'idle' ? 'Run a simulation to see your panel here.' : 'Agents will appear as they finish…'}
          </p>
        ) : (
          <>
            {postVerdict ? (
              <p className="mb-2 text-[11px] text-white/20">
                Click a specialist to open 1:1 follow-up chat (same memory as the full simulation).
              </p>
            ) : null}
          <div className="flex flex-wrap gap-2">
            {list.map((a) => {
              const hasThread = (threads[a.agent_id]?.length ?? 0) > 0;
              return (
                <button
                  key={a.agent_id}
                  type="button"
                  title={postVerdict ? `Chat with ${a.agent_name}` : 'Available after verdict'}
                  onClick={() => postVerdict && openChat(a.agent_id)}
                  disabled={!postVerdict}
                  className={cn(
                    'relative rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] text-white/70 transition-all',
                    postVerdict &&
                      'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white/20',
                    !postVerdict && 'cursor-not-allowed opacity-50',
                    chatOpen && activeId === a.agent_id && 'scale-105 ring-2 ring-purple-400/35',
                    chatOpen && activeId !== a.agent_id && postVerdict && 'opacity-40',
                  )}
                >
                  {a.agent_name}
                  {hasThread ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/30 text-[7px]"
                      aria-hidden
                    >
                      💬
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          </>
        )}
      </div>
      <SpecialistChatHost />
    </>
  );
}
