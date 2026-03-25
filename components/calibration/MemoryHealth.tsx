'use client';

import { useState, useEffect } from 'react';

type HealthData = {
  facts: { current: number; invalidated: number };
  opinions: { active: number; invalidated: number };
  observations: { active: number; invalidated: number };
  lessons: { active: number; inactive: number };
  rules: { active: number; inactive: number };
  entities: number;
  relations: number;
};

export default function MemoryHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    fetch('/api/calibration/memory-health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  if (!health) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        Loading memory metrics...
      </div>
    );
  }

  const rows = [
    { label: 'Facts', active: health.facts.current, total: health.facts.current + health.facts.invalidated },
    { label: 'Opinions', active: health.opinions.active, total: health.opinions.active + health.opinions.invalidated },
    { label: 'Observations', active: health.observations.active, total: health.observations.active + health.observations.invalidated },
    { label: 'Agent lessons', active: health.lessons.active, total: health.lessons.active + health.lessons.inactive },
    { label: 'Procedural rules', active: health.rules.active, total: health.rules.active + health.rules.inactive },
    { label: 'Graph entities', active: health.entities, total: health.entities },
    { label: 'Graph relations', active: health.relations, total: health.relations },
  ];

  return (
    <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      {rows.map((row, i) => {
        const pct = row.total > 0 ? Math.round((row.active / row.total) * 100) : 0;
        return (
          <div
            key={row.label}
            style={{
              padding: '10px 16px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.active}</span>
              {row.total !== row.active && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>/ {row.total}</span>
              )}
              {row.total > 0 && row.total !== row.active && (
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--surface-2)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: pct > 70 ? '#10B981' : pct > 40 ? '#F59E0B' : '#F43F5E' }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
