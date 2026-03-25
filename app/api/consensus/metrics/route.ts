import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';
import { exportPrometheusMetrics, exportMetricsJSON } from '@/lib/consensus/metrics';

/** GET /api/consensus/metrics — Prometheus or JSON metrics */
export async function GET(req: NextRequest) {
  const tracker = getTracker();
  const accept = req.headers.get('accept') || '';

  // Return Prometheus text format if requested
  if (accept.includes('text/plain') || accept.includes('text/openmetrics')) {
    return new NextResponse(exportPrometheusMetrics(tracker), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Default: JSON
  return NextResponse.json(exportMetricsJSON(tracker));
}
