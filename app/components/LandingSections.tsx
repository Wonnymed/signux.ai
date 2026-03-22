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
      <section style={{ ...sp, background: "var(--mk-card)" }}>
        <Fade>
          <div style={{ textAlign: "center" }}>
            <div style={LABEL}>Built for trust</div>
            <h2 style={{ ...H2, fontSize: isMobile ? 26 : 36, color: "var(--mk-text)" }}>
              Intelligence you can rely on
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 16, maxWidth: 720, margin: "0 auto",
          }}>
            {[
              { icon: Lock, title: "Private by default", desc: "Your data stays yours. No training on your inputs. No sharing across accounts." },
              { icon: BarChart3, title: "Confidence scoring", desc: "Every result includes a confidence level. You always know how certain the analysis is." },
              { icon: Brain, title: "Domain knowledge", desc: "Each engine draws from a proprietary knowledge base. Not just generic internet data." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{ ...CARD, textAlign: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "rgba(31,58,95,0.06)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px",
                  }}>
                    <Icon size={20} color="var(--mk-accent)" strokeWidth={1.5} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--mk-text)", marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </Fade>
      </section>

      {/* ═══ 5. ARCHITECTURE / MOAT ═══ */}
      <section style={sp}>
        <Fade>
          <div style={{ textAlign: "center" }}>
            <div style={LABEL}>Architecture</div>
            <h2 style={{ ...H2, fontSize: isMobile ? 26 : 36, color: "var(--mk-text)" }}>
              Purpose-built, not prompt-wrapped
            </h2>
            <p style={BODY}>
              Each engine has its own system prompt, output schema, domain knowledge base, and visual result renderer. This is not a generic chatbot with different skins.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 14, maxWidth: 680, margin: "0 auto",
          }}>
            {[
              { title: "Proprietary knowledge base", desc: "Months of curated business frameworks, competitive strategy, risk detection, and negotiation models." },
              { title: "Structured JSON output", desc: "Every engine returns structured data — not paragraphs. Visual cards, scores, matrices, and action lists." },
              { title: "Engine-specific prompt architecture", desc: "Each engine has a different system prompt optimized for its decision type. Not one-size-fits-all." },
              { title: "Fallback-safe parsing", desc: "If the AI returns text instead of JSON, the result renders as clean markdown. The user never sees an error." },
            ].map((item, i) => (
              <div key={i} style={CARD}>
                <Layers size={16} color="var(--mk-accent)" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)", marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Fade>
      </section>

      {/* ═══ 6. FAQ ═══ */}
      <section style={{ ...sp, background: "var(--mk-card)" }}>
        <Fade>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={LABEL}>FAQ</div>
            <h2 style={{ ...H2, fontSize: isMobile ? 26 : 36, color: "var(--mk-text)" }}>
              Common questions
            </h2>
          </div>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { q: "How is this different from ChatGPT?", a: "ChatGPT is a general chatbot. Signux is a decision intelligence platform with 6 specialized engines, each with its own prompt architecture, output schema, and domain knowledge. You get structured results, not paragraphs." },
              { q: "Is my data private?", a: "Yes. Your inputs are not used for training. Your conversations are not shared across accounts. We use Anthropic's Claude API with data privacy protections." },
              { q: "Do I need to know which engine to use?", a: "No. You can type any question into the main input and Signux will route it to the right engine. Or you can choose an engine directly if you know what you need." },
              { q: "What does the free tier include?", a: "The free tier gives you access to all 6 engines with a limited number of analyses per month. Upgrade to Pro or Max for higher limits and more powerful models." },
              { q: "Can I use this for my team?", a: "Currently Signux is individual accounts. Team features with shared analysis and decision tracking are on the roadmap." },
            ].map((faq, i, arr) => (
              <details
                key={i}
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid var(--mk-border)" : "none",
                  padding: "16px 0",
                }}
              >
                <summary style={{
                  fontSize: 15, fontWeight: 500, color: "var(--mk-text)",
                  cursor: "pointer", listStyle: "none", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                }}>
                  {faq.q}
                  <ChevronDown size={16} color="var(--mk-text-tertiary)" style={{ flexShrink: 0, marginLeft: 12 }} />
                </summary>
                <p style={{ fontSize: 14, color: "var(--mk-text-secondary)", lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </Fade>
      </section>

      {/* ═══ 7. USE CASES ═══ */}
      <section style={sp}>
        <Fade>
          <div style={{ textAlign: "center" }}>
            <div style={LABEL}>Use cases</div>
            <h2 style={{ ...H2, fontSize: isMobile ? 26 : 36, color: "var(--mk-text)" }}>
              Built for real decisions
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 14,
          }}>
            {[
              { title: "Founders", desc: "Validate ideas, plan execution, evaluate hires, and scan risks before committing resources." },
              { title: "Operators", desc: "Find growth levers, detect operational fragilities, and build execution plans for the next quarter." },
              { title: "Investors", desc: "Evaluate competitive landscapes, stress-test business models, and identify deal red flags." },
              { title: "Product teams", desc: "Pressure-test feature decisions, map competitive positioning, and prioritize with structured analysis." },
              { title: "Consultants", desc: "Deliver client-ready competitive analysis, risk assessments, and growth strategies in minutes." },
              { title: "Solo operators", desc: "Get the strategic analysis that used to require a team of analysts. All six engines, one subscription." },
            ].map((uc, i) => (
              <div key={i} style={CARD}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)", marginBottom: 4 }}>{uc.title}</div>
                <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>{uc.desc}</div>
              </div>
            ))}
          </div>
        </Fade>
      </section>

      {/* ═══ 8. PRICING + CTA ═══ */}
      <section style={{ ...sp, background: "var(--mk-card)" }}>
        <Fade>
          <div style={{ textAlign: "center" }}>
            <div style={LABEL}>Pricing</div>
            <h2 style={{ ...H2, fontSize: isMobile ? 26 : 36, color: "var(--mk-text)" }}>
              Simple pricing. Powerful intelligence.
            </h2>
            <p style={{ ...BODY, marginBottom: 48 }}>
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 20, maxWidth: 600, margin: "0 auto 48px",
          }}>
            {/* Pro */}
            <div style={{
              ...CARD, border: "2px solid var(--mk-accent)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-accent)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>PRO</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: "var(--mk-text)" }}>$29</span>
                <span style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>/month</span>
              </div>
              {["All 6 engines", "20 simulations/month", "10 deep researches", "Priority response times"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Check size={14} color="#22863a" />
                  <span style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>{f}</span>
                </div>
              ))}
              <Link href="/pricing" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 20, padding: "12px 24px", borderRadius: 8,
                background: "var(--mk-accent)", color: "#FFFFFF", fontWeight: 600,
                fontSize: 14, textDecoration: "none",
              }}>
                Get Pro <ArrowRight size={14} />
              </Link>
            </div>
            {/* Max */}
            <div style={{
              ...CARD, border: "2px solid #6E4AE2",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6E4AE2", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>MAX</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: "var(--mk-text)" }}>$99</span>
                <span style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>/month</span>
              </div>
              {["Everything unlimited", "Most powerful AI model", "New features first", "Priority support"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Check size={14} color="#6E4AE2" />
                  <span style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>{f}</span>
                </div>
              ))}
              <Link href="/pricing" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 20, padding: "12px 24px", borderRadius: 8,
                background: "#6E4AE2", color: "#FFFFFF", fontWeight: 600,
                fontSize: 14, textDecoration: "none",
              }}>
                Get Max <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Final CTA */}
          <div style={{ textAlign: "center", paddingTop: 24 }}>
            <h3 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 600, color: "var(--mk-text)", marginBottom: 12, fontFamily: "var(--font-brand)" }}>
              Stop guessing. Start knowing.
            </h3>
            <p style={{ fontSize: 15, color: "var(--mk-text-secondary)", marginBottom: 24 }}>
              Describe your next decision. See what Signux finds in 30 seconds.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 36px", borderRadius: 8,
                background: "var(--mk-accent)", color: "#FFFFFF", fontWeight: 600,
                fontSize: 15, border: "none", cursor: "pointer",
                fontFamily: "var(--font-brand)", letterSpacing: 0.5,
              }}
            >
              Start free <ArrowRight size={16} />
            </button>
            <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginTop: 12 }}>
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
