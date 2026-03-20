"use client";
import Link from "next/link";
import { SignuxIcon } from "../components/SignuxIcon";

const ENTRIES = [
  {
    date: "March 18, 2026",
    title: "Decision Autopsy + Intelligence Score",
    items: [
      "New Intel tool: Decision Autopsy — analyze past decisions with domain-by-domain breakdown",
      "Intelligence depth bar shows how much of the knowledge base was activated per response",
      "Second Opinion Engine (Max tier) — 3 parallel domain analyses on any AI response",
      "Adversarial Review (Max tier) — Devil's Advocate challenges every answer",
    ],
  },
  {
    date: "March 15, 2026",
    title: "Specialized /commands",
    items: [
      "/pitch — Generate investor-ready pitch decks",
      "/financial — Build complete financial models with projections",
      "/plan — Create structured business plans",
      "/pricing — Data-driven pricing strategy analysis",
      "/contract — Expert-level contract review and risk assessment",
    ],
  },
  {
    date: "March 12, 2026",
    title: "Smart Context + Domain Templates",
    items: [
      "Smart intent detection suggests the right tool as you type",
      "Domain-powered quick-start templates on welcome screen",
      "100+ intelligence domains now active across all modes",
      "Blind spot detector flags what you're not thinking about",
    ],
  },
  {
    date: "March 8, 2026",
    title: "Intel Engine launch",
    items: [
      "7 specialized analysis tools: Threat Radar, Deal X-Ray, War Game, Causal Map, Negotiation Sim, Scenario Planner, Deep Research",
      "Invest mode with Kelly Criterion, Bayesian analysis, and portfolio theory",
      "Global Ops mode for international business operations",
      "Enhanced follow-up engine with 3 smart questions per response",
    ],
  },
  {
    date: "March 1, 2026",
    title: "Signux AI public beta",
    items: [
      "6 AI modes: Chat, Simulate, Intel, Launchpad, Global Ops, Invest",
      "Reality Check engine for instant verdict on any decision",
      "Confidence meter on every response",
      "File upload and analysis (PDF, images, documents)",
      "Multi-language support (27+ languages)",
    ],
  },
];

export default function ChangelogPage() {
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
          Changelog
        </div>
        <h1 style={{
          fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 36,
          letterSpacing: 4, color: "var(--text-primary)", marginBottom: 8,
        }}>
          What&apos;s new
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>
          New intelligence domains, tools, and features — shipped weekly.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {ENTRIES.map((entry, i) => (
            <div key={i} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 20 }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)",
                letterSpacing: 1, marginBottom: 4,
              }}>
                {entry.date}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
                {entry.title}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
