'use client';

import { useState, useEffect, useRef } from 'react';

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

  const posColor = agentPosition === 'proceed' ? '#10B981' : agentPosition === 'delay' ? '#F59E0B' : '#F43F5E';

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', zIndex: 900,
      background: 'var(--surface-0, #fff)', borderLeft: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
      animation: 'slideInRight 0.2s ease',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{agentName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: posColor, display: 'inline-block' }} />
            {agentPosition.toUpperCase()} ({agentConfidence}/10)
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              Ask {agentName} about their analysis
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {getSuggestedQuestions(agentId).map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
                    border: '1px solid var(--border-subtle)', background: 'var(--surface-1)',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--text-secondary)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
              fontSize: '14px', lineHeight: 1.6,
              background: msg.role === 'user' ? '#7C3AED' : 'var(--surface-1)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '8px 0' }}>
            {agentName} is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={`Ask ${agentName}...`}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px',
              border: '1px solid var(--border-default)', background: 'var(--surface-0)',
              fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 16px', borderRadius: '8px', border: 'none',
              background: '#7C3AED', color: '#fff', fontSize: '14px',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
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
