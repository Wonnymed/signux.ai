"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const GOLD = "#C9A84C";
const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

/* ═══ Intersection Observer Hook ═══ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Section({ children, id, style }: { children: React.ReactNode; id?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useInView();
  return (
    <section ref={ref} id={id} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out", ...style }}>
      {children}
    </section>
  );
}

/* ═══ Agent Data ═══ */
const AGENTS = [
  { emoji: "🏛️", name: "Offshore Architect", desc: "International corporate structuring", bullets: ["HK, SG, Dubai, US LLC, BVI, Cayman", "Setup costs, annual fees, tax rates", "Optimal multi-jurisdiction structures"] },
  { emoji: "🇨🇳", name: "China Ops Navigator", desc: "Sourcing, validation, logistics", bullets: ["Alibaba & 1688.com supplier vetting", "Negotiation, payment, Incoterms", "Full landed cost calculations"] },
  { emoji: "🔐", name: "Crypto OPSEC Guard", desc: "Security, cold storage, privacy", bullets: ["Hardware wallets, seed phrase protocol", "2FA, VPN, browser hygiene", "DeFi risk management"] },
  { emoji: "🌍", name: "GeoIntel Analyst", desc: "Geopolitics & macro impact", bullets: ["Trade routes, sanctions, supply chains", "Currency & commodity analysis", "Risk-on/risk-off frameworks"] },
  { emoji: "🗣️", name: "Language Operator", desc: "Business translation & interpretation", bullets: ["8 languages, contract analysis", "Cultural negotiation nuances", "Tone & formality guidance"] },
  { emoji: "🔮", name: "Coming Soon", desc: "More agents in development", bullets: ["Tax Optimization Agent", "Deal Flow Analyzer", "Compliance Monitor"] },
];

const PIPELINE = [
  { icon: "🔍", label: "Graph" },
  { icon: "👥", label: "Agents" },
  { icon: "⚡", label: "Simulate" },
  { icon: "💬", label: "Debate" },
  { icon: "📊", label: "Report" },
];

const PRICING = [
  { name: "Explorer", price: 0, annual: 0, desc: "Get started for free", features: ["5 queries/month", "1 agent (Auto-route)", "Basic markdown export", "Community support"], cta: "Start Free", highlight: false },
  { name: "Operator", price: 49, annual: 39, desc: "For active operators", features: ["Unlimited queries", "All 5 specialist agents", "Conversation export", "Priority responses", "Profile personalization"], cta: "Get Started", highlight: true },
  { name: "Pro", price: 149, annual: 119, desc: "Simulation & API access", features: ["Everything in Operator", "Simulation Engine", "API access", "Tool calling (landed cost, setup cost)", "Priority support"], cta: "Go Pro", highlight: false },
  { name: "Enterprise", price: "Custom", annual: "Custom", desc: "White-label & custom agents", features: ["Everything in Pro", "Custom agent personas", "White-label deployment", "Dedicated support", "SSO & team management"], cta: "Contact Sales", highlight: false },
];

/* ═══ Landing Page ═══ */
export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div style={{ background: "#0A0A0A", color: "white", fontFamily: SANS, minHeight: "100vh", overflowX: "hidden" }}>
      {/* ═══ NAV ═══ */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(10,10,10,0.8)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, letterSpacing: "0.25em", color: GOLD, fontFamily: SERIF, fontWeight: 300 }}>SIGNUX</span>
          <span style={{ fontSize: 8, letterSpacing: "0.1em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>AI</span>
        </div>
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#agents" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>Agents</a>
          <a href="#simulation" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>Simulation</a>
          <a href="#pricing" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>Pricing</a>
          <Link href="/dashboard" style={{ fontSize: 13, padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A", textDecoration: "none", fontWeight: 500, transition: "opacity 0.2s" }}>Launch App</Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease-out 0.1s" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", color: GOLD, textTransform: "uppercase", marginBottom: 24, fontFamily: SANS }}>Operational Intelligence Platform</div>
        </div>

        <h1 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontFamily: SERIF, fontWeight: 300, lineHeight: 1.1, marginBottom: 24, maxWidth: 800, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease-out 0.2s" }}>
          All signal.<br /><span style={{ color: GOLD }}>Zero noise.</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.4)", maxWidth: 560, lineHeight: 1.7, marginBottom: 40, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease-out 0.35s" }}>
          Operational intelligence for global operators. Offshore structuring, China imports, crypto security, geopolitics — powered by specialist AI agents.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 56, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease-out 0.45s" }}>
          <Link href="/dashboard" style={{ padding: "14px 32px", borderRadius: 10, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A", fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: SANS, letterSpacing: "0.05em", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,168,76,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            Start Free
          </Link>
          <a href="#simulation" style={{ padding: "14px 32px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none", fontFamily: SANS, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}>
            Watch Demo
          </a>
        </div>

        {/* Chat mockup */}
        <div style={{ maxWidth: 560, width: "100%", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(32px)", transition: "all 1s ease-out 0.6s" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12 }}>🏛️</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Offshore Architect</span>
            <span style={{ marginLeft: "auto", fontSize: 8, padding: "2px 8px", borderRadius: 10, background: "rgba(201,168,76,0.08)", color: GOLD, letterSpacing: "0.08em" }}>BETA</span>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ alignSelf: "flex-end", padding: "10px 16px", borderRadius: "14px 14px 4px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.08)", fontSize: 13, color: "rgba(255,255,255,0.8)", maxWidth: "75%" }}>
              Quero abrir empresa em Hong Kong. Moro no Brasil, volume de $15K/mês.
            </div>
            <div style={{ alignSelf: "flex-start", padding: "14px 18px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: "80%", lineHeight: 1.7 }}>
              <span style={{ color: GOLD, fontWeight: 500 }}>Hong Kong é uma boa escolha</span> para o seu perfil. Setup via DuckDuck Club: <span style={{ color: "white" }}>R$10-17K</span>. Manutenção anual: <span style={{ color: "white" }}>R$12-30K</span>. Imposto sobre lucros offshore: <span style={{ color: GOLD }}>0%</span>...
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap", justifyContent: "center", opacity: mounted ? 1 : 0, transition: "opacity 1s ease-out 1s" }}>
          {["Powered by Claude", "5 Specialist Agents", "Real-time Streaming"].map(badge => (
            <span key={badge} style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
              <span style={{ color: "rgba(201,168,76,0.4)", marginRight: 6 }}>◆</span>{badge}
            </span>
          ))}
        </div>
      </section>

      {/* ═══ AGENTS ═══ */}
      <Section id="agents" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", marginBottom: 12 }}>Specialist Agents</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: SERIF, fontWeight: 300, marginBottom: 16 }}>Five minds. One platform.</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Each agent is a deep specialist. They don&apos;t just answer — they advise, calculate, and challenge your assumptions.</p>
        </div>
        <div className="agents-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {AGENTS.map((a, idx) => (
            <div key={a.name}
              style={{ padding: 28, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.3s ease", cursor: "default", opacity: idx === 5 ? 0.5 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "rgba(201,168,76,0.02)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{a.emoji}</div>
              <div style={{ fontSize: 16, fontFamily: SERIF, fontWeight: 400, color: "white", marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>{a.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {a.bullets.map(b => (
                  <div key={b} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "rgba(201,168,76,0.4)", flexShrink: 0, marginTop: 1 }}>›</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ SIMULATION ═══ */}
      <Section id="simulation" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", marginBottom: 12 }}>Simulation Engine</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: SERIF, fontWeight: 300, marginBottom: 16 }}>Don&apos;t just ask. <span style={{ color: GOLD }}>Simulate.</span></h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Describe a business scenario. Signux creates specialized agents, runs a multi-round debate, and delivers a GO/NO-GO report.</p>
        </div>

        {/* Pipeline */}
        <div className="pipeline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 56 }}>
          {PIPELINE.map((step, i) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, transition: "all 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.06)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"; }}>
                  {step.icon}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{step.label}</span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))", margin: "0 4px", marginBottom: 24 }} />
              )}
            </div>
          ))}
        </div>

        {/* Simulation mockup */}
        <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12 }}>◉</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Simulation Engine</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(201,168,76,0.4)" }}>4 agents · 3 rounds · 12 interactions</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[{ e: "🏭", n: "Chen Wei" }, { e: "🚢", n: "Maria Santos" }, { e: "📋", n: "Roberto Lima" }, { e: "💰", n: "Ana Park" }].map(a => (
                <span key={a.n} style={{ padding: "5px 12px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{a.e} {a.n}</span>
              ))}
            </div>
            <div style={{ fontSize: 15, fontFamily: SERIF, color: GOLD, marginBottom: 8 }}>FINAL VERDICT: GO ✓</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              Total landed cost: <span style={{ color: "white" }}>$14,280 USD (R$78,540)</span> · Timeline: <span style={{ color: "white" }}>35-42 days</span> · ROI estimate: <span style={{ color: GOLD }}>38-52%</span> margin at projected retail price.
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ PRICING ═══ */}
      <Section id="pricing" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: SERIF, fontWeight: 300, marginBottom: 16 }}>Built for operators.</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7, marginBottom: 28 }}>Start free. Scale when you need to.</p>

          {/* Toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "4px 6px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setAnnual(false)} style={{ padding: "6px 16px", borderRadius: 7, fontSize: 12, border: "none", cursor: "pointer", fontFamily: SANS, background: !annual ? "rgba(201,168,76,0.1)" : "transparent", color: !annual ? GOLD : "rgba(255,255,255,0.3)", transition: "all 0.2s" }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ padding: "6px 16px", borderRadius: 7, fontSize: 12, border: "none", cursor: "pointer", fontFamily: SANS, background: annual ? "rgba(201,168,76,0.1)" : "transparent", color: annual ? GOLD : "rgba(255,255,255,0.3)", transition: "all 0.2s" }}>
              Annual <span style={{ fontSize: 10, color: "rgba(201,168,76,0.6)" }}>-20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "start" }}>
          {PRICING.map(tier => {
            const price = annual ? tier.annual : tier.price;
            return (
              <div key={tier.name}
                style={{
                  padding: 28, borderRadius: 16,
                  background: tier.highlight ? "rgba(201,168,76,0.03)" : "rgba(255,255,255,0.02)",
                  border: tier.highlight ? "1px solid rgba(201,168,76,0.15)" : "1px solid rgba(255,255,255,0.05)",
                  position: "relative",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={e => { if (!tier.highlight) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                onMouseLeave={e => { if (!tier.highlight) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(0)"; } }}>
                {tier.highlight && (
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 9, letterSpacing: "0.12em", color: "#0A0A0A", background: GOLD, padding: "3px 12px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase" }}>Most Popular</div>
                )}
                <div style={{ fontSize: 16, fontFamily: SERIF, color: "white", marginBottom: 4 }}>{tier.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>{tier.desc}</div>
                <div style={{ marginBottom: 20 }}>
                  {typeof price === "number" ? (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 36, fontFamily: SERIF, fontWeight: 300, color: "white" }}>${price}</span>
                      {price > 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>/mo</span>}
                      {price === 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>forever</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 24, fontFamily: SERIF, fontWeight: 300, color: "white" }}>Custom</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "rgba(201,168,76,0.5)", fontSize: 10, flexShrink: 0 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard" style={{
                  display: "block", textAlign: "center", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: SANS, transition: "all 0.2s",
                  ...(tier.highlight
                    ? { background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A" }
                    : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }),
                }}>{tier.cta}</Link>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "60px 24px 40px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 60 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 32 }}>
          <div>
            <div style={{ fontSize: 16, letterSpacing: "0.25em", color: GOLD, fontFamily: SERIF, fontWeight: 300, marginBottom: 4 }}>SIGNUX</div>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>Operational Intelligence</div>
          </div>
          <div className="footer-links" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {["Agents", "Simulation", "Pricing"].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}>
                {link}
              </a>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Built for operators. By operators.</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Part of the DuckDuck Club ecosystem</span>
        </div>
      </footer>

      {/* ═══ RESPONSIVE ═══ */}
      <style>{`
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .nav-links a:not(:last-child) { display: none !important; }
          .agents-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .pipeline { flex-wrap: wrap !important; gap: 8px !important; }
          .footer-links { display: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .agents-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
