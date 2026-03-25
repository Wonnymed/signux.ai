/**
 * Autonomous Cron Jobs — OpenClaw pattern for Octux.
 *
 * Background maintenance that runs INDEPENDENTLY of user activity:
 *   - Prune stale facts (>60 days, low confidence, low evidence)
 *   - Decay old graph edges (>90 days, low weight)
 *   - Clean expired working buffers (orphaned from crashed sims)
 *   - Deactivate stale agent lessons (evidence=1, >45 days)
 *   - Prune very weak opinions (confidence < 0.1)
 *
 * Triggered by Vercel Cron (daily) or manually via API.
 *
 * Ref: OpenClaw (#26 — autonomous crons, background optimization)
 */

import { supabase } from './supabase';

export type CronResult = {
  factsPruned: number;
  edgesDecayed: number;
  buffersCleared: number;
  lessonsPruned: number;
  weakOpinionsPruned: number;
  durationMs: number;
};

/**
 * Run all scheduled maintenance tasks.
 * Designed to complete within Vercel's 60s function timeout.
 * Each operation is independent — failures don't cascade.
 */
export async function runScheduledMaintenance(): Promise<CronResult> {
  if (!supabase) {
    return { factsPruned: 0, edgesDecayed: 0, buffersCleared: 0, lessonsPruned: 0, weakOpinionsPruned: 0, durationMs: 0 };
  }

  const start = Date.now();
  const now = new Date().toISOString();
  let factsPruned = 0, edgesDecayed = 0, buffersCleared = 0, lessonsPruned = 0, weakOpinionsPruned = 0;

  // 1. Prune stale facts (>60 days, confidence < 0.3, evidence <= 1)
  try {
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
    const { data: stale } = await supabase
      .from('user_facts')
      .select('id')
      .eq('is_current', true)
      .lt('confidence', 0.3)
      .lte('evidence_count', 1)
      .lt('learned_at', cutoff)
      .limit(100);

    if (stale && stale.length > 0) {
      await supabase.from('user_facts').update({
        is_current: false, expired_at: now, valid_until: now, updated_at: now,
        metadata: { invalidation_reason: 'cron_prune_stale', invalidated_at: now },
      }).in('id', stale.map(f => f.id));
      factsPruned = stale.length;
    }
  } catch (err) { console.error('CRON: fact prune failed:', err); }

  // 2. Decay old graph edges (>90 days, weight < 0.8 → weight -= 0.15)
  try {
    const edgeCutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: oldEdges } = await supabase
      .from('knowledge_relations')
      .select('id, weight')
      .eq('is_active', true)
      .lt('weight', 0.8)
      .lt('created_at', edgeCutoff)
      .limit(200);

    if (oldEdges) {
      for (const edge of oldEdges) {
        const newWeight = Math.max(0.1, (edge.weight || 1.0) - 0.15);
        if (newWeight <= 0.15) {
          await supabase.from('knowledge_relations').update({ is_active: false, updated_at: now }).eq('id', edge.id);
        } else {
          await supabase.from('knowledge_relations').update({ weight: newWeight, updated_at: now }).eq('id', edge.id);
        }
        edgesDecayed++;
      }
    }
  } catch (err) { console.error('CRON: edge decay failed:', err); }

  // 3. Clean orphaned working buffers (>24 hours old)
  try {
    const bufferCutoff = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: orphaned } = await supabase
      .from('working_buffer')
      .select('simulation_id')
      .lt('created_at', bufferCutoff)
      .limit(100);

    if (orphaned && orphaned.length > 0) {
      const simIds = [...new Set(orphaned.map(b => b.simulation_id))];
      await supabase.from('working_buffer').delete().in('simulation_id', simIds);
      buffersCleared = simIds.length;
    }
  } catch (err) { console.error('CRON: buffer cleanup failed:', err); }

  // 4. Deactivate stale agent lessons (evidence=1, >45 days)
  try {
    const lessonCutoff = new Date(Date.now() - 45 * 86400000).toISOString();
    const { data: stale } = await supabase
      .from('agent_lessons')
      .select('id')
      .eq('is_active', true)
      .lte('evidence_count', 1)
      .lt('created_at', lessonCutoff)
      .limit(100);

    if (stale && stale.length > 0) {
      await supabase.from('agent_lessons').update({ is_active: false, updated_at: now }).in('id', stale.map(l => l.id));
      lessonsPruned = stale.length;
    }
  } catch (err) { console.error('CRON: lesson prune failed:', err); }

  // 5. Prune very weak opinions (confidence < 0.1)
  try {
    const { data: weak } = await supabase
      .from('decision_opinions')
      .select('id')
      .eq('status', 'active')
      .lt('confidence', 0.1)
      .limit(50);

    if (weak && weak.length > 0) {
      await supabase.from('decision_opinions').update({
        status: 'invalidated', valid_until: now, updated_at: now,
      }).in('id', weak.map(o => o.id));
      weakOpinionsPruned = weak.length;
    }
  } catch (err) { console.error('CRON: opinion prune failed:', err); }

  const durationMs = Date.now() - start;
  console.log(`CRON COMPLETE (${durationMs}ms): facts=${factsPruned}, edges=${edgesDecayed}, buffers=${buffersCleared}, lessons=${lessonsPruned}, opinions=${weakOpinionsPruned}`);

  return { factsPruned, edgesDecayed, buffersCleared, lessonsPruned, weakOpinionsPruned, durationMs };
}
