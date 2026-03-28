import type { SimulationChargeType } from '@/lib/billing/token-costs';

/** Legacy stress list shape (matches events.RiskEntry) without importing events (cycle). */
export type LegacyRiskEntry = { risk: string; severity: 'high' | 'medium' | 'low'; agent_source: string };

// ═══ Exported shapes (also referenced by VerdictResult in events.ts) ═══

export type CompareDimensionEntry = {
  name: string;
  winner: 'A' | 'B' | 'tie';
  score_a: number;
  score_b: number;
  reasoning: string;
};

export interface CompareVerdictData {
  winner: 'A' | 'B' | 'tie';
  winner_label: string;
  confidence: number;
  dimensions: CompareDimensionEntry[];
  summary: string;
  caveat?: string;
}

export type StressImpact = 'fatal' | 'severe' | 'moderate' | 'minor';

export interface StressRiskVector {
  threat: string;
  probability: number;
  impact: StressImpact;
  category: string;
  mitigation: string;
}

export interface StressVerdictData {
  overall_resiliency: number;
  risk_matrix: StressRiskVector[];
  critical_vulnerability: string;
  summary: string;
  survival_conditions: string;
}

export interface PremortemFailureCause {
  cause: string;
  probability: number;
  timeline: string;
  early_warnings: string[];
  prevention: string;
}

export interface PremortemFailureAnalysis {
  failure_causes: PremortemFailureCause[];
  failure_narrative: string;
  summary: string;
  prevention_checklist: string[];
}

// ═══ Chair appendix prompts (same root JSON as standard verdict) ═══

export const COMPARE_VERDICT_APPENDIX = `

MODE: COMPARISON (A vs B). Specialists debated two options.

In addition to the standard Decision Object fields above, add these keys to the SAME root JSON object:
- "one_liner": string — one headline for the user (e.g. who wins and why).
- "compare_data": {
    "winner": "A" | "B" | "tie",
    "winner_label": string — plain-language name of the winning option,
    "confidence": number — 0–100, your confidence in the comparison outcome,
    "dimensions": [ { "name": string, "winner": "A"|"B"|"tie", "score_a": 1-10, "score_b": 1-10, "reasoning": string } ],
    "summary": string,
    "caveat": string (optional)
  }

Generate 5–8 dimensions. Each dimension must have scores 1–10 and a clear winner where possible.
Map your overall "recommendation" to the comparison (e.g. proceed_with_conditions if the winner should be chosen with safeguards).
`;

export const STRESS_TEST_VERDICT_APPENDIX = `

MODE: STRESS TEST. Specialists tried to break this plan.

In addition to the standard Decision Object fields above, add these keys to the SAME root JSON object:
- "one_liner": string — headline on resilience / top failure modes.
- "stress_data": {
    "overall_resiliency": number — 0–100, higher = more resilient,
    "risk_matrix": [
      {
        "threat": string,
        "probability": number — 0–1,
        "impact": "fatal" | "severe" | "moderate" | "minor",
        "category": "regulatory" | "financial" | "operational" | "market" | "competitive" | string,
        "mitigation": string
      }
    ],
    "critical_vulnerability": string,
    "summary": string,
    "survival_conditions": string
  }

Generate 5–8 failure vectors. Sort "risk_matrix" by (probability × impact severity) descending — most dangerous first.
Use concrete scenarios and numbers where possible.
`;

export const PREMORTEM_VERDICT_APPENDIX = `

MODE: PRE-MORTEM. Specialists assumed the plan already failed and explained why.

In addition to the standard Decision Object fields above, add these keys to the SAME root JSON object:
- "one_liner": string — short headline of the dominant failure story.
- "failure_analysis": {
    "failure_causes": [
      {
        "cause": string,
        "probability": number — 0–1,
        "timeline": string,
        "early_warnings": string[],
        "prevention": string
      }
    ],
    "failure_narrative": string — story-style: what fails first, what cascades,
    "summary": string,
    "prevention_checklist": string[]
  }

Generate 4–6 failure causes; probabilities should sum to about 1.0. Sort causes by probability descending.
`;

export function getModeVerdictAppendix(mode: SimulationChargeType | string | undefined): string {
  switch (mode) {
    case 'compare':
      return COMPARE_VERDICT_APPENDIX;
    case 'stress_test':
      return STRESS_TEST_VERDICT_APPENDIX;
    case 'premortem':
      return PREMORTEM_VERDICT_APPENDIX;
    default:
      return '';
  }
}

/** Spec name from Prompt 3.2–3.4 — returns null when standard simulate verdict applies. */
export function getModeVerdictPrompt(mode: SimulationChargeType | string | undefined): string | null {
  const s = getModeVerdictAppendix(mode);
  return s ? s : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeCompareDimension(v: unknown): CompareDimensionEntry | null {
  if (!isRecord(v)) return null;
  const w = v.winner;
  if (w !== 'A' && w !== 'B' && w !== 'tie') return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;
  const score_a = Math.min(10, Math.max(1, Math.round(Number(v.score_a) || 5)));
  const score_b = Math.min(10, Math.max(1, Math.round(Number(v.score_b) || 5)));
  return {
    name,
    winner: w,
    score_a,
    score_b,
    reasoning: typeof v.reasoning === 'string' ? v.reasoning : '',
  };
}

function normalizeCompareData(v: unknown): CompareVerdictData | null {
  if (!isRecord(v)) return null;
  if (v.winner !== 'A' && v.winner !== 'B' && v.winner !== 'tie') return null;
  const winner_label = typeof v.winner_label === 'string' ? v.winner_label : '';
  const conf = Number(v.confidence);
  const confidence = Number.isNaN(conf) ? 50 : Math.min(100, Math.max(0, Math.round(conf)));
  if (!Array.isArray(v.dimensions)) return null;
  const dimensions = v.dimensions.map(normalizeCompareDimension).filter(Boolean) as CompareDimensionEntry[];
  if (dimensions.length === 0) return null;
  const summary = typeof v.summary === 'string' ? v.summary : '';
  if (!summary.trim()) return null;
  const caveat = typeof v.caveat === 'string' ? v.caveat : undefined;
  return {
    winner: v.winner,
    winner_label: winner_label || (v.winner === 'tie' ? 'Comparable options' : `Option ${v.winner}`),
    confidence,
    dimensions,
    summary,
    caveat,
  };
}

function normalizeStressImpact(v: unknown): StressImpact {
  if (v === 'fatal' || v === 'severe' || v === 'moderate' || v === 'minor') return v;
  return 'moderate';
}

function normalizeStressVector(v: unknown): StressRiskVector | null {
  if (!isRecord(v)) return null;
  if (typeof v.threat !== 'string' || !v.threat.trim()) return null;
  const p = Number(v.probability);
  if (Number.isNaN(p)) return null;
  return {
    threat: v.threat.trim(),
    probability: Math.min(1, Math.max(0, p > 1 ? p / 100 : p)),
    impact: normalizeStressImpact(v.impact),
    category: typeof v.category === 'string' && v.category.trim() ? v.category.trim() : 'operational',
    mitigation: typeof v.mitigation === 'string' ? v.mitigation : '',
  };
}

function normalizeStressData(v: unknown): StressVerdictData | null {
  if (!isRecord(v)) return null;
  if (!Array.isArray(v.risk_matrix)) return null;
  const risk_matrix = v.risk_matrix.map(normalizeStressVector).filter(Boolean) as StressRiskVector[];
  if (risk_matrix.length === 0) return null;
  const or = Number(v.overall_resiliency);
  return {
    overall_resiliency: Number.isNaN(or) ? 50 : Math.min(100, Math.max(0, Math.round(or))),
    risk_matrix,
    critical_vulnerability:
      typeof v.critical_vulnerability === 'string' ? v.critical_vulnerability : '',
    summary: typeof v.summary === 'string' ? v.summary : '',
    survival_conditions: typeof v.survival_conditions === 'string' ? v.survival_conditions : '',
  };
}

function normalizePremortemCause(v: unknown): PremortemFailureCause | null {
  if (!isRecord(v)) return null;
  if (typeof v.cause !== 'string' || !v.cause.trim()) return null;
  const p = Number(v.probability);
  if (Number.isNaN(p)) return null;
  const ew = Array.isArray(v.early_warnings)
    ? v.early_warnings.filter((w): w is string => typeof w === 'string')
    : [];
  return {
    cause: v.cause.trim(),
    probability: Math.min(1, Math.max(0, p > 1 ? p / 100 : p)),
    timeline: typeof v.timeline === 'string' ? v.timeline : '',
    early_warnings: ew,
    prevention: typeof v.prevention === 'string' ? v.prevention : '',
  };
}

function normalizeFailureAnalysis(v: unknown): PremortemFailureAnalysis | null {
  if (!isRecord(v) || !Array.isArray(v.failure_causes)) return null;
  const failure_causes = v.failure_causes
    .map(normalizePremortemCause)
    .filter(Boolean) as PremortemFailureCause[];
  if (failure_causes.length === 0) return null;
  const prevention_checklist = Array.isArray(v.prevention_checklist)
    ? v.prevention_checklist.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    failure_causes,
    failure_narrative: typeof v.failure_narrative === 'string' ? v.failure_narrative : '',
    summary: typeof v.summary === 'string' ? v.summary : '',
    prevention_checklist,
  };
}

function impactToSeverity(impact: StressImpact): LegacyRiskEntry['severity'] {
  if (impact === 'fatal' || impact === 'severe') return 'high';
  if (impact === 'moderate') return 'medium';
  return 'low';
}

/** Map stress vectors to legacy risk_matrix entries for older UI paths. */
export function stressVectorsToRiskEntries(vectors: StressRiskVector[]): LegacyRiskEntry[] {
  return vectors.map((v) => ({
    risk: v.threat,
    severity: impactToSeverity(v.impact),
    agent_source: typeof v.category === 'string' ? v.category : 'stress',
  }));
}

/** Core Decision Object fields (mirrors agents.DecisionObject minus mode extras). */
export type VerdictCoreFields = {
  recommendation: 'proceed' | 'proceed_with_conditions' | 'delay' | 'abandon';
  probability: number;
  main_risk: string;
  leverage_point: string;
  next_action: string;
  grade: string;
  grade_score: number;
  citations: Array<{
    id: number;
    agent_id: string;
    agent_name: string;
    claim: string;
    confidence: number;
  }>;
};

export function coerceVerdictCore(raw: Record<string, unknown>): VerdictCoreFields {
  const r = String(raw.recommendation || '').toLowerCase();
  const recommendation: VerdictCoreFields['recommendation'] =
    r === 'proceed_with_conditions' || r.includes('proceed_with')
      ? 'proceed_with_conditions'
      : r === 'delay'
        ? 'delay'
        : r === 'abandon'
          ? 'abandon'
          : r === 'proceed'
            ? 'proceed'
            : 'delay';

  const citations = Array.isArray(raw.citations)
    ? (raw.citations as VerdictCoreFields['citations']).filter(
        (c) =>
          c &&
          typeof c.id === 'number' &&
          typeof c.agent_id === 'string' &&
          typeof c.agent_name === 'string' &&
          typeof c.claim === 'string' &&
          typeof c.confidence === 'number',
      )
    : [];

  return {
    recommendation,
    probability: Math.min(100, Math.max(0, Math.round(Number(raw.probability) || 0))),
    main_risk: String(raw.main_risk ?? ''),
    leverage_point: String(raw.leverage_point ?? ''),
    next_action: String(raw.next_action ?? ''),
    grade: String(raw.grade ?? 'B'),
    grade_score: Math.min(100, Math.max(0, Math.round(Number(raw.grade_score) || 0))),
    citations,
  };
}

/**
 * Extract validated mode blocks from parsed Chair JSON. Invalid blocks are omitted (graceful).
 */
export function mergeModeVerdictFields(
  raw: Record<string, unknown>,
  mode: SimulationChargeType | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (mode === 'compare') {
    const cd = normalizeCompareData(raw.compare_data);
    if (cd) out.compare_data = cd;
  }

  if (mode === 'stress_test') {
    const normalized = normalizeStressData(raw.stress_data);
    if (normalized) {
      out.stress_data = normalized;
      out.risk_matrix = stressVectorsToRiskEntries(normalized.risk_matrix);
    }
  }

  if (mode === 'premortem') {
    const fa = normalizeFailureAnalysis(raw.failure_analysis);
    if (fa) {
      out.failure_analysis = fa;
      out.action_plan = fa.prevention_checklist;
    }
  }

  if (typeof raw.one_liner === 'string' && raw.one_liner.trim()) {
    out.one_liner = raw.one_liner.trim();
  }

  return out;
}

/** Spec alias (Prompt 3.2–3.4): validated mode extras from parsed Chair JSON. */
export const extractModeData = mergeModeVerdictFields;

/** Fill one_liner when the model omitted it but mode blocks exist. */
export function ensureVerdictOneLiner(
  verdict: Record<string, unknown>,
  mode: SimulationChargeType | undefined,
): void {
  if (typeof verdict.one_liner === 'string' && verdict.one_liner.trim()) return;

  const cd = verdict.compare_data as CompareVerdictData | undefined;
  if (mode === 'compare' && cd?.summary) {
    verdict.one_liner = cd.summary;
    return;
  }

  const sd = verdict.stress_data as StressVerdictData | undefined;
  if (mode === 'stress_test' && sd?.summary) {
    verdict.one_liner = sd.summary;
    return;
  }

  const fa = verdict.failure_analysis as PremortemFailureAnalysis | undefined;
  if (mode === 'premortem' && fa?.failure_narrative) {
    verdict.one_liner = fa.failure_narrative;
    return;
  }

  verdict.one_liner = String(verdict.leverage_point || verdict.main_risk || '');
}
