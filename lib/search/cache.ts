import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

export async function getCachedSearch(query: string): Promise<string | null> {
  const cacheKey = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const { data } = await getSupabase()
    .from('search_cache')
    .select('result')
    .eq('query_hash', hashQuery(cacheKey))
    .gte('expires_at', new Date().toISOString())
    .single();
  return data?.result || null;
}

export async function setCachedSearch(query: string, result: string): Promise<void> {
  const cacheKey = query.toLowerCase().trim().replace(/\s+/g, ' ');
  await getSupabase().from('search_cache').upsert({
    query_hash: hashQuery(cacheKey),
    query: cacheKey.substring(0, 200),
    result,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

function hashQuery(q: string): string {
  let hash = 0;
  for (let i = 0; i < q.length; i++) {
    const char = q.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sh_${Math.abs(hash).toString(36)}`;
}

/** Web search limits by tier */
export const WEB_SEARCH_LIMITS: Record<string, number> = {
  free: 0,
  pro: 5,
  max: 10,
  octopus: 10,
};

export function canAgentSearch(agentIndex: number, userTier: string): boolean {
  const limit = WEB_SEARCH_LIMITS[userTier] || 0;
  return agentIndex < limit;
}
