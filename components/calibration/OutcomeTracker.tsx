'use client';

type Outcome = {
  question: string;
  predicted: string;
  probability: number;
  outcome: string;
  brier: number;
};

export default function OutcomeTracker({ outcomes }: { outcomes: Outcome[] }) {
  if (outcomes.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
        No outcomes reported yet.
        <br />
        <span style={{ fontSize: '12px' }}>Go to a past simulation and report whether the decision worked out.</span>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      {outcomes.slice(0, 6).map((o, i) => {
        const isCorrect = (o.predicted === 'proceed' && o.outcome === 'success') ||
                          (o.predicted !== 'proceed' && o.outcome !== 'success');
        const outcomeColor = o.outcome === 'success' ? '#10B981' : o.outcome === 'failure' ? '#F43F5E' : '#F59E0B';

        return (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              borderBottom: i < Math.min(outcomes.length, 6) - 1 ? '1px solid var(--border-subtle)' : 'none',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: outcomeColor, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.question}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Predicted: {o.predicted.toUpperCase()} ({o.probability}%) → Actual: {o.outcome.toUpperCase()}
                {' '}<span style={{ color: isCorrect ? '#10B981' : '#F43F5E' }}>{isCorrect ? 'correct' : 'wrong'}</span>
                {' '}(Brier: {o.brier.toFixed(3)})
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
