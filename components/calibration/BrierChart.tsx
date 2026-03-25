'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

type Outcome = {
  question: string;
  predicted: string;
  probability: number;
  outcome: string;
  brier: number;
};

export default function BrierChart({ outcomes, overallBrier }: { outcomes: Outcome[]; overallBrier: number }) {
  if (outcomes.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        No outcomes reported yet. Report outcomes on past simulations to see accuracy trends.
      </div>
    );
  }

  const data = [...outcomes].reverse().map((o, i) => ({
    index: i + 1,
    brier: Math.round(o.brier * 1000) / 1000,
    label: o.question.substring(0, 25) + '...',
    outcome: o.outcome,
  }));

  return (
    <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '20px', background: 'var(--surface-0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Brier score per prediction (lower = better)
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: overallBrier < 0.2 ? '#10B981' : overallBrier < 0.3 ? '#F59E0B' : '#F43F5E' }}>
          Overall: {overallBrier.toFixed(3)}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <ReferenceArea y1={0} y2={0.2} fill="#10B981" fillOpacity={0.06} />
          <ReferenceArea y1={0.2} y2={0.35} fill="#F59E0B" fillOpacity={0.06} />
          <ReferenceArea y1={0.35} y2={1} fill="#F43F5E" fillOpacity={0.06} />

          <XAxis dataKey="index" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />

          <ReferenceLine y={0.25} stroke="var(--text-tertiary)" strokeDasharray="4 4" label={{ value: 'Random (0.25)', fontSize: 10, fill: 'var(--text-tertiary)' }} />

          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
            formatter={(value: number) => [value.toFixed(3), 'Brier']}
            labelFormatter={(label) => `Prediction #${label}`}
          />

          <Line
            type="monotone"
            dataKey="brier"
            stroke="#7C3AED"
            strokeWidth={2}
            dot={{ fill: '#7C3AED', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#10B98130', marginRight: '4px' }}></span>Good (&lt;0.2)</span>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B30', marginRight: '4px' }}></span>Fair (0.2-0.35)</span>
        <span><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: '#F43F5E30', marginRight: '4px' }}></span>Poor (&gt;0.35)</span>
      </div>
    </div>
  );
}
