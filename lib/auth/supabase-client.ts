import { createBrowserClient as createBrowser } from '@supabase/ssr';
import { createServerClient as createServer } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createBrowserClient() {
  return createBrowser(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function createAuthServerClient() {
  const cookieStore = await cookies();
  return createServer(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); }); }
          catch { /* server component */ }
        },
      },
    }
  );
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch { return null; }
}

/**
 * Get userId for API routes — real user OR anonymous fingerprint fallback.
 * Drop-in replacement for the fingerprint hash block in every API route.
 */
export async function getUserIdFromRequest(req: Request): Promise<{
  userId: string;
  isAuthenticated: boolean;
}> {
  try {
    const supabase = await createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return { userId: user.id, isAuthenticated: true };
  } catch {}

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'anonymous';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const fingerprint = `${ip}-${userAgent}`.substring(0, 100);
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const anonId = 'anon_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 31);

  return { userId: anonId, isAuthenticated: false };
}
