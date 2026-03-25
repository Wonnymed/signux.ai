import { supabase } from '@/lib/memory/supabase';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!supabase) return { title: 'Octux AI — Report Not Found' };

  const { data: sim } = await supabase
    .from('simulations')
    .select('question, verdict')
    .eq('id', id)
    .single();

  const verdict = sim?.verdict as any;
  const question = sim?.question || 'Decision Report';
  const rec = (verdict?.recommendation || '').toUpperCase();
  const prob = verdict?.probability || '';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://octux.ai';

  return {
    title: `${question} — Octux Report`,
    description: `${rec} (${prob}%) — ${verdict?.one_liner || 'AI-powered decision analysis'}`,
    openGraph: {
      title: `${rec} (${prob}%) — ${question}`,
      description: verdict?.one_liner || 'Analyzed by 10 AI specialists on Octux',
      images: [`${baseUrl}/api/og/${id}`],
      type: 'article',
      siteName: 'Octux AI',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${rec} (${prob}%) — ${question}`,
      description: verdict?.one_liner || 'Analyzed by 10 AI specialists on Octux',
      images: [`${baseUrl}/api/og/${id}`],
    },
  };
}

export default async function BoardroomReportPage({ params }: Props) {
  const { id } = await params;

  if (!supabase) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Service unavailable.</p>
      </div>
    );
  }

  const { data: sim } = await supabase
    .from('simulations')
    .select('id, question, verdict, domain, disclaimer, created_at')
    .eq('id', id)
    .single();

  if (!sim) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Report not found.</p>
      </div>
    );
  }

  const verdict = sim.verdict as any;
  const question = sim.question || 'Decision analysis';
  const createdAt = new Date(sim.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (!verdict) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">This simulation has no verdict yet.</p>
      </div>
    );
  }

  const rec = (verdict.recommendation || 'proceed').toLowerCase();
  const recColor = rec === 'proceed' ? '#10B981' : rec === 'delay' ? '#F59E0B' : '#EF4444';
  const agents = verdict.agent_scores || [];
  const claims = verdict.confidence_heatmap || [];

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      <div className="max-w-3xl mx-auto px-8 py-12 print:px-4 print:py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-light tracking-[0.15em] text-gray-400 lowercase">octux</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">Decision Report</span>
            </div>
            <h1 className="text-xl font-medium text-gray-900 leading-snug">{question}</h1>
            <p className="text-sm text-gray-500 mt-1">{createdAt} · 10 specialist analysts</p>
          </div>
          <div className="print:hidden">
            <a href="/c" className="text-sm text-purple-600 hover:text-purple-700">octux.ai →</a>
          </div>
        </div>

        {/* Verdict box */}
        <div className="mb-8 p-6 rounded-xl border-2" style={{ borderColor: recColor + '40' }}>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0" style={{ borderColor: recColor }}>
              <span className="text-2xl font-bold" style={{ color: recColor }}>{verdict.probability}%</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold px-2.5 py-0.5 rounded" style={{ backgroundColor: recColor + '15', color: recColor }}>
                  {verdict.recommendation?.toUpperCase()}
                </span>
                {verdict.grade && (
                  <span className="text-sm font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">{verdict.grade}</span>
                )}
              </div>
              <p className="text-base text-gray-800 leading-relaxed">{verdict.one_liner || verdict.summary}</p>
            </div>
          </div>
        </div>

        {/* Key Findings */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Key Findings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {verdict.main_risk && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                <span className="text-xs font-medium text-red-600">PRIMARY RISK</span>
                <p className="text-sm text-gray-700 mt-1">{verdict.main_risk}</p>
              </div>
            )}
            {verdict.next_action && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <span className="text-xs font-medium text-green-600">RECOMMENDED ACTION</span>
                <p className="text-sm text-gray-700 mt-1">{verdict.next_action}</p>
              </div>
            )}
          </div>
        </section>

        {/* Agent Scoreboard */}
        {agents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Analyst Scoreboard</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">Analyst</th>
                  <th className="text-left py-2 font-medium text-gray-500">Position</th>
                  <th className="text-right py-2 font-medium text-gray-500">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {[...agents].sort((a: any, b: any) => b.confidence - a.confidence).map((agent: any, i: number) => {
                  const posColor = agent.position?.toLowerCase() === 'proceed' ? '#10B981' : agent.position?.toLowerCase() === 'delay' ? '#F59E0B' : '#EF4444';
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-800">{agent.agent_name}</td>
                      <td className="py-2.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: posColor + '15', color: posColor }}>
                          {agent.position?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-600">{agent.confidence}/10</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Confidence Heatmap */}
        {claims.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Claim Confidence</h2>
            <div className="space-y-2">
              {claims.map((claim: any, i: number) => {
                const colors: Record<string, string> = { consensus: '#10B981', majority: '#3B82F6', contested: '#EC4899', unsupported: '#9CA3AF' };
                const color = colors[claim.grade] || colors.unsupported;
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-gray-700 flex-1">{claim.claim}</span>
                    <span className="text-xs text-gray-400 shrink-0">{claim.grade}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Methodology */}
        <section className="mb-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Methodology</h2>
          <div className="text-xs text-gray-500 space-y-1">
            <p>10-round adversarial debate protocol with {agents.length} specialist analysts.</p>
            <p>Each analyst provides independent assessment, positions are challenged in adversarial rounds, and convergence produces a consensus verdict with traceable citations.</p>
            {verdict.calibration_adjusted && verdict.calibration_note && <p>{verdict.calibration_note}</p>}
            {verdict.disclaimer && <p className="italic">{verdict.disclaimer}</p>}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-6 border-t border-gray-200 print:hidden">
          <p className="text-sm text-gray-500 mb-3">Powered by Octux AI — 10 specialists debate your decisions</p>
          <a
            href="/c"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Run your own analysis →
          </a>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-12 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">Generated by octux.ai — Decision Operating System</p>
        </div>
      </div>
    </div>
  );
}
