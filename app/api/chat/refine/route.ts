import { NextRequest, NextResponse } from 'next/server';
import { refineSimulation } from '@/lib/chat/refine';
import { getDefaultTier, type UserPlan, type ModelTier } from '@/lib/chat/tiers';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

export async function POST(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { simulationId, modification, tier: requestedTier } = await req.json();

  if (!simulationId || !modification) {
    return NextResponse.json({ error: 'simulationId and modification required' }, { status: 400 });
  }

  const plan: UserPlan = 'pro'; // TODO: real plan lookup
  const tier: ModelTier = requestedTier || getDefaultTier(plan);

  const result = await refineSimulation({ simulationId, modification, userId, tier });

  if (!result) {
    return NextResponse.json({ error: 'Simulation not found or refinement failed' }, { status: 404 });
  }

  return NextResponse.json(result);
}
