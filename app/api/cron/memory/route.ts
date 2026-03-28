import { NextRequest, NextResponse } from 'next/server';
import { runScheduledMaintenance } from '@/lib/memory/cron';

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
