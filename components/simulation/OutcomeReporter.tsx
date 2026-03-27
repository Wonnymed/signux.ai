'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';

type Props = {
  experienceId: string;
  currentOutcome?: string;
};

const outcomeDot: Record<string, string> = {
  success: 'bg-state-success',
  failure: 'bg-state-error',
  partial: 'bg-state-warning',
  cancelled: 'bg-txt-disabled',
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
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  }

  if (outcome && !isOpen) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-radius-md bg-surface-1 px-3 py-1.5 text-xs text-txt-secondary">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', outcomeDot[outcome] ?? 'bg-txt-disabled')} />
        Outcome: {outcome}
        {result && <span className="text-txt-tertiary">(Brier: {result.brier.toFixed(3)})</span>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-radius-md border border-border-default bg-transparent px-4 py-2 text-[13px] text-txt-secondary transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <span className="text-base leading-none">◎</span> Did this decision work out?
      </button>
    );
  }

  const options = [
    { value: 'success', label: 'It worked', ring: 'border-state-success/40 bg-state-success-muted/20 text-state-success' },
    { value: 'partial', label: 'Partially', ring: 'border-state-warning/40 bg-state-warning-muted/20 text-state-warning' },
    { value: 'failure', label: 'It failed', ring: 'border-state-error/40 bg-state-error-muted/20 text-state-error' },
    { value: 'cancelled', label: 'Cancelled', ring: 'border-border-default bg-surface-1 text-txt-secondary' },
  ] as const;

  return (
    <div className="mt-3 rounded-radius-xl border border-border-subtle bg-surface-0 p-5 shadow-premium">
      <div className="mb-3 text-sm font-medium text-txt-primary">How did this decision turn out?</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSubmit(opt.value)}
            disabled={submitting}
            className={cn(
              'min-w-0 flex-1 rounded-radius-md border px-2 py-2.5 text-[13px] font-medium transition-opacity',
              opt.ring,
              submitting && 'cursor-wait opacity-70',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional: what happened? (brief note)"
        className="box-border w-full rounded-radius-md border border-border-default bg-surface-0 px-3 py-2 text-[13px] text-txt-primary outline-none placeholder:text-txt-disabled focus-visible:ring-2 focus-visible:ring-focus-ring"
      />
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="mt-2 text-xs text-txt-tertiary hover:text-txt-secondary"
      >
        Cancel
      </button>
    </div>
  );
}
