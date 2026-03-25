'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  simulationId: string;
  question: string;
  conversationId?: string;
  shareDigest?: string;
};

export default function SimActions({ simulationId, question, conversationId, shareDigest }: Props) {
  const router = useRouter();
  const [showForkModal, setShowForkModal] = useState(false);
  const [forkParam, setForkParam] = useState('');
  const [forkOriginal, setForkOriginal] = useState('');
  const [forkNew, setForkNew] = useState('');
  const [loading, setLoading] = useState('');
  const [copied, setCopied] = useState(false);

  // suppress unused var warning — question is available for future use
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
    } catch {} finally { setLoading(''); }
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
    } catch {} finally { setLoading(''); setShowForkModal(false); }
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
      } catch {}
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={handleReplay} disabled={loading === 'replay'} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading === 'replay' ? 0.5 : 1 }}>
          ↻ {loading === 'replay' ? 'Preparing...' : 'Replay with current memory'}
        </button>
        <button onClick={() => setShowForkModal(true)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⑂ What if...?
        </button>
        <button onClick={handleShare} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'transparent', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⎘ {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {showForkModal && (
        <div style={{ marginTop: '12px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>What if you changed one variable?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={forkParam} onChange={(e) => setForkParam(e.target.value)} placeholder="What to change (e.g., budget, location)" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '13px', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={forkOriginal} onChange={(e) => setForkOriginal(e.target.value)} placeholder="Current value" style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '13px', outline: 'none' }} />
              <span style={{ alignSelf: 'center', color: 'var(--text-tertiary)' }}>→</span>
              <input value={forkNew} onChange={(e) => setForkNew(e.target.value)} placeholder="New value" style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={handleFork} disabled={!forkParam || !forkNew || loading === 'fork'} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#7C3AED', color: '#fff', fontSize: '13px', cursor: 'pointer', opacity: !forkParam || !forkNew ? 0.5 : 1 }}>
              {loading === 'fork' ? 'Forking...' : 'Run fork'}
            </button>
            <button onClick={() => setShowForkModal(false)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
