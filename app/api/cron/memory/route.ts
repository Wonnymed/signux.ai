import { NextRequest, NextResponse } from 'next/server';
import { runScheduledMaintenance } from '@/lib/memory/cron';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not set — refusing memory cron');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScheduledMaintenance();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('CRON API error:', err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
