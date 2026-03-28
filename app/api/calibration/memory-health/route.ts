import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { supabase } from '@/lib/memory/supabase';

const MEMORY_TABLES = [
  'user_facts',
  'decision_experiences',
  'decision_opinions',
  'decision_observations',
  'knowledge_entities',
  'knowledge_relations',
  'knowledge_triplets',
  'session_threads',
  'session_summaries',
  'working_buffer',
  'agent_lessons',
  'agent_prompt_versions',
  'optimization_cycles',
  'procedural_rules',
  'team_insights',
  'behavioral_profiles',
  'calibration_scores',
] as const;

/**
 * Diagnostic counts per user across memory tables (service role + authenticated user id).
 */
export async function GET() {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json(
      {
        error: 'Server misconfigured',
        user_id: user.id,
        counts: {},
        total_records: 0,
        has_memory: false,
        tables_with_errors: [...MEMORY_TABLES],
        tables_with_data: [],
        tables_empty: [],
      },
      { status: 503 },
    );
  }

  const counts: Record<string, number> = {};

  for (const table of MEMORY_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      counts[table] = error ? -1 : count ?? 0;
    } catch {
      counts[table] = -1;
    }
  }

  const total = Object.values(counts)
    .filter((c) => c > 0)
    .reduce((a, b) => a + b, 0);
  const errors = Object.entries(counts)
    .filter(([, c]) => c === -1)
    .map(([t]) => t);

  return NextResponse.json({
    user_id: user.id,
    counts,
    total_records: total,
    has_memory: total > 0,
    tables_with_errors: errors,
    tables_with_data: Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([t]) => t),
    tables_empty: Object.entries(counts)
      .filter(([, c]) => c === 0)
      .map(([t]) => t),
  });
}
