'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/design/cn';
import { SIMULATION_UI_LABELS } from '@/lib/simulation/streamingCopy';

type Props = {
  simulationId: string;
  question: string;
  conversationId?: string;
  shareDigest?: string;
};

const btnClass =
  'inline-flex items-center gap-1.5 rounded-radius-md border border-border-default bg-transparent px-3.5 py-2 text-[13px] text-txt-secondary transition-colors duration-normal ease-out hover:bg-surface-1 hover:text-txt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-50';

export default function SimActions({ simulationId, question, conversationId, shareDigest }: Props) {
  const router = useRouter();
  const [showForkModal, setShowForkModal] = useState(false);
  const [forkParam, setForkParam] = useState('');
  const [forkOriginal, setForkOriginal] = useState('');
  const [forkNew, setForkNew] = useState('');
  const [loading, setLoading] = useState('');
  const [copied, setCopied] = useState(false);

  void question;

  async function handleReplay() {
    setLoading('replay');
    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationId, action: 'prepare' }),
      });
      const data = await res.json();
      if (data.question) {
        router.push(`/c?q=${encodeURIComponent(data.question)}&replay_of=${simulationId}`);
      }
    } catch { /* noop */ } finally { setLoading(''); }
  }

  async function handleFork() {
    if (!forkParam || !forkNew) return;
    setLoading('fork');
    try {
      const res = await fetch('/api/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSimId: simulationId,
          modifications: [{ parameter: forkParam, original_value: forkOriginal, new_value: forkNew }],
          action: 'prepare',
        }),
      });
      const data = await res.json();
      if (data.modifiedQuestion) {
        router.push(`/c?q=${encodeURIComponent(data.modifiedQuestion)}&forked_from=${simulationId}`);
      }
    } catch { /* noop */ } finally { setLoading(''); setShowForkModal(false); }
  }

  async function handleShare() {
    const publicUrl = `${window.location.origin}/c/${conversationId || simulationId}/public`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Octux AI — Decision Analysis',
          text: shareDigest || 'Check out this AI-powered decision analysis',
          url: publicUrl,
        });
        return;
      } catch { /* noop */ }
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass =
    'w-full rounded-radius-md border border-border-default bg-surface-0 px-3 py-2 text-[13px] text-txt-primary outline-none placeholder:text-txt-disabled focus-visible:ring-2 focus-visible:ring-focus-ring';

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleReplay} disabled={loading === 'replay'} className={btnClass}>
          ↻ {loading === 'replay' ? SIMULATION_UI_LABELS.replayPreparing : 'Replay with current memory'}
        </button>
        <button type="button" onClick={() => setShowForkModal(true)} className={btnClass}>
          ⑂ What if...?
        </button>
        <button type="button" onClick={handleShare} className={btnClass}>
          ⎘ {copied ? SIMULATION_UI_LABELS.shareCopied : 'Share'}
        </button>
      </div>

      {showForkModal && (
        <div className="mt-3 rounded-radius-xl border border-border-subtle bg-surface-0 p-5 shadow-premium">
          <div className="mb-3 text-sm font-medium text-txt-primary">What if you changed one variable?</div>
          <div className="flex flex-col gap-2">
            <input
              value={forkParam}
              onChange={(e) => setForkParam(e.target.value)}
              placeholder="What to change (e.g., budget, location)"
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={forkOriginal}
                onChange={(e) => setForkOriginal(e.target.value)}
                placeholder="Current value"
                className={cn(inputClass, 'min-w-0 flex-1')}
              />
              <span className="text-txt-tertiary">→</span>
              <input
                value={forkNew}
                onChange={(e) => setForkNew(e.target.value)}
                placeholder="New value"
                className={cn(inputClass, 'min-w-0 flex-1')}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFork}
              disabled={!forkParam || !forkNew || loading === 'fork'}
              className="rounded-radius-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              {loading === 'fork' ? SIMULATION_UI_LABELS.forkRunning : 'Run fork'}
            </button>
            <button
              type="button"
              onClick={() => setShowForkModal(false)}
              className="rounded-radius-md px-3 py-2 text-[13px] text-txt-tertiary hover:text-txt-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
