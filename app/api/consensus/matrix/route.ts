import { NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** GET /api/consensus/matrix — N×N agreement matrix between nodes */
export async function GET() {
  const tracker = getTracker();
  const matrix = tracker.getAgreementMatrix();
  return NextResponse.json(matrix);
}
