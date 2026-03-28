/**
 * Bi-Temporal Fact Tracking — Graphiti pattern for Octux.
 *
 * Two time dimensions per fact:
 *   Real-world: valid_from → valid_until (when TRUE in the world)
 *   System:     learned_at → expired_at  (when Octux knew about it)
 *
 * Three operations:
 *   addFact()               — insert with both timestamp dimensions
 *   invalidateFact()        — soft-delete: is_current=false, never hard-delete
 *   resolveContradictions() — LLM detects conflicts, newer overrides older
 *
 * Ref: Graphiti (#27 — bi-temporal, non-lossy, temporal conflict resolution)
 */

import { callClaude, parseJSON } from '../simulation/claude';
import { supabase } from './supabase';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type TemporalFact = {
  id: string;
  content: string;
  category: string;
  confidence: number;
  valid_from: string;
  valid_until: string | null;
  learned_at: string;
  expired_at: string | null;
  is_current: boolean;
  superseded_by: string | null;
  source_simulation: string | null;
};

type Contradiction = {
  fact_a_id: string;
  fact_b_id: string;
  resolution: 'keep_a' | 'keep_b' | 'keep_both';
  reason: string;
};

// ═══════════════════════════════════════════
// addFact() — Temporal-aware insertion
// ═══════════════════════════════════════════

export async function addFact(
  userId: string,
  content: string,
  category: string,
  confidence: number,
  sourceSimulationId: string | null,
  validFromDate?: string
): Promise<string | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('user_facts')
      .insert({
        user_id: userId,
        content,
        category,
        confidence,
        evidence_count: 1,
        source_simulation: sourceSimulationId,
        valid_from: validFromDate || now,
        valid_until: null,
        learned_at: now,
        expired_at: null,
        is_current: true,
        superseded_by: null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[temporal] addFact error:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('[temporal] addFact exception:', err);
    return null;
  }
}

// ═══════════════════════════════════════════
// invalidateFact() — Non-lossy soft-delete
// ═══════════════════════════════════════════

export async function invalidateFact(
  factId: string,
  reason?: string
): Promise<boolean> {
  if (!supabase) return false;
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('user_facts')
      .update({
        valid_until: now,
        expired_at: now,
        is_current: false,
        updated_at: now,
        ...(reason
          ? { metadata: { invalidation_reason: reason, invalidated_at: now } }
          : {}),
      })
      .eq('id', factId)
      .eq('is_current', true);

    if (error) {
      console.error('[temporal] invalidateFact error:', error);
      return false;
    }

    console.log(`[temporal] Fact ${factId} invalidated${reason ? ` — ${reason}` : ''}`);
    return true;
  } catch (err) {
    console.error('[temporal] invalidateFact exception:', err);
    return false;
  }
}

// ═══════════════════════════════════════════
// temporalUpdateFact() — Invalidate old + Insert new (supersession)
// ═══════════════════════════════════════════

export async function temporalUpdateFact(
  userId: string,
  oldFactId: string,
  newContent: string,
  newConfidence: number,
  category: string,
  sourceSimulationId: string | null,
  validFromDate?: string
): Promise<string | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const validFrom = validFromDate || now;

  try {
    // 1. Invalidate old
    const { error: invError } = await supabase
      .from('user_facts')
      .update({
        valid_until: validFrom,
        expired_at: now,
        is_current: false,
        updated_at: now,
      })
      .eq('id', oldFactId);

    if (invError) {
      console.error('[temporal] update: invalidate failed:', invError);
      return null;
    }

    // 2. Insert new version
    const { data: newFact, error: insError } = await supabase
      .from('user_facts')
      .insert({
        user_id: userId,
        content: newContent,
        category,
        confidence: newConfidence,
        evidence_count: 1,
        source_simulation: sourceSimulationId,
        valid_from: validFrom,
        valid_until: null,
        learned_at: now,
        expired_at: null,
        is_current: true,
        superseded_by: null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (insError || !newFact) {
      console.error('[temporal] update: insert failed:', insError);
      return null;
    }

    // 3. Link old → new
    await supabase
      .from('user_facts')
      .update({ superseded_by: newFact.id })
      .eq('id', oldFactId);

    console.log(`[temporal] ${oldFactId} → superseded by → ${newFact.id}`);
    return newFact.id;
  } catch (err) {
    console.error('[temporal] temporalUpdateFact exception:', err);
    return null;
  }
}

// ═══════════════════════════════════════════
// resolveContradictions() — Newer overrides older
// ═══════════════════════════════════════════

export async function resolveContradictions(
  userId: string,
  _sourceSimulationId?: string
): Promise<number> {
  if (!supabase) return 0;

  const { data: currentFacts, error } = await supabase
    .from('user_facts')
    .select('id, content, category, confidence, learned_at')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('learned_at', { ascending: false });

  if (error || !currentFacts || currentFacts.length < 2) return 0;

  // Group by category
  const byCategory = new Map<string, typeof currentFacts>();
  for (const f of currentFacts) {
    const list = byCategory.get(f.category) || [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  let resolvedCount = 0;

  for (const [category, facts] of byCategory) {
    if (facts.length < 2) continue;
    if (facts.length > 15) continue;

    const factList = facts
      .map(f => `[${f.id}] "${f.content}" (confidence: ${f.confidence}, learned: ${new Date(f.learned_at).toISOString().split('T')[0]})`)
      .join('\n');

    try {
      const response = await callClaude({
        systemPrompt: `You detect contradictions between facts about a user's business.
A contradiction = two facts that CANNOT both be true at the same time.

CONTRADICTIONS:
- "Budget is $30K" vs "Budget is $50K" → YES (one value at a time)
- "Located in Gangnam" vs "Located in Hongdae" → YES (same business)
- "Team of 2" vs "Team of 5" → YES (team size changed)

NOT CONTRADICTIONS:
- "Budget is $50K" vs "Revenue target $100K" → NO (different things)
- "Market is growing" vs "Growth is 12%" → NO (compatible)
- "Café concept" vs "Restaurant concept" → MAYBE (could be pivot — flag as keep_both if unsure)

Return ONLY a JSON array. Empty array [] if no contradictions.
For each contradiction, pick which to KEEP:
- Default: keep the NEWER one (more recent learned date)
- Exception: if the older fact has confidence > 0.3 higher, keep the older one
- If genuinely unsure, use "keep_both"`,
        userMessage: `Category: "${category}"
Current facts:
${factList}

JSON array:`,
        maxTokens: 400,
      });

      const contradictions = parseJSON<Contradiction[]>(response);
      if (!contradictions || contradictions.length === 0) continue;

      for (const c of contradictions) {
        if (c.resolution === 'keep_both') continue;

        const loserId = c.resolution === 'keep_a' ? c.fact_b_id : c.fact_a_id;
        const winnerId = c.resolution === 'keep_a' ? c.fact_a_id : c.fact_b_id;

        const loserExists = facts.some(f => f.id === loserId);
        const winnerExists = facts.some(f => f.id === winnerId);
        if (!loserExists || !winnerExists) continue;

        const invalidated = await invalidateFact(loserId, `Contradiction: superseded by ${winnerId} — ${c.reason}`);
        if (invalidated) {
          await supabase
            .from('user_facts')
            .update({ superseded_by: winnerId })
            .eq('id', loserId);

          resolvedCount++;
          console.log(`[temporal] Resolved: ${loserId} invalidated, ${winnerId} kept — ${c.reason}`);
        }
      }
    } catch (err) {
      console.error(`[temporal] resolveContradictions error (${category}):`, err);
    }
  }

  if (resolvedCount > 0) {
    console.log(`[temporal] Resolved ${resolvedCount} contradiction(s) for user ${userId}`);
  }
  return resolvedCount;
}

// ═══════════════════════════════════════════
// getFactTimeline() — Chronological evolution of a fact
// ═══════════════════════════════════════════

export type FactVersion = {
  id: string;
  content: string;
  confidence: number;
  valid_from: string;
  valid_until: string | null;
  learned_at: string;
  is_current: boolean;
  superseded_by: string | null;
  source_simulation: string | null;
};

export type FactTimeline = {
  search_term: string;
  versions: FactVersion[];
  change_count: number;
  current_value: string | null;
};

/**
 * Get the full chronological history of a fact by keyword search.
 * Follows the supersession chain to show how a value evolved over time.
 */
export async function getFactTimeline(
  userId: string,
  searchTerm: string,
  category?: string
): Promise<FactTimeline | null> {
  if (!supabase) return null;

  let query = supabase
    .from('user_facts')
    .select('id, content, confidence, valid_from, valid_until, learned_at, is_current, superseded_by, source_simulation')
    .eq('user_id', userId)
    .ilike('content', `%${searchTerm}%`)
    .order('valid_from', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return null;

  const currentVersion = data.find(f => f.is_current);

  return {
    search_term: searchTerm,
    versions: data.map(f => ({
      id: f.id,
      content: f.content,
      confidence: f.confidence,
      valid_from: f.valid_from,
      valid_until: f.valid_until,
      learned_at: f.learned_at,
      is_current: f.is_current,
      superseded_by: f.superseded_by,
      source_simulation: f.source_simulation,
    })),
    change_count: data.length - 1,
    current_value: currentVersion?.content || null,
  };
}

/**
 * Get the full chronological history of a SPECIFIC fact by ID,
 * walking the supersession chain backward and forward.
 */
export async function getFactChain(factId: string): Promise<FactVersion[]> {
  if (!supabase) return [];

  const visited = new Set<string>();

  // Walk BACKWARD: find predecessors
  let currentId: string | null = factId;
  const backward: string[] = [];

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    backward.push(currentId);

    const { data } = await supabase
      .from('user_facts')
      .select('id')
      .eq('superseded_by', currentId)
      .maybeSingle();

    currentId = data?.id || null;
  }

  backward.reverse(); // oldest → newest

  // Walk FORWARD from factId
  const orderedIds = [...backward];
  visited.clear();
  for (const id of orderedIds) visited.add(id);

  const { data: originalFact } = await supabase
    .from('user_facts')
    .select('superseded_by')
    .eq('id', factId)
    .maybeSingle();

  let nextId: string | null = originalFact?.superseded_by || null;
  while (nextId && !visited.has(nextId)) {
    visited.add(nextId);
    orderedIds.push(nextId);

    const { data } = await supabase
      .from('user_facts')
      .select('superseded_by')
      .eq('id', nextId)
      .maybeSingle();

    nextId = data?.superseded_by || null;
  }

  if (orderedIds.length === 0) return [];

  const { data: facts } = await supabase
    .from('user_facts')
    .select('id, content, confidence, valid_from, valid_until, learned_at, is_current, superseded_by, source_simulation')
    .in('id', orderedIds);

  if (!facts) return [];

  const idOrder = new Map(orderedIds.map((id, i) => [id, i]));
  facts.sort((a, b) => (idOrder.get(a.id) || 0) - (idOrder.get(b.id) || 0));

  return facts.map(f => ({
    id: f.id,
    content: f.content,
    confidence: f.confidence,
    valid_from: f.valid_from,
    valid_until: f.valid_until,
    learned_at: f.learned_at,
    is_current: f.is_current,
    superseded_by: f.superseded_by,
    source_simulation: f.source_simulation,
  }));
}
