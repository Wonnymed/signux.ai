"use client";
import { useState } from "react";
import { SignuxIcon } from "../components/SignuxIcon";
import { createSupabaseBrowser } from "../lib/supabase-browser";

export default function LoginPage() {
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
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0E0D",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      {/* Subtle radial glow behind the card */}
      <div style={{
        position: "fixed",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: 400,
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 40,
        }}>
          <SignuxIcon size={48} />
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginTop: 12,
          }}>
            <span style={{
              fontFamily: "var(--font-brand)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 6,
              color: "#F3F0EC",
            }}>SIGNUX</span>
            <span style={{
              fontFamily: "var(--font-brand)",
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: 6,
              color: "rgba(243,240,236,0.25)",
            }}>AI</span>
          </div>
        </div>

        {sent ? (
          /* SUCCESS STATE */
          <div style={{
            textAlign: "center",
            padding: "32px 24px",
            borderRadius: 16,
            background: "rgba(212,175,55,0.04)",
            border: "1px solid rgba(212,175,55,0.12)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 22,
            }}>
              <span role="img" aria-label="email">&#9993;</span>
            </div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: "#F3F0EC",
              marginBottom: 8,
            }}>Check your email</h2>
            <p style={{
              fontSize: 14, color: "rgba(243,240,236,0.5)",
              lineHeight: 1.6,
            }}>
              We sent a sign-in link to <strong style={{ color: "#D4AF37" }}>{email}</strong>
            </p>
            <p style={{
              fontSize: 12, color: "rgba(243,240,236,0.3)",
              marginTop: 16,
            }}>
              Didn&apos;t receive it?{" "}
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#D4AF37", fontSize: 12, textDecoration: "underline",
                }}
              >Try again</button>
            </p>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "#F3F0EC",
                marginBottom: 6,
              }}>Welcome back</h1>
              <p style={{
                fontSize: 14, color: "rgba(243,240,236,0.4)",
              }}>Sign in to continue where you left off.</p>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                background: "#1A1918",
                border: "1px solid rgba(243,240,236,0.08)",
                color: "#F3F0EC",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 200ms ease",
                marginBottom: 24,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(243,240,236,0.15)";
                e.currentTarget.style.background = "#222120";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(243,240,236,0.08)";
                e.currentTarget.style.background = "#1A1918";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(243,240,236,0.06)" }} />
              <span style={{ fontSize: 12, color: "rgba(243,240,236,0.25)", fontFamily: "var(--font-mono)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(243,240,236,0.06)" }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 12,
                  background: "#1A1918",
                  border: "1px solid rgba(243,240,236,0.08)",
                  color: "#F3F0EC",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  transition: "border-color 200ms ease, box-shadow 200ms ease",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.06)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(243,240,236,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              {error && (
                <p style={{
                  fontSize: 12, color: "#EF4444",
                  marginBottom: 12, padding: "0 4px",
                }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px 0",
                  borderRadius: 12,
                  background: loading ? "rgba(212,175,55,0.3)" : "#D4AF37",
                  border: "none",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 200ms ease",
                  letterSpacing: 0.3,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.boxShadow = "0 0 20px rgba(212,175,55,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {loading ? "Sending..." : "Continue with email"}
              </button>
            </form>

            {/* Footer links */}
            <div style={{
              textAlign: "center",
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <p style={{ fontSize: 13, color: "rgba(243,240,236,0.35)" }}>
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  style={{
                    color: "#D4AF37",
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "opacity 200ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >Sign up free</a>
              </p>
            </div>

            {/* Terms */}
            <p style={{
              textAlign: "center",
              fontSize: 11,
              color: "rgba(243,240,236,0.15)",
              marginTop: 32,
              lineHeight: 1.6,
            }}>
              By continuing, you agree to our{" "}
              <a href="/terms" style={{ color: "rgba(243,240,236,0.25)", textDecoration: "underline" }}>Terms</a>{" "}
              and{" "}
              <a href="/terms" style={{ color: "rgba(243,240,236,0.25)", textDecoration: "underline" }}>Privacy Policy</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
