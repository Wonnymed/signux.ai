import { NextRequest, NextResponse } from 'next/server';
import { getKrakenBalance, grantKraken } from '@/lib/chat/kraken';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

export async function GET(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const balance = await getKrakenBalance(userId);
  return NextResponse.json({ balance });
}

// Grant tokens (called by billing webhook or admin)
export async function POST(req: NextRequest) {
  const { userId: reqUserId } = await getUserIdFromRequest(req);
  if (!reqUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, reason, userId: targetUserId } = await req.json();

  const userId = targetUserId || reqUserId;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  await grantKraken(userId, amount, reason || 'manual_grant');
  const balance = await getKrakenBalance(userId);
  return NextResponse.json({ balance });
}
