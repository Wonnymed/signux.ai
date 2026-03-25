import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/auth/supabase-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }

  return NextResponse.redirect(new URL('/?auth_error=true', req.url));
}
