import { NextRequest, NextResponse } from 'next/server';
import { getOptimizationReport } from '@/lib/memory/multi-optimizer';
import { getUserIdFromRequest } from '@/lib/auth/supabase-client';

export async function GET(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);

  try {
    const report = await getOptimizationReport(userId);
    return NextResponse.json(report);
  } catch (err) {
    console.error('Optimization report error:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
