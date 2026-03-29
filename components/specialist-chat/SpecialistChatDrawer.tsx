'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSimulationStore } from '@/lib/store/simulation';
import { buildSpecialistChatPersona } from '@/lib/specialist-chat/persona';
import { buildSimulationChatContext } from '@/lib/specialist-chat/context';
import { getSuggestedQuestions } from '@/lib/specialist-chat/suggestions';
import type { SpecialistChatMessage } from '@/lib/specialist-chat/types';
import ChatMessageBubble from './ChatMessageBubble';
import SpecialistSwitcher from './SpecialistSwitcher';

export default function SpecialistChatDrawer() {
  const open = useSimulationStore((s) => s.specialistChatOpen);
  const agentId = useSimulationStore((s) => s.specialistChatAgentId);
  const showSwitcher = useSimulationStore((s) => s.specialistChatShowSwitcher);
  const agentsMap = useSimulationStore((s) => s.agents);
  const chiefAssembly = useSimulationStore((s) => s.chiefAssembly);
  const chiefPanelSnapshot = useSimulationStore((s) => s.chiefPanelSnapshot);
  const lastSimQuestion = useSimulationStore((s) => s.lastSimQuestion);
  const operatorContextSnapshot = useSimulationStore((s) => s.operatorContextSnapshot);
  const activeChargeType = useSimulationStore((s) => s.activeChargeType);
  const chiefIntervention = useSimulationStore((s) => s.chiefIntervention);
  const result = useSimulationStore((s) => s.result);
  const simulationId = useSimulationStore((s) => s.simulationId);
  const specialistChatsByAgent = useSimulationStore((s) => s.specialistChatsByAgent);
  const setThread = useSimulationStore((s) => s.setSpecialistChatThread);
  const close = useSimulationStore((s) => s.closeSpecialistChat);
  const setSwitcher = useSimulationStore((s) => s.setSpecialistChatSwitcher);
  const openChat = useSimulationStore((s) => s.openSpecialistChat);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const agent = agentId ? agentsMap.get(agentId) : undefined;
  const persona = useMemo(() => {
    if (!agent) return null;
    return buildSpecialistChatPersona(agent, chiefAssembly, chiefPanelSnapshot);
  }, [agent, chiefAssembly, chiefPanelSnapshot]);

  const simContext = useMemo(() => {
    if (!agentId || !persona) return null;
    return buildSimulationChatContext({
      question: lastSimQuestion || '(question unavailable)',
      mode: activeChargeType || 'specialist',
      agents: agentsMap,
      activeAgentId: agentId,
      result,
      chiefIntervention,
      operatorContext: operatorContextSnapshot,
    });
  }, [
    agentId,
    persona,
    lastSimQuestion,
    activeChargeType,
    agentsMap,
    result,
    chiefIntervention,
    operatorContextSnapshot,
  ]);

  const messages: SpecialistChatMessage[] =
    agentId && specialistChatsByAgent[agentId] ? specialistChatsByAgent[agentId] : [];

  const suggestions = useMemo(() => {
    if (!persona || !simContext) return [];
    return getSuggestedQuestions(persona, simContext);
  }, [persona, simContext]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !agentId || !persona || !simContext || loading) return;

      const userMsg: SpecialistChatMessage = { role: 'user', text: t };
      const history = [...messages, userMsg];
      setThread(agentId, history);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/simulate/specialist-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            simulationId,
            specialistPlan: persona,
            simulationContext: simContext,
            message: t,
            conversationHistory: messages.map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          text?: string;
          sources?: { url: string; title: string }[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || 'Request failed');
        const assistant: SpecialistChatMessage = {
          role: 'assistant',
          text: data.text || '…',
          sources: data.sources,
        };
        setThread(agentId, [...history, assistant]);
      } catch {
        setThread(agentId, [
          ...history,
          {
            role: 'assistant',
            text: 'Something went wrong. Please try again in a moment.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [agentId, persona, simContext, messages, loading, setThread, simulationId],
  );

  if (!open || !agentId || !agent || !persona || !simContext) return null;

  const agentList = [...agentsMap.values()];

  return (
    <div
      className={`
        fixed right-0 top-0 z-50 flex h-full w-full max-w-[380px] flex-col
        border-l border-white/[0.06] bg-[#0f0f13] shadow-2xl
        transition-transform duration-300 sm:w-[380px]
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-white">{persona.name}</div>
            <div className="truncate text-[11px] text-white/30">{persona.role}</div>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 text-white/20 hover:text-white/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              persona.bias === 'bullish'
                ? 'bg-green-500/10 text-green-400/60'
                : persona.bias === 'bearish'
                  ? 'bg-red-500/10 text-red-400/60'
                  : 'bg-amber-500/10 text-amber-400/60'
            }`}
          >
            {persona.bias}
          </span>
          <span className="text-[10px] text-white/15">{persona.personality}</span>
        </div>
      </div>

      {messages.length === 0 && !loading ? (
        <div className="space-y-2 p-4">
          <div className="mb-2 text-[11px] text-white/20">Suggested questions:</div>
          {suggestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void send(q)}
              className="block w-full rounded-lg bg-white/[0.02] px-3 py-2 text-left text-[12px] text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/60"
            >
              &ldquo;{q}&rdquo;
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} msg={msg} specialistName={persona.name} />
        ))}
        {loading ? (
          <div className="animate-pulse text-[11px] text-white/20">{persona.name} is thinking…</div>
        ) : null}
      </div>

      {showSwitcher ? (
        <SpecialistSwitcher
          agents={agentList}
          currentAgentId={agentId}
          chiefAssembly={chiefAssembly}
          chiefPanelSnapshot={chiefPanelSnapshot}
          onPick={(id) => {
            openChat(id);
            setSwitcher(false);
          }}
        />
      ) : null}

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={`Ask ${persona.name.split(' ')[0]}…`}
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-white/70 placeholder:text-white/15 focus:border-white/[0.15] focus:outline-none"
          />
          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={() => void send(input)}
            className="rounded-lg bg-white/[0.06] px-3 py-2 text-[12px] text-white/40 hover:bg-white/[0.1] disabled:opacity-30"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex justify-between">
          <button
            type="button"
            onClick={() => setSwitcher(!showSwitcher)}
            className="text-[11px] text-white/15 hover:text-white/30"
          >
            Switch specialist ↔
          </button>
          <button
            type="button"
            onClick={close}
            className="text-[11px] text-white/15 hover:text-white/30"
          >
            End chat
          </button>
        </div>
      </div>
    </div>
  );
}
