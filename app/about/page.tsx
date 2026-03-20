"use client";
import Link from "next/link";
import { SignuxIcon } from "../components/SignuxIcon";

export default function AboutPage() {
  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid var(--border-secondary)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <SignuxIcon size={24} variant="gold" />
          <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 16, letterSpacing: 3, color: "var(--text-primary)" }}>
            SIGNUX <span style={{ fontWeight: 300, opacity: 0.3 }}>AI</span>
          </span>
        </Link>
        <Link href="/chat" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
          ← Back to app
        </Link>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 20px 80px" }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
          textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8,
        }}>
          About
        </div>
        <h1 style={{
          fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 36,
          letterSpacing: 4, color: "var(--text-primary)", marginBottom: 24,
        }}>
          Why Signux exists
        </h1>

        <div style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 20 }}>
          <p>
            Every day, entrepreneurs make decisions worth thousands — sometimes millions — based on gut feeling, a quick Google search, or advice from people who&apos;ve never been in their shoes.
          </p>
          <p>
            We built Signux because we believe every business decision deserves the same rigor that hedge funds, intelligence agencies, and top consulting firms apply to theirs. The difference? You shouldn&apos;t need a $500/hour consultant to get it.
          </p>

          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 24, color: "var(--text-primary)", marginTop: 16 }}>
            What makes us different
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { title: "100+ proprietary intelligence domains", desc: "Every response draws from specialized knowledge bases — game theory, deception detection, behavioral economics, geopolitics, and more. No other AI has this." },
              { title: "7 specialized analysis tools", desc: "Threat Radar, Deal X-Ray, War Game, Causal Map, Negotiation Sim, Scenario Planner, and Decision Autopsy — each built for a specific type of strategic thinking." },
              { title: "6 purpose-built AI modes", desc: "Chat, Simulate, Intel, Launchpad, Global Ops, and Invest. Each mode has its own system prompt, knowledge base, and behavioral framework." },
              { title: "Brutal honesty by default", desc: "We don't tell you what you want to hear. Signux is designed to challenge your assumptions, flag blind spots, and tell you when an idea is bad." },
            ].map((item, i) => (
              <div key={i} style={{ padding: "16px 20px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 24, color: "var(--text-primary)", marginTop: 16 }}>
            Our mission
          </h2>
          <p>
            Democratize strategic intelligence. Give every entrepreneur, freelancer, and small business owner access to the same depth of analysis that Fortune 500 companies take for granted.
          </p>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Link href="/pricing" style={{
              display: "inline-flex", padding: "14px 32px", borderRadius: 50,
              background: "var(--accent)", color: "#000", fontWeight: 700,
              fontSize: 14, textDecoration: "none", fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}>
              See pricing
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
