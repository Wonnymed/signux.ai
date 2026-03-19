"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Zap, Search, Rocket, Globe, TrendingUp, Wrench, CircleSlash, Copy, Users, Shield, Scan, Swords, GitBranch, Map, Target } from "lucide-react";
import { SignuxIcon } from "./components/SignuxIcon";
import SignuxFooter from "./components/SignuxFooter";

/* ═══ Fade-in on scroll ═══ */
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
    <div ref={ref} style={{ opacity: 0, transform: "translateY(20px)", transition: "opacity 0.5s ease, transform 0.5s ease", ...style }}>
      {children}
    </div>
  );
}

/* ═══ Hex to rgba ═══ */
function hexA(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ═══ Section Divider ═══ */
function Divider() {
  return <div style={{ height: 1, maxWidth: 600, margin: "0 auto", background: "linear-gradient(90deg, transparent, var(--divider), transparent)" }} />;
}

/* ═══ Mode data ═══ */
const MODE_SECTIONS = [
  {
    icon: Zap, color: "#D4AF37", name: "Simulate", textOnColor: "#000",
    title: "Predict outcomes before you invest",
    desc: "15 AI specialist agents analyze your plan from every angle — regulatory, financial, adversarial, operational. Stress-test any decision with God's Eye variable injection and multi-round debate.",
    features: ["Multi-agent debate", "Adversarial testing", "Risk scoring", "God's Eye injection", "Agent conversation"],
    preview: SimulatePreview,
  },
  {
    icon: Search, color: "#6B8AFF", name: "Deep Research", textOnColor: "#fff",
    title: "Multi-source intelligence synthesis",
    desc: "Signux plans 6-8 strategic queries, searches across multiple sources, cross-references findings, and compiles a structured report with citations and export to PDF.",
    features: ["Auto-planned queries", "8-12 sources", "Cross-referenced", "Cited report", "PDF export"],
    preview: ResearchPreview,
  },
  {
    icon: Rocket, color: "#14B8A6", name: "Launchpad", textOnColor: "#000",
    title: "From zero to business in 90 days",
    desc: "Tell Signux your skills and budget. We find the right business, validate it with our simulation engine, generate a blueprint, and track your progress week by week.",
    features: ["Skill-to-business matching", "Auto-validation", "90-day blueprint", "Weekly tracking", "Adaptive strategy"],
    preview: LaunchpadPreview,
  },
  {
    icon: Globe, color: "#22C55E", name: "Global Ops", textOnColor: "#000",
    title: "Cross-border operational intelligence",
    desc: "Specialized for international operations — offshore structures, import/export, crypto compliance, tax optimization. Proprietary knowledge across 100+ jurisdictions.",
    features: ["100+ jurisdictions", "Tax structures", "Crypto frameworks", "Trade routes", "Compliance mapping"],
    preview: GlobalOpsPreview,
  },
  {
    icon: TrendingUp, color: "#A855F7", name: "Invest", textOnColor: "#fff",
    title: "Quantitative deal evaluation",
    desc: "Evaluate any investment with the formulas hedge funds use — expected value, Kelly criterion, Bayesian updates, base rate analysis. Numbers, not opinions.",
    features: ["Expected value", "Kelly sizing", "Bayesian updates", "DCF / IRR", "Stress testing"],
    preview: InvestPreview,
  },
];

/* ═══ Preview Components ═══ */
function SimulatePreview() {
  const bars = [
    { label: "Regulatory", pct: 72, color: "#ef4444" },
    { label: "Financial", pct: 45, color: "#f59e0b" },
    { label: "Market", pct: 58, color: "#3b82f6" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {bars.map(b => (
        <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>
            <span>{b.label}</span><span>{b.pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--card-hover-bg)" }}>
            <div style={{ height: "100%", width: `${b.pct}%`, borderRadius: 2, background: b.color, opacity: 0.7 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--card-hover-bg)" }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1 }}>Viability</div>
          <div style={{ fontSize: 22, fontFamily: "var(--font-brand)", fontWeight: 700, color: "#D4AF37" }}>7.3</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1 }}>Est. ROI</div>
          <div style={{ fontSize: 22, fontFamily: "var(--font-brand)", fontWeight: 700, color: "#22c55e" }}>+23%</div>
        </div>
      </div>
    </div>
  );
}

function ResearchPreview() {
  const queries = [
    { text: "Market size analysis", done: true },
    { text: "Competitor pricing", done: true },
    { text: "Regulatory landscape", loading: true },
    { text: "Customer segments", pending: true },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {queries.map((q, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: q.done ? "none" : "1.5px solid var(--card-hover-border)", background: q.done ? "rgba(107,138,255,0.3)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {q.done && <span style={{ fontSize: 8, color: "#6B8AFF" }}>&#10003;</span>}
            {q.loading && <span style={{ fontSize: 7, color: "var(--text-tertiary)" }}>...</span>}
          </div>
          <span style={{ fontSize: 11, color: q.done ? "var(--text-secondary)" : "var(--text-tertiary)" }}>{q.text}</span>
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-tertiary)", marginBottom: 4 }}>
          <span>Progress</span><span>55%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "var(--card-hover-bg)" }}>
          <div style={{ height: "100%", width: "55%", borderRadius: 2, background: "#6B8AFF", opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}

function LaunchpadPreview() {
  const steps = [
    { label: "Discovery", active: true },
    { label: "Validation", active: false },
    { label: "Blueprint", active: false },
    { label: "Launch", active: false },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.active ? "#14B8A6" : "var(--card-border)", border: s.active ? "none" : "1.5px solid var(--border-primary)", boxShadow: s.active ? "0 0 8px rgba(20,184,166,0.3)" : "none" }} />
            {i < steps.length - 1 && <div style={{ width: 1, height: 28, background: "var(--card-border)" }} />}
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: s.active ? 600 : 400, color: s.active ? "#14B8A6" : "var(--text-tertiary)" }}>{s.label}</span>
            {s.active && <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2 }}>In progress</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function GlobalOpsPreview() {
  const jurisdictions = [
    { name: "Hong Kong", pct: 92 },
    { name: "Singapore", pct: 87 },
    { name: "Dubai DMCC", pct: 74 },
    { name: "BVI", pct: 68 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {jurisdictions.map(j => (
        <div key={j.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{j.name}</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-brand)", fontWeight: 700, color: j.pct >= 80 ? "#22C55E" : j.pct >= 70 ? "#f59e0b" : "var(--text-tertiary)" }}>{j.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function InvestPreview() {
  const metrics = [
    { label: "EV", value: "+$1.2M", color: "#22c55e" },
    { label: "Kelly", value: "12%", color: "#A855F7" },
    { label: "Bayes", value: "0.67", color: "#6B8AFF" },
    { label: "Base Rate", value: "34%", color: "#f59e0b" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {metrics.map(m => (
        <div key={m.label} style={{ padding: "10px 8px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--card-border)", textAlign: "center" }}>
          <div style={{ fontSize: 8, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
          <div style={{ fontSize: 16, fontFamily: "var(--font-brand)", fontWeight: 700, color: m.color }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Tools data ═══ */
const TOOLS_ACTIVE = ["Pitch Deck Builder", "Financial Model", "Chat with PDF", "Business Plan Writer", "Pricing Calculator", "Contract Analyzer"];
const TOOLS_SOON = ["Brand Kit Generator", "Outreach Writer", "Market Sizing", "Ad Copy Agent"];

/* ═══ MAIN LANDING PAGE ═══ */
export default function LandingPage() {
  const [checked, setChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setChecked(true);
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!checked) return <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />;

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", overflowX: "hidden" }}>

      {/* ═══ NAV BAR ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
        background: "rgba(var(--bg-primary-rgb), 0.8)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-secondary)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SignuxIcon size={24} variant="gold" />
          <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 16, letterSpacing: 3, color: "var(--text-primary)" }}>
            SIGNUX <span style={{ fontWeight: 300, opacity: 0.3 }}>AI</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/login" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>Log in</Link>
          <Link href="/chat" style={{
            fontSize: 13, fontWeight: 600, color: "#000", background: "var(--accent)",
            padding: "8px 20px", borderRadius: 50, textDecoration: "none",
          }}>Start free</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "120px 20px 60px" : "120px 24px 80px",
        textAlign: "center", position: "relative",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
          width: 800, height: 800, background: "radial-gradient(circle, var(--glow-color) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Floating particles */}
        {[
          { top: "20%", left: "15%", dur: "8s", delay: "0s" },
          { top: "35%", left: "82%", dur: "10s", delay: "1.5s" },
          { top: "70%", left: "25%", dur: "12s", delay: "3s" },
          { top: "60%", left: "78%", dur: "9s", delay: "0.5s" },
        ].map((p, i) => (
          <div key={`lp-${i}`} style={{
            position: "absolute", top: p.top, left: p.left,
            width: 1.5, height: 1.5, borderRadius: "50%",
            background: "rgba(212,175,55,0.15)", pointerEvents: "none",
            animation: `float1 ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 0 }}>
            <SignuxIcon size={isMobile ? 44 : 52} variant="gold" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontFamily: "var(--font-brand)", fontWeight: 700,
                fontSize: isMobile ? 40 : 56, letterSpacing: 6,
                color: "var(--text-primary)", lineHeight: 1,
              }}>
                SIGNUX
              </span>
              <span style={{
                fontFamily: "var(--font-brand)", fontWeight: 300,
                fontSize: isMobile ? 40 : 56, letterSpacing: 4,
                color: "var(--text-primary)", opacity: 0.22, lineHeight: 1,
              }}>
                AI
              </span>
            </div>
          </div>
          <div style={{ width: 48, height: 1.5, background: "var(--accent)", margin: "8px auto 0" }} />

          <h1 style={{
            fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 32 : 48,
            letterSpacing: 2, color: "var(--text-primary)", maxWidth: 700,
            lineHeight: 1.1, margin: "32px auto 16px",
          }}>
            Think through any business decision before you make it
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 18, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.6 }}>
            6 specialized AI modes. Multi-agent simulation. Deep research. Quantitative analysis. From idea to business in 90 days.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/chat" style={{
              padding: "14px 32px", borderRadius: 50, background: "var(--accent)",
              color: "#000", fontWeight: 600, fontSize: 15, textDecoration: "none",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}>Start free</Link>
            <a href="#modes" style={{
              padding: "14px 32px", borderRadius: 50,
              border: "1px solid var(--border-primary)", color: "var(--text-secondary)",
              fontSize: 15, textDecoration: "none",
            }}>See all modes</a>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
          Trusted by entrepreneurs, founders, and decision-makers worldwide
        </div>
      </section>

      {/* ═══ MODES SHOWCASE ═══ */}
      <div id="modes">
        {MODE_SECTIONS.map((sec, idx) => {
          const Icon = sec.icon;
          const Preview = sec.preview;
          const reverse = idx % 2 === 1;
          return (
            <div key={sec.name}>
              <Divider />
              <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
                <FadeSection>
                  <div style={{
                    display: "flex", gap: isMobile ? 24 : 40, alignItems: "flex-start",
                    flexDirection: isMobile ? "column" : reverse ? "row-reverse" : "row",
                  }}>
                    {/* Text */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 6,
                        background: hexA(sec.color, 0.08), color: sec.color,
                        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
                        marginBottom: 16,
                      }}>
                        <Icon size={12} /> {sec.name}
                      </div>
                      <h2 style={{
                        fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 32,
                        color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.2,
                      }}>{sec.title}</h2>
                      <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
                        {sec.desc}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                        {sec.features.map(f => (
                          <span key={f} style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--card-border)" }}>{f}</span>
                        ))}
                      </div>
                      <Link href="/chat" style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "10px 24px", borderRadius: 50,
                        background: sec.color, color: sec.textOnColor,
                        fontWeight: 600, fontSize: 13, textDecoration: "none",
                        fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
                      }}>
                        <Icon size={14} /> Try {sec.name}
                      </Link>
                    </div>

                    {/* Preview */}
                    {!isMobile && (
                      <div style={{
                        width: 280, flexShrink: 0, borderRadius: 14,
                        border: "1px solid var(--card-border)", background: "var(--card-bg)",
                        padding: 20, overflow: "hidden",
                      }}>
                        <Preview />
                      </div>
                    )}
                  </div>
                </FadeSection>
              </section>
            </div>
          );
        })}
      </div>

      {/* ═══ REALITY CHECK highlight ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <div style={{
            display: "flex", gap: isMobile ? 24 : 40, alignItems: "flex-start",
            flexDirection: isMobile ? "column" : "row",
          }}>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6,
                background: "rgba(239,68,68,0.08)", color: "#ef4444",
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16,
              }}>
                <CircleSlash size={12} /> Reality Check
              </div>
              <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 32, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.2 }}>
                Honest verdict in 10 seconds
              </h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
                &quot;Is dropshipping still viable?&quot; &quot;Should I buy this course?&quot; Get a data-backed GO, CAUTION, or STOP with real numbers.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {["Web search", "Real data", "10 seconds", "GO / CAUTION / STOP"].map(f => (
                  <span key={f} style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--card-border)" }}>{f}</span>
                ))}
              </div>
              <Link href="/chat" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 24px", borderRadius: 50,
                background: "#ef4444", color: "#fff",
                fontWeight: 600, fontSize: 13, textDecoration: "none",
                fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
              }}>
                <CircleSlash size={14} /> Try Reality Check
              </Link>
            </div>

            {/* Preview */}
            {!isMobile && (
              <div style={{
                width: 280, flexShrink: 0, borderRadius: 14,
                border: "1px solid var(--card-border)", background: "var(--card-bg)",
                padding: 20, overflow: "hidden",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 28, color: "#f59e0b" }}>CAUTION</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Worth learning but market is shifting
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: 8, borderRadius: 6, background: "var(--card-bg)", border: "1px solid var(--card-border)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 16, color: "#f59e0b" }}>62%</div>
                    <div style={{ fontSize: 8, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 1 }}>Relevant</div>
                  </div>
                  <div style={{ padding: 8, borderRadius: 6, background: "var(--card-bg)", border: "1px solid var(--card-border)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 16, color: "#22c55e" }}>$89K</div>
                    <div style={{ fontSize: 8, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 1 }}>Avg salary</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--text-secondary)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#22c55e", flexShrink: 0 }}>+</span>
                    High freelance demand
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--text-secondary)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#ef4444", flexShrink: 0 }}>-</span>
                    AI reducing junior demand
                  </div>
                </div>
              </div>
            )}
          </div>
        </FadeSection>
      </section>

      {/* ═══ INTELLIGENCE TOOLS ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
            Intelligence-grade tools
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", marginBottom: 40 }}>
            Specialized analysis tools that go beyond chat. Type a slash command or click to launch.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
            {([
              { icon: Shield, title: "Threat Radar", desc: "Scan 5 risk axes — market, regulatory, operational, cyber, geopolitical — with real-time web data.", color: "#ef4444", cmd: "/threats" },
              { icon: Scan, title: "Deal X-Ray", desc: "Forensic analysis of any deal. Detects red flags, hidden incentives, and deception patterns.", color: "#f59e0b", cmd: "/xray" },
              { icon: Swords, title: "War Game", desc: "5 AI agents simulate competitive moves over 3 rounds. Find your dominant strategy.", color: "#D4AF37", cmd: "/wargame" },
              { icon: GitBranch, title: "Causal Map", desc: "Map cause-and-effect chains with confidence scores. Identify confounders and verify hypotheses.", color: "#6366F1", cmd: "/causal" },
              { icon: Map, title: "Scenario Planner", desc: "4 alternative futures in a 2×2 matrix with timelines, early warnings, and hedging strategies.", color: "#A855F7", cmd: "/scenarios" },
              { icon: Target, title: "Negotiation War Room", desc: "Intel → Strategy → Practice → Debrief. Full lifecycle negotiation preparation.", color: "#F97316", cmd: "/negotiate" },
            ] as const).map((tool, i) => {
              const Icon = tool.icon;
              return (
                <div key={i} style={{ padding: 20, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${tool.color}10` }}>
                      <Icon size={14} style={{ color: tool.color }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: 1 }}>{tool.cmd}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{tool.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{tool.desc}</div>
                </div>
              );
            })}
          </div>
        </FadeSection>
      </section>

      {/* ═══ INNOVATION FEATURES ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
            Features no other AI has
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", marginBottom: 40 }}>
            Built for entrepreneurs who make real decisions with real money.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
            {[
              { title: "Enhance", desc: "AI improves your prompt before sending. Better input = better output.", color: "var(--accent)" },
              { title: "Follow-up Engine", desc: "3 questions you didn't think to ask after every response.", color: "#6B8AFF" },
              { title: "Confidence Meter", desc: "See how sure the AI is about each answer. Green, yellow, or red.", color: "#22c55e" },
              { title: "Reverse Engineer", desc: "Paste a business URL. Get a complete playbook to replicate it.", color: "#F97316" },
              { title: "Negotiation Sim", desc: "Practice tough conversations before real meetings.", color: "#F97316" },
              { title: "Decision Journal", desc: "Auto-tracks your decisions. Follows up 30 days later.", color: "#A855F7" },
            ].map((f, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, marginBottom: 12, opacity: 0.6 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ═══ TOOLS ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28, color: "var(--text-primary)", marginBottom: 32 }}>
            Specialized tools
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {TOOLS_ACTIVE.map(tool => (
              <span key={tool} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 13, color: "var(--text-secondary)" }}>{tool}</span>
            ))}
            {TOOLS_SOON.map(tool => (
              <span key={tool} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 13, color: "var(--text-tertiary)", opacity: 0.5 }}>
                {tool} <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>SOON</span>
              </span>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", textAlign: "center" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 28 : 36, color: "var(--text-primary)", marginBottom: 16 }}>
            Ready to think smarter?
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 32 }}>
            Free to start. No credit card required.
          </p>
          <Link href="/chat" style={{
            display: "inline-flex", padding: "16px 40px", borderRadius: 50,
            background: "var(--accent)", color: "#000", fontWeight: 700,
            fontSize: 16, textDecoration: "none", fontFamily: "var(--font-brand)",
            letterSpacing: 1,
          }}>Start free</Link>
        </FadeSection>
      </section>

      {/* ═══ FOOTER ═══ */}
      <Divider />
      <SignuxFooter />
    </div>
  );
}
