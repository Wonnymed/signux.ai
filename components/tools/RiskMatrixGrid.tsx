'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/design/cn';

type Quadrant = 'low-low' | 'high-low' | 'low-high' | 'high-high';

interface Risk {
  id: string;
  label: string;
  quadrant: Quadrant;
}

const INITIAL: Risk[] = [
  { id: '1', label: 'Regulatory change', quadrant: 'high-high' },
  { id: '2', label: 'Key hire leaves', quadrant: 'low-high' },
  { id: '3', label: 'Vendor delay', quadrant: 'high-low' },
  { id: '4', label: 'Minor UI bug', quadrant: 'low-low' },
];

const QUADRANT_LABELS: Record<Quadrant, { title: string; sub: string }> = {
  'low-low': { title: 'Monitor', sub: 'Low impact · Low probability' },
  'high-low': { title: 'Contingency', sub: 'High impact · Low probability' },
  'low-high': { title: 'Watch', sub: 'Low impact · High probability' },
  'high-high': { title: 'Critical', sub: 'High impact · High probability' },
};

export default function RiskMatrixGrid() {
  const [risks, setRisks] = useState<Risk[]>(INITIAL);
  const [draft, setDraft] = useState('');
  const dragIdRef = useRef<string | null>(null);

  const move = useCallback((id: string, q: Quadrant) => {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, quadrant: q } : r)));
  }, []);

  const addRisk = () => {
    const label = draft.trim();
    if (!label) return;
    setRisks((prev) => [
      ...prev,
      { id: `n-${Date.now()}`, label, quadrant: 'low-low' },
    ]);
    setDraft('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRisk()}
          placeholder="Add a risk…"
          className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-accent/30"
        />
        <button
          type="button"
          onClick={addRisk}
          className="px-4 py-2.5 rounded-xl bg-accent/15 text-accent text-sm font-medium hover:bg-accent/20 transition-colors shrink-0"
        >
          Add to matrix
        </button>
      </div>

      <div className="relative">
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-white/25 tracking-wider whitespace-nowrap origin-center">
          Probability →
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-[10px] font-medium text-white/25 tracking-wider">
          Impact →
        </div>

        <div className="grid grid-cols-2 gap-2 pl-6 pb-8 min-h-[280px]">
          {(['low-high', 'high-high', 'low-low', 'high-low'] as const).map((q) => (
            <QuadrantDropZone
              key={q}
              quadrant={q}
              risks={risks.filter((r) => r.quadrant === q)}
              onDragStart={(id) => {
                dragIdRef.current = id;
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
              }}
              onDrop={() => {
                const id = dragIdRef.current;
                if (id) move(id, q);
                dragIdRef.current = null;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuadrantDropZone({
  quadrant,
  risks,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  quadrant: Quadrant;
  risks: Risk[];
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const meta = QUADRANT_LABELS[quadrant];
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
        onDragEnd();
      }}
      className={cn(
        'rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-3 min-h-[120px] transition-colors',
        'hover:border-white/[0.12]',
      )}
    >
      <p className="text-[10px] font-medium text-white/35 mb-0.5">{meta.title}</p>
      <p className="text-[9px] text-white/20 mb-2">{meta.sub}</p>
      <ul className="space-y-1.5">
        {risks.map((r) => (
          <li
            key={r.id}
            draggable
            onDragStart={() => onDragStart(r.id)}
            onDragEnd={onDragEnd}
            className="text-xs text-white/60 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing hover:bg-white/[0.06] transition-colors"
          >
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
