'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ArrowUp } from 'lucide-react';
import { useDeepDiveStore } from '@/lib/store/deep-dive';
import { useSimulationStore } from '@/lib/store/simulation';
import { useDashboardUiStore } from '@/lib/store/dashboard-ui';
import { getSuggestedQuestions } from '@/lib/dashboard/deep-dive-suggestions';
import { DARK_THEME } from '@/lib/dashboard/theme';
import { cn } from '@/lib/design/cn';
import type { VerdictResult } from '@/lib/simulation/events';
import { resolveAgentChatId } from '@/lib/agent-chat/resolve-agent-id';

function positionPillStyle(
  p: string,
): { label: string; ring: string; bg: string } {
  const s = p.toLowerCase();
  if (s === 'abandon') return { label: 'ABANDON', ring: DARK_THEME.danger, bg: 'rgba(248,113,113,0.2)' };
  if (s === 'delay') return { label: 'DELAY', ring: DARK_THEME.warning, bg: 'rgba(251,191,36,0.2)' };
  return { label: 'PROCEED', ring: DARK_THEME.success, bg: 'rgba(74,222,128,0.2)' };
}

function verdictSummaryText(v: VerdictResult | null): string {
  if (!v) return '';
  const parts = [
    v.one_liner,
    v.main_risk ? `Top risk: ${v.main_risk}` : '',
    v.next_action ? `Next action: ${v.next_action}` : '',
    typeof v.recommendation === 'string' ? `Recommendation: ${v.recommendation}` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

export default function DeepDivePanel() {
  const isOpen = useDeepDiveStore((s) => s.isOpen);
  const selectedAgentId = useDeepDiveStore((s) => s.selectedAgentId);
  const messagesByAgent = useDeepDiveStore((s) => s.messagesByAgent);
  const close = useDeepDiveStore((s) => s.close);
  const appendMessages = useDeepDiveStore((s) => s.appendMessages);

  const agentsMap = useSimulationStore((s) => s.agents);
  const result = useSimulationStore((s) => s.result) as VerdictResult | null;
  const inputA = useDashboardUiStore((s) => s.inputA);
  const inputB = useDashboardUiStore((s) => s.inputB);
  const activeMode = useDashboardUiStore((s) => s.activeMode);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const streamAgents = useMemo(() => agentsMap, [agentsMap]);

  const resolvedId = useMemo(() => {
    if (!selectedAgentId) return null;
    return resolveAgentChatId(selectedAgentId, streamAgents);
  }, [selectedAgentId, streamAgents]);

  const agentState = useMemo(() => {
    if (!resolvedId) return null;
    return agentsMap.get(resolvedId) ?? [...agentsMap.values()].find((a) => a.agent_id === resolvedId) ?? null;
  }, [resolvedId, agentsMap]);

  const displayName = agentState?.agent_name || resolvedId || 'Specialist';
  const position = agentState?.position || 'pending';
  const confidence =
    typeof agentState?.confidence === 'number' ? Math.round(agentState.confidence) : null;
  const argument =
    (agentState?.partialResponse && agentState.partialResponse.trim()) ||
    (typeof agentState?.report === 'string' ? agentState.report : '') ||
    '';

  const messages = resolvedId ? messagesByAgent[resolvedId] ?? [] : [];

  const originalQuestion = useMemo(() => {
    if (activeMode === 'compare') {
      const a = inputA.trim();
      const b = inputB.trim();
      if (a && b) return `Option A: ${a}\nOption B: ${b}`;
      return a || b || '';
    }
    return inputA.trim();
  }, [activeMode, inputA, inputB]);

  const ephemeralContext = useMemo(() => {
    const verdictSummary = verdictSummaryText(result);
    const others = [...agentsMap.values()]
      .filter((a) => a.agent_id !== resolvedId && a.status === 'complete' && a.position)
      .map((a) => ({ name: a.agent_name, position: a.position || '' }));
    return {
      originalQuestion: originalQuestion || verdictSummary || 'Simulation',
      agentPosition: position,
      agentArgument: argument.slice(0, 4000),
      agentConfidence: confidence ?? undefined,
      verdictSummary: verdictSummary || originalQuestion || 'No verdict summary.',
      otherAgents: others,
    };
  }, [agentsMap, resolvedId, position, argument, result, originalQuestion, confidence]);

  const suggestions = useMemo(
    () =>
      getSuggestedQuestions(
        displayName,
        position,
        argument,
        originalQuestion,
      ),
    [displayName, position, argument, originalQuestion],
  );

  const pill = positionPillStyle(position === 'pending' ? 'delay' : position);
  const quoteBorder =
    position === 'abandon'
      ? DARK_THEME.danger
      : position === 'delay'
        ? DARK_THEME.warning
        : DARK_THEME.success;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !resolvedId || sending) return;

      const prior = messagesByAgent[resolvedId] || [];
      const historyForApi = prior.map((m) => ({
        role: m.role === 'agent' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const userMsg = {
        id: `u-${Date.now()}`,
        role: 'user' as const,
        content: trimmed,
        createdAt: Date.now(),
      };
      appendMessages(resolvedId, [userMsg]);
      setInput('');
      setSending(true);

      try {
        const res = await fetch('/api/agent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: resolvedId,
            message: trimmed,
            history: historyForApi,
            ephemeralContext,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const reply =
          typeof data.response === 'string' && data.response.trim()
            ? data.response.trim()
            : 'No response. Try again.';
        appendMessages(resolvedId, [
          {
            id: `a-${Date.now()}`,
            role: 'agent',
            content: reply,
            createdAt: Date.now(),
          },
        ]);
      } catch {
        appendMessages(resolvedId, [
          {
            id: `a-${Date.now()}`,
            role: 'agent',
            content: 'Network error. Check your connection and try again.',
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [resolvedId, sending, appendMessages, messagesByAgent, ephemeralContext],
  );

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <AnimatePresence>
      {isOpen && resolvedId && (
        <motion.aside
          key={resolvedId}
          role="complementary"
          aria-label="Specialist deep dive"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn(
            'absolute bottom-0 right-0 top-0 z-[45] flex flex-col border-l border-white/[0.08] shadow-[-12px_0_40px_rgba(0,0,0,0.35)]',
            'w-[min(380px,40vw)] min-w-[280px]',
          )}
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <header className="shrink-0 border-b border-white/[0.06] px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="truncate text-sm font-medium text-white">{displayName}</span>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{ backgroundColor: pill.bg, color: pill.ring }}
              >
                {position === 'pending' ? '…' : pill.label}
              </span>
              {confidence != null && (
                <span className="text-xs text-white/45">Confidence: {confidence}/10</span>
              )}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <blockquote
              className="border-l-2 pl-3 text-[13px] italic leading-relaxed text-white/[0.6]"
              style={{ borderColor: quoteBorder }}
            >
              {argument || 'No excerpt available yet for this specialist.'}
            </blockquote>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
              Suggested questions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-left text-[12px] text-white/70 transition-colors hover:border-[#e8593c]/40 hover:bg-white/[0.07] disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-6 text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
              Chat
            </p>
            <div
              ref={listRef}
              className="flex min-h-[120px] flex-col gap-2 pb-2"
            >
              {messages.length === 0 && (
                <p className="text-[12px] text-white/35">Ask a follow-up about this simulation.</p>
              )}
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div
                      className="max-w-[92%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed text-white"
                      style={{ backgroundColor: 'rgba(232,89,60,0.85)' }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start gap-2">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: `${quoteBorder}55` }}
                    >
                      {initial}
                    </div>
                    <div
                      className="max-w-[85%] rounded-xl border border-white/[0.06] bg-white/[0.04] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/[0.82]"
                    >
                      {m.content}
                    </div>
                  </div>
                ),
              )}
              {sending && (
                <p className="text-[12px] text-white/40">Thinking…</p>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
                placeholder={`Ask ${displayName} a question…`}
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none"
                disabled={sending}
              />
              <button
                type="button"
                disabled={sending || !input.trim()}
                onClick={() => void sendMessage(input)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-95 disabled:opacity-35"
                style={{ backgroundColor: '#e8593c' }}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
