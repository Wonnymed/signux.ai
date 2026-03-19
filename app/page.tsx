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
    title: "Know if your idea will work — before you spend a dollar",
    desc: "Describe any business scenario. AI specialists will debate it from every angle — finding the risks you can't see, the competitors you forgot, and the numbers that actually matter. Like seeing the future of your business before it happens.",
    features: ["Predict outcomes", "Find hidden risks", "Stress-test anything", "See the future first"],
    preview: SimulatePreview,
  },
  {
    icon: Shield, color: "#DC2626", name: "Intel", textOnColor: "#fff",
    title: "See what others miss. Know what others don't.",
    desc: "Is that partnership offer legit? How will competitors react? What's the real risk nobody is talking about? Specialized tools that analyze deals, detect lies, simulate competition, and prepare you for what's coming.",
    features: ["Predict competitor moves", "Catch lies in deals", "Map threats before they hit", "Prepare for anything"],
    preview: IntelPreview,
  },
  {
    icon: Rocket, color: "#14B8A6", name: "Launchpad", textOnColor: "#000",
    title: "Your first $1,000 in 90 days",
    desc: "Tell us what you're good at and how much you can invest. We'll find the best business for you, predict if it will work before you start, create your 90-day plan, and check in every week. Like a co-founder who already knows what's coming.",
    features: ["Find your best business", "AI-tested before you start", "90-day plan", "Weekly check-ins", "Adapts as you grow"],
    preview: LaunchpadPreview,
  },
  {
    icon: Globe, color: "#22C55E", name: "Global Ops", textOnColor: "#000",
    title: "Expand anywhere. Know the rules before you break them.",
    desc: "Setting up in a new country? Importing from Asia? Need a tax-efficient structure? Get specific guidance for your exact situation — the steps, the costs, the risks, and what others got wrong before you.",
    features: ["Any jurisdiction", "Tax optimization", "Import/export", "Crypto compliance", "Step-by-step guidance"],
    preview: GlobalOpsPreview,
  },
  {
    icon: TrendingUp, color: "#A855F7", name: "Invest", textOnColor: "#fff",
    title: "Should you invest? Get the real numbers.",
    desc: "Paste a deal, describe an opportunity, or evaluate a startup. Get the real math — expected value, risk scores, and an honest verdict. The same frameworks hedge funds use, in plain language. Know the answer before you wire the money.",
    features: ["Expected value", "Risk scores", "Honest verdict", "Plain language", "Stress testing"],
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

function IntelPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#DC2626", marginBottom: 6 }}>
          Threat level
        </div>
        <div style={{ fontFamily: "var(--font-brand)", fontSize: 28, fontWeight: 700, color: "#F59E0B" }}>
          ELEVATED
        </div>
      </div>
      {[
        { name: "Market", score: 7, color: "#ef4444" },
        { name: "Regulatory", score: 4, color: "#22c55e" },
        { name: "Operational", score: 6, color: "#f59e0b" },
        { name: "Cyber", score: 3, color: "#22c55e" },
        { name: "Geopolitical", score: 5, color: "#f59e0b" },
      ].map((axis, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", width: 70 }}>{axis.name}</span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--card-border)" }}>
            <div style={{ width: `${axis.score * 10}%`, height: "100%", borderRadius: 2, background: axis.color }} />
          </div>
          <span style={{ fontSize: 10, color: axis.color, fontWeight: 600, width: 16 }}>{axis.score}</span>
        </div>
      ))}
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
const TOOLS = [
  { name: "Pitch Deck Builder", command: "/pitch", color: "#D4AF37" },
  { name: "Financial Model", command: "/financial", color: "#22c55e" },
  { name: "Business Plan Writer", command: "/plan", color: "#6B8AFF" },
  { name: "Pricing Strategy", command: "/pricing", color: "#F97316" },
  { name: "Contract Analyzer", command: "/contract", color: "#DC2626" },
];
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
            See what happens before it happens.
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 18, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.6 }}>
            Test any idea before you invest. Spot bad deals before you sign. Know how competitors will react before they move. The AI that sees around corners.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/chat" style={{
              padding: "14px 32px", borderRadius: 50, background: "var(--accent)",
              color: "#000", fontWeight: 600, fontSize: 15, textDecoration: "none",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}>Start free</Link>
            <a href="#compare" style={{
              padding: "14px 32px", borderRadius: 50,
              border: "1px solid var(--border-primary)", color: "var(--text-secondary)",
              fontSize: 15, textDecoration: "none",
            }}>See the difference</a>
          </div>

          {/* Avatar stack + social proof */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, marginTop: 24,
          }}>
            <div style={{ display: "flex" }}>
              {["NV","SK","AR","PT","LC","JM","RK"].map((initials, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: ["#D4AF37","#DC2626","#14B8A6","#22C55E","#8B5CF6","#F59E0B","#06B6D4"][i],
                  border: "2px solid var(--bg-primary)",
                  marginLeft: i > 0 ? -8 : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff", fontWeight: 600,
                }}>
                  {initials}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Used by founders and operators worldwide
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
          Free to start. No credit card required.
        </div>
      </section>

      {/* ═══ COMPARISON TABLE ═══ */}
      <Divider />
      <section id="compare" style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 900, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{
            fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28,
            color: "var(--text-primary)", textAlign: "center", marginBottom: 8,
          }}>
            What makes Signux different
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-tertiary)", textAlign: "center", marginBottom: 32 }}>
            Not another chatbot. A decision intelligence platform.
          </p>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              Live — analyzing decisions right now
            </span>
          </div>

          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border-secondary)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, fontFamily: "var(--font-sans)", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-secondary)" }}>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text-tertiary)", fontWeight: 400, width: "30%" }}>Capability</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "var(--accent)", fontSize: 14, background: "rgba(212,175,55,0.04)" }}>Signux AI</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 13 }}>ChatGPT</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 13 }}>Claude</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 500, color: "var(--text-tertiary)", fontSize: 13 }}>Hiring a consultant</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { feature: "Predict if your idea will work", signux: "AI simulation", chatgpt: "Generic opinion", claude: "Generic opinion", consultant: "$5,000+" },
                  { feature: "Detect lies and red flags in deals", signux: "Deal X-Ray", chatgpt: "✕", claude: "✕", consultant: "$25,000+" },
                  { feature: "See how competitors will react", signux: "War Game", chatgpt: "✕", claude: "✕", consultant: "$10,000+" },
                  { feature: "Map every threat to your business", signux: "Threat Radar", chatgpt: "✕", claude: "✕", consultant: "$500/hr" },
                  { feature: "Prepare to win a negotiation", signux: "War Room", chatgpt: "Generic tips", claude: "Generic tips", consultant: "$500/hr" },
                  { feature: "Go from idea to revenue in 90 days", signux: "Launchpad", chatgpt: "✕", claude: "✕", consultant: "$50,000+" },
                  { feature: "Specialized business intelligence", signux: "Proprietary domains", chatgpt: "General knowledge", claude: "General knowledge", consultant: "1-2 specialties" },
                  { feature: "Price", signux: "Free to start", chatgpt: "$20/mo", claude: "$20/mo", consultant: "$5,000+/mo" },
                ] as const).map((row, i, arr) => (
                  <tr key={i} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border-secondary)" : "none" }}>
                    <td style={{ padding: "14px 20px", color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}>{row.feature}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", background: "rgba(212,175,55,0.04)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
                        ✓ {row.signux}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: row.chatgpt === "✕" ? "var(--text-tertiary)" : "var(--text-secondary)", fontSize: 12, opacity: row.chatgpt === "✕" ? 0.4 : 0.7 }}>{row.chatgpt}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: row.claude === "✕" ? "var(--text-tertiary)" : "var(--text-secondary)", fontSize: 12, opacity: row.claude === "✕" ? 0.4 : 0.7 }}>{row.claude}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 12, opacity: 0.7 }}>{row.consultant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12, opacity: 0.4 }}>
            Comparison based on publicly available features as of 2026
          </p>
        </FadeSection>
      </section>

      {/* ═══ MODES SHOWCASE — Simulate + Intel first ═══ */}
      <div id="modes">
        {MODE_SECTIONS.slice(0, 2).map((sec, idx) => {
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
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

      {/* ═══ INTELLIGENCE TOOLS ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
            See around corners
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", marginBottom: 40 }}>
            Each tool answers a question you should ask before every big decision.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
            {([
              { icon: Shield, title: "Threat Radar", desc: "What could hurt my business next? Scan every risk before it becomes a problem.", color: "#ef4444", cmd: "/threats" },
              { icon: Scan, title: "Deal X-Ray", desc: "Is this deal hiding something? Spot red flags and hidden incentives instantly.", color: "#f59e0b", cmd: "/xray" },
              { icon: Swords, title: "War Game", desc: "What will competitors do next? AI simulates their moves so you can plan yours.", color: "#D4AF37", cmd: "/wargame" },
              { icon: GitBranch, title: "Causal Map", desc: "Did that actually cause the result? Separate real causes from coincidences.", color: "#6366F1", cmd: "/causal" },
              { icon: Map, title: "Scenario Planner", desc: "What could happen next year? See possible futures with early warnings and backup plans.", color: "#A855F7", cmd: "/scenarios" },
              { icon: Target, title: "Negotiation War Room", desc: "How do I walk out winning? Full prep from intel to practice rounds.", color: "#F97316", cmd: "/negotiate" },
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

      {/* ═══ INTELLIGENCE BEHIND THE AI ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <FadeSection>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
            textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8,
          }}>
            Proprietary knowledge base
          </div>
          <h2 style={{
            fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28,
            color: "var(--text-primary)", marginBottom: 8,
          }}>
            Not just another AI
          </h2>
          <p style={{
            fontSize: 14, color: "var(--text-secondary)", marginBottom: 32,
            maxWidth: 540, margin: "0 auto 32px",
          }}>
            While other AIs search the internet, Signux draws from a proprietary knowledge base built over months across specialized business domains — from competitive strategy to risk detection to negotiation frameworks. This is why our answers are different.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12,
            maxWidth: 720, margin: "0 auto 24px",
          }}>
            {[
              { name: "Protecting your deals", domains: "Spot lies, detect threats, verify claims, stay secure", color: "#DC2626" },
              { name: "Outsmarting competitors", domains: "Predict moves, find advantages, win markets", color: "#8B5CF6" },
              { name: "Growing your revenue", domains: "Price right, spend smart, scale profitably", color: "#D4AF37" },
              { name: "Running your business", domains: "Build systems, delegate, scale without chaos", color: "#14B8A6" },
              { name: "Going international", domains: "Navigate regulations, optimize taxes, expand safely", color: "#22C55E" },
              { name: "Making better decisions", domains: "Separate fact from noise, predict outcomes", color: "#06B6D4" },
            ].map((cat, i) => (
              <div key={i} style={{
                padding: "16px 14px", borderRadius: 10,
                border: "1px solid var(--card-border)", background: "var(--card-bg)",
                textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, opacity: 0.6 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</span>
                </div>
                <div style={{ height: 4 }} />
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                  {cat.domains}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 50,
            background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              New domains added weekly
            </span>
          </div>
        </FadeSection>
      </section>

      {/* ═══ MODES — Launchpad, Global Ops, Invest ═══ */}
      {MODE_SECTIONS.slice(2).map((sec, idx) => {
        const Icon = sec.icon;
        const Preview = sec.preview;
        const reverse = (idx + 2) % 2 === 1;
        return (
          <div key={sec.name}>
            <Divider />
            <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
              <FadeSection>
                <div style={{
                  display: "flex", gap: isMobile ? 24 : 40, alignItems: "flex-start",
                  flexDirection: isMobile ? "column" : reverse ? "row-reverse" : "row",
                }}>
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
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
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

      {/* ═══ REALITY CHECK ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <div style={{
            display: "flex", gap: isMobile ? 24 : 40, alignItems: "flex-start",
            flexDirection: isMobile ? "column" : "row",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6,
                background: "rgba(239,68,68,0.08)", color: "#ef4444",
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16,
              }}>
                <CircleSlash size={12} /> Reality Check
              </div>
              <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 32, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.2 }}>
                Is it still worth it? Know in 10 seconds.
              </h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
                Thinking about dropshipping? Wondering if that course is worth it? Get an honest GO, CAUTION, or STOP — with real data, not opinions. Know before you spend.
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

      {/* ═══ BUILT FOR BETTER CONVERSATIONS ═══ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "48px 24px", maxWidth: 960, margin: "0 auto" }}>
        <FadeSection>
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: isMobile ? 24 : 28, color: "var(--text-primary)", marginBottom: 32, textAlign: "center" }}>
            Built for better conversations
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
            {[
              { title: "Enhance", desc: "AI improves your prompt before sending. Better input = better output.", color: "var(--accent)" },
              { title: "Confidence Meter", desc: "See how sure the AI is about each answer. Green, yellow, or red.", color: "#22c55e" },
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
            {TOOLS.map(tool => (
              <span key={tool.name} style={{
                padding: "8px 16px", borderRadius: 8,
                border: `1px solid ${tool.color}20`, background: `${tool.color}06`,
                fontSize: 13, color: "var(--text-secondary)",
                display: "inline-flex", alignItems: "center", gap: 8,
              }}>
                {tool.name}
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: tool.color, opacity: 0.7 }}>{tool.command}</span>
              </span>
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
            Stop guessing. Start knowing.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 32 }}>
            See what your AI finds in 30 seconds. Free to start.
          </p>
          <Link href="/chat" style={{
            display: "inline-flex", padding: "16px 40px", borderRadius: 50,
            background: "var(--accent)", color: "#000", fontWeight: 700,
            fontSize: 16, textDecoration: "none", fontFamily: "var(--font-brand)",
            letterSpacing: 1,
          }}>Start free</Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, opacity: 0.5 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              Analyzing decisions since March 2026
            </span>
          </div>
        </FadeSection>
      </section>

      {/* ═══ FOOTER ═══ */}
      <Divider />
      <SignuxFooter />
    </div>
  );
}
