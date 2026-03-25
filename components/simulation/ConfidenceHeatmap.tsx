'use client';

type Claim = {
  claim: string;
  confidence_grade: 'green' | 'yellow' | 'red';
  confidence_score: number;
  supporting_agents: string[];
  contested_by: string[];
  evidence_quality: string;
  category: string;
};

type Heatmap = {
  total_claims: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  overall_confidence: number;
  claims: Claim[];
};

type Props = { heatmap: Heatmap | null };

export default function ConfidenceHeatmap({ heatmap }: Props) {
  if (!heatmap || heatmap.claims.length === 0) return null;

  const gradeColors = {
    green: { bg: '#10B98110', border: '#10B98140', dot: '#10B981' },
    yellow: { bg: '#F59E0B10', border: '#F59E0B40', dot: '#F59E0B' },
    red: { bg: '#F43F5E10', border: '#F43F5E40', dot: '#F43F5E' },
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Confidence breakdown</div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span>{heatmap.green_count} high</span>
          <span>{heatmap.yellow_count} moderate</span>
          <span>{heatmap.red_count} low</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {heatmap.claims.map((claim, i) => {
          const grade = gradeColors[claim.confidence_grade] || gradeColors.yellow;
          return (
            <div key={i} style={{ padding: '12px 16px', borderRadius: '10px', border: `1px solid ${grade.border}`, background: grade.bg }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: grade.dot, flexShrink: 0, marginTop: '6px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{claim.claim}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Score: {Math.round(claim.confidence_score * 100)}%</span>
                    <span>Evidence: {claim.evidence_quality}</span>
                    {claim.supporting_agents.length > 0 && <span>Supported by {claim.supporting_agents.length} agent{claim.supporting_agents.length > 1 ? 's' : ''}</span>}
                    {claim.contested_by.length > 0 && <span style={{ color: '#F43F5E' }}>Contested by {claim.contested_by.length}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
