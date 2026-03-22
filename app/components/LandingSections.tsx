"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Zap, Hammer, TrendingUp, UserCheck, Shield, Swords, Check, ArrowRight, ChevronDown, Lock, Layers, Brain, BarChart3 } from "lucide-react";
import { SignuxIcon } from "./SignuxIcon";
import SignuxFooter from "./SignuxFooter";
import { ENGINES } from "../lib/engines";

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
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Fade({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} style={{ opacity: 0, transform: "translateY(16px)", transition: "opacity 0.6s ease, transform 0.6s ease", ...style }}>
      {children}
    </div>
  );
}

/* ═══ Shared styles ═══ */
const SECTION_PAD = { padding: "96px 24px", maxWidth: 1120, margin: "0 auto" } as const;
const SECTION_PAD_M = { padding: "72px 16px", maxWidth: 1120, margin: "0 auto" } as const;
const LABEL: React.CSSProperties = {
  fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
  textTransform: "uppercase", color: "var(--mk-text-tertiary)", marginBottom: 12,
};
const H2: React.CSSProperties = {
  fontFamily: "var(--font-brand)", fontWeight: 600, lineHeight: 1.2, marginBottom: 12,
};
const BODY: React.CSSProperties = {
  fontSize: 16, lineHeight: 1.7, color: "var(--mk-text-secondary)", maxWidth: 600, margin: "0 auto 40px",
};
const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E8E8E3",
  borderRadius: 14, padding: 28, boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
};

const ICON_MAP: Record<string, typeof Zap> = { Zap, Hammer, TrendingUp, UserCheck, Shield, Swords };

const ENGINES_LIST = [
  { ...ENGINES.simulate, id: "simulate" },
  { ...ENGINES.build, id: "build" },
  { ...ENGINES.grow, id: "grow" },
  { ...ENGINES.hire, id: "hire" },
  { ...ENGINES.protect, id: "protect" },
  { ...ENGINES.compete, id: "compete" },
];

/* ═══ MAIN ═══ */
export default function LandingSections() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const sp = isMobile ? SECTION_PAD_M : SECTION_PAD;

  return (
    <div data-surface="below-fold" style={{
      background: "var(--mk-bg)", color: "var(--mk-text)",
      fontFamily: "var(--font-sans)",
    }}>

      {/* ═══ SCROLL BRIDGE ═══ */}
      <div style={{
        height: 64,
        background: "linear-gradient(to bottom, var(--bg-primary), var(--mk-bg))",
      }} />

      {/* ═══ 1. HOW IT WORKS ═══ */}
      <section id="how-it-works" style={sp}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300, lineHeight: 1.25,
              fontSize: isMobile ? 26 : 34, color: "var(--mk-text)", marginBottom: 14,
            }}>
              One question. Ten perspectives. One clear decision.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.7, color: "var(--mk-text-secondary)",
              maxWidth: 600, margin: "0 auto 48px",
            }}>
              You describe what you&apos;re deciding. Signux pressure-tests it through specialist AI agents — and returns a structured result you can act on in under a minute.
            </p>
          </div>

          {/* 3-step cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 16, maxWidth: 780, margin: "0 auto",
          }}>
            {[
              {
                num: "01",
                label: "Ask",
                body: "Describe the decision you\u2019re facing — a new product, a hire, a market move, a risk you\u2019re unsure about. Plain language, no setup required.",
              },
              {
                num: "02",
                label: "Simulate",
                body: "Signux routes your question to the right engine. Each one runs a specialized analysis with its own prompt architecture, domain knowledge, and output schema.",
              },
              {
                num: "03",
                label: "Decide",
                body: "You get a structured result — scores, risks, actions, trade-offs — not a wall of text. Ready to share, ready to act on.",
              },
            ].map((s) => (
              <div key={s.num} style={CARD}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  color: "#1F3A5F", background: "rgba(31,58,95,0.07)",
                  padding: "4px 12px", borderRadius: 20, marginBottom: 14,
                  letterSpacing: 0.5,
                }}>
                  {s.num}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 600, color: "var(--mk-text)", marginBottom: 8,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 14, color: "var(--mk-text-secondary)", lineHeight: 1.65,
                }}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>

          {/* Screenshot / demo stage */}
          <div id="demo" style={{
            maxWidth: 840, margin: "56px auto 0", textAlign: "center",
          }}>
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: "1px solid var(--mk-border)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
              background: "#0A0A0C",
              aspectRatio: "16/9",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* Placeholder — replace with actual screenshot/video */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                color: "rgba(255,255,255,0.3)",
              }}>
                <SignuxIcon size={28} variant="gold" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1 }}>
                  SIGNUX SIMULATION
                </span>
              </div>
            </div>

            {/* Caption row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              maxWidth: 840, margin: "14px auto 0", padding: "0 4px",
            }}>
              <span style={{
                fontSize: 12, color: "var(--mk-text-tertiary)", fontFamily: "var(--font-mono)",
                letterSpacing: 0.3,
              }}>
                Actual Signux simulation
              </span>
              <button
                onClick={() => {
                  const el = document.getElementById("demo");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  fontSize: 12, color: "var(--mk-accent)", fontWeight: 500,
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, display: "flex", alignItems: "center", gap: 4,
                }}
              >
                Watch demo <ArrowRight size={12} />
              </button>
            </div>

            {/* Micro trust line */}
            <div style={{
              fontSize: 12, color: "var(--mk-text-tertiary)",
              marginTop: 20, fontFamily: "var(--font-mono)", letterSpacing: 0.3,
            }}>
              Structured output in under a minute.
            </div>
          </div>
        </Fade>
      </section>

      {/* ═══ 2. SIX ENGINES ═══ */}
      <section id="engines" style={{ ...sp, background: "#FAFAF7" }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 48 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              ENGINES
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Six engines. Every major business decision covered.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              Each engine answers a question founders, operators, and investors face every week.
            </p>
          </div>

          {/* Engine grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 20,
          }}>
            {([
              { num: "01", name: "Simulate", question: "Should I do this?", desc: "Pressure-test a decision before you commit.", chips: ["10 agents", "10 rounds"] },
              { num: "02", name: "Build", question: "How do I build this?", desc: "Turn an idea into an executable plan.", chips: ["Roadmap", "Execution"] },
              { num: "03", name: "Grow", question: "How do I grow this?", desc: "Find the fastest path to better revenue.", chips: ["Channels", "Levers"] },
              { num: "04", name: "Hire", question: "Should I hire this person?", desc: "Decide who to hire, and when.", chips: ["Fit", "Timing"] },
              { num: "05", name: "Protect", question: "What could kill this?", desc: "Find what could break the business next.", chips: ["Risk", "Fragility"] },
              { num: "06", name: "Compete", question: "How do I beat them?", desc: "See how rivals move, and where you can win.", chips: ["Rivals", "Moat"] },
            ] as const).map((engine) => (
              <div
                key={engine.num}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{
                  ...CARD,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column",
                  transition: "border-color 200ms ease, box-shadow 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#D0D0C8";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E8E8E3";
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.04)";
                }}
              >
                {/* Micro-label */}
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
                  color: "#5B5B5B",
                }}>
                  ENGINE {engine.num}
                </span>

                {/* Engine name */}
                <div style={{
                  fontSize: 19, fontWeight: 600, color: "#111111", marginTop: 12,
                }}>
                  {engine.name}
                </div>

                {/* Central question */}
                <div style={{
                  fontSize: 16, fontWeight: 500, color: "#1F3A5F", marginTop: 8,
                }}>
                  {engine.question}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 14, lineHeight: 1.65, color: "#5B5B5B", marginTop: 10,
                }}>
                  {engine.desc}
                </div>

                {/* Chips */}
                <div style={{
                  display: "flex", gap: 8, marginTop: 18,
                }}>
                  {engine.chips.map((chip) => (
                    <span key={chip} style={{
                      fontSize: 11, color: "#5B5B5B",
                      border: "1px solid #E8E8E3", background: "#F8F8F5",
                      borderRadius: 100, padding: "4px 12px",
                    }}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom line + micro CTA */}
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <div style={{ fontSize: 14, color: "#5B5B5B", fontStyle: "italic" }}>
              One interface. Six decision engines.
            </div>
            <div style={{ fontSize: 13, color: "#1F3A5F", marginTop: 8 }}>
              Ask Signux and it routes you to the right engine.
            </div>
          </div>
        </Fade>
      </section>

      {/* ═══ 3. WHY SIGNUX ═══ */}
      <section id="why-signux" style={{ ...sp, background: "#FAFAF7" }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 40 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              WHY SIGNUX
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Not another chatbot. A decision engine.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              Signux is built to structure decisions, pressure-test uncertainty, and return output that is actually usable.
            </p>
          </div>

          {/* Comparison table */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E8E3",
            borderRadius: 16, overflow: "hidden",
            boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
            ...(isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties : {}),
          }}>
            <table style={{
              width: "100%", minWidth: isMobile ? 640 : undefined,
              borderCollapse: "collapse", fontSize: 14,
            }}>
              <thead>
                <tr style={{ background: "#F5F5F2" }}>
                  <th style={{
                    padding: "16px 20px", textAlign: "left", fontSize: 14,
                    fontWeight: 600, color: "#111111", width: "28%",
                  }}>
                    Capability
                  </th>
                  <th style={{
                    padding: "16px 20px", textAlign: "left", fontSize: 14,
                    fontWeight: 600, color: "#111111",
                    background: "rgba(31,58,95,0.03)",
                    borderLeft: "2px solid rgba(31,58,95,0.10)",
                    borderRight: "2px solid rgba(31,58,95,0.10)",
                  }}>
                    Signux AI
                  </th>
                  <th style={{
                    padding: "16px 20px", textAlign: "left", fontSize: 14,
                    fontWeight: 600, color: "#111111",
                  }}>
                    General chatbot
                  </th>
                  <th style={{
                    padding: "16px 20px", textAlign: "left", fontSize: 14,
                    fontWeight: 600, color: "#111111",
                  }}>
                    Traditional advisory
                  </th>
                </tr>
              </thead>
              <tbody>
                {([
                  { cap: "Pressure-test a decision", s: "Structured multi-perspective simulation", c: "Single response", a: "Manual review" },
                  { cap: "Surface key risks", s: "Built-in downside scan", c: "Depends on prompting", a: "Project-based" },
                  { cap: "Compare options quickly", s: "Yes", c: "Partially", a: "Slow" },
                  { cap: "Turn analysis into next action", s: "Built into the output", c: "Not consistently", a: "Depends on engagement" },
                  { cap: "Specialized hiring / growth / risk logic", s: "Engine-specific", c: "General-purpose", a: "Separate process" },
                  { cap: "Show disagreement explicitly", s: "Yes", c: "Usually no", a: "Depends on team dynamics" },
                  { cap: "Improve over time through decision infrastructure", s: "Designed for this", c: "No", a: "Rarely" },
                  { cap: "Time to first useful output", s: "Under a minute", c: "Seconds", a: "Days to weeks" },
                ] as const).map((row, i, arr) => (
                  <tr key={i} style={{
                    borderTop: "1px solid #F0F0EC",
                  }}>
                    <td style={{
                      padding: "16px 20px", color: "#111111", fontSize: 14,
                      fontWeight: 500, lineHeight: 1.5,
                    }}>
                      {row.cap}
                    </td>
                    <td style={{
                      padding: "16px 20px", color: "#1A1A1A", fontSize: 14,
                      lineHeight: 1.5, background: "rgba(31,58,95,0.03)",
                      borderLeft: "2px solid rgba(31,58,95,0.10)",
                      borderRight: "2px solid rgba(31,58,95,0.10)",
                      fontWeight: 500,
                    }}>
                      {row.s}
                    </td>
                    <td style={{
                      padding: "16px 20px", color: "#5B5B5B", fontSize: 14,
                      lineHeight: 1.5,
                    }}>
                      {row.c}
                    </td>
                    <td style={{
                      padding: "16px 20px", color: "#5B5B5B", fontSize: 14,
                      lineHeight: 1.5,
                    }}>
                      {row.a}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnote */}
          <div style={{
            fontSize: 12, color: "#8A8A84", fontStyle: "italic",
            marginTop: 14, textAlign: "center",
          }}>
            Illustrative product comparison for positioning purposes.
          </div>

          {/* Bottom positioning line */}
          <div style={{
            fontSize: 14, color: "#5B5B5B", fontStyle: "italic",
            marginTop: 20, textAlign: "center",
          }}>
            Built for decisions that need more than one answer.
          </div>
        </Fade>
      </section>

      {/* ═══ 4. PRODUCT TRUST ═══ */}
      <section id="trust" style={{ ...sp, background: "#FAFAF7" }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 44 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              TRUST
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Built for real decisions, not just impressive answers.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              Most AI tools generate output. Signux is designed to structure judgment.
            </p>
          </div>

          {/* 2-column layout */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 20, alignItems: "start",
          }}>
            {/* Left — Trust blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([
                { title: "Structured judgment", body: "Signux pressure-tests a decision across multiple specialist perspectives instead of stopping at a single answer." },
                { title: "Visible disagreement", body: "Instead of hiding uncertainty, it shows where the most important tensions are and why they matter." },
                { title: "Decision-ready output", body: "The result is not just analysis. It is probability, risk, leverage, and the best next move." },
              ] as const).map((block) => (
                <div key={block.title} style={{
                  background: "#FFFFFF", border: "1px solid #E8E8E3",
                  borderRadius: 12, padding: 24,
                }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "#111111", marginBottom: 8 }}>
                    {block.title}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "#5B5B5B" }}>
                    {block.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Right — Outcome panel */}
            <div style={{
              background: "#FFFFFF", border: "1px solid #E8E8E3",
              borderRadius: 16, padding: 28,
              boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column",
            }}>
              <span style={{
                fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
                fontWeight: 600, color: "#1F3A5F",
              }}>
                WHAT THE PRODUCT GIVES YOU
              </span>
              <div style={{
                fontSize: isMobile ? 20 : 24, fontWeight: 300,
                lineHeight: 1.3, color: "#111111", marginTop: 12,
              }}>
                Clarity where most teams still guess.
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 14,
                marginTop: 24,
              }}>
                {[
                  "A clearer decision",
                  "A sharper downside view",
                  "A stronger next action",
                  "Less noise, more judgment",
                ].map((item) => (
                  <div key={item} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    fontSize: 15, lineHeight: 1.7, color: "#333333",
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#1F3A5F", flexShrink: 0, opacity: 0.5,
                    }} />
                    {item}
                  </div>
                ))}
              </div>
              <div style={{
                fontSize: 13, color: "#5B5B5B", marginTop: 24,
                paddingTop: 16, borderTop: "1px solid #F0F0EC",
              }}>
                Designed for high-stakes business decisions.
              </div>
            </div>
          </div>

          {/* Bottom line */}
          <div style={{
            fontSize: 14, color: "#5B5B5B", fontStyle: "italic",
            marginTop: 28, textAlign: "center", lineHeight: 1.6,
          }}>
            Designed for founders, operators, and investors making consequential decisions.
          </div>

          {/* Mini trust strip */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center",
            gap: isMobile ? 12 : 24, marginTop: 18,
          }}>
            {["Live product", "Structured simulation", "Decision-ready outputs", "Built for consequential decisions"].map((label) => (
              <span key={label} style={{ fontSize: 12, color: "#777777" }}>
                {label}
              </span>
            ))}
          </div>
        </Fade>
      </section>

      {/* ═══ 5. ARCHITECTURE / MOAT ═══ */}
      <section id="architecture" style={{ ...sp, padding: isMobile ? "76px 16px" : "104px 24px" }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 34 : 44 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              ARCHITECTURE
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 780, margin: "0 auto", marginBottom: 16,
            }}>
              A simulation today. A learning system over time.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 780, margin: "0 auto",
            }}>
              What creates long-term value is not only the interface. It is the decision infrastructure behind it.
            </p>
          </div>

          {/* ── BLOCK 1: LIVE PRODUCT ── */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E8E3",
            borderRadius: 16, padding: isMobile ? 22 : 28,
            boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
          }}>
            {/* Title row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 400, color: "#111111" }}>
                What exists today
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "#166534",
                background: "#EEF6EE", border: "1px solid rgba(22,101,52,0.12)",
                borderRadius: 999, padding: "5px 10px",
              }}>
                LIVE PRODUCT
              </span>
            </div>
            <div style={{ fontSize: 14, color: "#5B5B5B", marginTop: 10, marginBottom: 24 }}>
              The visible product layer already exists.
            </div>

            {/* 2-col content */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 20, alignItems: "start",
            }}>
              {/* Left — product points */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  "10 specialist agents",
                  "10 structured rounds",
                  "Probability, risk, leverage, and next action",
                  "Visible disagreement",
                  "Executive-ready output",
                ].map((item) => (
                  <div key={item} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    fontSize: 15, lineHeight: 1.7, color: "#333333",
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#1F3A5F", flexShrink: 0, opacity: 0.45,
                    }} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Right — framing panel */}
              <div style={{
                background: "#F8F8F5", border: "1px solid #E8E8E3",
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111111", marginBottom: 8 }}>
                  What the user experiences
                </div>
                <div style={{ fontSize: 14, color: "#5B5B5B", lineHeight: 1.7 }}>
                  One business question becomes a structured decision surface in under a minute.
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCK 2: COMPOUNDING LAYER ── */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E8E3",
            borderRadius: 16, padding: isMobile ? 22 : 28,
            boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
            marginTop: 18,
          }}>
            <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 400, color: "#111111" }}>
              What compounds over time
            </div>
            <div style={{ fontSize: 14, color: "#5B5B5B", marginTop: 10, marginBottom: 20 }}>
              The long-term moat comes from the layers behind the visible product.
            </div>

            {/* 8-card grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
              gap: 14,
            }}>
              {([
                { title: "Forecast Contracts", desc: "Turns vague questions into measurable decisions." },
                { title: "Resolver Network", desc: "Defines how outcomes are judged against reality." },
                { title: "Resolution Engine", desc: "Closes the loop once the decision plays out." },
                { title: "Calibration Lab", desc: "Measures forecast quality over time." },
                { title: "Base-Rate Factory", desc: "Brings the outside view into every decision." },
                { title: "Agent Performance Weighting", desc: "Learns which reasoning becomes more reliable." },
                { title: "Memory of Misses", desc: "Stores broken assumptions and repeated error patterns." },
                { title: "Intervention Logic", desc: "Finds the move most likely to change the odds." },
              ] as const).map((card) => (
                <div key={card.title} style={{
                  background: "#F8F8F5", border: "1px solid #E8E8E3",
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111111" }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: "#5B5B5B", marginTop: 8 }}>
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom framing */}
          <div style={{
            fontSize: 14, color: "#5B5B5B", fontStyle: "italic",
            marginTop: 26, textAlign: "center", lineHeight: 1.6,
          }}>
            The visible product creates trust. The architecture creates compounding advantage.
          </div>
          <div style={{
            fontSize: 13, color: "#777777",
            marginTop: 10, textAlign: "center",
          }}>
            This is how Signux evolves from interface into infrastructure.
          </div>
        </Fade>
      </section>

      {/* ═══ 6. FAQ ═══ */}
      <section id="faq" style={{
        ...sp, background: "#FAFAF7",
        maxWidth: 920, margin: "0 auto",
        padding: isMobile ? "72px 16px" : "96px 24px",
      }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              FAQ
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Questions people ask before they trust a new category.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              Clear answers to the questions that matter most.
            </p>
          </div>

          {/* Accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([
              { q: "Is Signux just another chatbot?", a: "No. Signux is designed as a decision engine, not a single-answer interface. The goal is not only to generate text, but to structure judgment." },
              { q: "What makes it different from consulting?", a: "It aims to be faster than traditional advisory processes and more structured than general-purpose chat. The product is designed for speed, clarity, and decision usefulness." },
              { q: "How does it handle uncertainty?", a: "It does not hide uncertainty. It surfaces probability, disagreement, risk, and the move most likely to improve the odds." },
              { q: "Can normal users understand the output?", a: "Yes. The system underneath is complex, but the output is designed to be simple: a clearer decision, the main risk, the key leverage point, and the next action." },
              { q: "Is the product already live?", a: "Yes. The live product exists today, and the architecture behind it is designed to deepen over time." },
              { q: "How does it improve over time?", a: "By adding decision infrastructure such as resolution, calibration, base-rate memory, and error tracking. The long-term goal is not just output, but accumulated judgment quality." },
              { q: "Who is Signux built for?", a: "Founders, operators, and investors making consequential decisions under uncertainty." },
            ] as const).map((faq, i) => (
              <details
                key={i}
                open={i === 0}
                style={{
                  background: "#FFFFFF", border: "1px solid #E8E8E3",
                  borderRadius: 12, overflow: "hidden",
                }}
              >
                <summary style={{
                  fontSize: 16, fontWeight: 500, color: "#111111",
                  cursor: "pointer", listStyle: "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "20px 22px",
                }}>
                  {faq.q}
                  <ChevronDown size={16} color="#8A8A84" style={{ flexShrink: 0, marginLeft: 12 }} />
                </summary>
                <div style={{
                  padding: "0 22px 20px 22px",
                  fontSize: 14, lineHeight: 1.75, color: "#5B5B5B",
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

          {/* Bottom line */}
          <div style={{
            fontSize: 14, color: "#5B5B5B", fontStyle: "italic",
            marginTop: 22, textAlign: "center",
          }}>
            New category. Familiar need.
          </div>
          <div style={{
            fontSize: 13, color: "#777777",
            marginTop: 8, textAlign: "center",
          }}>
            Most important decisions still need more than one answer.
          </div>
        </Fade>
      </section>

      {/* ═══ 7. USE CASES ═══ */}
      <section id="use-cases" style={{ ...sp, background: "#FAFAF7" }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 40 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              USE CASES
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Built for decisions that actually matter.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              The same engine can support launches, growth bets, hiring decisions, risk scans, and competitive moves.
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 20,
          }}>
            {([
              { label: "LAUNCH", title: "Launching a premium brand in Gangnam", body: "Pressure-test whether a high-visibility launch is attractive, fragile, or premature.", tag: "Simulate" },
              { label: "MARKET ENTRY", title: "Choosing between Korea and Brazil expansion", body: "Compare where to move first, what changes the odds, and what could slow execution.", tag: "Build / Simulate" },
              { label: "HIRING", title: "Hiring a VP Sales at the right time", body: "Evaluate role timing, likely upside, hidden downside, and the cost of waiting.", tag: "Hire" },
              { label: "GROWTH", title: "Choosing between performance ads and creators", body: "Decide where the next budget should go and what lever is most likely to move revenue.", tag: "Grow" },
              { label: "RISK", title: "Stress-testing a new product rollout", body: "Find what could break the launch before it becomes expensive to fix.", tag: "Protect" },
              { label: "COMPETITION", title: "Mapping competitor response before launch", body: "See how rivals are likely to react and where the real strategic opening is.", tag: "Compete" },
            ] as const).map((tile) => (
              <div
                key={tile.label}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{
                  background: "#FFFFFF", border: "1px solid #E8E8E3",
                  borderRadius: 14, padding: 24, cursor: "pointer",
                  boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
                  display: "flex", flexDirection: "column",
                  transition: "border-color 200ms ease, box-shadow 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#D0D0C8";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E8E8E3";
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.04)";
                }}
              >
                <span style={{
                  fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5,
                  color: "#5B5B5B", fontWeight: 600,
                }}>
                  {tile.label}
                </span>
                <div style={{
                  fontSize: 16, fontWeight: 600, color: "#111111",
                  lineHeight: 1.35, marginTop: 10,
                }}>
                  {tile.title}
                </div>
                <div style={{
                  fontSize: 14, lineHeight: 1.7, color: "#5B5B5B", marginTop: 10,
                }}>
                  {tile.body}
                </div>
                <div style={{ marginTop: 16 }}>
                  <span style={{
                    fontSize: 11, color: "#5B5B5B",
                    border: "1px solid #E8E8E3", background: "#F8F8F5",
                    borderRadius: 100, padding: "4px 12px",
                  }}>
                    {tile.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom line */}
          <div style={{
            fontSize: 14, color: "#5B5B5B", fontStyle: "italic",
            marginTop: 26, textAlign: "center", lineHeight: 1.6,
          }}>
            One interface. Six engines. Endless decision surfaces.
          </div>
          <div style={{
            fontSize: 13, color: "#777777",
            marginTop: 8, textAlign: "center",
          }}>
            From launch decisions to growth, hiring, risk, and competitive strategy.
          </div>
        </Fade>
      </section>

      {/* ═══ 8. PRICING + CTA ═══ */}
      <section id="pricing" style={{
        ...sp, background: "#FAFAF7",
        padding: isMobile ? "76px 16px" : "104px 24px",
      }}>
        <Fade>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 40 }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600, color: "#B8941F", marginBottom: 14,
            }}>
              PRICING
            </div>
            <h2 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#111111", maxWidth: 760, margin: "0 auto", marginBottom: 16,
            }}>
              Simple pricing. Serious capability.
            </h2>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: "#5B5B5B",
              maxWidth: 760, margin: "0 auto",
            }}>
              Start free. Upgrade when you need more depth, usage, and control.
            </p>
          </div>

          {/* Pricing grid */}
          {(() => {
            const plans = [
              {
                name: "Free", price: "$0", period: "",
                support: "For first-time users",
                features: ["Access the core experience", "Limited usage", "Basic outputs"],
                cta: "Start free", featured: false, note: "",
              },
              {
                name: "Pro", price: "$29", period: "/ month",
                support: "For focused individual use",
                features: ["All six engines", "PDF export", "Save and reload simulations", "Higher usage limits", "Priority email support"],
                cta: "Get Pro", featured: false, note: "",
              },
              {
                name: "Max", price: "$99", period: "/ month",
                support: "For operators and advanced users",
                features: ["Everything in Pro", "More monthly usage", "Advanced simulations", "Custom agent configurations", "Priority support"],
                cta: "Get Max", featured: true, note: "Most popular",
              },
            ];

            return (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 20,
              }}>
                {plans.map((plan) => (
                  <div key={plan.name} style={{
                    background: "#FFFFFF",
                    border: plan.featured ? "2px solid #1F3A5F" : "1px solid #E8E8E3",
                    borderRadius: 16, padding: isMobile ? 24 : 32,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
                    display: "flex", flexDirection: "column",
                    position: "relative",
                  }}>
                    {plan.note && (
                      <span style={{
                        position: "absolute", top: 16, right: 16,
                        fontSize: 11, fontWeight: 600, color: "#FFFFFF",
                        background: "#1F3A5F", borderRadius: 999,
                        padding: "5px 10px",
                      }}>
                        {plan.note}
                      </span>
                    )}
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#111111" }}>
                      {plan.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", marginTop: 12 }}>
                      <span style={{
                        fontSize: isMobile ? 34 : 40, fontWeight: 300, color: "#111111",
                      }}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span style={{ fontSize: 15, color: "#5B5B5B", marginLeft: 4 }}>
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: "#5B5B5B", marginTop: 10, lineHeight: 1.6 }}>
                      {plan.support}
                    </div>
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 10,
                      marginTop: 20, flex: 1,
                    }}>
                      {plan.features.map((f) => (
                        <div key={f} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          fontSize: 14, lineHeight: 1.75, color: "#333333",
                        }}>
                          <Check size={14} color="#1F3A5F" strokeWidth={2} style={{ flexShrink: 0 }} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <Link href="/signup" style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 24, padding: "14px 24px", borderRadius: 10,
                      background: plan.featured ? "#111111" : "#1F3A5F",
                      color: "#FFFFFF", fontWeight: 600, fontSize: 15,
                      textDecoration: "none",
                      transition: "opacity 150ms ease",
                    }}>
                      {plan.cta}
                    </Link>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Footnote */}
          <div style={{
            fontSize: 12, color: "#8A8A84", fontStyle: "italic",
            marginTop: 16, textAlign: "center",
          }}>
            Pricing can evolve with product depth and usage over time.
          </div>

          {/* Final CTA panel */}
          <div style={{
            background: "#1F3A5F", borderRadius: 22,
            padding: isMobile ? "48px 24px" : "72px 48px",
            marginTop: 52, textAlign: "center",
          }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
            }}>
              START
            </div>
            <h3 style={{
              fontFamily: "var(--font-brand)", fontWeight: 300,
              lineHeight: 1.18, fontSize: isMobile ? 24 : 34,
              color: "#FFFFFF", maxWidth: 760, margin: "12px auto 0",
            }}>
              Stop guessing. Start deciding better.
            </h3>
            <p style={{
              fontSize: 16, lineHeight: 1.6,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 620, margin: "16px auto 0",
            }}>
              See what Signux surfaces in under a minute.
            </p>
            <div style={{
              display: "flex", flexWrap: "wrap",
              justifyContent: "center", gap: 12, marginTop: 28,
            }}>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px", borderRadius: 10,
                background: "#FFFFFF", color: "#1F3A5F", fontWeight: 600,
                fontSize: 15, textDecoration: "none",
              }}>
                Start free <ArrowRight size={15} />
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById("demo");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 36px", borderRadius: 10,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#FFFFFF", fontWeight: 500,
                  fontSize: 15, cursor: "pointer",
                }}
              >
                Watch demo
              </button>
            </div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 16,
            }}>
              No credit card required
            </div>
          </div>
        </Fade>
      </section>

      {/* ═══ 9. FOOTER ═══ */}
      <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <SignuxFooter />
      </div>
    </div>
  );
}
