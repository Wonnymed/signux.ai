'use client';

import type { CompareVerdict as CompareVerdictT } from '@/lib/simulation/types';
import { VERDICT_HEADER, VerdictSectionRule, VerdictSources } from '@/components/verdict/common';

const ACCENT_A = '#3B8BD4';
const ACCENT_B = '#e24b4a';

function ScoreBar({ score, color }: { score: number; color: string }) {
  const u = Math.min(100, Math.max(0, score));
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${u}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-white/55">{Math.round(u)}</span>
    </div>
  );
}

export function CompareVerdict({ verdict }: { verdict: CompareVerdictT }) {
  const optA = verdict.option_a;
  const optB = verdict.option_b;
  const winner = verdict.winner;
  const winA = winner === 'A';
  const winB = winner === 'B';
  const nextA = verdict.next_steps?.if_a;
  const nextB = verdict.next_steps?.if_b;
  const risksA = verdict.risks?.if_choosing_a;
  const risksB = verdict.risks?.if_choosing_b;

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-0 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Head-to-head report</p>
      <h2 className="mt-2 text-[20px] font-semibold leading-tight text-white/95">
        {winner === 'neither' ? 'No clear winner' : `Option ${winner} wins`}
        <span className="ml-2 text-[15px] font-medium text-white/45">· {Math.round(verdict.confidence)}% confidence</span>
      </h2>
      <p className="mt-1 text-[13px] text-white/40">Grade: {verdict.grade}</p>
      {verdict.headline ? <p className="mt-3 text-[14px] leading-relaxed text-white/55">{verdict.headline}</p> : null}
      {verdict.executive_summary ? (
        <blockquote className="mt-3 border-l-2 border-white/10 pl-3 text-[13px] italic leading-relaxed text-white/50">
          {verdict.executive_summary}
        </blockquote>
      ) : null}

      <VerdictSectionRule />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className="rounded-xl border bg-white/[0.02] p-3 transition-shadow"
          style={{
            borderColor: winA ? `${ACCENT_A}55` : 'rgba(255,255,255,0.08)',
            boxShadow: winA ? `0 0 24px ${ACCENT_A}18` : undefined,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT_A }}>
            Option A
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-white/80">{optA?.label || 'Option A'}</p>
          <ScoreBar score={optA?.score ?? 0} color={ACCENT_A} />
          <ul className="mt-3 space-y-1 text-[11px]">
            {optA?.strengths?.map((s, j) => (
              <li key={`sa-${j}`} className="text-emerald-300/75">
                ✓ {s}
              </li>
            ))}
            {optA?.weaknesses?.map((w, j) => (
              <li key={`wa-${j}`} className="text-red-300/65">
                ✗ {w}
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-xl border bg-white/[0.02] p-3 transition-shadow"
          style={{
            borderColor: winB ? `${ACCENT_B}55` : 'rgba(255,255,255,0.08)',
            boxShadow: winB ? `0 0 24px ${ACCENT_B}18` : undefined,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ACCENT_B }}>
            Option B
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-white/80">{optB?.label || 'Option B'}</p>
          <ScoreBar score={optB?.score ?? 0} color={ACCENT_B} />
          <ul className="mt-3 space-y-1 text-[11px]">
            {optB?.strengths?.map((s, j) => (
              <li key={`sb-${j}`} className="text-emerald-300/75">
                ✓ {s}
              </li>
            ))}
            {optB?.weaknesses?.map((w, j) => (
              <li key={`wb-${j}`} className="text-red-300/65">
                ✗ {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {verdict.head_to_head?.length ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>Dimension breakdown</p>
          <div className="mt-3 space-y-3">
            {verdict.head_to_head.map((h, i) => {
              const sa = h.score_a ?? 50;
              const sb = h.score_b ?? 50;
              const sum = sa + sb || 1;
              const wa = Math.round((100 * sa) / sum);
              const wb = 100 - wa;
              return (
                <div key={`${h.dimension}-${i}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/50">
                    <span className="min-w-0 truncate font-medium text-white/65">{h.dimension}</span>
                    <span className="shrink-0 text-[10px] uppercase text-white/35">
                      {h.winner === 'tie' ? 'Tie' : `→ ${h.winner}`}
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-l-full"
                      style={{ width: `${wa}%`, backgroundColor: `${ACCENT_A}aa` }}
                    />
                    <div
                      className="h-full rounded-r-full"
                      style={{ width: `${wb}%`, backgroundColor: `${ACCENT_B}aa` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/30">{h.reason}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {(nextA?.length || nextB?.length) && (winA || winB || winner === 'neither') ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>
            {winner === 'neither' ? 'Next steps' : `Next steps (if choosing ${winner})`}
          </p>
          <ul className="mt-2 space-y-2 text-[12px] text-white/55">
            {(winner === 'A' || winner === 'neither') &&
              nextA?.map((n, i) => (
                <li key={`na-${i}`}>
                  <span className="text-white/35">→ {n.timeframe}: </span>
                  {n.action}
                </li>
              ))}
            {(winner === 'B' || winner === 'neither') &&
              nextB?.map((n, i) => (
                <li key={`nb-${i}`}>
                  <span className="text-white/35">→ {n.timeframe}: </span>
                  {n.action}
                </li>
              ))}
          </ul>
        </>
      ) : null}

      {(risksA?.length || risksB?.length) && (winA || winB || winner === 'neither') ? (
        <>
          <VerdictSectionRule />
          <p className={VERDICT_HEADER}>
            {winner === 'neither' ? 'Risks' : `Risks if choosing ${winner}`}
          </p>
          <ul className="mt-2 space-y-2 text-[12px] text-amber-200/70">
            {(winner === 'A' || winner === 'neither') &&
              risksA?.map((r, i) => (
                <li key={`ra-${i}`} className="flex gap-2">
                  <span className="shrink-0">⚠</span>
                  <span>{r}</span>
                </li>
              ))}
            {(winner === 'B' || winner === 'neither') &&
              risksB?.map((r, i) => (
                <li key={`rb-${i}`} className="flex gap-2">
                  <span className="shrink-0">⚠</span>
                  <span>{r}</span>
                </li>
              ))}
          </ul>
        </>
      ) : null}

      {verdict.risks?.if_choosing_neither ? (
        <p className="mt-4 border-l-2 border-amber-400/35 pl-3 text-[12px] text-white/45">
          If you delay: {verdict.risks.if_choosing_neither}
        </p>
      ) : null}

      {verdict.final_word ? (
        <>
          <VerdictSectionRule />
          <blockquote className="border-l-2 border-white/15 pl-4 text-[13px] italic leading-relaxed text-white/55">
            {verdict.final_word}
            <footer className="mt-2 text-[12px] not-italic text-white/35">— Chief</footer>
          </blockquote>
        </>
      ) : null}

      <VerdictSources sources={verdict.sources} />
    </div>
  );
}
