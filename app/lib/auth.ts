"use client";
import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowser } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  initials: string;
  raw: User;
}

function formatUser(u: User): AuthUser {
  const meta = u.user_metadata || {};
  const name = meta.full_name || meta.name || u.email?.split("@")[0] || "User";
  const avatar = meta.avatar_url || meta.picture || "";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  return { id: u.id, email: u.email || "", name, avatar, initials, raw: u };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(formatUser(session.user));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(formatUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/chat";
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback" },
    });
    return { error };
  }, []);

  return { user, loading, signOut, signInWithGoogle, signInWithEmail };
}
