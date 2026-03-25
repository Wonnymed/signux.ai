'use client';

type Agent = {
  agentId: string;
  agentName: string;
  currentVersion: number;
  avgScore: number | null;
  simCount: number;
  versionHistory: { version: number; source: string; avgScore: number | null; simCount: number; promotedAt: string | null }[];
};

export default function AgentPerformanceTable({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>No agent data yet. Run simulations to see agent performance.</div>;
  }

  const sorted = [...agents].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  return (
    <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-1, #f9f9f8)', borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>Agent</th>
            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)' }}>Version</th>
            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)' }}>Avg score</th>
            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)' }}>Sims</th>
            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((agent, i) => {
            const score = agent.avgScore ?? 0;
            const scoreColor = score >= 7.5 ? '#10B981' : score >= 6 ? '#F59E0B' : score > 0 ? '#F43F5E' : 'var(--text-tertiary)';
            const isOptimized = agent.currentVersion > 0;
            const hasRollback = agent.versionHistory.some(v => v.source === 'rollback');

            return (
              <tr key={agent.agentId} style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{agent.agentName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{agent.agentId}</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    background: isOptimized ? '#7C3AED18' : 'var(--surface-2)',
                    color: isOptimized ? '#7C3AED' : 'var(--text-tertiary)',
                  }}>
                    v{agent.currentVersion}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500, color: scoreColor }}>
                  {score > 0 ? score.toFixed(1) : '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {agent.simCount}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {hasRollback && <span style={{ fontSize: '11px', color: '#F43F5E' }}>rolled back</span>}
                  {isOptimized && !hasRollback && <span style={{ fontSize: '11px', color: '#10B981' }}>optimized</span>}
                  {!isOptimized && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>default</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
