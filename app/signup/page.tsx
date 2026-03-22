"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import { AuthShell } from "../components/AuthShell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (err) throw err;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      mode="signup"
      email={email}
      setEmail={setEmail}
      error={error}
      loading={loading}
      sent={sent}
      onGoogleAuth={handleGoogle}
      onMagicLink={handleMagicLink}
      onResetSent={() => { setSent(false); setEmail(""); }}
    />
  );
}
