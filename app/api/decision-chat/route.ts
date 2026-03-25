import { NextRequest, NextResponse } from 'next/server';
import { chatWithMemory } from '@/lib/chat/chat';
import { canUseTier, getDefaultTier, type ModelTier, type UserPlan } from '@/lib/chat/tiers';
import { getKrakenBalance, spendKrakenChatMessage } from '@/lib/chat/kraken';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

export async function POST(req: NextRequest) {
  const { userId, isAuthenticated } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { message, history = [], tier: requestedTier } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const plan: UserPlan = isAuthenticated ? 'pro' : 'free';
  let tier: ModelTier = requestedTier || getDefaultTier(plan);

  const krakenBalance = await getKrakenBalance(userId);
  const access = canUseTier(plan, tier, krakenBalance);

  if (!access.allowed) {
    tier = getDefaultTier(plan);
  }

  if (tier === 'kraken') {
    const canSpend = await spendKrakenChatMessage(userId);
    if (!canSpend) {
      tier = 'deep';
    }
  }

  try {
    const result = await chatWithMemory(userId, message, history, tier);
    return NextResponse.json(result);
  } catch (err) {
    console.error('DECISION-CHAT API error:', err);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
