import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TIERS, TOKEN_COSTS, type TierType } from './tiers';

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  tokensUsed?: number;
  tokensTotal?: number;
  upgradeRequired?: TierType;
}

export async function checkSimulationUsage(
  userId: string,
  simType: 'deep' | 'kraken',
): Promise<UsageCheckResult> {
  const { data: sub } = await getSupabase()
    .from('user_subscriptions')
    .select('tier, tokens_used, tokens_total')
    .eq('user_id', userId)
    .single();

  if (!sub) {
    return { allowed: false, reason: 'No subscription found', upgradeRequired: 'pro' };
  }

  const tier = (sub.tier as TierType) || 'free';
  const tokensUsed = sub.tokens_used || 0;
  const tokensTotal = sub.tokens_total || TIERS[tier].limits.tokensPerMonth;
  const cost = TOKEN_COSTS[simType];
  const remaining = tokensTotal - tokensUsed;

  if (remaining < cost) {
    const nextTier = tier === 'free' ? 'pro' : tier === 'pro' ? 'max' : 'octopus';
    return {
      allowed: false,
      reason: `Not enough tokens (${remaining} remaining, ${cost} needed)`,
      tokensUsed,
      tokensTotal,
      upgradeRequired: nextTier as TierType,
    };
  }

  return { allowed: true, tokensUsed, tokensTotal };
}

export async function consumeTokens(
  userId: string,
  simType: 'deep' | 'kraken',
): Promise<void> {
  const cost = TOKEN_COSTS[simType];
  const { data: sub } = await getSupabase()
    .from('user_subscriptions')
    .select('tokens_used')
    .eq('user_id', userId)
    .single();

  if (!sub) return;

  const { error } = await getSupabase()
    .from('user_subscriptions')
    .update({ tokens_used: (sub.tokens_used || 0) + cost })
    .eq('user_id', userId);

  if (error) console.error('Token consumption failed:', error);
}

export async function getTokenBalance(userId: string): Promise<{
  tokensUsed: number;
  tokensTotal: number;
  tokensRemaining: number;
  tier: TierType;
}> {
  const { data: sub } = await getSupabase()
    .from('user_subscriptions')
    .select('tier, tokens_used, tokens_total')
    .eq('user_id', userId)
    .single();

  if (!sub) {
    return { tokensUsed: 0, tokensTotal: 1, tokensRemaining: 1, tier: 'free' };
  }

  const tier = (sub.tier as TierType) || 'free';
  const tokensUsed = sub.tokens_used || 0;
  const tokensTotal = sub.tokens_total || TIERS[tier].limits.tokensPerMonth;

  return {
    tokensUsed,
    tokensTotal,
    tokensRemaining: Math.max(0, tokensTotal - tokensUsed),
    tier,
  };
}

export async function resetMonthlyTokens(userId: string, tier: TierType): Promise<void> {
  const config = TIERS[tier] || TIERS.free;
  const { error } = await getSupabase()
    .from('user_subscriptions')
    .update({
      tokens_used: 0,
      tokens_total: config.limits.tokensPerMonth,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', userId);

  if (error) console.error('Token reset failed:', error);
}

export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof TIERS.free.limits,
): Promise<UsageCheckResult> {
  const { data: sub } = await getSupabase()
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  const tier = (sub?.tier as TierType) || 'free';
  const config = TIERS[tier];
  const value = config.limits[feature];

  if (typeof value === 'boolean' && !value) {
    const nextTier = tier === 'free' ? 'pro' : tier === 'pro' ? 'max' : 'octopus';
    return {
      allowed: false,
      reason: `${feature} requires ${nextTier} or higher`,
      upgradeRequired: nextTier as TierType,
    };
  }

  return { allowed: true };
}

export async function getSubscription(userId: string) {
  const { data } = await getSupabase()
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}
