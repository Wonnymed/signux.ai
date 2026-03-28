import { supabase } from '@/lib/memory/supabase';
import { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

// ═══ DYNAMIC METADATA (OG tags for social sharing) ═══
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!supabase) {
    return { title: 'Octux AI — Decision Not Found' };
  }

  const { data: sim } = await supabase
    .from('simulations')
    .select('question, verdict, share_digest, domain')
    .eq('id', id)
    .single();

  if (!sim) {
    return { title: 'Octux AI — Decision Not Found' };
  }

  const verdict = sim.verdict as any;
  const rec = (verdict?.recommendation || 'unknown').toUpperCase();
  const prob = verdict?.probability || 0;
  const question = (sim.question || '').substring(0, 100);
  const digest = sim.share_digest || `${question} → ${rec} (${prob}%)`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://octux.ai';

  return {
    title: `${rec} (${prob}%) — Octux AI`,
    description: digest,
    openGraph: {
      title: `Octux: ${rec} (${prob}%)`,
      description: digest,
      type: 'article',
      url: `${baseUrl}/c/${id}/public`,
      images: [
        {
          url: `${baseUrl}/api/og/${id}`,
          width: 1200,
          height: 630,
          alt: `Octux AI verdict: ${rec} (${prob}%)`,
        },
      ],
      siteName: 'Octux AI',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Octux: ${rec} (${prob}%)`,
      description: digest,
      images: [`${baseUrl}/api/og/${id}`],
    },
  };
}

// ═══ PUBLIC PAGE — Read-only, no auth required ═══
export default async function PublicSimPage({ params }: Props) {
  const { id } = await params;

  if (!supabase) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', fontSize: '20px', color: '#666' }}>Service unavailable</div>
      </div>
    );
  }

  const { data: sim } = await supabase
    .from('simulations')
    .select('id, question, verdict, domain, share_digest, disclaimer, created_at')
    .eq('id', id)
    .single();

  if (!sim) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0, #fff)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐙</div>
          <div style={{ fontSize: '20px', fontWeight: 300, color: 'var(--text-primary)' }}>Decision not found</div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>This tentacle doesn&apos;t reach that far.</div>
          <a href="/" style={{ display: 'inline-block', marginTop: '24px', padding: '10px 24px', borderRadius: '8px', background: '#C75B2A', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            Try Octux
          </a>
        </div>
      </div>
    );
  }

  const verdict = sim.verdict as any;
  const rec = (verdict?.recommendation || 'unknown').toUpperCase();
  const prob = verdict?.probability || 0;
  const grade = verdict?.grade || '?';
  const oneLiner = verdict?.one_liner || '';
  const mainRisk = verdict?.main_risk || '';
  const nextAction = verdict?.next_action || '';
  const heatmap = verdict?.confidence_heatmap;
  const domain = (sim.domain || 'business').toUpperCase();
  const disclaimer = sim.disclaimer || '';

  const recColor = rec === 'PROCEED' ? '#10B981' : rec === 'DELAY' ? '#F59E0B' : rec === 'ABANDON' ? '#C9970D' : '#6B7280';
  const recBg = rec === 'PROCEED' ? '#10B98115' : rec === 'DELAY' ? '#F59E0B15' : '#C9970D15';

  const dateStr = new Date(sim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-0, #fff)', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', fontSize: '16px', fontWeight: 500, color: '#C75B2A' }}>
          octux ai
        </a>
        <a href="/" style={{ padding: '8px 20px', borderRadius: '8px', background: '#C75B2A', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
          Try Octux free
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Domain + Date */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: 'rgba(124,58,237,0.08)', color: '#C75B2A' }}>{domain}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary, rgba(0,0,0,0.35))' }}>{dateStr}</span>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: '28px', fontWeight: 300, color: 'var(--text-primary, rgba(0,0,0,0.90))', lineHeight: 1.3, marginBottom: '32px' }}>
          &quot;{sim.question}&quot;
        </h1>

        {/* Verdict card */}
        <div style={{ padding: '24px', borderRadius: '12px', border: `2px solid ${recColor}30`, background: recBg, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <span style={{ padding: '6px 14px', borderRadius: '6px', background: `${recColor}20`, color: recColor, fontSize: '15px', fontWeight: 600 }}>
              {rec}
            </span>
            <span style={{ fontSize: '36px', fontWeight: 300, color: 'var(--text-primary)' }}>{prob}%</span>
            <span style={{ marginLeft: 'auto', fontSize: '24px', fontWeight: 500, color: '#C75B2A' }}>{grade}</span>
          </div>
          {oneLiner && (
            <div style={{ fontSize: '15px', color: 'var(--text-secondary, rgba(0,0,0,0.55))', lineHeight: 1.6 }}>{oneLiner}</div>
          )}
        </div>

        {/* Key details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          {mainRisk && (
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface-1, #f9f9f8)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Main Risk</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{mainRisk}</div>
            </div>
          )}
          {nextAction && (
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface-1, #f9f9f8)' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Next Action</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{nextAction}</div>
            </div>
          )}
        </div>

        {/* Confidence heatmap */}
        {heatmap && heatmap.claims && heatmap.claims.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Confidence breakdown ({heatmap.green_count} strong, {heatmap.yellow_count} moderate, {heatmap.red_count} needs verification)
            </div>
            {heatmap.claims.slice(0, 6).map((claim: any, i: number) => {
              const claimColor = claim.confidence_grade === 'green' ? '#10B981' : claim.confidence_grade === 'yellow' ? '#F59E0B' : '#C9970D';
              return (
                <div key={i} style={{ padding: '10px 14px', marginBottom: '6px', borderRadius: '8px', borderLeft: `3px solid ${claimColor}`, background: 'var(--surface-1, #f9f9f8)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{claim.claim}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {claim.supporting_agents?.length || 0} agent{(claim.supporting_agents?.length || 0) !== 1 ? 's' : ''} support
                    {claim.contested_by?.length > 0 && ` · ${claim.contested_by.length} contest`}
                    {' · '}{Math.round((claim.confidence_score || 0) * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <div style={{ padding: '14px 16px', borderRadius: '8px', background: '#FEF3C7', fontSize: '12px', color: '#92400E', lineHeight: 1.6, marginBottom: '32px' }}>
            {disclaimer}
          </div>
        )}

        {/* Social proof + CTA */}
        <div style={{ textAlign: 'center', padding: '32px 0', borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
            10 AI specialists debated this decision on Octux
          </div>
          <a href="/" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: '8px', background: '#C75B2A', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}>
            Ask Octux your decision
          </a>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px' }}>Free. No login required for your first decision.</div>
        </div>
      </div>
    </div>
  );
}
