'use client';

import { useState } from 'react';
import { cn } from '@/lib/design/cn';

const DOMAINS = [
  {
    id: 'investment',
    label: 'Investment',
    color: '#6366f1',
    blurb: 'Capital allocation, diversification, entry/exit.',
  },
  {
    id: 'career',
    label: 'Career',
    color: '#f59e0b',
    blurb: 'Role changes, compensation, trajectory.',
  },
  {
    id: 'business',
    label: 'Business',
    color: '#10b981',
    blurb: 'Launch, pivot, partnerships, GTM.',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    color: '#ec4899',
    blurb: 'Commitment, boundaries, major conversations.',
  },
  {
    id: 'life',
    label: 'Life',
    color: '#06b6d4',
    blurb: 'Health, geography, family tradeoffs.',
  },
] as const;

export default function TemplateCards() {
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setSelected(d.id)}
            className={cn(
              'text-left rounded-2xl border p-5 transition-all duration-150',
              selected === d.id
                ? 'border-accent/35 bg-accent/[0.06] shadow-lg shadow-black/20'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]',
            )}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: `${d.color}20` }}
            >
              <span className="text-sm font-semibold" style={{ color: d.color }}>
                {d.label[0]}
              </span>
            </div>
            <h3 className="text-sm font-medium text-white/85 mb-1">{d.label}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{d.blurb}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e14] p-6 space-y-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Decision brief
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Fill in context: options, constraints, what good looks like…"
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-white/75 placeholder:text-white/25 outline-none focus:border-accent/25 resize-y"
          />
          <p className="text-micro text-white/25">
            This form is local-only for now — persistence ships in a later release.
          </p>
        </div>
      )}
    </div>
  );
}
