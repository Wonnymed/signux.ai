'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  simulationId: string;
  assumptions: string[];
  summary: string;
  agentPositions: { agent: string; position: string; confidence: number }[];
  timeoutMs: number;
  onComplete: () => void;
};

export default function HITLCheckpoint({
  simulationId, assumptions, summary, agentPositions, timeoutMs, onComplete,
}: Props) {
  const [correction, setCorrection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.round(timeoutMs / 1000));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            submittedRef.current = true;
            handleSubmit('skip');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  async function handleSubmit(action: 'confirm' | 'correct' | 'skip') {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      await fetch('/api/simulate/hitl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId,
          action,
          correction: action === 'correct' ? correction : undefined,
        }),
      });
    } catch (err) {
      console.error('HITL submit failed:', err);
    }

    onComplete();
  }

  return (
    <div style={{
      margin: '16px 0', padding: '24px', borderRadius: '12px',
      border: '2px solid #7C3AED', background: 'var(--surface-0)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#7C3AED' }}>
          Decision Chair is asking for your input
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {timeLeft}s remaining
        </div>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
        {summary}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Key assumptions being used
        </div>
        {assumptions.map((a, i) => (
          <div key={i} style={{
            padding: '8px 12px', marginBottom: '4px', borderRadius: '6px',
            background: 'var(--surface-1)', fontSize: '13px', color: 'var(--text-primary)',
          }}>
            {i + 1}. {a}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {agentPositions.slice(0, 6).map((ap, i) => (
          <span key={i} style={{
            padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
            background: ap.position === 'proceed' ? '#10B98118' : ap.position === 'delay' ? '#F59E0B18' : '#F43F5E18',
            color: ap.position === 'proceed' ? '#10B981' : ap.position === 'delay' ? '#F59E0B' : '#F43F5E',
          }}>
            {ap.agent}: {ap.position} ({ap.confidence}/10)
          </span>
        ))}
      </div>

      <textarea
        ref={inputRef}
        value={correction}
        onChange={(e) => setCorrection(e.target.value)}
        placeholder="Correct any wrong assumptions, add context, or specify constraints... (e.g., 'Actually targeting families, not young professionals. Budget is $80K, not $50K.')"
        style={{
          width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px',
          border: '1px solid var(--border-default)', background: 'var(--surface-0)',
          fontSize: '14px', resize: 'vertical', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={() => handleSubmit('correct')}
          disabled={submitting || !correction.trim()}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            border: 'none', background: '#7C3AED', color: '#fff',
            fontSize: '14px', fontWeight: 500,
            cursor: submitting || !correction.trim() ? 'default' : 'pointer',
            opacity: submitting || !correction.trim() ? 0.5 : 1,
          }}
        >
          Submit correction
        </button>
        <button
          onClick={() => handleSubmit('confirm')}
          disabled={submitting}
          style={{
            padding: '10px 20px', borderRadius: '8px',
            border: '1px solid var(--border-default)', background: 'transparent',
            fontSize: '14px', color: 'var(--text-secondary)',
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          All correct, continue
        </button>
        <button
          onClick={() => handleSubmit('skip')}
          disabled={submitting}
          style={{
            padding: '10px 16px', borderRadius: '8px',
            border: 'none', background: 'transparent',
            fontSize: '13px', color: 'var(--text-tertiary)',
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
