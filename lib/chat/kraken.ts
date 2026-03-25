/**
 * Kraken Token System — Premium currency for Opus access.
 *
 * Earning:
 *   Pro plan:  1 Kraken/month
 *   Max plan:  3 Kraken/month
 *   Purchase:  $5 per token
 *
 * Spending:
 *   1 token = 1 Kraken simulation (10 agents on Opus)
 *   1 token = 10 Kraken chat messages
 */

import { supabase } from '../memory/supabase';

export async function getKrakenBalance(userId: string): Promise<number> {
  if (!supabase) return 0;

  const { data } = await supabase
    .from('kraken_tokens')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (!data) {
    await supabase.from('kraken_tokens').insert({
      user_id: userId, balance: 0, lifetime_earned: 0, lifetime_spent: 0,
    });
    return 0;
  }

  return data.balance;
}

export async function spendKraken(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<boolean> {
  if (!supabase) return false;

  const balance = await getKrakenBalance(userId);
  if (balance < amount) return false;

  const now = new Date().toISOString();

  await supabase.from('kraken_tokens').update({
    balance: balance - amount,
    lifetime_spent: (balance - amount >= 0 ? amount : 0),
    updated_at: now,
  }).eq('user_id', userId);

  await supabase.from('kraken_transactions').insert({
    user_id: userId,
    amount: -amount,
    reason,
    reference_id: referenceId || null,
  });

  return true;
}

export async function grantKraken(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (!supabase) return;

  const balance = await getKrakenBalance(userId);
  const now = new Date().toISOString();

  await supabase.from('kraken_tokens').upsert({
    user_id: userId,
    balance: balance + amount,
    lifetime_earned: balance + amount,
    updated_at: now,
  }, { onConflict: 'user_id' });

  await supabase.from('kraken_transactions').insert({
    user_id: userId, amount, reason,
  });
}

export async function spendKrakenChatMessage(userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('model_tier', 'kraken')
    .eq('role', 'user');

  const totalKrakenMessages = count || 0;

  // Every 10th message, deduct 1 token
  if (totalKrakenMessages > 0 && totalKrakenMessages % 10 === 0) {
    return await spendKraken(userId, 1, 'kraken_chat_10_messages');
  }

  // If this is the start of a new batch, verify they have a token
  const messagesUntilNextDeduction = 10 - (totalKrakenMessages % 10);
  if (messagesUntilNextDeduction === 10) {
    const balance = await getKrakenBalance(userId);
    if (balance <= 0) return false;
  }

  return true;
}
