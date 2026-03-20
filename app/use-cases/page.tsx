"use client";
import Link from "next/link";
import { SignuxIcon } from "../components/SignuxIcon";

const USE_CASES = [
  {
    title: "Startup founders",
    problem: "You're making 50 decisions a week with incomplete information and no board to consult.",
    solution: "Use Chat for daily decisions, Simulate to test scenarios before committing, and /pitch to create investor-ready decks in minutes.",
    commands: ["/pitch", "/plan", "/financial"],
    color: "#D4AF37",
  },
  {
    title: "Freelancers & consultants",
    problem: "Pricing too low, bad contracts, and clients who don't pay. No legal team, no finance team.",
    solution: "Use /pricing for data-driven rates, /contract to review client agreements, and Negotiation Sim to prepare for tough conversations.",
    commands: ["/pricing", "/contract"],
    color: "#6B8AFF",
  },
  {
    title: "E-commerce operators",
    problem: "Thin margins, fierce competition, and supplier negotiations where you're always the smaller player.",
    solution: "Use Deal X-Ray to analyze supplier terms, War Game to simulate competitor moves, and Global Ops for international sourcing.",
    commands: ["/pricing"],
    color: "#22c55e",
  },
  {
    title: "Investors & analysts",
    problem: "Too many deals, not enough time. Need to separate signal from noise and avoid confirmation bias.",
    solution: "Use Invest mode for Kelly Criterion sizing and Bayesian analysis. Decision Autopsy to learn from past investment mistakes.",
    commands: ["/financial"],
    color: "#A855F7",
  },
  {
    title: "Agency owners",
    problem: "Scaling without losing quality. Hiring, pricing, and client management eating all your time.",
    solution: "Use /plan to build growth roadmaps, Scenario Planner for capacity planning, and Causal Map to find what's really driving churn.",
    commands: ["/plan", "/pricing"],
    color: "#F97316",
  },
  {
    title: "International businesses",
    problem: "Cross-border complexity — regulations, tax structures, currency risk, and cultural blind spots.",
    solution: "Use Global Ops mode for jurisdiction analysis, Threat Radar for regulatory risk mapping, and /contract for international agreements.",
    commands: ["/contract"],
    color: "#14B8A6",
  },
];

export default function UseCasesPage() {
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
          Use cases
        </div>
        <h1 style={{
          fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 36,
          letterSpacing: 4, color: "var(--text-primary)", marginBottom: 8,
        }}>
          Built for real decisions
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40 }}>
          See how different professionals use Signux to make better decisions.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {USE_CASES.map((uc, i) => (
            <div key={i} style={{
              padding: "24px 20px", borderRadius: 12,
              border: `1px solid ${uc.color}18`, background: `${uc.color}04`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: uc.color, opacity: 0.6 }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{uc.title}</span>
              </div>

              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8, fontStyle: "italic" }}>
                {uc.problem}
              </div>

              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
                {uc.solution}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {uc.commands.map(cmd => (
                  <span key={cmd} style={{
                    fontSize: 11, fontFamily: "var(--font-mono)",
                    padding: "3px 8px", borderRadius: 4,
                    background: `${uc.color}10`, color: uc.color,
                  }}>
                    {cmd}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Link href="/chat" style={{
            display: "inline-flex", padding: "14px 32px", borderRadius: 50,
            background: "var(--accent)", color: "#000", fontWeight: 700,
            fontSize: 14, textDecoration: "none", fontFamily: "var(--font-brand)", letterSpacing: 1,
          }}>
            Try it free
          </Link>
        </div>
      </main>
    </div>
  );
}
