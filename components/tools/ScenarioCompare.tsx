'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/design/cn';

export default function ScenarioCompare() {
  const [a, setA] = useState({ name: 'Option A', pros: '', cons: '' });
  const [b, setB] = useState({ name: 'Option B', pros: '', cons: '' });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <OptionColumn
        label="Option A"
        value={a}
        onChange={setA}
        accent="border-accent/20 bg-accent/[0.03]"
      />
      <OptionColumn
        label="Option B"
        value={b}
        onChange={setB}
        accent="border-amber-600/20 bg-amber-600/[0.03]"
      />
    </div>
  );
}

function OptionColumn({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: { name: string; pros: string; cons: string };
  onChange: (v: { name: string; pros: string; cons: string }) => void;
  accent: string;
}) {
  return (
    <div className={cn('rounded-2xl border p-5 space-y-4', accent)}>
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        className="w-full bg-transparent text-base font-medium text-txt-primary border-b border-border-default pb-2 outline-none focus:border-accent/40 transition-colors"
        placeholder={label}
      />
      <div>
        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Pros</p>
        <textarea
          value={value.pros}
          onChange={(e) => onChange({ ...value, pros: e.target.value })}
          placeholder="List strengths…"
          rows={5}
          className="w-full rounded-xl bg-surface-2 border border-border-subtle px-3 py-2.5 text-sm text-txt-secondary placeholder:text-txt-disabled outline-none focus:border-border-strong resize-y min-h-[120px]"
        />
      </div>
      <div>
        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Cons</p>
        <textarea
          value={value.cons}
          onChange={(e) => onChange({ ...value, cons: e.target.value })}
          placeholder="List tradeoffs…"
          rows={5}
          className="w-full rounded-xl bg-surface-2 border border-border-subtle px-3 py-2.5 text-sm text-txt-secondary placeholder:text-txt-disabled outline-none focus:border-border-strong resize-y min-h-[120px]"
        />
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-colors"
      >
        <Plus size={14} strokeWidth={1.5} />
        Add bullet
      </button>
    </div>
  );
}
