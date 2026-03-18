import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "../../lib/supabase";
import { getUser, createUser } from "../../lib/database";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Ensure user exists in public.users table
  const authId = data.user.id;
  const email = data.user.email || "";
  let dbUser = await getUser(authId);

  if (!dbUser) {
    const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || null;
    await createUser({
      auth_id: authId,
      email,
      ...(name ? { name } : {}),
    });
  }

  return NextResponse.redirect(`${origin}/chat`);
}
