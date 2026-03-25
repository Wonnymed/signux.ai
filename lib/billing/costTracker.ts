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

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  operation: string;
}

// Cost per million tokens (Claude 2025 pricing)
const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-6-20250514': { input: 15.0, output: 75.0 },
};

export function calculateCost(usage: TokenUsage): number {
  const rates = COST_PER_MTOK[usage.model] || COST_PER_MTOK['claude-sonnet-4-6-20250514'];
  return (usage.inputTokens * rates.input + usage.outputTokens * rates.output) / 1_000_000;
}

export async function trackUsageCost(
  userId: string,
  conversationId: string,
  usage: TokenUsage,
): Promise<void> {
  const cost = calculateCost(usage);

  const { error } = await getSupabase().from('usage_costs').insert({
    user_id: userId,
    conversation_id: conversationId,
    model: usage.model,
    operation: usage.operation,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: cost,
  });
  if (error) console.error('Cost tracking failed:', error);
}

export async function getMonthlyUserCost(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await getSupabase()
    .from('usage_costs')
    .select('cost_usd')
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  return data?.reduce((sum, row) => sum + (row.cost_usd || 0), 0) || 0;
}
