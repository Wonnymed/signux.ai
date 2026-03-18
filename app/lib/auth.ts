import { createBrowserClient } from "./supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/** Get the currently authenticated user (browser-side) */
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  const supabase = createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Sign out and redirect to /chat */
export async function signOut() {
  const supabase = createBrowserClient();
  await supabase.auth.signOut();
  window.location.href = "/chat";
}

/** Listen for auth state changes */
export function onAuthStateChange(callback: (user: SupabaseUser | null) => void) {
  const supabase = createBrowserClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return subscription;
}
