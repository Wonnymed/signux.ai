'use client';

import type { StressOpusVerdict as StressOpusVerdictT } from '@/lib/simulation/types';
import { cn } from '@/lib/design/cn';
import { VERDICT_HEADER, VerdictSectionRule, VerdictSources } from '@/components/verdict/common';

function pctDisplay(n: number): number {
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  return Math.round(n);
}

function survivalBarColor(p: number): string {
  if (p >= 70) return 'rgba(74,222,128,0.85)';
  if (p >= 40) return 'rgba(251,191,36,0.85)';
  return 'rgba(248,113,113,0.85)';
}

function riskLevelPill(rl: string): { cls: string; label: string } {
  switch (rl) {
    case 'LOW':
      return { cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', label: 'LOW' };
    case 'MODERATE':
      return { cls: 'border-amber-500/25 bg-amber-500/10 text-amber-200', label: 'MODERATE' };
    case 'HIGH':
      return { cls: 'border-orange-500/30 bg-orange-500/10 text-orange-300', label: 'HIGH' };
    case 'CRITICAL':
      return { cls: 'border-red-500/35 bg-red-500/10 text-red-300', label: 'CRITICAL' };
    default:
      return { cls: 'border-white/10 bg-white/[0.04] text-white/45', label: rl };
  }
}

const severityCard: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/[0.04]',
  high: 'border-orange-500/25 bg-orange-500/[0.03]',
  medium: 'border-amber-500/20 bg-amber-500/[0.03]',
  low: 'border-white/10 bg-white/[0.02]',
};

export function StressVerdict({ verdict }: { verdict: StressOpusVerdictT }) {
  const surv = Math.min(100, Math.max(0, verdict.survival_probability));
  const barColor = survivalBarColor(surv);
  const pill = riskLevelPill(verdict.risk_level);
  const bpProb = verdict.breaking_point ? pctDisplay(verdict.breaking_point.probability) : 0;

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-0 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Vulnerability audit</p>
      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${surv}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[26px] font-semibold tabular-nums text-white/90">{surv}%</span>
          <span className="text-[12px] text-white/40">Survival probability</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-white/45">Risk level:</span>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', pill.cls)}>
          {pill.label}
        </span>
      </div>
      {verdict.headline ? <p className="mt-3 text-[14px] leading-relaxed text-white/55">{verdict.headline}</p> : null}
      {verdict.executive_summary ? (
        <p className="mt-2 text-[13px] leading-relaxed text-white/45">{verdict.executive_summary}</p>
      ) : null}

      {verdict.breaking_point ? (
        <>
          <VerdictSectionRule />
          <div className="rounded-xl border border-red-500/35 bg-red-500/[0.04] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400/80">Breaking point</p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/75">{verdict.breaking_point.description}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/40">
              <span>Probability: {bpProb}%</span>
              <span className="text-white/25">|</span>
              <span>{verdict.breaking_point.timeframe}</span>
            </div>
          </div>
        </>
      ) : null}

      {verdict.resilience_scores?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Resilience scores</p>
          <div className="mt-3 space-y-3">
            {verdict.resilience_scores.map((r, i) => (
              <div key={`${r.dimension}-${i}`}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-white/55">{r.dimension}</span>
                  <span className="tabular-nums text-white/40">{r.score}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      r.score >= 70 ? 'bg-emerald-500/55' : r.score >= 40 ? 'bg-amber-500/55' : 'bg-red-500/55',
                    )}
                    style={{ width: `${Math.min(100, r.score)}%` }}
                  />
                </div>
                {r.explanation ? <p className="mt-1 text-[10px] text-white/28">{r.explanation}</p> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {verdict.vulnerabilities?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Vulnerabilities ({verdict.vulnerabilities.length})</p>
          <div className="mt-3 space-y-3">
            {verdict.vulnerabilities.map((v, i) => (
              <div
                key={v.id ?? i}
                className={cn('rounded-xl border p-3', severityCard[v.severity] || severityCard.low)}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/45">{v.severity}</span>
                  <span className="text-[13px] font-medium text-white/80">{v.title}</span>
                </div>
                <p className="text-[12px] leading-relaxed text-white/50">{v.description}</p>
                {v.specialist_who_found ? (
                  <p className="mt-2 text-[10px] text-white/28">Found by: {v.specialist_who_found}</p>
                ) : null}
                <div className="mt-3 border-t border-white/[0.06] pt-2 text-[11px] text-emerald-200/65">
                  <span className="font-medium text-emerald-300/80">Fix: </span>
                  {v.mitigation?.action}
                  {v.mitigation?.cost ? (
                    <span className="ml-1 text-white/30">({v.mitigation.cost})</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {verdict.kill_switches?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Kill switches</p>
          <ul className="mt-3 space-y-3 text-[12px]">
            {verdict.kill_switches.map((ks, i) => (
              <li key={i} className="leading-relaxed text-amber-200/75">
                <span className="text-white/50">IF </span>
                {ks.trigger}
                <div className="mt-1 pl-0 text-white/55">
                  <span className="text-amber-400/70">→ </span>
                  {ks.action}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {verdict.immediate_actions?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Do before you launch</p>
          <ol className="mt-3 list-none space-y-3 p-0">
            {verdict.immediate_actions.map((a) => (
              <li key={a.priority} className="flex gap-3 text-[12px] text-white/55">
                <span className="w-5 shrink-0 font-semibold text-[#e8593c]">#{a.priority}</span>
                <div>
                  <p>{a.action}</p>
                  <p className="mt-0.5 text-[10px] text-white/30">by: {a.deadline}</p>
                  {a.why ? <p className="mt-1 text-[11px] text-white/35">{a.why}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {verdict.best_case_if_patched ? (
        <>
          <VerdictSectionRule />
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70">
              If you fix the top issues
            </p>
            <p className="mt-2 text-[13px] text-white/55">{verdict.best_case_if_patched.narrative}</p>
            <div className="mt-3 text-[13px] font-medium text-emerald-300/85">
              {surv}% survival → {verdict.best_case_if_patched.survival_probability_after_fixes}% survival
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-500/50"
                style={{
                  width: `${Math.min(100, verdict.best_case_if_patched.survival_probability_after_fixes)}%`,
                }}
              />
            </div>
          </div>
        </>
      ) : null}

      {verdict.worst_case_scenario?.narrative ? (
        <>
          <VerdictSectionRule />
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className={VERDICT_HEADER}>Worst case</p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/50">{verdict.worst_case_scenario.narrative}</p>
            <p className="mt-2 text-[11px] text-white/35">
              Loss: {verdict.worst_case_scenario.total_loss} · Recovery: {verdict.worst_case_scenario.recovery_time}
            </p>
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
