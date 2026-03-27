'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/design/cn';
import { formatAgentThinking } from '@/lib/simulation/streamingCopy';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  simulationId: string;
  agentId: string;
  agentName: string;
  agentPosition: string;
  agentConfidence: number;
};

export default function AgentChatPanel({
  isOpen, onClose, simulationId, agentId, agentName, agentPosition, agentConfidence,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [agentId, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId,
          agentId,
          message: userMsg.content,
          history: messages,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response. Try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const posDot =
    agentPosition === 'proceed' ? 'bg-verdict-proceed' :
    agentPosition === 'delay' ? 'bg-verdict-delay' :
    'bg-verdict-abandon';

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-[90] flex w-full max-w-[420px] flex-col',
        'border-l border-border-subtle bg-surface-0 shadow-premium animate-slide-in-right',
      )}
    >
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-txt-primary">{agentName}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-txt-tertiary">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', posDot)} />
            {agentPosition.toUpperCase()} ({agentConfidence}/10)
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-lg leading-none text-txt-tertiary transition-colors hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-radius-sm"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <div className="mb-3 text-[13px] text-txt-tertiary">
              Ask {agentName} about their analysis
            </div>
            <div className="flex flex-col gap-1.5">
              {getSuggestedQuestions(agentId).map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="rounded-radius-md border border-border-subtle bg-surface-1 px-3 py-2 text-left text-xs text-txt-secondary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('mb-4 flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-radius-xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-accent text-white'
                  : 'bg-surface-1 text-txt-primary',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="py-2 text-[13px] text-txt-tertiary">
            {formatAgentThinking(agentName)}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border-subtle px-5 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={`Ask ${agentName}...`}
            className="min-w-0 flex-1 rounded-radius-md border border-border-default bg-surface-0 px-3.5 py-2.5 text-sm text-txt-primary outline-none placeholder:text-txt-disabled focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-radius-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function getSuggestedQuestions(agentId: string): string[] {
  const suggestions: Record<string, string[]> = {
    base_rate_archivist: ['What data sources did you use?', 'How confident are you in the market size?', 'What comparable benchmarks exist?'],
    regulatory_gatekeeper: ['Which exact permits do I need?', 'How long does each permit take?', 'What are the costs for compliance?'],
    unit_economics_auditor: ['Walk me through the breakeven math', 'What are the biggest cost drivers?', 'How sensitive is the model to price changes?'],
    competitive_intel: ['Who are the top 3 competitors?', 'What is their pricing strategy?', 'Where is the gap in the market?'],
    demand_signal_analyst: ['What demand signals are strongest?', 'How seasonal is this market?', 'What growth rate do you project?'],
    execution_operator: ['What should I do first?', 'What are the biggest execution risks?', 'What team do I need?'],
    capital_allocator: ['How much runway do I need?', 'When should I seek funding?', 'What is the optimal capital structure?'],
    scenario_planner: ['What is the worst-case scenario?', 'What triggers the downside risk?', 'What is the probability of each scenario?'],
    intervention_optimizer: ['What is the highest-leverage action?', 'What quick wins are available?', 'What should I avoid?'],
    customer_reality: ['Would customers actually pay for this?', 'What is the biggest objection?', 'How do I validate demand?'],
    decision_chair: ['Why did you recommend this verdict?', 'Which agents disagreed most?', 'What was the tipping point?'],
  };
  return suggestions[agentId] || ['Tell me more about your analysis', 'What are you most uncertain about?', 'What would change your mind?'];
}
