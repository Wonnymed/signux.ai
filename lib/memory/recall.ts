/**
 * Memory Scoring + Multi-Strategy Recall for Octux.
 *
 * Pipeline: recallMemories() → reciprocalRankFusion() → scoreMemory() → top K
 *
 * Two-layer ranking:
 *   Layer 1 — RRF: Fuses rankings from multiple retrieval strategies
 *   Layer 2 — Mem0 scoring: relevance × 0.5 + recency × 0.25 + importance × 0.25
 *
 * Refs: Mem0 (#21), Graphiti (#27), Hindsight (#28)
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type MemoryItem = {
  id: string;
  network: 'world' | 'experience' | 'opinion' | 'observation';
  content: string;
  confidence: number;
  learned_at: string;
  category?: string;
  rrf_score: number;
  relevance_score: number;
  recency_score: number;
  importance_score: number;
  final_score: number;
};

type RankedList = { id: string; rank: number }[];

// ═══════════════════════════════════════════
// scoreMemory() — Mem0 scoring formula
// ═══════════════════════════════════════════

export function scoreMemory(
  item: MemoryItem,
  questionKeywords: string[]
): MemoryItem {
  const contentLower = item.content.toLowerCase();
  const matchCount = questionKeywords.filter(kw => contentLower.includes(kw)).length;
  const relevance = questionKeywords.length > 0
    ? Math.min(matchCount / Math.max(questionKeywords.length * 0.4, 1), 1.0)
    : 0.5;

  const ageDays = (Date.now() - new Date(item.learned_at).getTime()) / 86400000;
  const recency = Math.exp(-0.693 * ageDays / 14);

  const importance = Math.min(Math.max(item.confidence, 0), 1);

  const final_score = (relevance * 0.5) + (recency * 0.25) + (importance * 0.25);

  return {
    ...item,
    relevance_score: round3(relevance),
    recency_score: round3(recency),
    importance_score: round3(importance),
    final_score: round3(final_score),
  };
}

// ═══════════════════════════════════════════
// reciprocalRankFusion()
// ═══════════════════════════════════════════

export function reciprocalRankFusion(
  rankedLists: RankedList[],
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const list of rankedLists) {
    for (const item of list) {
      const current = scores.get(item.id) || 0;
      scores.set(item.id, current + (1 / (k + item.rank)));
    }
  }

  return scores;
}

// ═══════════════════════════════════════════
// recallMemories() — 4-way hybrid recall with RRF fusion
// ═══════════════════════════════════════════

export async function recallMemories(
  userId: string,
  question: string,
  maxPerStrategy: number = 20
): Promise<MemoryItem[]> {
  if (!supabase) return [];

  const keywords = extractKeywords(question);
  const tsquery = keywords.length > 0
    ? keywords.map(k => k.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean).join(' | ')
    : null;

  const itemMap = new Map<string, MemoryItem>();
  const rankedLists: RankedList[] = [];

  // ── STRATEGY 1: BM25 full-text on user_facts ──
  if (tsquery) {
    try {
      const { data } = await supabase
        .from('user_facts')
        .select('id, content, category, confidence, learned_at')
        .eq('user_id', userId)
        .eq('is_current', true)
        .textSearch('search_vector', tsquery, { type: 'plain' })
        .limit(maxPerStrategy);

      if (data && data.length > 0) {
        const ranked: RankedList = [];
        data.forEach((row, i) => {
          ranked.push({ id: row.id, rank: i + 1 });
          if (!itemMap.has(row.id)) itemMap.set(row.id, makeItem(row, 'world'));
        });
        rankedLists.push(ranked);
      }
    } catch (err) {
      console.error('[recall] BM25 facts failed:', err);
    }
  }

  // ── STRATEGY 2: Confidence sort on user_facts ──
  try {
    const { data } = await supabase
      .from('user_facts')
      .select('id, content, category, confidence, learned_at')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('confidence', { ascending: false })
      .limit(maxPerStrategy);

    if (data && data.length > 0) {
      const ranked: RankedList = [];
      data.forEach((row, i) => {
        ranked.push({ id: row.id, rank: i + 1 });
        if (!itemMap.has(row.id)) itemMap.set(row.id, makeItem(row, 'world'));
      });
      rankedLists.push(ranked);
    }
  } catch (err) {
    console.error('[recall] Confidence sort failed:', err);
  }

  // ── STRATEGY 3: Recency sort on user_facts ──
  try {
    const { data } = await supabase
      .from('user_facts')
      .select('id, content, category, confidence, learned_at')
      .eq('user_id', userId)
      .eq('is_current', true)
      .order('learned_at', { ascending: false })
      .limit(maxPerStrategy);

    if (data && data.length > 0) {
      const ranked: RankedList = [];
      data.forEach((row, i) => {
        ranked.push({ id: row.id, rank: i + 1 });
        if (!itemMap.has(row.id)) itemMap.set(row.id, makeItem(row, 'world'));
      });
      rankedLists.push(ranked);
    }
  } catch (err) {
    console.error('[recall] Recency sort failed:', err);
  }

  // ── STRATEGY 4A: Cross-network — EXPERIENCES ──
  try {
    const { data } = await supabase
      .from('decision_experiences')
      .select('id, question, verdict_recommendation, verdict_probability, verdict_summary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(maxPerStrategy);

    if (data && data.length > 0) {
      const ranked: RankedList = [];
      data.forEach((row, i) => {
        ranked.push({ id: row.id, rank: i + 1 });
        if (!itemMap.has(row.id)) {
          const content = `Asked: "${(row.question || '').substring(0, 80)}..." → ${(row.verdict_recommendation || 'unknown').toUpperCase()} (${row.verdict_probability || 0}%)${row.verdict_summary ? '. ' + row.verdict_summary : ''}`;
          itemMap.set(row.id, {
            id: row.id, network: 'experience', content,
            confidence: (row.verdict_probability || 50) / 100,
            learned_at: row.created_at || new Date().toISOString(),
            category: 'experience',
            rrf_score: 0, relevance_score: 0, recency_score: 0, importance_score: 0, final_score: 0,
          });
        }
      });
      rankedLists.push(ranked);
    }
  } catch (err) {
    console.error('[recall] Experiences failed:', err);
  }

  // ── STRATEGY 4B: Cross-network — OPINIONS ──
  try {
    let query = supabase
      .from('decision_opinions')
      .select('id, belief, domain, confidence, learned_at, created_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (tsquery) {
      query = query.textSearch('search_vector', tsquery, { type: 'plain' });
    }

    const { data } = await query
      .order('confidence', { ascending: false })
      .limit(maxPerStrategy);

    if (data && data.length > 0) {
      const ranked: RankedList = [];
      data.forEach((row, i) => {
        ranked.push({ id: row.id, rank: i + 1 });
        if (!itemMap.has(row.id)) {
          itemMap.set(row.id, {
            id: row.id, network: 'opinion',
            content: `Belief: "${row.belief}" (confidence: ${Math.round((row.confidence || 0.5) * 100)}%, domain: ${row.domain})`,
            confidence: row.confidence || 0.5,
            learned_at: row.learned_at || row.created_at || new Date().toISOString(),
            category: row.domain,
            rrf_score: 0, relevance_score: 0, recency_score: 0, importance_score: 0, final_score: 0,
          });
        }
      });
      rankedLists.push(ranked);
    }
  } catch (err) {
    console.error('[recall] Opinions failed:', err);
  }

  // ── STRATEGY 4C: Cross-network — OBSERVATIONS ──
  try {
    let query = supabase
      .from('decision_observations')
      .select('id, pattern, domain, strength, evidence_count, learned_at, created_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (tsquery) {
      query = query.textSearch('search_vector', tsquery, { type: 'plain' });
    }

    const { data } = await query
      .order('strength', { ascending: false })
      .limit(maxPerStrategy);

    if (data && data.length > 0) {
      const ranked: RankedList = [];
      data.forEach((row, i) => {
        ranked.push({ id: row.id, rank: i + 1 });
        if (!itemMap.has(row.id)) {
          itemMap.set(row.id, {
            id: row.id, network: 'observation',
            content: `Pattern: ${row.pattern} (strength: ${Math.round((row.strength || 0.5) * 100)}%, evidence: ${row.evidence_count || 1} sims)`,
            confidence: row.strength || 0.5,
            learned_at: row.learned_at || row.created_at || new Date().toISOString(),
            category: row.domain,
            rrf_score: 0, relevance_score: 0, recency_score: 0, importance_score: 0, final_score: 0,
          });
        }
      });
      rankedLists.push(ranked);
    }
  } catch (err) {
    console.error('[recall] Observations failed:', err);
  }

  // ── FUSE via Reciprocal Rank Fusion ──
  const rrfScores = reciprocalRankFusion(rankedLists);
  const items = Array.from(itemMap.values());
  for (const item of items) {
    item.rrf_score = round3(rrfScores.get(item.id) || 0);
  }

  return items;
}

// ═══════════════════════════════════════════
// getTopKMemories() — Main entry point
// ═══════════════════════════════════════════

export async function getTopKMemories(
  userId: string,
  question: string,
  k: number = 15
): Promise<string> {
  const candidates = await recallMemories(userId, question);
  if (candidates.length === 0) return '';

  const keywords = extractKeywords(question);
  const scored = candidates.map(item => scoreMemory(item, keywords));

  // Combine RRF + Mem0 into final score
  const maxRrf = Math.max(...scored.map(s => s.rrf_score), 0.001);
  for (const item of scored) {
    const normalizedRrf = item.rrf_score / maxRrf;
    item.final_score = round3(
      (normalizedRrf * 0.4) + (item.final_score * 0.6)
    );
  }

  scored.sort((a, b) => b.final_score - a.final_score);
  const topK = scored.slice(0, k);

  return formatMemoriesForContext(topK);
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function makeItem(row: Record<string, unknown>, network: MemoryItem['network']): MemoryItem {
  return {
    id: row.id as string,
    network,
    content: row.content as string,
    confidence: (row.confidence as number) || 0.5,
    learned_at: (row.learned_at as string) || (row.created_at as string) || new Date().toISOString(),
    category: row.category as string,
    rrf_score: 0, relevance_score: 0, recency_score: 0, importance_score: 0, final_score: 0,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'the', 'a', 'an', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'about', 'between', 'through', 'during', 'before', 'after',
    'and', 'or', 'but', 'not', 'no', 'if', 'then', 'than', 'that', 'this',
    'what', 'which', 'who', 'how', 'when', 'where', 'why',
    'it', 'its', 'there', 'here', 'so', 'just', 'very', 'also', 'too',
    'want', 'need', 'think', 'know', 'like', 'make', 'get', 'go',
    'good', 'bad', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
    'much', 'many', 'some', 'any', 'each', 'every', 'all', 'both',
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s$%]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.has(word))
    .slice(0, 20);
}

function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (memories.length === 0) return '';

  const world = memories.filter(m => m.network === 'world');
  const experiences = memories.filter(m => m.network === 'experience');
  const opinions = memories.filter(m => m.network === 'opinion');
  const observations = memories.filter(m => m.network === 'observation');

  const sections: string[] = [];

  if (world.length > 0) {
    sections.push('KNOWN FACTS:');
    for (const m of world) sections.push(`  • ${m.content}`);
  }

  if (experiences.length > 0) {
    sections.push('PAST DECISIONS:');
    for (const m of experiences) sections.push(`  • ${m.content}`);
  }

  if (opinions.length > 0) {
    sections.push('SYSTEM BELIEFS (challenge if your analysis contradicts):');
    for (const m of opinions) sections.push(`  • ${m.content}`);
  }

  if (observations.length > 0) {
    sections.push('LEARNED PATTERNS (apply if relevant):');
    for (const m of observations) sections.push(`  • ${m.content}`);
  }

  return [
    '\n═══ RECALLED MEMORIES (top ' + memories.length + ', multi-strategy scored) ═══',
    ...sections,
    '══════════════════════════════════════════════════════════════\n',
  ].join('\n');
}
