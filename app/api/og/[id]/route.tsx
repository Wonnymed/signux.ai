import { NextRequest } from 'next/server';
import { supabase } from '@/lib/memory/supabase';

/**
 * Dynamic OG image for shared simulation links.
 * Returns an SVG that Twitter/LinkedIn/Slack renders as a card preview.
 * Target: 1200x630 (works for both Twitter and LinkedIn).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!supabase) {
    return new Response('Service unavailable', { status: 503 });
  }

  const { data: sim } = await supabase
    .from('simulations')
    .select('question, verdict, domain, share_digest')
    .eq('id', id)
    .single();

  if (!sim) {
    return new Response('Not found', { status: 404 });
  }

  const verdict = sim.verdict as any;
  const rec = (verdict?.recommendation || 'unknown').toUpperCase();
  const prob = verdict?.probability || 0;
  const question = (sim.question || '').substring(0, 90);
  const domain = (sim.domain || 'business').toUpperCase();
  const oneLiner = (verdict?.one_liner || '').substring(0, 80);
  const grade = verdict?.grade || '?';

  const recColor = rec === 'PROCEED' ? '#10B981' : rec === 'DELAY' ? '#F59E0B' : rec === 'ABANDON' ? '#F43F5E' : '#6B7280';

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F0A1A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1A0F2E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="purple" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A78BFA;stop-opacity:1" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <ellipse cx="600" cy="315" rx="400" ry="200" fill="rgba(124,58,237,0.06)" />

  <text x="60" y="60" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="500" fill="#A78BFA">octux ai</text>
  <text x="1140" y="60" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="400" fill="rgba(255,255,255,0.4)" text-anchor="end">${escapeXml(domain)}</text>

  <text x="60" y="160" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="300" fill="rgba(255,255,255,0.90)">
    <tspan x="60">&quot;${escapeXml(question.substring(0, 50))}</tspan>
    ${question.length > 50 ? `<tspan x="60" dy="36">${escapeXml(question.substring(50, 90))}${question.length > 90 ? '...' : ''}&quot;</tspan>` : '&quot;'}
  </text>

  <rect x="60" y="250" width="1080" height="120" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

  <rect x="80" y="270" width="${rec.length * 16 + 40}" height="36" rx="6" fill="${recColor}20" />
  <text x="${80 + (rec.length * 16 + 40) / 2}" y="294" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="${recColor}" text-anchor="middle">${escapeXml(rec)}</text>

  <text x="${80 + rec.length * 16 + 60}" y="296" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="300" fill="rgba(255,255,255,0.90)">${prob}%</text>

  <text x="1100" y="300" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="500" fill="url(#purple)" text-anchor="end">${escapeXml(grade)}</text>

  <text x="80" y="350" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="400" fill="rgba(255,255,255,0.55)">${escapeXml(oneLiner)}</text>

  <text x="60" y="520" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="400" fill="rgba(255,255,255,0.4)">10 AI specialists debated this decision</text>

  <rect x="60" y="550" width="180" height="40" rx="8" fill="#7C3AED" />
  <text x="150" y="576" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500" fill="#FFFFFF" text-anchor="middle">See full analysis</text>

  <text x="1140" y="576" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="400" fill="rgba(255,255,255,0.3)" text-anchor="end">octux.ai</text>

  <rect x="0" y="625" width="1200" height="5" fill="url(#purple)" />
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
