/**
 * Memory Optimization — Cortex Mem + Cognee memify patterns for Octux.
 *
 * consolidateMemories() — merge duplicate facts, sum evidence_count
 * pruneStaleMemories()  — invalidate old low-quality facts
 * strengthenFrequentEdges() — increase weight on frequently-referenced graph edges
 * deriveNewFacts()      — infer new relations from existing graph
 * runMemoryOptimization() — orchestrator, every 10 sims
 *
 * Without this, memory grows into noise. With this, memory gets SHARPER over time.
 *
 * Refs: Cortex Mem (#6 — periodic consolidation, semantic dedup, quality eval)
 *       Cognee (#22 — memify: prune stale, strengthen frequent, derive new)
 */

import { supabase } from './supabase';
import { callClaude, parseJSON } from '../simulation/claude';
import { invalidateFact } from './temporal';

// ═══════════════════════════════════════════
// runMemoryOptimization() — Orchestrator
// ═══════════════════════════════════════════

export async function runMemoryOptimization(
  userId: string,
  force: boolean = false
): Promise<{
  consolidated: number;
  pruned: number;
  strengthened: number;
  derived: number;
}> {
  if (!supabase) return { consolidated: 0, pruned: 0, strengthened: 0, derived: 0 };

  // Check if it's time to optimize
  if (!force) {
    const { count } = await supabase
      .from('decision_experiences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!count || count % 10 !== 0) {
      return { consolidated: 0, pruned: 0, strengthened: 0, derived: 0 };
    }

    console.log(`OPTIMIZE: Triggering memory optimization for user ${userId} (${count} sims)`);
  }

  const startTime = Date.now();

  // Run all operations in sequence (not parallel — consolidate first, then prune)
  const consolidated = await consolidateMemories(userId);
  const pruned = await pruneStaleMemories(userId);
  const strengthened = await strengthenFrequentEdges(userId);
  const derived = await deriveNewFacts(userId);

  // Also prune stale agent lessons
  const lessonsPruned = await pruneStaleAgentLessons(userId);

  const durationMs = Date.now() - startTime;

  // Log the optimization run
  await supabase.from('memory_optimization_log').insert({
    user_id: userId,
    trigger: force ? 'manual' : 'auto',
    facts_consolidated: consolidated,
    facts_pruned: pruned,
    edges_strengthened: strengthened,
    facts_derived: derived,
    lessons_pruned: lessonsPruned,
    duration_ms: durationMs,
  }); // non-blocking log

  console.log(`OPTIMIZE COMPLETE (${durationMs}ms): consolidated=${consolidated}, pruned=${pruned}, strengthened=${strengthened}, derived=${derived}, lessons_pruned=${lessonsPruned}`);

  return { consolidated, pruned, strengthened, derived };
}

// ═══════════════════════════════════════════
// consolidateMemories() — Merge duplicate facts
// ═══════════════════════════════════════════

async function consolidateMemories(userId: string): Promise<number> {
  if (!supabase) return 0;

  const { data: currentFacts } = await supabase
    .from('user_facts')
    .select('id, content, category, confidence, evidence_count')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('category')
    .order('confidence', { ascending: false });

  if (!currentFacts || currentFacts.length < 2) return 0;

  // Group by category
  const byCategory = new Map<string, typeof currentFacts>();
  for (const f of currentFacts) {
    const list = byCategory.get(f.category) || [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  let consolidated = 0;

  for (const [category, facts] of byCategory) {
    if (facts.length < 2) continue;
    if (facts.length > 20) continue; // too many for one LLM call — skip

    const factList = facts.map(f =>
      `[${f.id}] "${f.content}" (confidence: ${f.confidence}, evidence: ${f.evidence_count})`
    ).join('\n');

    try {
      const response = await callClaude({
        systemPrompt: `You find DUPLICATE facts that say the same thing in different words.

DUPLICATES (merge these):
- "Budget is $50K" and "User has a $50K budget" → SAME fact
- "Located in Gangnam" and "Business location: Gangnam-gu" → SAME fact
- "Team of 2 people" and "Two co-founders" → SAME fact

NOT DUPLICATES (keep both):
- "Budget is $50K" and "Revenue target $100K" → DIFFERENT facts
- "Located in Gangnam" and "Serves Gangnam area" → DIFFERENT (location vs market)

For each duplicate group, indicate which ID to KEEP (highest confidence) and which to MERGE (invalidate, transfer evidence_count).

Return JSON array. Empty [] if no duplicates found.`,
        userMessage: `Category: "${category}"
Facts:
${factList}

Find duplicate groups. JSON:
[{
  "keep_id": "uuid of the fact to keep",
  "merge_ids": ["uuid1", "uuid2"],
  "reason": "why these are duplicates"
}]`,
        maxTokens: 400,
      });

      const groups = parseJSON<{ keep_id: string; merge_ids: string[]; reason: string }[]>(response);
      if (!groups || groups.length === 0) continue;

      for (const group of groups) {
        // Validate IDs exist in our facts
        const keeper = facts.find(f => f.id === group.keep_id);
        const toMerge = group.merge_ids
          .map(id => facts.find(f => f.id === id))
          .filter(Boolean);

        if (!keeper || toMerge.length === 0) continue;

        // Sum evidence_count from merged facts
        const totalEvidence = (keeper.evidence_count || 1) +
          toMerge.reduce((sum, f) => sum + (f!.evidence_count || 1), 0);

        // Update keeper with combined evidence
        await supabase
          .from('user_facts')
          .update({
            evidence_count: totalEvidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', group.keep_id);

        // Invalidate merged facts (non-lossy)
        for (const merged of toMerge) {
          if (!merged) continue;
          await invalidateFact(merged.id, `Consolidated into ${group.keep_id}: ${group.reason}`);
          // Link to keeper via superseded_by
          await supabase
            .from('user_facts')
            .update({ superseded_by: group.keep_id })
            .eq('id', merged.id);
          consolidated++;
        }

        console.log(`OPTIMIZE CONSOLIDATE: Merged ${toMerge.length} duplicates into "${keeper.content.substring(0, 50)}..." (evidence: ${totalEvidence})`);
      }
    } catch (err) {
      console.error(`OPTIMIZE consolidate error (${category}):`, err);
    }
  }

  return consolidated;
}

// ═══════════════════════════════════════════
// pruneStaleMemories() — Remove low-quality old facts
// ═══════════════════════════════════════════

async function pruneStaleMemories(userId: string): Promise<number> {
  if (!supabase) return 0;

  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  let pruned = 0;

  // Prune stale facts
  try {
    const { data: staleFacts } = await supabase
      .from('user_facts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_current', true)
      .lt('confidence', 0.4)
      .lte('evidence_count', 1)
      .lt('learned_at', thirtyDaysAgo);

    if (staleFacts && staleFacts.length > 0) {
      for (const f of staleFacts) {
        await invalidateFact(f.id, 'Pruned: low confidence + old + low evidence');
        pruned++;
      }
      console.log(`OPTIMIZE PRUNE: ${staleFacts.length} stale facts invalidated`);
    }
  } catch (err) {
    console.error('OPTIMIZE prune facts error:', err);
  }

  // Prune weak opinions (confidence < 0.2)
  try {
    const { data: weakOpinions } = await supabase
      .from('decision_opinions')
      .select('id, belief')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('confidence', 0.2);

    if (weakOpinions && weakOpinions.length > 0) {
      const ids = weakOpinions.map(o => o.id);
      await supabase
        .from('decision_opinions')
        .update({
          status: 'invalidated',
          valid_until: now,
          updated_at: now,
        })
        .in('id', ids);

      pruned += ids.length;
      console.log(`OPTIMIZE PRUNE: ${ids.length} weak opinions invalidated (confidence < 0.2)`);
    }
  } catch (err) {
    console.error('OPTIMIZE prune opinions error:', err);
  }

  // Prune weak observations (strength < 0.2, evidence_count <= 1)
  try {
    const { data: weakObs } = await supabase
      .from('decision_observations')
      .select('id, pattern')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('strength', 0.2)
      .lte('evidence_count', 1);

    if (weakObs && weakObs.length > 0) {
      const ids = weakObs.map(o => o.id);
      await supabase
        .from('decision_observations')
        .update({
          status: 'invalidated',
          valid_until: now,
          updated_at: now,
        })
        .in('id', ids);

      pruned += ids.length;
      console.log(`OPTIMIZE PRUNE: ${ids.length} weak observations invalidated`);
    }
  } catch (err) {
    console.error('OPTIMIZE prune observations error:', err);
  }

  return pruned;
}

// ═══════════════════════════════════════════
// strengthenFrequentEdges() — Cognee memify: usage = weight
// ═══════════════════════════════════════════

async function strengthenFrequentEdges(userId: string): Promise<number> {
  if (!supabase) return 0;

  // Get all active relations with their entity mention counts
  const { data: relations } = await supabase
    .from('knowledge_relations')
    .select(`
      id, weight, source_entity_id, target_entity_id, created_at,
      source:knowledge_entities!source_entity_id(mention_count),
      target:knowledge_entities!target_entity_id(mention_count)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!relations || relations.length === 0) return 0;

  let updated = 0;
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  for (const rel of relations) {
    const sourceMentions = (rel.source as any)?.mention_count || 1;
    const targetMentions = (rel.target as any)?.mention_count || 1;
    const currentWeight = rel.weight || 1.0;
    const createdAt = new Date(rel.created_at);

    let newWeight = currentWeight;

    // Strengthen: boost based on entity mention frequency
    const frequencyBoost = 0.1 * Math.min(sourceMentions, targetMentions) / 5;
    newWeight += frequencyBoost;

    // Decay: old low-weight edges lose weight
    if (createdAt < sixtyDaysAgo && currentWeight < 0.5) {
      newWeight -= 0.1;
    }

    // Clamp to [0.1, 5.0]
    newWeight = Math.max(0.1, Math.min(5.0, newWeight));
    newWeight = Math.round(newWeight * 100) / 100;

    // Only update if changed meaningfully
    if (Math.abs(newWeight - currentWeight) >= 0.05) {
      await supabase
        .from('knowledge_relations')
        .update({ weight: newWeight, updated_at: now.toISOString() })
        .eq('id', rel.id);
      updated++;
    }
  }

  if (updated > 0) {
    console.log(`OPTIMIZE STRENGTHEN: ${updated} graph edges reweighted`);
  }

  return updated;
}

// ═══════════════════════════════════════════
// deriveNewFacts() — Infer new relations from graph
// ═══════════════════════════════════════════

async function deriveNewFacts(userId: string): Promise<number> {
  if (!supabase) return 0;

  // Define transitive pairs: if A→[type1]→B and B→[type2]→C, then A→[derived_type]→C
  const transitivePairs: { type1: string; type2: string; derived: string; minWeight: number }[] = [
    { type1: 'located_in', type2: 'regulated_by', derived: 'regulated_by', minWeight: 1.0 },
    { type1: 'targets_market', type2: 'competes_with', derived: 'competes_with', minWeight: 1.0 },
    { type1: 'depends_on', type2: 'blocks', derived: 'blocks', minWeight: 1.0 },
    { type1: 'requires', type2: 'costs', derived: 'costs', minWeight: 0.8 },
    { type1: 'targets_market', type2: 'regulated_by', derived: 'regulated_by', minWeight: 0.8 },
  ];

  let derived = 0;
  const now = new Date().toISOString();

  for (const pair of transitivePairs) {
    try {
      // Find A→[type1]→B edges
      const { data: firstHops } = await supabase
        .from('knowledge_relations')
        .select('source_entity_id, target_entity_id, weight')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('relation_type', pair.type1)
        .gte('weight', pair.minWeight);

      if (!firstHops || firstHops.length === 0) continue;

      for (const hop1 of firstHops) {
        // Find B→[type2]→C edges where B = hop1.target
        const { data: secondHops } = await supabase
          .from('knowledge_relations')
          .select('target_entity_id, weight')
          .eq('user_id', userId)
          .eq('is_active', true)
          .eq('relation_type', pair.type2)
          .eq('source_entity_id', hop1.target_entity_id)
          .gte('weight', pair.minWeight);

        if (!secondHops || secondHops.length === 0) continue;

        for (const hop2 of secondHops) {
          // Check if A→[derived]→C already exists
          const { data: exists } = await supabase
            .from('knowledge_relations')
            .select('id')
            .eq('user_id', userId)
            .eq('source_entity_id', hop1.source_entity_id)
            .eq('target_entity_id', hop2.target_entity_id)
            .eq('relation_type', pair.derived)
            .eq('is_active', true)
            .single();

          if (exists) continue; // already exists

          // Derive confidence from the two hops
          const derivedConfidence = Math.round(
            Math.min(hop1.weight || 1, hop2.weight || 1) * 0.6 * 100
          ) / 100;

          // Insert derived relation
          const { error } = await supabase
            .from('knowledge_relations')
            .insert({
              user_id: userId,
              source_entity_id: hop1.source_entity_id,
              target_entity_id: hop2.target_entity_id,
              relation_type: pair.derived,
              description: `Derived: via ${pair.type1} → ${pair.type2} transitive chain`,
              weight: 0.8,
              confidence: derivedConfidence,
              is_active: true,
              valid_from: now,
              created_at: now,
              updated_at: now,
            });

          if (!error) {
            derived++;
          }
        }
      }
    } catch (err) {
      console.error(`OPTIMIZE derive error (${pair.type1}→${pair.type2}):`, err);
    }
  }

  if (derived > 0) {
    console.log(`OPTIMIZE DERIVE: ${derived} new relations inferred from graph`);
  }

  return derived;
}

// ═══════════════════════════════════════════
// pruneStaleAgentLessons() — Clean up agent lessons
// ═══════════════════════════════════════════

async function pruneStaleAgentLessons(userId: string): Promise<number> {
  if (!supabase) return 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  try {
    const { data: staleLessons } = await supabase
      .from('agent_lessons')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('evidence_count', 1)
      .lt('created_at', thirtyDaysAgo);

    if (!staleLessons || staleLessons.length === 0) return 0;

    const ids = staleLessons.map(l => l.id);
    await supabase
      .from('agent_lessons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', ids);

    console.log(`OPTIMIZE PRUNE: ${ids.length} stale agent lessons deactivated`);
    return ids.length;
  } catch (err) {
    console.error('OPTIMIZE prune lessons error:', err);
    return 0;
  }
}
