import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAuthServerClient } from '@/lib/auth/supabase-server';
import { getTokenBalance } from '@/lib/billing/usage';
import { TIERS } from '@/lib/billing/tiers';
import { generateShareId } from '@/lib/share/generate-share-id';
import { getPublicAppUrl } from '@/lib/share/app-url';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Create or return a public share link for a simulation (Pro/Max — same gate as PDF export).
 */
export async function POST(req: NextRequest) {
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

    const { data: row, error: fetchErr } = await sb
      .from('simulations')
      .select('id, user_id, share_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    if (row.user_id && row.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base = getPublicAppUrl();

    if (row.share_id) {
      return NextResponse.json({
        shareId: row.share_id,
        url: `${base}/s/${row.share_id}`,
      });
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      const shareId = generateShareId(10);
      const { data: updated, error: upErr } = await sb
        .from('simulations')
        .update({ share_id: shareId })
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .select('share_id')
        .maybeSingle();

      if (!upErr && updated?.share_id === shareId) {
        return NextResponse.json({
          shareId,
          url: `${base}/s/${shareId}`,
        });
      }

      if (!upErr && !updated) {
        return NextResponse.json({ error: 'Could not update simulation' }, { status: 403 });
      }

      const msg = upErr?.message || '';
      if (!msg.includes('duplicate') && !msg.includes('unique') && upErr?.code !== '23505') {
        console.error('[share] update failed:', upErr);
        return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Could not allocate share id' }, { status: 500 });
  } catch (e) {
    console.error('[share]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
