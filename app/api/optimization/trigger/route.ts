import { NextRequest, NextResponse } from 'next/server';
import { optimizeAllAgents } from '@/lib/memory/multi-optimizer';
import { getUserIdFromRequest } from '@/lib/auth/supabase-client';

export async function POST(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);

  try {
    const results = await optimizeAllAgents(userId, true);
    return NextResponse.json({
      promoted: results.filter(r => r.action === 'promoted').map(r => r.agentId),
      skipped: results.filter(r => r.action === 'skipped').map(r => r.agentId),
      failed: results.filter(r => r.action === 'failed').map(r => r.agentId),
      results,
    });
  } catch (err) {
    console.error('Manual optimization error:', err);
    return NextResponse.json({ error: 'Failed to run optimization' }, { status: 500 });
  }
}
