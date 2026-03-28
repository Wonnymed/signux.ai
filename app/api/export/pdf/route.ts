import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { getTokenBalance } from '@/lib/billing/usage';
import { TIERS } from '@/lib/billing/tiers';
import { buildPdfInputFromSimulationRow, generateSimulationPdf } from '@/lib/export/pdf-generator';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getTokenBalance(user.id);
    if (!TIERS[balance.tier].limits.pdf_export) {
      return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { conversationId?: string };
    const conversationId = body.conversationId?.trim();
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const sb = admin();
    if (!sb) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { data: row, error } = await sb
      .from('simulations')
      .select('id, user_id, question, verdict, debate, audit, created_at')
      .eq('id', conversationId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    if (row.user_id && row.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const input = buildPdfInputFromSimulationRow(row);
    const pdf = generateSimulationPdf(input);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="octux-report-${conversationId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[export/pdf]', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
