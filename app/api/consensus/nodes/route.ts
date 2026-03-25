import { NextRequest, NextResponse } from 'next/server';
import { getTracker } from '@/lib/consensus/instance';

/** GET /api/consensus/nodes — List all nodes with status */
export async function GET() {
  const tracker = getTracker();
  const nodes = tracker.getAllNodes();

  return NextResponse.json(nodes.map(n => ({
    id: n.id,
    name: n.name,
    status: n.status,
    latencyMs: n.latencyMs,
    lastSeen: n.lastSeen.toISOString(),
  })));
}

/** POST /api/consensus/nodes — Register a new node */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const tracker = getTracker();

  try {
    tracker.registerNode({
      id: body.id,
      name: body.name || body.id,
      status: 'sync',
      latencyMs: 0,
      lastSeen: new Date(),
      publicKey: body.publicKey || '',
    });
    return NextResponse.json({ ok: true, nodeId: body.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
