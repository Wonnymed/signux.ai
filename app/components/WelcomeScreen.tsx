"use client";
import { Zap, Search, Rocket, Globe, TrendingUp, ChevronDown, Wrench } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import ChatInput, { type FileAttachment } from "./ChatInput";
import { SignuxIcon } from "./SignuxIcon";
import type { Mode } from "../lib/types";

type WelcomeScreenProps = {
  profileName: string;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  loading: boolean;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onToast?: (msg: string, type: "success" | "error" | "info") => void;
  onSwitchToSimulate?: () => void;
  onSwitchToResearch?: () => void;
  onSwitchMode?: (mode: Mode) => void;
};

/* ═══ Particles ═══ */
const PARTICLES = [
  { top: "15%", left: "20%", size: 1.5, anim: "float1", dur: "8s", delay: "0s" },
  { top: "30%", left: "78%", size: 1, anim: "float2", dur: "10s", delay: "1s" },
  { top: "60%", left: "12%", size: 1.5, anim: "float1", dur: "12s", delay: "2s" },
  { top: "55%", left: "88%", size: 1, anim: "float2", dur: "9s", delay: "3s" },
  { top: "82%", left: "42%", size: 1, anim: "float1", dur: "11s", delay: "1.5s" },
];

/* ═══ Mode Section Data ═══ */
const MODE_SECTIONS: {
  mode: Mode; icon: any; color: string; name: string;
  title: string; desc: string; features: string[];
  ctaLabel: string; textOnColor: string;
}[] = [
  {
    mode: "simulate", icon: Zap, color: "#D4AF37", name: "Simulate",
    title: "Predict outcomes before you invest",
    desc: "15 AI specialist agents analyze your plan from every angle — regulatory, financial, adversarial, operational. Stress-test any decision with God's Eye variable injection.",
    features: ["Multi-agent debate", "Adversarial testing", "Risk scoring", "God's Eye injection", "Agent conversation"],
    ctaLabel: "Open Simulate", textOnColor: "#000",
  },
  {
    mode: "research", icon: Search, color: "#6B8AFF", name: "Deep Research",
    title: "Multi-source intelligence synthesis",
    desc: "Signux plans 6-8 strategic queries, searches across multiple sources, cross-references findings, and compiles a structured report with citations.",
    features: ["Auto-planned queries", "8-12 sources", "Cross-referenced", "Cited report", "PDF export"],
    ctaLabel: "Open Research", textOnColor: "#fff",
  },
  {
    mode: "launchpad", icon: Rocket, color: "#14B8A6", name: "Launchpad",
    title: "From zero to business in 90 days",
    desc: "Tell Signux your skills and budget. We'll find the right business for you, validate it with our simulation engine, generate a complete blueprint, and track your progress week by week.",
    features: ["Skill-to-business matching", "Auto-validation", "90-day blueprint", "Weekly tracking", "Adaptive strategy"],
    ctaLabel: "Start my journey", textOnColor: "#000",
  },
  {
    mode: "globalops", icon: Globe, color: "#22C55E", name: "Global Ops",
    title: "Cross-border operational intelligence",
    desc: "Specialized for international operations — offshore structures, import/export, crypto compliance, tax optimization, jurisdictional arbitrage. Powered by proprietary knowledge across 100+ jurisdictions.",
    features: ["100+ jurisdictions", "Tax structures", "Crypto frameworks", "Trade routes", "Compliance mapping"],
    ctaLabel: "Open Global Ops", textOnColor: "#000",
  },
  {
    mode: "invest", icon: TrendingUp, color: "#A855F7", name: "Invest",
    title: "Quantitative deal evaluation",
    desc: "Evaluate any investment with the formulas hedge funds use — expected value, Kelly criterion, Bayesian updates, base rate analysis. Numbers, not opinions.",
    features: ["Expected value", "Kelly sizing", "Bayesian updates", "DCF / IRR", "Stress testing"],
    ctaLabel: "Open Invest", textOnColor: "#fff",
  },
];

/* ═══ Tools data ═══ */
const TOOLS_ACTIVE = [
  "Pitch Deck Builder", "Financial Model", "Chat with PDF",
  "Business Plan Writer", "Pricing Calculator", "Contract Analyzer",
];
const TOOLS_SOON = [
  "Brand Kit Generator", "Outreach Writer", "Market Sizing", "Ad Copy Agent",
];

/* ═══ Footer data ═══ */
const FOOTER_COLS = [
  { header: "PRODUCT", links: [
    { text: "Chat" }, { text: "Simulate" }, { text: "Deep Research" },
    { text: "Launchpad", badge: "NEW" }, { text: "Global Ops" },
    { text: "Invest" }, { text: "Pricing" },
  ]},
  { header: "SOLUTIONS", links: [
    { text: "For Startups" }, { text: "For Agencies" }, { text: "For E-commerce" },
    { text: "For Freelancers" }, { text: "For Importers" }, { text: "For Investors" },
  ]},
  { header: "LEARN", links: [
    { text: "Blog" }, { text: "Use Cases" }, { text: "Templates" },
    { text: "Whitepaper", badge: "NEW" }, { text: "Help Center" }, { text: "Changelog" },
  ]},
  { header: "COMPANY", links: [
    { text: "About" }, { text: "Affiliates" }, { text: "Careers" },
    { text: "Contact" }, { text: "API Docs" },
  ]},
];

/* ═══ Hex to rgba ═══ */
function hexA(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ═══ Section Divider ═══ */
function Divider() {
  return (
    <div style={{
      height: 1, maxWidth: 600, margin: "0 auto",
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
    }} />
  );
}

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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
            <span>{b.label}</span><span>{b.pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ height: "100%", width: `${b.pct}%`, borderRadius: 2, background: b.color, opacity: 0.7 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 1 }}>Viability</div>
          <div style={{ fontSize: 22, fontFamily: "var(--font-brand)", fontWeight: 700, color: "#D4AF37" }}>7.3</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 1 }}>Est. ROI</div>
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
          <div style={{
            width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
            border: q.done ? "none" : "1.5px solid rgba(255,255,255,0.1)",
            background: q.done ? "rgba(107,138,255,0.3)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {q.done && <span style={{ fontSize: 8, color: "#6B8AFF" }}>&#10003;</span>}
            {q.loading && <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>...</span>}
          </div>
          <span style={{ fontSize: 11, color: q.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)" }}>{q.text}</span>
        </div>
      ))}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4 }}>
          <span>Progress</span><span>55%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
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
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: s.active ? "#14B8A6" : "rgba(255,255,255,0.06)",
              border: s.active ? "none" : "1.5px solid rgba(255,255,255,0.08)",
              boxShadow: s.active ? "0 0 8px rgba(20,184,166,0.3)" : "none",
            }} />
            {i < steps.length - 1 && (
              <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)" }} />
            )}
          </div>
          <div style={{ paddingTop: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: s.active ? 600 : 400,
              color: s.active ? "#14B8A6" : "rgba(255,255,255,0.2)",
            }}>
              {s.label}
            </span>
            {s.active && (
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 2 }}>In progress</div>
            )}
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
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{j.name}</span>
          <span style={{
            fontSize: 12, fontFamily: "var(--font-brand)", fontWeight: 700,
            color: j.pct >= 80 ? "#22C55E" : j.pct >= 70 ? "#f59e0b" : "rgba(255,255,255,0.3)",
          }}>
            {j.pct}%
          </span>
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
        <div key={m.label} style={{
          padding: "10px 8px", borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
          <div style={{ fontSize: 16, fontFamily: "var(--font-brand)", fontWeight: 700, color: m.color }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

const PREVIEW_MAP: Record<string, () => JSX.Element> = {
  simulate: SimulatePreview,
  research: ResearchPreview,
  launchpad: LaunchpadPreview,
  globalops: GlobalOpsPreview,
  invest: InvestPreview,
};

/* ═══ NEW Badge ═══ */
function NewBadge() {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 1,
      background: "rgba(212,175,55,0.12)", color: "#D4AF37",
      padding: "1px 4px", borderRadius: 3, marginLeft: 4,
      textTransform: "uppercase", fontWeight: 700,
    }}>
      NEW
    </span>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function WelcomeScreen({
  input, setInput, onSend, loading, attachments, onAttachmentsChange,
  onToast, onSwitchMode,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile();
  const particleCount = isMobile ? 3 : 5;

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollBehavior: "smooth" }}>

      {/* ════════════════ HERO ════════════════ */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 520, padding: isMobile ? "48px 16px 32px" : "60px 24px 40px",
        position: "relative",
      }}>
        {/* Particles */}
        {PARTICLES.slice(0, particleCount).map((p, i) => (
          <div key={`p-${i}`} style={{
            position: "absolute", top: p.top, left: p.left,
            width: p.size, height: p.size, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", pointerEvents: "none",
            animation: `${p.anim} ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }} />
        ))}

        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(212,175,55,0.012) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 640, width: "100%", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: "1px solid rgba(212,175,55,0.06)",
                animation: "ringPulse 4s ease-in-out infinite",
              }} />
              <SignuxIcon variant="gold" size={44} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: isMobile ? 36 : 40, fontWeight: 700, letterSpacing: 5, color: "#fff" }}>
                SIGNUX
              </span>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: isMobile ? 36 : 40, fontWeight: 300, letterSpacing: 3, color: "#fff", opacity: 0.22, marginLeft: 8 }}>
                AI
              </span>
            </div>
          </div>

          {/* Tagline */}
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 380,
            textAlign: "center", lineHeight: 1.5, marginBottom: 36,
          }}>
            {t("chat.tagline")}
          </p>

          {/* Input */}
          <div style={{ width: "100%", marginBottom: 8 }}>
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => onSend()}
              loading={loading}
              showDisclaimer={false}
              attachments={attachments}
              onAttachmentsChange={onAttachmentsChange}
              onToast={onToast}
              placeholder={t("chat.placeholder")}
            />
          </div>

          {/* Scroll indicator */}
          {!isMobile && (
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: 0.5 }}>
                {t("chat.explore_modes")}
              </span>
              <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.12)", animation: "signuxBob 2s ease-in-out infinite" }} />
            </div>
          )}
        </div>
      </section>

      {/* ════════════════ MODE SECTIONS ════════════════ */}
      {MODE_SECTIONS.map((sec) => {
        const Icon = sec.icon;
        const Preview = PREVIEW_MAP[sec.mode];
        return (
          <div key={sec.mode}>
            <Divider />
            <section style={{ padding: isMobile ? "48px 16px" : "64px 24px", maxWidth: 880, margin: "0 auto" }}>
              <div style={{ display: "flex", gap: 32, alignItems: isMobile ? "stretch" : "flex-start", flexDirection: isMobile ? "column" : "row" }}>

                {/* Left — Text */}
                <div style={{ flex: 1 }}>
                  {/* Badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 4, marginBottom: 14,
                    background: hexA(sec.color, 0.06), color: sec.color,
                    fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
                  }}>
                    <Icon size={10} /> {sec.name}
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontFamily: "var(--font-brand)", fontWeight: 700,
                    fontSize: isMobile ? 24 : 28, letterSpacing: 2,
                    color: "#fff", marginBottom: 6, lineHeight: 1.2,
                  }}>
                    {sec.title}
                  </h2>

                  {/* Description */}
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 500, lineHeight: 1.6, marginBottom: 24 }}>
                    {sec.desc}
                  </p>

                  {/* Feature tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {sec.features.map(f => (
                      <span key={f} style={{
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        color: "rgba(255,255,255,0.25)",
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: hexA(sec.color, 0.4) }} />
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => onSwitchMode?.(sec.mode)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 24px", borderRadius: 50, border: "none",
                      background: sec.color, color: sec.textOnColor,
                      fontSize: 12, fontWeight: 600, fontFamily: "var(--font-brand)",
                      letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <Icon size={14} /> {sec.ctaLabel}
                  </button>
                </div>

                {/* Right — Preview */}
                {!isMobile && (
                  <div style={{
                    width: 280, flexShrink: 0, borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.015)", padding: 16, overflow: "hidden",
                  }}>
                    {Preview && <Preview />}
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      })}

      {/* ════════════════ TOOLS SECTION ════════════════ */}
      <Divider />
      <section style={{ padding: isMobile ? "48px 16px" : "64px 24px", maxWidth: 880, margin: "0 auto" }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 4, marginBottom: 14,
          background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)",
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
        }}>
          <Wrench size={10} /> Tools & Agents
        </div>

        <h2 style={{
          fontFamily: "var(--font-brand)", fontWeight: 700,
          fontSize: 24, letterSpacing: 2, color: "#fff", marginBottom: 6,
        }}>
          Specialized business tools
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          Purpose-built agents for specific tasks.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TOOLS_ACTIVE.map(tool => (
            <span key={tool} style={{
              fontSize: 12, color: "rgba(255,255,255,0.3)",
              padding: "6px 14px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}>
              {tool}
            </span>
          ))}
          {TOOLS_SOON.map(tool => (
            <span key={tool} style={{
              fontSize: 12, color: "rgba(255,255,255,0.3)",
              padding: "6px 14px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
              opacity: 0.4, display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              {tool}
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: 1,
                color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
              }}>
                SOON
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <Divider />
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: isMobile ? "40px 16px 24px" : "48px 24px 32px",
        maxWidth: 880, margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr 1fr 1fr 1fr",
          gap: isMobile ? 32 : 24,
        }}>
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <SignuxIcon variant="gold" size={24} />
              <span style={{ fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700, letterSpacing: 3, color: "#fff" }}>
                SIGNUX <span style={{ fontWeight: 300, opacity: 0.3 }}>AI</span>
              </span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", maxWidth: 200, lineHeight: 1.5 }}>
              Think through any business decision before you make it.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map(col => (
            <div key={col.header}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
                marginBottom: 12,
              }}>
                {col.header}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {col.links.map(link => (
                  <span key={link.text} style={{
                    fontSize: 12, color: "rgba(255,255,255,0.3)",
                    padding: "3px 0", cursor: "pointer",
                    transition: "color 0.15s",
                    display: "inline-flex", alignItems: "center",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                  >
                    {link.text}
                    {"badge" in link && link.badge && <NewBadge />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 20, marginTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
            &copy; 2026 Signux AI. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Terms", "Privacy", "Security"].map(link => (
              <span key={link} style={{
                fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer",
                transition: "color 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
