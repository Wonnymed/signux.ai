'use client';

import { useState } from 'react';

type Cycle = {
  id: string;
  trigger: string;
  agentsOptimized: string[];
  agentsRolledBack: string[];
  totalImprovement: number | null;
  createdAt: string;
};

export default function OptimizationLog({ cycles }: { cycles: Cycle[] }) {
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  async function handleManualTrigger() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch('/api/optimization/trigger', { method: 'POST' });
      const data = await res.json();
      const promoted = data.promoted?.length || 0;
      const skipped = data.skipped?.length || 0;
      setTriggerResult(`Done: ${promoted} promoted, ${skipped} skipped`);
    } catch {
      setTriggerResult('Failed to trigger optimization');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={handleManualTrigger}
          disabled={triggering}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid #C75B2A', background: 'transparent',
            color: '#C75B2A', fontSize: '13px', fontWeight: 500,
            cursor: triggering ? 'wait' : 'pointer',
            opacity: triggering ? 0.6 : 1,
          }}
        >
          {triggering ? 'Optimizing...' : 'Trigger optimization now'}
        </button>
        {triggerResult && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{triggerResult}</span>
        )}
      </div>

      {cycles.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
          No optimization cycles yet. System optimizes automatically every 20 simulations.
        </div>
      ) : (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {cycles.map((cycle, i) => (
            <div
              key={cycle.id}
              style={{
                padding: '12px 16px',
                borderBottom: i < cycles.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  {cycle.trigger === 'auto' ? 'Auto optimization' : 'Manual trigger'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {new Date(cycle.createdAt).toLocaleDateString()} {new Date(cycle.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {cycle.agentsOptimized.length > 0 && (
                  <span>
                    <span style={{ color: '#10B981' }}>Promoted:</span> {cycle.agentsOptimized.map(a => a.replace(/_/g, ' ')).join(', ')}
                  </span>
                )}
                {cycle.agentsRolledBack.length > 0 && (
                  <span>
                    <span style={{ color: '#C9970D' }}>Rolled back:</span> {cycle.agentsRolledBack.map(a => a.replace(/_/g, ' ')).join(', ')}
                  </span>
                )}
                {cycle.totalImprovement !== null && cycle.totalImprovement > 0 && (
                  <span style={{ color: '#10B981' }}>+{cycle.totalImprovement.toFixed(1)} avg improvement</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
