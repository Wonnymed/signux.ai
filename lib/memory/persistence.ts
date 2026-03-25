// ── Phase 2B: Memory System — Simulation Persistence ────────
// Saves completed simulations to Supabase for history & memory

import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────

export type SaveSimulationInput = {
  simulationId: string;
  userId?: string;
  engine: string;
  question: string;
  plan: unknown;
  debate: unknown;
  verdict: unknown;
  evaluation: unknown;
  citations: unknown;
  followUps: string[];
  counterFactual: unknown;
  blindSpots: unknown;
  audit: unknown;
  totalTokens: number;
  totalCostUsd: number;
  durationMs: number;
  domain?: string;
  shareDigest?: string | null;
  disclaimer?: string | null;
  isPublic?: boolean;
};

// ── Save ───────────────────────────────────────────────────

export async function saveSimulation(input: SaveSimulationInput): Promise<string | null> {
  if (!supabase) {
    console.warn('[persistence] Supabase not configured — skipping save');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('simulations')
      .insert({
        id: input.simulationId,
        user_id: input.userId || null,
        engine: input.engine,
        question: input.question,
        plan: input.plan,
        debate: input.debate,
        verdict: input.verdict,
        evaluation: input.evaluation,
        citations: input.citations,
        follow_ups: input.followUps,
        counter_factual: input.counterFactual,
        blind_spots: input.blindSpots,
        audit: input.audit,
        status: 'complete',
        total_tokens: input.totalTokens,
        total_cost_usd: input.totalCostUsd,
        duration_ms: input.durationMs,
        domain: input.domain || 'business',
        share_digest: input.shareDigest || null,
        disclaimer: input.disclaimer || null,
        is_public: input.isPublic ?? true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[persistence] Failed to save simulation:', error);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error('[persistence] Simulation save error:', err);
    return null;
  }
}

// ── Read ───────────────────────────────────────────────────

export async function getSimulation(simulationId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserSimulations(userId: string, limit = 10) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('simulations')
    .select('id, question, engine, verdict, evaluation, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}
