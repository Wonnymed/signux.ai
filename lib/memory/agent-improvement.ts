/**
 * Self-Improving Agent Eval — OpenClaw + MiroFish patterns for Octux.
 *
 * evaluateAgentPerformance() — post-sim, grade each agent's report
 * writeAgentLessons()        — persist lessons to agent_lessons table
 * injectLessonsIntoPrompt()  — load lessons as constraints for next sim
 * persistRoundLearnings()    — share round N discoveries with round N+1
 *
 * Refs: OpenClaw (#26 — self-improving agent, evaluate→learn→improve loop)
 *       MiroFish (#10 — PERSIST: inter-round knowledge sharing)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type AgentEvaluation = {
  agent_id: string;
  agent_name: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  lessons: string[];
  lesson_types: string[];
};

export type AgentLesson = {
  id: string;
  agent_id: string;
  lesson: string;
  lesson_type: string;
  evidence_count: number;
  is_active: boolean;
};

export type RoundLearning = {
  agent_id: string;
  facts_discovered: string[];
  key_claims: string[];
};

// ═══════════════════════════════════════════
// evaluateAgentPerformance() — Post-sim eval
// ═══════════════════════════════════════════

export async function evaluateAgentPerformance(
  userId: string,
  simulationId: string,
  question: string,
  agentReports: Map<string, unknown> | Record<string, unknown>,
  verdict: unknown
): Promise<AgentEvaluation[]> {
  if (!supabase) return [];

  const reports: { id: string; name: string; report: Record<string, unknown> }[] = [];

  if (agentReports instanceof Map) {
    for (const [id, report] of agentReports.entries()) {
      if (id === 'decision_chair') continue;
      const r = report as Record<string, unknown>;
      reports.push({ id, name: (r.agent_name as string) || id, report: r });
    }
  } else {
    for (const [id, report] of Object.entries(agentReports)) {
      if (id === 'decision_chair') continue;
      const r = report as Record<string, unknown>;
      reports.push({ id, name: (r.agent_name as string) || id, report: r });
    }
  }

  if (reports.length === 0) return [];

  const reportsText = reports.map(r =>
    `AGENT: ${r.name} (${r.id})
Position: ${r.report.position || 'unknown'} | Confidence: ${r.report.confidence || '?'}/10
Key argument: ${((r.report.key_argument as string) || (r.report.summary as string) || 'no argument').substring(0, 200)}
Evidence cited: ${((r.report.evidence as string[]) || (r.report.citations as string[]) || []).slice(0, 3).join('; ') || 'none'}
Risks identified: ${((r.report.risks as string[]) || []).slice(0, 3).join('; ') || 'none'}`
  ).join('\n\n');

  const v = verdict as Record<string, unknown> | null;

  try {
    const response = await callClaude({
      systemPrompt: `You evaluate AI agent performance in a decision simulation.
For each agent, assess:
- SCORE (1-10): How valuable was their contribution?
- STRENGTHS: What did they do well? (specific)
- WEAKNESSES: What should they improve? (specific)
- LESSONS: Actionable rules for improvement (max 2 per agent)

Scoring guide:
  9-10: Exceptional — unique insight, well-evidenced, changed the outcome
  7-8:  Good — solid analysis, relevant evidence, clear position
  5-6:  Adequate — basic analysis, generic reasoning, no surprises
  3-4:  Weak — vague, unsupported claims, or off-topic
  1-2:  Failed — contradictory, harmful, or completely irrelevant

LESSON FORMAT: Write lessons as RULES the agent should follow.
Good: "Always cite the source year when referencing market statistics"
Bad: "Be better at analysis" (too vague)

Each lesson needs a type:
- quality: improve argument structure, evidence use, clarity
- accuracy: fix factual/numerical tendencies
- behavior: change interaction style
- domain: domain-specific knowledge correction

Return JSON array, one entry per agent.`,
      userMessage: `QUESTION: "${question}"
VERDICT: ${((v?.recommendation as string) || 'unknown').toUpperCase()} (${v?.probability || 0}%)

AGENT REPORTS:
${reportsText}

Evaluate each agent. JSON array:
[{
  "agent_id": "agent_id_here",
  "agent_name": "Agent Name",
  "score": 7,
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "lessons": ["actionable rule"],
  "lesson_types": ["quality"]
}]`,
      maxTokens: 1000,
    });

    const evaluations = parseJSON<AgentEvaluation[]>(response);
    if (!evaluations || evaluations.length === 0) return [];

    for (const eval_ of evaluations) {
      if (eval_.lessons && eval_.lessons.length > 0) {
        await writeAgentLessons(
          userId,
          eval_.agent_id,
          eval_.lessons,
          eval_.lesson_types || eval_.lessons.map(() => 'quality'),
          simulationId
        );
      }
    }

    console.log(`EVAL: ${evaluations.length} agents evaluated. Scores: ${evaluations.map(e => `${e.agent_id}:${e.score}`).join(', ')}`);
    return evaluations;

  } catch (err) {
    console.error('EVAL: evaluateAgentPerformance failed:', err);
    return [];
  }
}

// ═══════════════════════════════════════════
// writeAgentLessons() — Persist lessons
// ═══════════════════════════════════════════

export async function writeAgentLessons(
  userId: string,
  agentId: string,
  lessons: string[],
  lessonTypes: string[],
  simulationId: string
): Promise<number> {
  if (!supabase) return 0;

  const { data: existing } = await supabase
    .from('agent_lessons')
    .select('id, lesson, lesson_type, evidence_count')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('is_active', true);

  let savedCount = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const type = lessonTypes[i] || 'quality';

    const duplicate = findSimilarLesson(lesson, existing || []);

    if (duplicate) {
      const { error } = await supabase
        .from('agent_lessons')
        .update({
          evidence_count: (duplicate.evidence_count || 1) + 1,
          updated_at: now,
        })
        .eq('id', duplicate.id);

      if (!error) {
        savedCount++;
        console.log(`EVAL LESSON: Reinforced "${duplicate.lesson.substring(0, 50)}..." (evidence: ${(duplicate.evidence_count || 1) + 1}) for ${agentId}`);
      }
    } else {
      const { error } = await supabase
        .from('agent_lessons')
        .insert({
          user_id: userId,
          agent_id: agentId,
          lesson,
          lesson_type: type,
          derived_from_sim: simulationId,
          evidence_count: 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        });

      if (!error) {
        savedCount++;
        console.log(`EVAL LESSON: New "${lesson.substring(0, 50)}..." for ${agentId}`);
      }
    }
  }

  return savedCount;
}

function findSimilarLesson(
  newLesson: string,
  existingLessons: { id: string; lesson: string; evidence_count: number }[]
): { id: string; lesson: string; evidence_count: number } | null {
  const newWords = new Set(
    newLesson.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  );

  if (newWords.size === 0) return null;

  for (const existing of existingLessons) {
    const existingWords = new Set(
      existing.lesson.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
    );

    if (existingWords.size === 0) continue;

    let overlap = 0;
    for (const word of newWords) {
      if (existingWords.has(word)) overlap++;
    }

    const similarity = overlap / Math.min(newWords.size, existingWords.size);
    if (similarity > 0.6) return existing;
  }

  return null;
}

// ═══════════════════════════════════════════
// loadAllAgentLessons() — Batch load for all agents
// ═══════════════════════════════════════════

export async function loadAllAgentLessons(
  userId: string,
  maxPerAgent: number = 8
): Promise<Map<string, string>> {
  if (!supabase) return new Map();

  const { data: allLessons, error } = await supabase
    .from('agent_lessons')
    .select('agent_id, lesson, lesson_type, evidence_count')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('evidence_count', { ascending: false });

  if (error || !allLessons || allLessons.length === 0) return new Map();

  const grouped = new Map<string, typeof allLessons>();
  for (const l of allLessons) {
    const list = grouped.get(l.agent_id) || [];
    list.push(l);
    grouped.set(l.agent_id, list);
  }

  const result = new Map<string, string>();
  for (const [agentId, lessons] of grouped) {
    const top = lessons.slice(0, maxPerAgent);
    const lines = top.map(l => {
      const tag = l.evidence_count > 2 ? ' [confirmed ×' + l.evidence_count + ']' : '';
      return `  • ${l.lesson}${tag}`;
    });

    result.set(agentId, [
      '\n── LEARNED RULES (from past performance evaluation) ──',
      'Follow these rules — they correct known weaknesses in your analysis:',
      ...lines,
      '──────────────────────────────────────────────────────\n',
    ].join('\n'));
  }

  return result;
}

// ═══════════════════════════════════════════
// persistRoundLearnings() — Inter-round knowledge sharing
// ═══════════════════════════════════════════

export function persistRoundLearnings(
  agentId: string,
  _agentName: string,
  report: Record<string, unknown>
): RoundLearning {
  const facts: string[] = [];
  const claims: string[] = [];

  if (report.key_argument) {
    claims.push(report.key_argument as string);
  }

  if (report.evidence && Array.isArray(report.evidence)) {
    for (const e of (report.evidence as unknown[]).slice(0, 3)) {
      const text = typeof e === 'string' ? e : ((e as Record<string, string>)?.description || (e as Record<string, string>)?.text || '');
      if (text.length > 10) facts.push(text);
    }
  }

  if (report.risks_identified && Array.isArray(report.risks_identified)) {
    for (const r of (report.risks_identified as unknown[]).slice(0, 2)) {
      const text = typeof r === 'string' ? r : ((r as Record<string, string>)?.description || (r as Record<string, string>)?.risk || '');
      if (text.length > 10) claims.push(`Risk: ${text}`);
    }
  }

  if (report.data_points && Array.isArray(report.data_points)) {
    for (const d of (report.data_points as unknown[]).slice(0, 3)) {
      const text = typeof d === 'string' ? d : ((d as Record<string, string>)?.description || (d as Record<string, string>)?.value || '');
      if (text.length > 5) facts.push(text);
    }
  }

  return { agent_id: agentId, facts_discovered: facts, key_claims: claims };
}

export function formatRoundDiscoveries(
  discoveries: RoundLearning[],
  currentRound: number
): string {
  if (discoveries.length === 0) return '';

  const lines: string[] = [
    `\n── ROUND DISCOVERIES (facts from rounds 1-${currentRound - 1}) ──`,
  ];

  for (const d of discoveries) {
    if (d.facts_discovered.length === 0 && d.key_claims.length === 0) continue;
    const items = [...d.facts_discovered, ...d.key_claims].slice(0, 3);
    for (const item of items) {
      lines.push(`  • [${d.agent_id}] ${item.substring(0, 150)}`);
    }
  }

  if (lines.length <= 1) return '';

  lines.push('Use these discoveries to ground your analysis. Don\'t repeat — build on them.');
  lines.push('──────────────────────────────────────────────────\n');

  return lines.join('\n');
}
