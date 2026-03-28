import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: sim } = await supabase
    .from('simulations')
    .select('question, verdict')
    .eq('share_id', shareId)
    .maybeSingle();

  const verdict = sim?.verdict as Record<string, unknown> | undefined;
  const question = sim?.question || 'Decision analysis';
  const recommendation = String(verdict?.recommendation || 'analyzing')
    .toUpperCase()
    .replace(/_/g, ' ');
  const probability = verdict?.probability ?? '?';
  const grade = verdict?.grade || '';
  const gv = verdict?.god_view as Record<string, unknown> | undefined;
  const voiceCount = typeof gv?.totalVoices === 'number' ? gv.totalVoices : 0;

  const recColor =
    recommendation.includes('PROCEED') && !recommendation.includes('DELAY')
      ? '#4ade80'
      : recommendation.includes('DELAY')
        ? '#fbbf24'
        : recommendation.includes('ABANDON')
          ? '#f87171'
          : '#94a3b8';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '56px 72px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121c 50%, #0a0a0f 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#e8593c', letterSpacing: '0.12em' }}>OCTUX</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Shared simulation</span>
        </div>

        <div
          style={{
            fontSize: question.length > 90 ? '28px' : '34px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.25,
            marginBottom: '32px',
            maxWidth: '1000px',
          }}
        >
          {question.length > 140 ? `${question.slice(0, 137)}…` : question}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '28px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '72px', fontWeight: 700, color: recColor }}>{String(probability)}%</div>
          <div style={{ fontSize: '30px', fontWeight: 600, color: recColor, maxWidth: '520px' }}>{recommendation}</div>
          {grade ? (
            <div
              style={{
                fontSize: '26px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {String(grade)}
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.45)', marginTop: '36px' }}>
          10 specialists{voiceCount > 0 ? ` · ${voiceCount} market voices` : ''}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
