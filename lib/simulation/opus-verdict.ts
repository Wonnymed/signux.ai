import type { AgentReport, DecisionObject } from '@/lib/agents/types';
import type { CompareVerdictData, StressVerdictData, PremortemFailureAnalysis } from '@/lib/simulation/mode-verdict';
import { parseJSON, type SearchCitation } from '@/lib/simulation/claude';
import type { SimulationChargeType } from '@/lib/billing/token-costs';
import type { GodViewCrowdSummary } from '@/lib/simulation/crowd';
import type { SimulationDesign } from '@/lib/simulation/types';
import { sanitizeChiefId } from '@/lib/simulation/flows';
import { splitCompareOptions } from '@/lib/simulation/crowd';

function specialistTeam(
  report: AgentReport,
  chiefDesign: SimulationDesign | null,
): 'A' | 'B' | undefined {
  if (chiefDesign?.kind !== 'specialist') return undefined;
  const s = chiefDesign.specialists.find(
    (sp) => `chief_${sanitizeChiefId(sp.id)}` === report.agent_id,
  );
  return s?.team;
}

function formatReportsBlock(reports: AgentReport[]): string {
  return reports
    .map(
      (r) =>
        `[${r.agent_name} | ${r.agent_id} | ${r.position} | conf ${r.confidence}/10]: ${r.key_argument}`,
    )
    .join('\n\n');
}

function godViewBlock(crowdSignalText: string, gv?: GodViewCrowdSummary): string {
  let s = crowdSignalText ? `\nCROWD / MARKET SIGNAL (text):\n${crowdSignalText}\n` : '';
  if (gv && gv.totalVoices > 0) {
    s += `\nGOD'S VIEW SUMMARY:\n- Voices: ${gv.totalVoices} (+${gv.positive} / -${gv.negative} / ~${gv.neutral})\n- Top positive theme: ${gv.topPositive}\n- Top concern: ${gv.topNegative}\n`;
  }
  return s;
}

export function buildOpusVerdictUserPayload(params: {
  mode: SimulationChargeType;
  question: string;
  chiefDesign: SimulationDesign | null;
  consensusReports: AgentReport[];
  allReports: AgentReport[];
  reportSummaryForChair: string;
  taskLedgerSection: string;
  crowdSignalText: string;
  godViewSummary?: GodViewCrowdSummary;
  operatorContext: string;
  memoryForVerdict: string;
  specialistSourcesBlock: string;
}): string {
  const {
    mode,
    question,
    chiefDesign,
    consensusReports,
    allReports,
    reportSummaryForChair,
    taskLedgerSection,
    crowdSignalText,
    godViewSummary,
    operatorContext,
    memoryForVerdict,
    specialistSourcesBlock,
  } = params;

  let body = `SIMULATION COMPLETE. Deliver your final ${mode} verdict as specified in your instructions.\n\n`;

  if (mode === 'compare') {
    const { a: optA, b: optB } = splitCompareOptions(question);
    const teamA = consensusReports.filter((r) => specialistTeam(r, chiefDesign) === 'A');
    const teamB = consensusReports.filter((r) => specialistTeam(r, chiefDesign) === 'B');
    const rest = consensusReports.filter((r) => !specialistTeam(r, chiefDesign));
    body += `OPTION A (text): ${optA}\nOPTION B (text): ${optB}\n\n`;
    body += `TEAM A (${teamA.length} specialists):\n${formatReportsBlock(teamA)}\n\n`;
    body += `TEAM B (${teamB.length} specialists):\n${formatReportsBlock(teamB)}\n\n`;
    if (rest.length > 0) {
      body += `OTHER PANEL VOICES (${rest.length}):\n${formatReportsBlock(rest)}\n\n`;
    }
  } else {
    body += `QUESTION / PLAN UNDER TEST:\n${question}\n\n`;
    body += `FINAL POSITIONS (convergence):\n${formatReportsBlock(consensusReports)}\n\n`;
  }

  body += `FULL DEBATE HISTORY (${allReports.length} reports):\n${reportSummaryForChair}\n\n`;
  body += `${taskLedgerSection}\n`;
  body += memoryForVerdict;
  body += specialistSourcesBlock;
  body += godViewBlock(crowdSignalText, godViewSummary);
  body += `\nUSER / OPERATOR PROFILE:\n${operatorContext || 'Not provided — infer cautiously.'}\n\n`;
  body += `Verify critical claims with web search where needed. Return ONLY valid JSON, no markdown fences.`;
  return body;
}

export function mergeToolSourcesIntoParsedVerdict(
  parsed: Record<string, unknown>,
  toolCitations: SearchCitation[],
): void {
  const raw = parsed.sources;
  const existing: { url: string; title: string }[] = Array.isArray(raw)
    ? raw
        .map((x) => {
          const o = x as Record<string, unknown>;
          const url = typeof o.url === 'string' ? o.url.trim() : '';
          if (!url) return null;
          return { url, title: typeof o.title === 'string' ? o.title.trim() : url };
        })
        .filter((x): x is { url: string; title: string } => x != null)
    : [];
  const seen = new Set(existing.map((s) => s.url));
  for (const c of toolCitations) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    existing.push({ url: c.url, title: c.title || c.url });
  }
  parsed.sources = existing.slice(0, 18);
}

function mapHeadToHeadToCompareData(parsed: Record<string, unknown>): CompareVerdictData {
  const winnerRaw = parsed.winner;
  const winner: CompareVerdictData['winner'] =
    winnerRaw === 'A' ? 'A' : winnerRaw === 'B' ? 'B' : 'tie';
  const optA = parsed.option_a as Record<string, unknown> | undefined;
  const optB = parsed.option_b as Record<string, unknown> | undefined;
  const h2h = Array.isArray(parsed.head_to_head) ? parsed.head_to_head : [];
  return {
    winner,
    winner_label:
      winner === 'A'
        ? String(optA?.label || 'Option A')
        : winner === 'B'
          ? String(optB?.label || 'Option B')
          : 'No single winner',
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
    dimensions: h2h.map((row: Record<string, unknown>) => {
      const sa = Math.min(10, Math.max(1, Math.round((Number(row.score_a) || 50) / 10)));
      const sb = Math.min(10, Math.max(1, Math.round((Number(row.score_b) || 50) / 10)));
      const w = row.winner;
      const dimWinner: 'A' | 'B' | 'tie' =
        w === 'A' || w === 'B' ? w : 'tie';
      return {
        name: String(row.dimension || 'Dimension'),
        winner: dimWinner,
        score_a: sa,
        score_b: sb,
        reasoning: String(row.reason || ''),
      };
    }),
    summary: String(parsed.executive_summary || parsed.headline || ''),
    caveat: (() => {
      const risks = parsed.risks as Record<string, unknown> | undefined;
      return typeof risks?.if_choosing_neither === 'string' ? risks.if_choosing_neither : undefined;
    })(),
  };
}

export function mapCompareOpusToDecision(parsed: Record<string, unknown>): DecisionObject {
  const winner = String(parsed.winner || 'neither');
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
  const risks = parsed.risks as Record<string, unknown> | undefined;
  const mainRisk =
    winner === 'A' && Array.isArray(risks?.if_choosing_a) && (risks.if_choosing_a as string[])[0]
      ? String((risks.if_choosing_a as string[])[0])
      : winner === 'B' && Array.isArray(risks?.if_choosing_b) && (risks.if_choosing_b as string[])[0]
        ? String((risks.if_choosing_b as string[])[0])
        : typeof risks?.if_choosing_neither === 'string'
          ? String(risks.if_choosing_neither).slice(0, 400)
          : String(parsed.executive_summary || parsed.headline || 'Weigh both options carefully.').slice(
              0,
              400,
            );
  const rec = winner === 'neither' ? 'delay' : 'proceed_with_conditions';
  const nextSteps = parsed.next_steps as Record<string, unknown> | undefined;
  const branch = winner === 'B' ? nextSteps?.if_b : nextSteps?.if_a;
  let nextAction = '';
  if (Array.isArray(branch)) {
    const first = branch[0] as Record<string, unknown> | undefined;
    if (first && typeof first.action === 'string') {
      nextAction = `${first.timeframe ? `${first.timeframe}: ` : ''}${first.action}`;
    }
  }
  return {
    recommendation: rec,
    probability: confidence,
    main_risk: mainRisk,
    leverage_point: String(parsed.headline || 'Use the Head-to-Head report to choose decisively.').slice(
      0,
      320,
    ),
    next_action:
      nextAction ||
      'Open the Chief’s next_steps for your chosen option and execute step one this week.',
    grade: String(parsed.grade || 'B'),
    grade_score: confidence,
    citations: [],
    one_liner: String(parsed.headline || parsed.executive_summary || '').slice(0, 280),
    compare_data: mapHeadToHeadToCompareData(parsed),
  };
}

export function mapStressOpusToDecision(parsed: Record<string, unknown>): DecisionObject {
  const surv = Math.min(100, Math.max(0, Number(parsed.survival_probability) || 50));
  const rec =
    surv >= 68 ? 'proceed_with_conditions' : surv >= 42 ? 'delay' : 'abandon';
  const vulns = Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [];
  const firstV = vulns[0] as Record<string, unknown> | undefined;
  const mit = firstV?.mitigation as Record<string, unknown> | undefined;
  const ia = Array.isArray(parsed.immediate_actions) ? parsed.immediate_actions : [];
  const ia0 = ia[0] as Record<string, unknown> | undefined;
  const stressVectors = vulns.map((v: Record<string, unknown>) => ({
    threat: String(v.title || 'Risk'),
    probability: Math.min(1, Math.max(0, (Number(v.likelihood) || 50) / 100)),
    impact: ((): 'fatal' | 'severe' | 'moderate' | 'minor' => {
      const sev = String(v.severity || '').toLowerCase();
      if (sev === 'critical') return 'fatal';
      if (sev === 'high') return 'severe';
      if (sev === 'medium') return 'moderate';
      return 'minor';
    })(),
    category: String(v.category || 'operational'),
    mitigation: String((v.mitigation as Record<string, unknown>)?.action || ''),
  })) as StressVerdictData['risk_matrix'];
  const stress_data: StressVerdictData = {
    overall_resiliency: surv,
    risk_matrix: stressVectors,
    critical_vulnerability: String((parsed.breaking_point as Record<string, unknown>)?.description || firstV?.title || ''),
    summary: String(parsed.executive_summary || parsed.headline || ''),
    survival_conditions: String(parsed.final_word || '').slice(0, 500),
  };
  return {
    recommendation: rec,
    probability: surv,
    main_risk: String(firstV?.title || parsed.headline || 'See vulnerability audit.'),
    leverage_point: String(
      (parsed.breaking_point as Record<string, unknown>)?.description || parsed.headline || '',
    ).slice(0, 320),
    next_action: String(mit?.action || ia0?.action || 'Complete the three immediate actions before launch.'),
    grade: String(parsed.grade || 'B'),
    grade_score: surv,
    citations: [],
    one_liner: String(parsed.headline || '').slice(0, 280),
    stress_data,
  };
}

export function mapPremortemOpusToDecision(parsed: Record<string, unknown>): DecisionObject {
  const fp = Math.min(100, Math.max(0, Number(parsed.failure_probability) || 50));
  const rec = fp >= 72 ? 'abandon' : fp >= 48 ? 'delay' : 'proceed_with_conditions';
  const factors = Array.isArray(parsed.contributing_factors) ? parsed.contributing_factors : [];
  const how = Array.isArray(parsed.how_to_prevent_this) ? parsed.how_to_prevent_this : [];
  const how0 = how[0] as Record<string, unknown> | undefined;
  const failure_causes = factors.map((f: Record<string, unknown>) => ({
    cause: String(f.factor || ''),
    probability: Math.min(1, Math.max(0, (Number(f.weight) || 40) / 100)),
    timeline: String(f.when_to_act || 'varies'),
    early_warnings: [String(f.prevention || '').slice(0, 120)].filter(Boolean),
    prevention: String(f.prevention || ''),
  }));
  const failure_analysis: PremortemFailureAnalysis = {
    failure_causes,
    failure_narrative: String(parsed.autopsy_narrative || ''),
    summary: String(parsed.cause_of_death || parsed.headline || ''),
    prevention_checklist: how
      .map((h: Record<string, unknown>) => String(h.intervention || ''))
      .filter(Boolean),
  };
  return {
    recommendation: rec,
    probability: fp,
    main_risk: String(parsed.cause_of_death || parsed.headline || '').slice(0, 400),
    leverage_point: String(
      (parsed.point_of_no_return as Record<string, unknown>)?.what_happened || parsed.headline || '',
    ).slice(0, 320),
    next_action: String(how0?.intervention || 'Execute the #1 prevention step this week.'),
    grade: String(parsed.grade || 'B'),
    grade_score: 100 - fp,
    citations: [],
    one_liner: String(parsed.headline || '').slice(0, 280),
    failure_analysis,
    action_plan: failure_analysis.prevention_checklist,
  };
}

export function attachOpusPremiumPayload(
  verdict: DecisionObject,
  mode: 'compare' | 'stress_test' | 'premortem',
  parsed: Record<string, unknown>,
): void {
  const v = verdict as Record<string, unknown>;
  v._mode = mode;
  if (mode === 'compare') {
    v.opus_compare = { ...parsed, _mode: 'compare' };
  } else if (mode === 'stress_test') {
    v.opus_stress = { ...parsed, _mode: 'stress_test' };
  } else {
    v.opus_premortem = { ...parsed, _mode: 'premortem' };
  }
}

export function usesOpusPremiumVerdict(
  mode: SimulationChargeType | undefined,
): mode is 'compare' | 'stress_test' | 'premortem' {
  return mode === 'compare' || mode === 'stress_test' || mode === 'premortem';
}

export function parseOpusVerdictJson(text: string): Record<string, unknown> {
  return parseJSON<Record<string, unknown>>(text);
}

/** Minimal JSON-shaped object so mappers + UI never crash when the model returns non-JSON. */
export function buildOpusParseFallbackParsed(
  mode: SimulationChargeType,
  raw: string,
): Record<string, unknown> {
  const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (mode === 'compare') {
    return {
      winner: 'neither',
      confidence: 40,
      grade: 'C',
      headline: 'Could not parse Chief JSON — review specialist reports.',
      executive_summary: snippet || 'The model did not return valid JSON for this compare verdict.',
      option_a: {
        score: 50,
        label: 'Option A',
        strengths: [],
        weaknesses: [],
      },
      option_b: {
        score: 50,
        label: 'Option B',
        strengths: [],
        weaknesses: [],
      },
      head_to_head: [],
      risks: { if_choosing_neither: 'Re-run the simulation or contact support if this persists.' },
      next_steps: { if_a: [], if_b: [] },
      final_word: 'We could not render the full Head-to-Head report. Your debate transcripts and sources above remain valid.',
      sources: [],
    };
  }
  if (mode === 'stress_test') {
    return {
      survival_probability: 45,
      grade: 'C',
      risk_level: 'MODERATE',
      headline: 'Could not parse vulnerability audit JSON.',
      executive_summary: snippet || 'The model did not return valid JSON for this stress verdict.',
      breaking_point: { description: 'Unknown — JSON parse failed.', probability: 50, timeframe: 'n/a' },
      vulnerabilities: [],
      resilience_scores: [],
      worst_case_scenario: { narrative: snippet.slice(0, 400), total_loss: 'Unknown', recovery_time: 'Unknown' },
      best_case_if_patched: { narrative: '', survival_probability_after_fixes: 55 },
      immediate_actions: [],
      kill_switches: [],
      final_word: 'Review the specialist failure vectors in the simulation log.',
      sources: [],
    };
  }
  return {
    cause_of_death: 'Parse failure — autopsy unavailable.',
    grade: 'C',
    failure_probability: 50,
    headline: 'Could not parse failure autopsy JSON.',
    autopsy_narrative: snippet || 'The model did not return valid JSON for this pre-mortem verdict.',
    timeline: [],
    point_of_no_return: { when: 'n/a', what_happened: 'n/a', what_should_have_happened: 'n/a' },
    contributing_factors: [],
    total_cost_of_failure: {
      financial: 'Unknown',
      time: 'Unknown',
      opportunity_cost: 'Unknown',
      emotional: 'Unknown',
    },
    how_to_prevent_this: [],
    revised_probability_if_all_prevented: 50,
    final_word: 'Review failure_analysis from specialists in the debate history.',
    sources: [],
  };
}
