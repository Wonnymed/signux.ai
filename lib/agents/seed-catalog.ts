/**
 * Upsert the canonical 60-agent catalog into public.agents (Supabase).
 * Source of truth remains lib/agents/catalog.ts — re-run POST /api/agents/seed after edits.
 */

import { getServiceSupabase } from '@/lib/user/service-client';
import { AGENT_CATALOG } from './catalog';

export async function seedAgentsCatalog(): Promise<{ seeded: number }> {
  const supabase = getServiceSupabase();

  const rows = AGENT_CATALOG.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    description: a.description,
    domain: a.domain,
    default_for: a.defaultFor,
  }));

  const { error } = await supabase.from('agents').upsert(rows, { onConflict: 'id' });

  if (error) throw new Error(error.message);

  return { seeded: rows.length };
}
