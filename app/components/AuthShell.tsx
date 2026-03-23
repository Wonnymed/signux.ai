"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import { useIsMobile } from "../lib/useIsMobile";

/* ═══ Zinc palette ═══ */
const Z950 = "#09090B";
const Z800 = "#27272A";
const Z700 = "#3F3F46";
const Z600 = "#52525B";
const Z500 = "#71717A";
const Z400 = "#A1A1AA";
const Z300 = "#D4D4D8";
const Z200 = "#E4E4E7";

/* ═══ Google SVG ═══ */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* ═══ Shared Auth Shell ═══ */

export type AuthMode = "login" | "signup";

export function AuthShell({
  mode,
  email,
  setEmail,
  error,
  loading,
  sent,
  onGoogleAuth,
  onMagicLink,
  onResetSent,
}: {
  mode: AuthMode;
  email: string;
  setEmail: (v: string) => void;
  error: string;
  loading: boolean;
  sent: boolean;
  onGoogleAuth: () => void;
  onMagicLink: (e: React.FormEvent) => void;
  onResetSent: () => void;
}) {
  const isMobile = useIsMobile();

  const isLogin = mode === "login";
  const title = isLogin ? "Sign in" : "Create your account";
  const subtitle = isLogin ? "Continue to Signux." : "Start with Signux.";
  const switchText = isLogin ? "Don\u2019t have an account?" : "Already have an account?";
  const switchLabel = isLogin ? "Create account" : "Sign in";
  const switchHref = isLogin ? "/signup" : "/login";

  return (
    <div style={{
      minHeight: "100vh",
      background: Z950,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "24px 20px" : 24,
    }}>
      {/* Auth card */}
      <div style={{
        width: "100%",
        maxWidth: 380,
      }}>
        {/* Brand mark */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 40,
        }}>
          <SignuxIcon size={22} variant="gold" />
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 4,
            color: Z200,
          }}>SIGNUX</span>
        </div>

        {/* Card surface */}
        <div style={{
          padding: isMobile ? "32px 24px" : "36px 32px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${Z800}`,
        }}>
          {sent ? (
            /* ═══ Magic link sent state ═══ */
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${Z800}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Mail size={20} strokeWidth={1.5} style={{ color: Z400 }} />
              </div>
              <h2 style={{
                fontSize: 17, fontWeight: 500, color: Z200,
                marginBottom: 8, marginTop: 0,
              }}>
                Check your email
              </h2>
              <p style={{
                fontSize: 13, color: Z500,
                lineHeight: 1.6, margin: "0 0 4px",
              }}>
                We sent a sign-in link to
              </p>
              <p style={{
                fontSize: 13, color: Z200, fontWeight: 500,
                margin: "0 0 20px",
                fontFamily: "var(--font-mono)",
                wordBreak: "break-all",
              }}>
                {email}
              </p>
              <button
                onClick={onResetSent}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: Z500, fontSize: 12,
                  transition: "color 180ms ease-out",
                  padding: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = Z300}
                onMouseLeave={e => e.currentTarget.style.color = Z500}
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{
                  fontSize: 18, fontWeight: 500, color: Z200,
                  margin: "0 0 5px", letterSpacing: 0.1,
                }}>
                  {title}
                </h1>
                <p style={{
                  fontSize: 13, color: Z600, margin: 0, lineHeight: 1.5,
                }}>
                  {subtitle}
                </p>
              </div>

              {/* Google button */}
              <button
                onClick={onGoogleAuth}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 9,
                  background: "transparent",
                  border: `1px solid ${Z800}`,
                  color: Z200,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 180ms ease-out",
                  marginBottom: 20,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = Z700;
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = Z800;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: 20,
              }}>
                <div style={{ flex: 1, height: 1, background: Z800 }} />
                <span style={{
                  fontSize: 10, color: Z600,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}>
                  or
                </span>
                <div style={{ flex: 1, height: 1, background: Z800 }} />
              </div>

              {/* Email form */}
              <form onSubmit={onMagicLink}>
                <label style={{
                  display: "block", fontSize: 11, color: Z500,
                  marginBottom: 6, fontWeight: 500,
                }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${Z800}`,
                    color: Z200,
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 180ms ease-out",
                    marginBottom: error ? 0 : 14,
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = Z600}
                  onBlur={e => e.currentTarget.style.borderColor = Z800}
                />

                {error && (
                  <div style={{
                    fontSize: 12, color: "#ef4444",
                    padding: "8px 12px", marginTop: 8, marginBottom: 14,
                    borderRadius: 7,
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.08)",
                    lineHeight: 1.4,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    borderRadius: 9,
                    background: loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${loading ? Z800 : Z700}`,
                    color: loading ? Z600 : Z200,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: loading ? "wait" : "pointer",
                    transition: "all 180ms ease-out",
                  }}
                  onMouseEnter={e => {
                    if (loading) return;
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.borderColor = Z600;
                  }}
                  onMouseLeave={e => {
                    if (loading) return;
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = Z700;
                  }}
                >
                  {loading ? "Sending link..." : "Continue with email"}
                </button>
              </form>

              {/* Switch link */}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <span style={{ fontSize: 12.5, color: Z600 }}>
                  {switchText}{" "}
                  <a href={switchHref} style={{
                    color: Z400, textDecoration: "none", fontWeight: 500,
                    transition: "color 180ms ease-out",
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = Z200}
                    onMouseLeave={e => e.currentTarget.style.color = Z400}
                  >
                    {switchLabel}
                  </a>
                </span>
              </div>

              {!isLogin && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <a
                    href="/chat"
                    style={{
                      fontSize: 11.5, color: Z600, textDecoration: "none",
                      transition: "color 180ms ease-out",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = Z400}
                    onMouseLeave={e => e.currentTarget.style.color = Z600}
                  >
                    Continue without account
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Terms footer */}
        <p style={{
          textAlign: "center",
          fontSize: 10,
          color: Z700,
          marginTop: 20,
          lineHeight: 1.7,
        }}>
          By continuing, you agree to our{" "}
          <a href="/terms" style={{ color: Z600, textDecoration: "none" }}
            onMouseEnter={e => e.currentTarget.style.color = Z400}
            onMouseLeave={e => e.currentTarget.style.color = Z600}
          >Terms</a>
          {" "}and{" "}
          <a href="/privacy" style={{ color: Z600, textDecoration: "none" }}
            onMouseEnter={e => e.currentTarget.style.color = Z400}
            onMouseLeave={e => e.currentTarget.style.color = Z600}
          >Privacy Policy</a>
        </p>

        {/* Trust signal */}
        <p style={{
          textAlign: "center",
          fontSize: 10,
          color: Z700,
          marginTop: 12,
          letterSpacing: 0.3,
        }}>
          Private by default
        </p>
      </div>
    </div>
  );
}
