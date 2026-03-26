'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/design/cn';

type Outcome = 'pending' | 'confirmed' | 'regretted';

interface Row {
  id: string;
  title: string;
  verdict: string;
  date: string;
  outcome: Outcome;
}

const MOCK: Row[] = [
  {
    id: '1',
    title: 'Should I accept the Series A offer?',
    verdict: 'Proceed (72%)',
    date: 'Mar 24, 2026',
    outcome: 'pending',
  },
  {
    id: '2',
    title: 'Relocate to Singapore vs stay in Seoul',
    verdict: 'Delay (55%)',
    date: 'Mar 18, 2026',
    outcome: 'confirmed',
  },
  {
    id: '3',
    title: 'Buy rental in Gangnam',
    verdict: 'Abandon (61%)',
    date: 'Feb 02, 2026',
    outcome: 'regretted',
  },
];

const FILTERS: { id: Outcome | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'regretted', label: 'Regretted' },
];

export default function DecisionJournal() {
  const [filter, setFilter] = useState<Outcome | 'all'>('all');

  const rows = useMemo(() => {
    if (filter === 'all') return MOCK;
    return MOCK.filter((r) => r.outcome === filter);
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs transition-colors duration-150',
              filter === f.id
                ? 'bg-accent/15 text-accent border border-accent/25'
                : 'text-white/35 border border-transparent hover:bg-white/[0.04] hover:text-white/55',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <div className="min-w-[520px]">
        <div className="grid grid-cols-[1fr_120px_100px_100px] gap-2 px-4 py-2.5 bg-white/[0.03] text-[10px] font-medium text-white/30 uppercase tracking-wider">
          <span>Decision</span>
          <span>Verdict</span>
          <span>Date</span>
          <span>Outcome</span>
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[1fr_120px_100px_100px] gap-2 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.02] transition-colors"
            >
              <span className="truncate">{r.title}</span>
              <span className="text-white/50 text-xs">{r.verdict}</span>
              <span className="text-white/35 text-xs">{r.date}</span>
              <OutcomeBadge outcome={r.outcome} />
            </li>
          ))}
        </ul>
        </div>
      </div>
      <p className="text-micro text-white/25">
        Sample data — connect your account to sync real decisions.
      </p>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const styles: Record<Outcome, string> = {
    pending: 'text-verdict-delay bg-verdict-delay/10 border-verdict-delay/20',
    confirmed: 'text-verdict-proceed bg-verdict-proceed/10 border-verdict-proceed/20',
    regretted: 'text-verdict-abandon bg-verdict-abandon/10 border-verdict-abandon/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-medium border w-fit',
        styles[outcome],
      )}
    >
      {outcome}
    </span>
  );
}
