'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Thread = {
  id: string;
  title: string;
  verdict: string;
  created_at: string;
};

export default function ThreadList() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/command-palette/recent')
      .then(r => r.json())
      .then(data => {
        if (data.sims) {
          setThreads(data.sims.slice(0, 5).map((c: { id: string; question?: string; verdict_recommendation?: string; created_at: string }) => ({
            id: c.id,
            title: (c.question || '').substring(0, 40) + ((c.question || '').length > 40 ? '...' : ''),
            verdict: c.verdict_recommendation || 'unknown',
            created_at: c.created_at,
          })));
        }
      })
      .catch(() => {});
  }, [pathname]);

  if (threads.length === 0) return null;

  const verdictColors: Record<string, string> = { proceed: '#10B981', delay: '#F59E0B', abandon: '#F43F5E' };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '4px 12px', fontSize: '10px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent</div>
      {threads.map(t => {
        const isActive = pathname === `/sim/${t.id}`;
        return (
          <button key={t.id} onClick={() => router.push(`/sim/${t.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', border: 'none', background: isActive ? 'var(--surface-2)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', margin: '1px 4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: verdictColors[t.verdict] || '#6B7280' }} />
            <span style={{ fontSize: '12px', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
          </button>
        );
      })}
    </div>
  );
}
