'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE_OUT, stagger } from '@/lib/motion/constants';
import { useChatStore } from '@/lib/store/chat';
import { useSimulationStore } from '@/lib/store/simulation';
import { useAppStore } from '@/lib/store/app';
import { useSimulationStream } from '@/lib/hooks/useSimulationStream';
import { cn } from '@/lib/design/cn';
import EntityVisual from '@/components/chat/EntityVisual';
import ChatInput from '@/components/chat/ChatInput';
import { MessageRenderer, ThinkingIndicator } from '@/components/chat';
import { pendingFirstMessageKey, pendingSimulationKey } from '@/lib/chat/firstMessageBootstrap';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import SimulationCanvas from '@/components/dashboard/SimulationCanvas';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  // ─── STORES ───
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const entityState = useChatStore((s) => s.entityState);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clear = useChatStore((s) => s.clear);

  const simReset = useSimulationStore((s) => s.reset);
  const specialistChatOpen = useSimulationStore((s) => s.specialistChatOpen);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);

  // ─── SIMULATION HOOK ───
  const { triggerSimulation } = useSimulationStream({ conversationId });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── LOAD CONVERSATION ON MOUNT + bootstrap first message from home ───
  useEffect(() => {
    setActiveConversationId(conversationId);
    let cancelled = false;

    const run = async () => {
      await loadConversation(conversationId);
      if (cancelled) return;

      let pendingSimRaw: string | null = null;
      try {
        pendingSimRaw = sessionStorage.getItem(pendingSimulationKey(conversationId));
      } catch {
        /* ignore */
      }

      if (pendingSimRaw) {
        try {
          sessionStorage.removeItem(pendingSimulationKey(conversationId));
        } catch {
          /* ignore */
        }
        try {
          const parsed = JSON.parse(pendingSimRaw) as {
            question?: string;
            simMode?: SimulationChargeType;
            panelTier?: 'swarm' | 'specialist';
          };
          const q = parsed.question?.trim();
          if (q) {
            await triggerSimulation(q, parsed.simMode, {
              panelTier: parsed.panelTier,
            });
          }
        } catch {
          /* bad payload */
        }
        return;
      }

      const key = pendingFirstMessageKey(conversationId);
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem(key);
      } catch {
        /* ignore */
      }

      if (pending?.trim()) {
        const trimmed = pending.trim();
        try {
          sessionStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        const { messages: afterLoad } = useChatStore.getState();
        if (afterLoad.length === 0) {
          await sendMessage(conversationId, trimmed);
        }
        return;
      }

      // Legacy: empty thread after navigation (e.g. slow DB) — one soft refetch
      if (useChatStore.getState().messages.length === 0) {
        setTimeout(() => {
          if (cancelled) return;
          void loadConversation(conversationId);
        }, 1000);
      }
    };

    void run();

    return () => {
      cancelled = true;
      clear();
      simReset();
      setActiveConversationId(null);
    };
  }, [conversationId, loadConversation, sendMessage, clear, simReset, setActiveConversationId, triggerSimulation]);

  // ─── AUTO-SCROLL ───
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, sending]);

  // ─── HANDLE SIMULATION ───
  const handleSimulate = useCallback(
    (question: string, simMode?: SimulationChargeType) => {
      const { selectedPanelTier } = useChatStore.getState();
      triggerSimulation(question, simMode, { panelTier: selectedPanelTier });
    },
    [triggerSimulation],
  );

  // ─── HANDLE REFINEMENT ───
  const handleRefine = useCallback(
    async (simulationId: string, modification: string) => {
      try {
        const res = await fetch(`/api/c/${conversationId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refine', simulationId, modification }),
        });

        if (!res.ok) throw new Error('Refinement failed');
        const data = await res.json();

        useChatStore.getState().addMessage({
          id: `refine-${Date.now()}`,
          message_type: 'refinement',
          role: 'assistant',
          content: null,
          structured_data: data,
          model_tier: 'default',
          simulation_id: simulationId,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Refinement failed:', error);
      }
    },
    [conversationId],
  );

  const hasMessages = messages.length > 0;

  return (
    <motion.div
      key={conversationId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-[#0a0a0f] transition-[padding] duration-300',
        specialistChatOpen && 'sm:pr-[380px]',
      )}
    >
      <div className="flex min-h-[min(38vh,420px)] max-h-[min(52vh,560px)] shrink-0 border-b border-white/[0.06]">
        <SimulationCanvas />
      </div>

      {/* ─── MESSAGES AREA ─── */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 py-6">
          <div className={cn(
            'flex justify-center shrink-0 transition-all duration-300',
            hasMessages ? 'py-2' : 'py-6',
          )}>
            <EntityVisual
              state={entityState || 'idle'}
              size={hasMessages ? 'sm' : 'md'}
              className="py-0"
            />
          </div>

          {!hasMessages && !sending && (
            <div className="text-center py-8">
              <p className="text-sm text-white/50 mb-1">Ask anything about a decision you&apos;re facing</p>
              <p className="text-micro text-white/30">10 AI specialists will debate your question</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={
                  msg.role === 'user'
                    ? { opacity: 0, x: 12 }
                    : { opacity: 0, y: 8 }
                }
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{
                  duration: msg.role === 'user' ? 0.2 : 0.3,
                  delay: stagger(i, 0.04, 0.3),
                  ease: EASE_OUT,
                }}
              >
                <MessageRenderer
                  message={msg}
                  conversationId={conversationId}
                  onSimulate={handleSimulate}
                  onRefine={handleRefine}
                  isLast={i === messages.length - 1}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {sending && <ThinkingIndicator />}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* ─── INPUT BAR ─── */}
      <ChatInput
        conversationId={conversationId}
        showSuggestions={!hasMessages}
        placeholder={
          messages.some((m) => m.message_type === 'simulation_verdict')
            ? 'Ask a follow-up or refine the verdict...'
            : 'What decision are you facing?'
        }
      />
    </motion.div>
  );
}
