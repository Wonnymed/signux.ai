'use client';

import { useState } from 'react';

type Props = {
  experienceId: string;
  currentOutcome?: string;
};

export default function OutcomeReporter({ experienceId, currentOutcome }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(currentOutcome || null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ brier: number } | null>(null);

  async function handleSubmit(selectedOutcome: string) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceId, outcome: selectedOutcome, notes }),
      });
      const data = await res.json();
      setOutcome(selectedOutcome);
      setResult(data);
      setTimeout(() => setIsOpen(false), 2000);
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome && !isOpen) {
    const outcomeColors: Record<string, string> = { success: '#10B981', failure: '#F43F5E', partial: '#F59E0B', cancelled: '#6B7280' };
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'var(--surface-1)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: outcomeColors[outcome] || '#6B7280' }} />
        Outcome: {outcome}
        {result && <span style={{ color: 'var(--text-tertiary)' }}>(Brier: {result.brier.toFixed(3)})</span>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '16px' }}>◎</span> Did this decision work out?
      </button>
    );
  }

  return (
    <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-0)', marginTop: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>How did this decision turn out?</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {[
          { value: 'success', label: 'It worked', color: '#10B981' },
          { value: 'partial', label: 'Partially', color: '#F59E0B' },
          { value: 'failure', label: 'It failed', color: '#F43F5E' },
          { value: 'cancelled', label: 'Cancelled', color: '#6B7280' },
        ].map(opt => (
          <button key={opt.value} onClick={() => handleSubmit(opt.value)} disabled={submitting} style={{ flex: 1, padding: '10px 8px', borderRadius: '8px', border: `1px solid ${opt.color}33`, background: `${opt.color}08`, fontSize: '13px', color: opt.color, cursor: submitting ? 'wait' : 'pointer', fontWeight: 500 }}>
            {opt.label}
          </button>
        ))}
      </div>
      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional: what happened? (brief note)" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '13px', background: 'var(--surface-0)', outline: 'none', boxSizing: 'border-box' }} />
      <button onClick={() => setIsOpen(false)} style={{ marginTop: '8px', background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Cancel</button>
    </div>
  );
}
