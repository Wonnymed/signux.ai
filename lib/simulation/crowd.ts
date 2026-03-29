/**
 * God's View — market voices (Haiku) layered on specialist debate.
 *
 * 1) One Haiku call generates contextual personas (JSON).
 * 2) Each persona gets a tiny Haiku reaction (sentiment + statement), concurrency 20.
 * 3) Synthesize summary for Chair + legacy CrowdSignal mapping.
 */

import { callClaude, parseJSON } from './claude';
import type { CrowdSegment } from '@/lib/simulation/types';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type MarketPersonaRole = 'consumer' | 'seller' | 'competitor' | 'supply_chain' | 'observer';

export type MarketPersona = {
  id: string;
  role: MarketPersonaRole;
  name: string;
  description: string;
  likely_sentiment: 'positive' | 'negative' | 'neutral';
};

export type MarketVoiceResult = {
  persona_id: string;
  persona: string;
  role: MarketPersonaRole;
  sentiment: 'positive' | 'negative' | 'neutral';
  statement: string;
};

export type GodViewCrowdSummary = {
  totalVoices: number;
  positive: number;
  negative: number;
  neutral: number;
  topPositive: string;
  topNegative: string;
};

/** Legacy shape for verdict weighting + existing UI hooks */
export type CrowdAdvisor = {
  id: string;
  persona: string;
  background: string;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
};

export type CrowdVote = {
  advisor_id: string;
  persona: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;
  one_liner: string;
};

export type CrowdSignal = {
  total_advisors: number;
  proceed_count: number;
  delay_count: number;
  abandon_count: number;
  proceed_pct: number;
  avg_confidence: number;
  top_reasons_proceed: string[];
  top_reasons_delay: string[];
  top_reasons_abandon: string[];
  crowd_verdict: 'proceed' | 'delay' | 'abandon';
  consensus_strength: 'strong' | 'moderate' | 'weak' | 'split';
  /** Sentiment breakdown (God's View) */
  god_view?: GodViewCrowdSummary;
};

const CONCURRENCY = 20;

/** Split framed compare questions into Option A / Option B text for dual crowd pipelines. */
export function splitCompareOptions(fullQuestion: string): { a: string; b: string } {
  const optB = fullQuestion.match(/Option B:\s*([\s\S]+)/i);
  const optA = fullQuestion.match(/Option A:\s*([\s\S]+?)(?=Option B:|$)/i);
  return {
    a: (optA?.[1]?.trim() || 'Option A').slice(0, 2000),
    b: (optB?.[1]?.trim() || 'Option B').slice(0, 2000),
  };
}

export function formatChiefCrowdSegmentBootstrap(segments: CrowdSegment[] | undefined): string {
  if (!segments?.length) return '';
  return `Chief-designed audience segments (stay faithful; voices should sound like these buckets):\n${segments
    .map(
      (s) =>
        `• ${s.segment} (~${s.count} voices): ${s.behavior}. Context: ${s.context}. Sample: "${s.sample_voice}"`,
    )
    .join('\n')}\n\n`;
}

function stripJsonFence(s: string): string {
  return s.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
}

function safeRole(r: string): MarketPersonaRole {
  const x = (r || '').toLowerCase();
  if (x === 'consumer' || x === 'seller' || x === 'competitor' || x === 'supply_chain' || x === 'observer')
    return x;
  return 'observer';
}

function safeSentiment(s: string): 'positive' | 'negative' | 'neutral' {
  const x = (s || '').toLowerCase();
  if (x === 'positive' || x === 'negative' || x === 'neutral') return x;
  return 'neutral';
}

const PERSONA_BATCH = 60;

async function generateMarketPersonasOneBatch(
  question: string,
  batchSize: number,
  startIndex: number,
  avoidHint: string,
): Promise<MarketPersona[]> {
  const systemPrompt = `You are a market research persona generator. Generate exactly ${batchSize} diverse personas for the business decision.

Each persona object:
- role: consumer | seller | competitor | supply_chain | observer
- name: realistic for the market/region in the question
- description: one line background
- likely_sentiment: positive | negative | neutral

Distribution in this batch: ~40% consumer, ~20% seller, ~15% competitor, ~15% supply_chain, ~10% observer.

Respond ONLY with a JSON array. No markdown.`;

  const raw = await callClaude({
    tier: 'crowd',
    systemPrompt,
    userMessage: `Decision:\n"${question.slice(0, 3500)}"\n\nGenerate ${batchSize} NEW personas (indices ${startIndex}–${startIndex + batchSize - 1}). Do not duplicate: ${avoidHint.slice(0, 500)}`,
    maxTokens: Math.min(8192, 400 + batchSize * 45),
  });
  const arr = parseJSON<Array<Record<string, unknown>>>(stripJsonFence(raw));
  if (!Array.isArray(arr) || arr.length === 0) return [];

  return arr.slice(0, batchSize).map((row, j) => {
    const i = startIndex + j;
    return {
      id: `mv_${i}`,
      role: safeRole(String(row.role)),
      name: String(row.name || `Voice ${i + 1}`).slice(0, 80),
      description: String(row.description || row.persona || 'Market participant').slice(0, 200),
      likely_sentiment: safeSentiment(String(row.likely_sentiment)),
    };
  });
}

/**
 * Contextual personas via Haiku (batched so swarm targets stay within model output limits).
 */
export async function generateMarketPersonasHaiku(question: string, count: number): Promise<MarketPersona[]> {
  const n = Math.min(1000, Math.max(1, Math.floor(count)));
  const out: MarketPersona[] = [];
  let avoid = '';

  try {
    for (let start = 0; start < n; start += PERSONA_BATCH) {
      const need = Math.min(PERSONA_BATCH, n - start);
      const batch = await generateMarketPersonasOneBatch(question, need, start, avoid);
      if (batch.length === 0) break;
      out.push(...batch);
      avoid = batch.map((p) => p.name).join(', ');
    }
  } catch (e) {
    console.error('[crowd] generateMarketPersonasHaiku failed:', e);
  }

  if (out.length === 0) return fallbackPersonas(Math.min(n, 80), question);

  while (out.length < n) {
    const src = out[out.length % out.length];
    const j = out.length;
    out.push({
      id: `mv_${j}`,
      role: src.role,
      name: `${src.name} (variant ${j + 1})`,
      description: src.description,
      likely_sentiment: src.likely_sentiment,
    });
  }
  return out.slice(0, n);
}

function fallbackPersonas(n: number, question: string): MarketPersona[] {
  const roles: MarketPersonaRole[] = [
    'consumer',
    'consumer',
    'seller',
    'competitor',
    'supply_chain',
    'observer',
  ];
  return Array.from({ length: n }, (_, i) => ({
    id: `mv_fb_${i}`,
    role: roles[i % roles.length],
    name: `Stakeholder ${i + 1}`,
    description: `Affected party regarding: ${question.slice(0, 100)}`,
    likely_sentiment: 'neutral' as const,
  }));
}

async function runSingleMarketVoice(
  persona: MarketPersona,
  question: string,
  specialistSummary: string,
): Promise<MarketVoiceResult | null> {
  try {
    const response = await callClaude({
      tier: 'crowd',
      systemPrompt: `You are ${persona.name}, ${persona.description}.
Respond with ONLY a JSON object: {"sentiment":"positive"|"negative"|"neutral","statement":"..."}
Statement: 1-2 sentences, first person, honest reaction.`,
      userMessage: `Someone is considering: "${question.slice(0, 2000)}"

Expert panel summary so far: ${specialistSummary.slice(0, 1200)}

In 1-2 sentences, your honest reaction from your perspective. Would you lean toward supporting this move? What worries you?

JSON only:`,
      maxTokens: 180,
    });
    const parsed = parseJSON<{ sentiment?: string; statement?: string }>(stripJsonFence(response));
    const sentiment = safeSentiment(parsed.sentiment || 'neutral');
    const statement = String(parsed.statement || 'No comment.').slice(0, 500);
    return {
      persona_id: persona.id,
      persona: persona.name,
      role: persona.role,
      sentiment,
      statement,
    };
  } catch {
    return null;
  }
}

/**
 * Run all voices with concurrency limit; invoke onVoice as each completes.
 */
export async function runMarketVoicesParallel(
  personas: MarketPersona[],
  question: string,
  specialistSummary: string,
  onVoice: (v: MarketVoiceResult) => void,
): Promise<MarketVoiceResult[]> {
  const voices: MarketVoiceResult[] = [];
  for (let i = 0; i < personas.length; i += CONCURRENCY) {
    const chunk = personas.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((p) => runSingleMarketVoice(p, question, specialistSummary)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        voices.push(r.value);
        onVoice(r.value);
      }
    }
  }
  return voices;
}

export function marketVoiceToCrowdVote(v: MarketVoiceResult): CrowdVote {
  const position: CrowdVote['position'] =
    v.sentiment === 'positive' ? 'proceed' : v.sentiment === 'negative' ? 'abandon' : 'delay';
  return {
    advisor_id: v.persona_id,
    persona: v.persona,
    position,
    confidence: 5,
    one_liner: v.statement,
  };
}

async function summarizeThemesHaiku(voices: MarketVoiceResult[]): Promise<{ topPositive: string; topNegative: string }> {
  if (voices.length === 0) return { topPositive: '', topNegative: '' };
  const pos = voices.filter((v) => v.sentiment === 'positive').map((v) => v.statement);
  const neg = voices.filter((v) => v.sentiment === 'negative').map((v) => v.statement);
  if (pos.length === 0 && neg.length === 0) {
    return { topPositive: 'No strong positive themes.', topNegative: 'No strong negative themes.' };
  }
  const sample = [
    ...pos.slice(0, 6).map((s) => `+ ${s}`),
    ...neg.slice(0, 6).map((s) => `- ${s}`),
  ].join('\n');
  try {
    const raw = await callClaude({
      tier: 'crowd',
      systemPrompt: `Given market voice snippets, return ONLY JSON: {"topPositive":"one short theme","topNegative":"one short concern"}`,
      userMessage: `Snippets:\n${sample.slice(0, 6000)}`,
      maxTokens: 200,
    });
    const p = parseJSON<{ topPositive?: string; topNegative?: string }>(stripJsonFence(raw));
    return {
      topPositive: String(p.topPositive || pos[0] || 'Mixed support').slice(0, 240),
      topNegative: String(p.topNegative || neg[0] || 'Mixed concerns').slice(0, 240),
    };
  } catch {
    return {
      topPositive: pos[0] || 'Support contingent on execution.',
      topNegative: neg[0] || 'Skepticism around risks mentioned.',
    };
  }
}

export function buildGodViewSummary(voices: MarketVoiceResult[]): GodViewCrowdSummary {
  const positive = voices.filter((v) => v.sentiment === 'positive').length;
  const negative = voices.filter((v) => v.sentiment === 'negative').length;
  const neutral = voices.filter((v) => v.sentiment === 'neutral').length;
  return {
    totalVoices: voices.length,
    positive,
    negative,
    neutral,
    topPositive: '',
    topNegative: '',
  };
}

export async function finalizeGodViewSummary(voices: MarketVoiceResult[]): Promise<GodViewCrowdSummary> {
  const base = buildGodViewSummary(voices);
  const themes = await summarizeThemesHaiku(voices);
  return { ...base, ...themes };
}

/**
 * Full pipeline: personas → parallel voices (streaming via onVoice) → summary + legacy votes.
 */
export async function runGodViewMarketPipeline(params: {
  question: string;
  specialistSummary: string;
  targetCount: number;
  onVoice: (v: MarketVoiceResult) => void;
}): Promise<{ voices: MarketVoiceResult[]; summary: GodViewCrowdSummary; votes: CrowdVote[] }> {
  const personas = await generateMarketPersonasHaiku(params.question, params.targetCount);
  const voices = await runMarketVoicesParallel(
    personas,
    params.question,
    params.specialistSummary,
    params.onVoice,
  );
  const summary = await finalizeGodViewSummary(voices);
  const votes = voices.map(marketVoiceToCrowdVote);
  return { voices, summary, votes };
}

export function synthesizeCrowdSignal(votes: CrowdVote[], godView?: GodViewCrowdSummary): CrowdSignal {
  if (votes.length === 0) {
    return {
      total_advisors: 0,
      proceed_count: 0,
      delay_count: 0,
      abandon_count: 0,
      proceed_pct: 0,
      avg_confidence: 0,
      top_reasons_proceed: [],
      top_reasons_delay: [],
      top_reasons_abandon: [],
      crowd_verdict: 'delay',
      consensus_strength: 'weak',
      god_view: godView,
    };
  }

  const proceed = votes.filter((v) => v.position === 'proceed');
  const delay = votes.filter((v) => v.position === 'delay');
  const abandon = votes.filter((v) => v.position === 'abandon');

  const proceedPct = Math.round((proceed.length / votes.length) * 100);
  const avgConf = votes.reduce((s, v) => s + v.confidence, 0) / votes.length;

  let crowdVerdict: CrowdSignal['crowd_verdict'] = 'delay';
  if (proceed.length >= delay.length && proceed.length >= abandon.length) crowdVerdict = 'proceed';
  else if (abandon.length >= delay.length) crowdVerdict = 'abandon';

  const maxPct = Math.max(
    proceedPct,
    Math.round((delay.length / votes.length) * 100),
    Math.round((abandon.length / votes.length) * 100),
  );
  let consensus: CrowdSignal['consensus_strength'] = 'split';
  if (maxPct >= 80) consensus = 'strong';
  else if (maxPct >= 60) consensus = 'moderate';
  else if (maxPct >= 45) consensus = 'weak';

  return {
    total_advisors: votes.length,
    proceed_count: proceed.length,
    delay_count: delay.length,
    abandon_count: abandon.length,
    proceed_pct: proceedPct,
    avg_confidence: Math.round(avgConf * 10) / 10,
    top_reasons_proceed: proceed.slice(0, 3).map((v) => v.one_liner),
    top_reasons_delay: delay.slice(0, 3).map((v) => v.one_liner),
    top_reasons_abandon: abandon.slice(0, 3).map((v) => v.one_liner),
    crowd_verdict: crowdVerdict,
    consensus_strength: consensus,
    god_view: godView,
  };
}

export function formatCrowdSignal(signal: CrowdSignal): string {
  if (signal.total_advisors === 0) return '';

  const gv = signal.god_view;
  const godBlock =
    gv && gv.totalVoices > 0
      ? `
God's View (market voices):
- ${gv.positive} positive / ${gv.negative} negative / ${gv.neutral} neutral out of ${gv.totalVoices} voices
- Top positive theme: ${gv.topPositive}
- Top concern: ${gv.topNegative}
`
      : '';

  return `
═══ CROWD SIGNAL (${signal.total_advisors} market voices) ═══
Crowd verdict (mapped from sentiment): ${signal.crowd_verdict.toUpperCase()} (consensus: ${signal.consensus_strength})
Proceed-leaning: ${signal.proceed_count} (${signal.proceed_pct}%) | Delay-leaning: ${signal.delay_count} | Abandon-leaning: ${signal.abandon_count}
Avg confidence: ${signal.avg_confidence}/10
${godBlock}
${signal.top_reasons_proceed.length > 0 ? 'Pro-proceed voices:\n' + signal.top_reasons_proceed.map((r) => `  • ${r}`).join('\n') : ''}
${signal.top_reasons_delay.length > 0 ? 'Pro-delay voices:\n' + signal.top_reasons_delay.map((r) => `  • ${r}`).join('\n') : ''}
${signal.top_reasons_abandon.length > 0 ? 'Pro-abandon voices:\n' + signal.top_reasons_abandon.map((r) => `  • ${r}`).join('\n') : ''}
═══════════════════════════════════════════════════════
Weight this signal alongside specialist analysis. Market voices capture demand-side and ecosystem reactions.`;
}

/** Sync fallback personas (no API) — legacy helper */
export function generateCrowdAdvisors(count: number): CrowdAdvisor[] {
  return fallbackPersonas(Math.min(count, 200), 'business decision').map((p) => ({
    id: p.id,
    persona: p.name,
    background: p.description,
    risk_tolerance: 'moderate' as const,
  }));
}
