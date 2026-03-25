import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** GET /api/consensus/nodes/:id — Node detail */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tracker = getTracker();
  const nodes = tracker.getAllNodes();
  const node = nodes.find(n => n.id === id);

  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: node.id,
    name: node.name,
    status: node.status,
    latencyMs: node.latencyMs,
    lastSeen: node.lastSeen.toISOString(),
  });
}
