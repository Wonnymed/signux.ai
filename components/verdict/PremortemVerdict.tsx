'use client';

import type { PremortemOpusVerdict as PremortemOpusVerdictT } from '@/lib/simulation/types';
import { cn } from '@/lib/design/cn';
import { VERDICT_HEADER, VerdictSectionRule, VerdictSources } from '@/components/verdict/common';

function timelineDotClass(i: number, n: number): string {
  if (n <= 1) return 'bg-amber-500/50';
  const t = i / (n - 1);
  if (t < 0.35) return 'bg-emerald-500/55';
  if (t < 0.65) return 'bg-amber-500/55';
  return 'bg-red-500/50';
}

export function PremortemVerdict({ verdict }: { verdict: PremortemOpusVerdictT }) {
  const tl = verdict.timeline ?? [];
  const n = tl.length;

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-0 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Failure autopsy</p>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-red-400/50">Cause of death</p>
      <p className="mt-1 text-[16px] font-medium leading-snug text-red-300/90">{verdict.cause_of_death}</p>
      <p className="mt-2 text-[13px] text-white/45">
        Failure probability: {verdict.failure_probability}% · Grade: {verdict.grade}
      </p>
      {verdict.headline ? <p className="mt-3 text-[14px] text-white/50">{verdict.headline}</p> : null}

      {verdict.autopsy_narrative ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>The story</p>
          <blockquote
            className={cn(
              'mt-3 border-l-2 border-red-500/25 pl-4 text-[13px] italic leading-relaxed',
              'text-white/55',
            )}
          >
            {verdict.autopsy_narrative}
          </blockquote>
        </>
      ) : null}

      {n > 0 ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Timeline of failure</p>
          <div className="mt-4 space-y-0">
            {tl.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', timelineDotClass(i, n))} />
                  {i < n - 1 ? <div className="mt-1 min-h-[28px] w-px flex-1 bg-gradient-to-b from-white/10 to-white/5" /> : null}
                </div>
                <div className={cn('pb-4', i === n - 1 && 'pb-0')}>
                  <p className="text-[11px] font-semibold text-white/40">{t.month}</p>
                  <p className="mt-0.5 text-[12px] text-white/60">{t.event}</p>
                  {t.warning_sign ? (
                    <p className="mt-1 text-[11px] text-amber-400/55">⚠ {t.warning_sign}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {verdict.point_of_no_return ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Point of no return</p>
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-400/90" aria-hidden>
                ◆
              </span>
              <div>
                <p className="text-[12px] font-medium text-red-300/85">{verdict.point_of_no_return.when}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  {verdict.point_of_no_return.what_happened}
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-emerald-200/55">
                  <span className="font-medium text-emerald-300/70">Should have: </span>
                  {verdict.point_of_no_return.what_should_have_happened}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {verdict.what_the_crowd_saw ? (
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] text-white/45">
          <p className={VERDICT_HEADER}>What the crowd showed</p>
          <p className="mt-2">{verdict.what_the_crowd_saw.early_signal}</p>
          <p className="mt-2 text-amber-200/50">Ignored: {verdict.what_the_crowd_saw.ignored_warning}</p>
        </div>
      ) : null}

      {verdict.contributing_factors?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Contributing factors</p>
          <ul className="mt-3 space-y-2">
            {verdict.contributing_factors.map((c) => (
              <li key={c.rank} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[12px] text-white/55">
                <span className="text-white/35">#{c.rank} </span>
                {c.factor}
                <span className="text-[10px] text-white/28"> · weight {c.weight}%</span>
                <p className="mt-1 text-[11px] text-emerald-200/55">Prevention: {c.prevention}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {verdict.total_cost_of_failure ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Total cost of failure</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
            <div>
              <span className="text-white/30">Financial: </span>
              <span className="text-red-300/70">{verdict.total_cost_of_failure.financial}</span>
            </div>
            <div>
              <span className="text-white/30">Time: </span>
              <span className="text-white/50">{verdict.total_cost_of_failure.time}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-white/30">Opportunity: </span>
              <span className="text-white/50">{verdict.total_cost_of_failure.opportunity_cost}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-white/30">Emotional: </span>
              <span className="italic text-white/35">{verdict.total_cost_of_failure.emotional}</span>
            </div>
          </div>
        </>
      ) : null}

      {verdict.how_to_prevent_this?.length ? (
        <>
          <VerdictSectionRule />
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70">
              How to prevent this
            </p>
            <ol className="mt-3 list-none space-y-3 p-0">
              {verdict.how_to_prevent_this.map((h) => (
                <li key={h.priority} className="text-[12px] text-white/60">
                  <span className="font-semibold text-emerald-400/75">#{h.priority} </span>
                  {h.intervention}
                  <p className="mt-1 text-[10px] text-white/35">
                    When: {h.when_to_act} · Success with fix: ~{h.success_probability_with_fix}%
                  </p>
                </li>
              ))}
            </ol>
            {typeof verdict.revised_probability_if_all_prevented === 'number' ? (
              <p className="mt-4 border-t border-emerald-500/15 pt-3 text-[13px] font-medium text-emerald-300/80">
                If all prevented: outlook ~{verdict.revised_probability_if_all_prevented}% success
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {verdict.final_word ? (
        <>
          <VerdictSectionRule />
          <blockquote className="border-l-2 border-white/12 pl-4 text-[13px] italic leading-relaxed text-white/55">
            {verdict.final_word}
            <footer className="mt-2 text-[12px] not-italic text-white/35">— Chief</footer>
          </blockquote>
        </>
      ) : null}

      <VerdictSources sources={verdict.sources} />
    </div>
  );
}
