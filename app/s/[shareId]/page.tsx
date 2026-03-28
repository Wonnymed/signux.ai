import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/memory/supabase';
import { buildPdfInputFromSimulationRow } from '@/lib/export/pdf-generator';
import { getPublicAppUrl } from '@/lib/share/app-url';

type Props = { params: Promise<{ shareId: string }> };

async function fetchShared(shareId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('simulations')
    .select('question, verdict, debate, audit, created_at, disclaimer')
    .eq('share_id', shareId)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const row = await fetchShared(shareId);
  const base = getPublicAppUrl();

  if (!row) {
    return { title: 'Octux — Shared simulation' };
  }

  const v = (row.verdict || {}) as Record<string, unknown>;
  const rec = String(v.recommendation || 'unknown').toUpperCase().replace(/_/g, ' ');
  const prob = v.probability ?? '?';
  const grade = v.grade || '';
  const title = `Octux: ${(row.question || 'Simulation').slice(0, 80)}${(row.question || '').length > 80 ? '…' : ''}`;
  const description = `${prob}% ${rec} · Grade ${grade} · 10 specialists`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${base}/s/${shareId}`,
      images: [
        {
          url: `${base}/api/og/share/${shareId}`,
          width: 1200,
          height: 630,
          alt: 'Octux simulation summary',
        },
      ],
      siteName: 'Octux',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${base}/api/og/share/${shareId}`],
    },
  };
}

function recLabel(v: Record<string, unknown>): string {
  const r = String(v.recommendation || '').toLowerCase();
  if (r.includes('proceed_with') || r.includes('conditions')) return 'PROCEED WITH CONDITIONS';
  if (r === 'delay') return 'DELAY';
  if (r === 'abandon') return 'ABANDON';
  return 'PROCEED';
}

export default async function SharedSimulationPage({ params }: Props) {
  const { shareId } = await params;

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <p className="text-white/50">Service unavailable.</p>
      </div>
    );
  }

  const row = await fetchShared(shareId);
  if (!row) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center text-white">
        <p className="text-lg text-white/70">This shared link is invalid or expired.</p>
        <Link href="/" className="mt-8 rounded-lg bg-[#e8593c] px-6 py-3 text-sm font-medium text-white">
          Run your own simulation
        </Link>
      </div>
    );
  }

  const pdfInput = buildPdfInputFromSimulationRow(row);
  const v = pdfInput.verdict;
  const pct = Math.min(100, Math.max(0, Math.round(Number(v.probability) || 0)));
  const gv = v.god_view as Record<string, unknown> | undefined;
  const god =
    gv && typeof gv.totalVoices === 'number' && gv.totalVoices > 0
      ? (() => {
          const pos = Number(gv.positive) || 0;
          const neg = Number(gv.negative) || 0;
          const neu = Number(gv.neutral) || 0;
          const sum = pos + neg + neu;
          const denom = sum > 0 ? sum : gv.totalVoices;
          return {
            total: gv.totalVoices as number,
            pos: Math.round((100 * pos) / denom),
            neg: Math.round((100 * neg) / denom),
            neu: Math.round((100 * neu) / denom),
          };
        })()
      : null;

  const cd = v.compare_data as Record<string, unknown> | undefined;
  const stress = v.stress_data as { risk_matrix?: Array<Record<string, unknown>> } | undefined;
  const fa = v.failure_analysis as {
    failure_causes?: Array<Record<string, unknown>>;
    prevention_checklist?: string[];
    failure_narrative?: string;
  } | undefined;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-2xl px-6 py-12 pb-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#e8593c]">Octux</p>
        <h1 className="mt-2 text-2xl font-semibold leading-snug text-white/95">Simulation report</h1>
        <p className="mt-1 text-xs text-white/35">
          Shared read-only view · {pdfInput.generatedAtLabel}
        </p>

        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Question</h2>
          <p className="mt-2 text-base leading-relaxed text-white/80">&ldquo;{row.question}&rdquo;</p>
        </section>

        <section className="mt-10 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Verdict</h2>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <span className="text-5xl font-bold text-[#e8593c]">{pct}%</span>
            <span className="text-lg font-semibold text-emerald-300/90">{recLabel(v)}</span>
            <span className="rounded-md bg-white/10 px-2 py-1 text-sm text-white/70">Grade {String(v.grade || '—')}</span>
          </div>
          {v.one_liner ? (
            <p className="mt-4 text-sm leading-relaxed text-white/55">{String(v.one_liner)}</p>
          ) : null}
        </section>

        {(v.main_risk || v.next_action) && (
          <section className="mt-8 space-y-4">
            {v.main_risk ? (
              <div className="border-l-2 border-red-400/60 pl-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300/90">Top risk</p>
                <p className="mt-1 text-sm text-white/80">{String(v.main_risk)}</p>
              </div>
            ) : null}
            {v.next_action ? (
              <div className="border-l-2 border-emerald-400/60 pl-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">Top action</p>
                <p className="mt-1 text-sm text-white/80">{String(v.next_action)}</p>
              </div>
            ) : null}
          </section>
        )}

        {pdfInput.specialists.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Specialist positions</h2>
            <ul className="mt-3 space-y-2">
              {pdfInput.specialists.slice(0, 12).map((s) => (
                <li key={s.name} className="flex justify-between gap-3 text-sm text-white/65">
                  <span className="min-w-0 truncate">{s.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase text-white/40">
                    {s.position} · {Math.round(s.confidence)}/10
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {god && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">
              God&apos;s view · {god.total} market voices
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {god.pos}% positive · {god.neg}% concerned · {god.neu}% neutral
            </p>
          </section>
        )}

        {cd && Array.isArray(cd.dimensions) && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Comparison</h2>
            <p className="mt-2 text-sm text-white/70">Winner: {String(cd.winner_label || cd.winner)}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/55">
              {(cd.dimensions as Array<Record<string, unknown>>).map((d, i) => (
                <li key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="font-medium text-white/80">{String(d.name)}</span> — Option {String(d.winner)} · A{' '}
                  {String(d.score_a)}/10 vs B {String(d.score_b)}/10
                </li>
              ))}
            </ul>
          </section>
        )}

        {stress?.risk_matrix && stress.risk_matrix.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Stress test</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              {stress.risk_matrix.slice(0, 8).map((r, i) => {
                const p = Number(r.probability) > 1 ? Number(r.probability) / 100 : Number(r.probability) || 0;
                return (
                  <li key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <span className="text-white/85">{String(r.threat)}</span>
                    <span className="ml-2 text-[10px] uppercase text-white/35">
                      {String(r.impact)} · p≈{Math.round(p * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {fa?.failure_causes && fa.failure_causes.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Pre-mortem</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              {fa.failure_causes.slice(0, 8).map((c, i) => (
                <li key={i}>
                  {String(c.cause)} ({Math.round((Number(c.probability) || 0) * 100)}%)
                </li>
              ))}
            </ul>
            {fa.prevention_checklist && fa.prevention_checklist.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">Prevention</p>
                <ul className="mt-2 list-inside list-disc text-sm text-emerald-200/70">
                  {fa.prevention_checklist.slice(0, 10).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {row.disclaimer ? (
          <p className="mt-10 text-xs leading-relaxed text-white/35">{row.disclaimer}</p>
        ) : null}

        <div className="mt-14 border-t border-white/[0.08] pt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#e8593c] px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-95"
          >
            Run your own simulation
          </Link>
          <p className="mt-4 text-xs text-white/30">octux.ai · {pdfInput.roundCount} rounds · {pdfInput.specialistCount} specialists</p>
        </div>
      </div>
    </div>
  );
}
