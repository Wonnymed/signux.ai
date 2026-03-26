'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/lib/store/chat';
import { useSimulationStore } from '@/lib/store/simulation';
import { useAppStore } from '@/lib/store/app';
import { useSimulationStream } from '@/lib/hooks/useSimulationStream';
import EntityVisual from '@/components/chat/EntityVisual';
import ChatInput from '@/components/chat/ChatInput';
import { MessageRenderer, ThinkingIndicator } from '@/components/chat';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  // ─── STORES ───
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const entityState = useChatStore((s) => s.entityState);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const clear = useChatStore((s) => s.clear);

  const simReset = useSimulationStore((s) => s.reset);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);

  // ─── SIMULATION HOOK ───
  const { triggerSimulation } = useSimulationStream({ conversationId });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── LOAD CONVERSATION ON MOUNT ───
  useEffect(() => {
    setActiveConversationId(conversationId);

    const load = async () => {
      await loadConversation(conversationId);

      // Race condition: first message may not be saved yet
      const msgs = useChatStore.getState().messages;
      if (msgs.length === 0) {
        setTimeout(() => loadConversation(conversationId), 1000);
      }
    };
    load();

    return () => {
      clear();
      simReset();
      setActiveConversationId(null);
    };
  }, [conversationId, loadConversation, clear, simReset, setActiveConversationId]);

  // ─── AUTO-SCROLL ───
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, sending]);

  // ─── HANDLE SIMULATION ───
  const handleSimulate = useCallback(
    (question: string, tier: string) => {
      triggerSimulation(question, tier);
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
          body: JSON.stringify({ action: 'refine', simulationId, modification, tier: 'deep' }),
        });

        if (!res.ok) throw new Error('Refinement failed');
        const data = await res.json();

        useChatStore.getState().addMessage({
          id: `refine-${Date.now()}`,
          message_type: 'refinement',
          role: 'assistant',
          content: null,
          structured_data: data,
          model_tier: 'deep',
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
    <div className="flex flex-col h-full bg-surface-0">
      {/* ─── MESSAGES AREA ─── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
          <EntityVisual
            state={entityState || 'idle'}
            compact={hasMessages}
          />

          {!hasMessages && !sending && (
            <div className="text-center py-8">
              <p className="text-sm text-txt-tertiary mb-1">Ask anything about a decision you&apos;re facing</p>
              <p className="text-micro text-txt-disabled">10 AI specialists will debate your question</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageRenderer
                key={msg.id}
                message={msg}
                conversationId={conversationId}
                onSimulate={handleSimulate}
                onRefine={handleRefine}
                isLast={i === messages.length - 1}
              />
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
    </div>
  );
}
