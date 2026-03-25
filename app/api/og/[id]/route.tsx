import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: sim } = await supabase
    .from('simulations')
    .select('question, verdict')
    .eq('id', conversationId)
    .single();

  const verdict = sim?.verdict as any;
  const question = sim?.question || 'Decision Analysis';

  const recommendation = (verdict?.recommendation || 'analyzing').toUpperCase();
  const probability = verdict?.probability || '?';
  const grade = verdict?.grade || '';
  const oneLiner = verdict?.one_liner || verdict?.summary || 'AI-powered decision analysis';

  const recColor = recommendation === 'PROCEED' ? '#10B981' : recommendation === 'DELAY' ? '#F59E0B' : recommendation === 'ABANDON' ? '#EF4444' : '#7C3AED';

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #0A0A0F 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Octux wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <span style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>octux</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Decision Report</span>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3, marginBottom: '28px', maxWidth: '900px' }}>
          {question.length > 80 ? question.substring(0, 77) + '...' : question}
        </h1>

        {/* Verdict row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            border: `4px solid ${recColor}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: recColor }}>{probability}%</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '14px', fontWeight: 600, padding: '4px 12px',
                borderRadius: '6px', backgroundColor: recColor + '25', color: recColor,
              }}>
                {recommendation}
              </span>
              {grade && (
                <span style={{
                  fontSize: '13px', fontWeight: 500, padding: '3px 10px',
                  borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                }}>
                  {grade}
                </span>
              )}
            </div>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, maxWidth: '700px' }}>
              {oneLiner.length > 120 ? oneLiner.substring(0, 117) + '...' : oneLiner}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>Analyzed by 10 AI specialists</span>
          <span style={{ fontSize: '14px', color: '#7C3AED', fontWeight: 500 }}>octux.ai</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );

  // Cache for 24h on CDN, 1h in browser
  imageResponse.headers.set('Cache-Control', 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400');
  imageResponse.headers.set('CDN-Cache-Control', 'public, max-age=86400');

  return imageResponse;
}
