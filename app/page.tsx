"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProfile } from "./lib/profile";
import { SignuxIcon } from "./components/SignuxIcon";

/* ═══ Fade-in on scroll (IntersectionObserver) ═══ */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══ Chat Mockup ═══ */
function ChatMockup() {
  return (
    <div style={{
      maxWidth: 560, width: "100%", margin: "0 auto",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      overflow: "hidden", background: "var(--bg-primary)",
    }}>
      {/* User message */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-secondary)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, letterSpacing: "0.02em" }}>You</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
          I want to import electronics from Shenzhen. Budget $20K. Best structure?
        </div>
      </div>
      {/* AI response */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, letterSpacing: "0.02em" }}>Signux</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
          For a <span style={{ fontWeight: 600 }}>$20K</span> electronics import from Shenzhen, I recommend a
          three-layer structure: a Hong Kong trading company as your procurement vehicle (lowest
          friction for China suppliers), routing through a free-trade zone for duty optimization, and
          a local entity in your destination market. Here&apos;s why this works...
        </div>
        <div style={{
          display: "inline-block", width: 2, height: 14,
          background: "var(--text-tertiary)", marginLeft: 2,
          animation: "blink 1s infinite", verticalAlign: "text-bottom",
          opacity: 0.5,
        }} />
      </div>
    </div>
  );
}

/* ═══ Simulation Mockup ═══ */
function SimMockup() {
  return (
    <div style={{
      maxWidth: 560, width: "100%", margin: "0 auto",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      overflow: "hidden", background: "var(--bg-primary)",
    }}>
      {/* Metadata bar */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid var(--border-secondary)",
        display: "flex", gap: 20, fontSize: 12, color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
      }}>
        <span>15 Agents</span>
        <span>4 Rounds</span>
        <span>60 Interactions</span>
      </div>
      {/* Report snippet */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.04em", marginBottom: 10 }}>
          EXECUTIVE SUMMARY
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)", marginBottom: 14 }}>
          The proposed Shenzhen electronics import operation is viable with moderate risk.
          Key factors: supplier verification through SGS reduces fraud risk by
          <span style={{ fontWeight: 600 }}> 73%</span>, HK routing saves
          <span style={{ fontWeight: 600 }}> $3,200</span> in duties vs direct import.
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 100,
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>GO</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Landing Page ═══ */
export default function LandingPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    if (profile && profile.name && profile.email) {
      router.replace("/chat");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />;
  }

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>

      {/* ═══ HERO — Above the fold ═══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", padding: "0 24px",
      }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Icon */}
          <SignuxIcon variant="gold" size={80} />

          {/* Logo text */}
          <h1 style={{ margin: "12px 0 0", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: "clamp(36px, 8vw, 56px)",
              fontWeight: 700, letterSpacing: 5, color: "var(--text-primary)",
            }}>SIGNUX</span>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: "clamp(36px, 8vw, 56px)",
              fontWeight: 300, letterSpacing: 3, color: "var(--text-primary)", opacity: 0.5,
            }}>AI</span>
          </h1>

          {/* Gold line */}
          <div style={{
            width: 48, height: 1.5, background: "var(--accent)",
            margin: "8px auto 0",
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: 18, fontWeight: 400, color: "var(--text-secondary)",
            maxWidth: 420, margin: "24px auto 0", lineHeight: 1.6,
          }}>
            The AI that knows how global business actually works.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 12, justifyContent: "center",
            marginTop: 40, flexWrap: "wrap",
          }}>
            <Link href="/chat" style={{
              display: "inline-flex", alignItems: "center",
              padding: "14px 32px", borderRadius: 100,
              background: "var(--text-primary)", color: "var(--text-inverse)",
              fontSize: 15, fontWeight: 500, textDecoration: "none",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Start now — it&apos;s free
            </Link>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "14px 32px", borderRadius: 100,
                background: "transparent", color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
                fontSize: 15, fontWeight: 500, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              See what it can do
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: "absolute", bottom: 32, left: 0, right: 0,
          textAlign: "center", fontSize: 12, color: "var(--text-tertiary)",
        }}>
          Built for operators who think globally
        </div>
      </section>

      {/* ═══ SECTION 1 — What it is ═══ */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 720, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 16px", textAlign: "center" }}>
            Ask anything about global business.
          </h2>
          <p style={{
            fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7,
            maxWidth: 560, margin: "0 auto 48px", textAlign: "center",
          }}>
            Offshore structures. China imports. Crypto security. Tax optimization.
            Real-time geopolitics. One AI that actually understands all of it.
          </p>
          <ChatMockup />
        </FadeSection>
      </section>

      {/* ═══ SECTION 2 — Simulation ═══ */}
      <section style={{ padding: "100px 24px", maxWidth: 720, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 16px", textAlign: "center" }}>
            Don&apos;t guess. Simulate.
          </h2>
          <p style={{
            fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7,
            maxWidth: 560, margin: "0 auto 48px", textAlign: "center",
          }}>
            Describe a scenario. Signux creates 15+ AI specialists — suppliers, lawyers,
            customs officers, market analysts — and runs your entire operation before you
            invest a single dollar.
          </p>
          <SimMockup />
        </FadeSection>
      </section>

      {/* ═══ SECTION 3 — Intel ═══ */}
      <section style={{ padding: "100px 24px", maxWidth: 720, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 16px", textAlign: "center" }}>
            Know before everyone else.
          </h2>
          <p style={{
            fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7,
            maxWidth: 560, margin: "0 auto", textAlign: "center",
          }}>
            Daily intelligence briefings. Regulatory changes. Market shifts.
            Supply chain disruptions. All analyzed for operational impact.
          </p>
        </FadeSection>
      </section>

      {/* ═══ SECTION 4 — Final CTA ═══ */}
      <section style={{
        padding: "100px 24px", maxWidth: 720, margin: "0 auto",
        textAlign: "center",
      }}>
        <FadeSection>
          <h2 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 32px" }}>
            Ready to operate smarter?
          </h2>
          <Link href="/chat" style={{
            display: "inline-flex", alignItems: "center",
            padding: "14px 32px", borderRadius: 100,
            background: "var(--text-primary)", color: "var(--text-inverse)",
            fontSize: 15, fontWeight: 500, textDecoration: "none",
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Start now — it&apos;s free
          </Link>
          <p style={{
            fontSize: 13, color: "var(--text-tertiary)", marginTop: 16,
          }}>
            No credit card required. Free plan includes 10 queries per month.
          </p>
        </FadeSection>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: "48px 24px", borderTop: "1px solid var(--border-secondary)",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <SignuxIcon variant="gold" size={20} style={{ opacity: 0.4 }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 700,
              letterSpacing: 3, color: "var(--text-tertiary)",
            }}>SIGNUX</span>
            <span style={{
              fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 300,
              letterSpacing: 2, color: "var(--text-tertiary)", opacity: 0.5,
            }}>AI</span>
          </div>
        </div>
        <div style={{
          display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap",
          marginBottom: 20,
        }}>
          {["About", "Pricing", "Blog", "Contact", "Terms", "Privacy"].map(link => (
            <span key={link} style={{
              fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer",
              transition: "color 0.15s",
            }}>
              {link}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          &copy; 2026 Signux AI. Part of the DuckDuck Club ecosystem.
        </div>
      </footer>
    </div>
  );
}
