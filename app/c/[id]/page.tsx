'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import EntityVisual from '@/components/chat/EntityVisual';
import ChatInput from '@/components/chat/ChatInput';
import MessageBubble from '@/components/chat/MessageBubble';
import SimulationBlock from '@/components/chat/SimulationBlock';
import VerdictCard from '@/components/chat/VerdictCard';
import RefinementCard from '@/components/chat/RefinementCard';
import { cn } from '@/lib/design/cn';
import { OctButton } from '@/components/ui';

type Message = {
  id: string;
  message_type: string;
  role: string;
  content: string | null;
  structured_data: any;
  model_tier: string;
  simulation_id: string | null;
  created_at: string;
};

type OctopusState = 'idle' | 'chatting' | 'diving' | 'resting';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [octopusState, setOctopusState] = useState<OctopusState>('idle');
  const [, setActiveSimulation] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation messages
  useEffect(() => {
    fetch(`/api/c/${conversationId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages || []);
        const hasVerdict = data.messages?.some((m: Message) => m.message_type === 'simulation_verdict');
        const hasSimStart = data.messages?.some((m: Message) => m.message_type === 'simulation_start');
        if (hasVerdict) setOctopusState('resting');
        else if (hasSimStart) setOctopusState('diving');
        else if (data.messages?.length > 0) setOctopusState('chatting');
        else setOctopusState('idle');
      })
      .catch(() => {});
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send chat message
  const handleSend = useCallback(async (message: string, options?: { tier?: string; simulate?: boolean }) => {
    if (!message.trim() || loading) return;
    const tier = options?.tier || 'ink';

    // If simulate requested, trigger simulation flow
    if (options?.simulate) {
      handleSimulate(message, tier);
      return;
    }

    setLoading(true);
    setOctopusState('chatting');

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      message_type: 'text', role: 'user', content: message,
      structured_data: null, model_tier: tier, simulation_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/c/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tier }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        message_type: data.suggestSimulation ? 'decision_card' : 'text',
        role: 'assistant', content: data.response,
        structured_data: data.suggestSimulation ? {
          suggest_simulation: true,
          simulation_prompt: data.simulationPrompt,
          disclaimer: data.disclaimer,
        } : data.disclaimer ? { disclaimer: data.disclaimer } : null,
        model_tier: data.tier, simulation_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, message_type: 'text', role: 'assistant',
        content: 'Something went wrong. Try again.', structured_data: null,
        model_tier: 'ink', simulation_id: null, created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  // Trigger simulation
  const handleSimulate = useCallback(async (question: string, tier: string) => {
    setOctopusState('diving');
    setActiveSimulation(question);

    try {
      const res = await fetch(`/api/c/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', question, tier }),
      });
      const data = await res.json();

      if (data.streamUrl) {
        setMessages(prev => [...prev, {
          id: `sim-start-${Date.now()}`, message_type: 'simulation_start',
          role: 'system', content: question,
          structured_data: { streamUrl: data.streamUrl, tier },
          model_tier: tier, simulation_id: null,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch {
      setOctopusState('chatting');
      setActiveSimulation(null);
    }
  }, [conversationId]);

  // Simulation completed callback
  const handleSimulationComplete = useCallback((verdict: any, simulationId: string) => {
    setOctopusState('resting');
    setActiveSimulation(null);

    setMessages(prev => [...prev, {
      id: `verdict-${Date.now()}`, message_type: 'simulation_verdict',
      role: 'assistant', content: null,
      structured_data: verdict,
      model_tier: 'deep', simulation_id: simulationId,
      created_at: new Date().toISOString(),
    }]);
  }, []);

  // Handle refinement
  async function handleRefine(simulationId: string, modification: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/c/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refine', simulationId, modification, tier: 'deep' }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: `refine-${Date.now()}`, message_type: 'refinement',
        role: 'assistant', content: null,
        structured_data: data, model_tier: 'deep',
        simulation_id: simulationId, created_at: new Date().toISOString(),
      }]);
    } catch {} finally { setLoading(false); }
  }

  // Render a single message based on its type
  function renderMessage(msg: Message) {
    switch (msg.message_type) {
      case 'text':
        return <MessageBubble key={msg.id} role={msg.role as any} content={msg.content || ''} tier={msg.model_tier} />;

      case 'decision_card':
        return (
          <div key={msg.id}>
            <MessageBubble role="assistant" content={msg.content || ''} tier={msg.model_tier} />
            {msg.structured_data?.suggest_simulation && (
              <div className="ml-10 mt-2 mb-2">
                <SimulationSuggestCard
                  prompt={msg.structured_data.simulation_prompt}
                  onSimulate={(q) => handleSimulate(q, 'deep')}
                />
              </div>
            )}
            {msg.structured_data?.disclaimer && (
              <div className="ml-10 mt-1 mb-1 px-3 py-2 rounded-md bg-verdict-delay/5 text-micro text-verdict-delay">
                {msg.structured_data.disclaimer}
              </div>
            )}
          </div>
        );

      case 'simulation_start':
        return (
          <SimulationBlock
            key={msg.id}
            question={msg.content || ''}
            streamUrl={msg.structured_data?.streamUrl}
            octopusState={octopusState}
            onComplete={handleSimulationComplete}
            onStateChange={(s) => setOctopusState(s as OctopusState)}
          />
        );

      case 'simulation_verdict':
        return <VerdictCard key={msg.id} verdict={msg.structured_data} simulationId={msg.simulation_id} conversationId={conversationId} onRefine={(mod) => handleRefine(msg.simulation_id!, mod)} />;

      case 'refinement':
        return <RefinementCard key={msg.id} data={msg.structured_data} />;

      case 'system':
        return (
          <MessageBubble key={msg.id} role="system" content={msg.content || ''} />
        );

      default:
        return <MessageBubble key={msg.id} role={msg.role as any} content={msg.content || ''} tier={msg.model_tier} />;
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          {/* Entity visual (compact when messages exist) */}
          <EntityVisual state={octopusState} compact={messages.length > 0} />

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 mb-4 animate-fade-in">
              <div className="shrink-0 mt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/80 to-entity-bioluminescent/60 flex items-center justify-center animate-breathe-fast">
                  <span className="text-[10px] text-white font-medium">O</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent stagger-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent stagger-3" />
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}

// ═══ HELPER COMPONENTS ═══

function SimulationSuggestCard({ prompt, onSimulate }: { prompt: string; onSimulate: (q: string) => void }) {
  return (
    <div className="p-3 rounded-lg border border-accent/20 bg-accent-subtle/50">
      <div className="text-xs font-medium text-accent mb-2">
        This looks like a decision worth analyzing deeply
      </div>
      <OctButton
        variant="accent"
        size="sm"
        onClick={() => onSimulate(prompt)}
      >
        Activate Deep Simulation
      </OctButton>
    </div>
  );
}
