"use client";
import { useState } from "react";
import { Rocket, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";

type BusinessIdea = {
  name: string;
  matchScore: number;
  description: string;
  whyItMatches: string[];
  estimatedTimeToRevenue: string;
  capitalNeeded: string;
  riskLevel: string;
};

type LaunchpadPhase = "welcome" | "discovery" | "analyzing" | "results";

const TEAL = "#14B8A6";
const tealAlpha = (a: number) => `rgba(20,184,166,${a})`;

const TRAJECTORY_LINES = [
  { left: "8%", height: 40, delay: 0, dur: 6 },
  { left: "25%", height: 55, delay: 1.2, dur: 7 },
  { left: "42%", height: 35, delay: 2.5, dur: 6.5 },
  { left: "60%", height: 50, delay: 0.8, dur: 7.5 },
  { left: "78%", height: 30, delay: 3, dur: 6 },
  { left: "92%", height: 45, delay: 1.8, dur: 8 },
];

const JOURNEY_STEPS = ["Discovery", "Validation", "Blueprint", "Launch", "Track", "Scale"];

const SKILL_PILLS = ["Design", "Programming", "Writing", "Marketing", "Sales", "Finance", "Teaching", "Cooking"];

const TIME_OPTIONS = [
  { label: "Full-time (40h+/week)", value: "full-time" },
  { label: "Part-time (15-25h/week)", value: "part-time" },
  { label: "Side project (5-10h/week)", value: "side-project" },
];

const CAPITAL_OPTIONS = [
  { label: "Under $1K", value: "under-1k" },
  { label: "$1K - $5K", value: "1k-5k" },
  { label: "$5K - $20K", value: "5k-20k" },
  { label: "$20K+", value: "20k-plus" },
];

const PRIORITY_OPTIONS = ["Freedom", "Income", "Impact", "Creativity", "Scalability", "Low stress"];

export default function LaunchpadView({ lang }: { lang: string }) {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<LaunchpadPhase>("welcome");
  const [questionIndex, setQuestionIndex] = useState(0);

  // Discovery answers
  const [skills, setSkills] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("");
  const [capital, setCapital] = useState("");
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [priorities, setPriorities] = useState<string[]>([]);

  // Results
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [error, setError] = useState("");

  const startDiscovery = (persona?: string) => {
    if (persona === "scale") {
      setSkills("Already have a running business");
      setQuestionIndex(1);
    }
    setPhase("discovery");
  };

  const canProceed = () => {
    switch (questionIndex) {
      case 0: return skills.trim().length > 0;
      case 1: return timeAvailable !== "";
      case 2: return capital !== "";
      case 3: return true; // slider always has a value
      case 4: return priorities.length > 0;
      default: return false;
    }
  };

  const nextQuestion = () => {
    if (questionIndex < 4) {
      setQuestionIndex(prev => prev + 1);
    } else {
      runDiscovery();
    }
  };

  const prevQuestion = () => {
    if (questionIndex > 0) setQuestionIndex(prev => prev - 1);
  };

  const togglePriority = (p: string) => {
    setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const runDiscovery = async () => {
    setPhase("analyzing");
    setError("");
    try {
      const res = await fetch("/api/launchpad/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, timeAvailable, capital, riskTolerance, priorities, lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setIdeas(data.ideas || []);
      setPhase("results");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setPhase("results");
    }
  };

  const reset = () => {
    setPhase("welcome");
    setQuestionIndex(0);
    setSkills("");
    setTimeAvailable("");
    setCapital("");
    setRiskTolerance(5);
    setPriorities([]);
    setIdeas([]);
    setError("");
  };

  /* ═══ WELCOME STATE ═══ */
  if (phase === "welcome") {
    const personas = [
      { tag: "CAREER CHANGE", color: TEAL, desc: "I have skills but no business idea yet", persona: "career" },
      { tag: "SIDE PROJECT", color: "#f59e0b", desc: "I have an idea and want to validate it", persona: "side" },
      { tag: "SCALE UP", color: "#3b82f6", desc: "I already started but need structure to grow", persona: "scale" },
    ];

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 16px 32px" : "32px 24px 40px",
        position: "relative", overflow: "hidden",
        minHeight: "calc(100vh - 60px)",
      }}>
        {/* Trajectory particles */}
        {TRAJECTORY_LINES.map((line, i) => (
          <div key={`tl-${i}`} style={{
            position: "absolute", left: line.left, width: 2,
            height: line.height, pointerEvents: "none",
            background: `linear-gradient(to top, ${tealAlpha(0.3)}, transparent)`,
            animation: `moveUp ${line.dur}s linear infinite`,
            animationDelay: `${line.delay}s`,
          }} />
        ))}

        <div style={{ maxWidth: 720, width: "100%", position: "relative", zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeIn 0.4s ease-out" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              border: `1px solid ${tealAlpha(0.15)}`,
              background: tealAlpha(0.04),
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Rocket size={28} style={{ color: TEAL }} />
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 32 : 42, fontWeight: 700,
                letterSpacing: 8, color: "#fff",
              }}>LAUNCH</span>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 32 : 42, fontWeight: 300,
                letterSpacing: 4, color: "#fff", opacity: 0.3, marginLeft: 8,
              }}>PAD</span>
            </div>

            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3,
              textTransform: "uppercase", color: tealAlpha(0.6), marginTop: 12,
            }}>
              {t("launchpad.subtitle")}
            </div>

            <div style={{
              width: 48, height: 1,
              background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
              margin: "20px auto 0",
            }} />
          </div>

          {/* ── JOURNEY PREVIEW ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 0, marginBottom: 40, animation: "fadeIn 0.5s ease-out",
            overflowX: "auto", padding: "0 8px",
          }}>
            {JOURNEY_STEPS.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{
                    width: isMobile ? 12 : 24, height: 1,
                    background: tealAlpha(0.15),
                  }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: i === 0 ? `1px solid ${tealAlpha(0.4)}` : "1px solid rgba(255,255,255,0.08)",
                    background: i === 0 ? tealAlpha(0.15) : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                    color: i === 0 ? TEAL : "rgba(255,255,255,0.2)",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                    textTransform: "uppercase",
                    color: i === 0 ? tealAlpha(0.7) : "rgba(255,255,255,0.2)",
                    whiteSpace: "nowrap",
                  }}>
                    {step}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── CENTRAL TEXT ── */}
          <div style={{
            textAlign: "center", maxWidth: 520, margin: "0 auto 40px",
            fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
            animation: "fadeIn 0.55s ease-out",
          }}>
            {t("launchpad.central_text")}
          </div>

          {/* ── PERSONA CARDS ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 10, marginBottom: 32,
            animation: "fadeIn 0.6s ease-out",
          }}>
            {personas.map(p => {
              const r = parseInt(p.color.slice(1, 3), 16);
              const g = parseInt(p.color.slice(3, 5), 16);
              const b = parseInt(p.color.slice(5, 7), 16);
              const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
              return (
                <button
                  key={p.tag}
                  onClick={() => startDiscovery(p.persona)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "16px",
                    cursor: "pointer", transition: "all 200ms",
                    textAlign: "left", borderLeft: "2px solid transparent",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = rgba(0.2);
                    e.currentTarget.style.borderLeftColor = p.color;
                    e.currentTarget.style.background = rgba(0.03);
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderLeftColor = "transparent";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.color }} />
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                      textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
                    }}>{p.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── CTA ── */}
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <button
              onClick={() => startDiscovery()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: TEAL, color: "#fff", border: "none", borderRadius: 50,
                padding: "14px 36px",
                fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 14,
                letterSpacing: 2, textTransform: "uppercase",
                cursor: "pointer", transition: "all 200ms",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.filter = "brightness(1.15)";
                e.currentTarget.style.boxShadow = `0 0 30px ${tealAlpha(0.25)}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Rocket size={16} />
              {t("launchpad.cta")}
            </button>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 16 }}>
              {t("launchpad.disclaimer")}
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ═══ DISCOVERY STATE ═══ */
  if (phase === "discovery") {
    const renderQuestion = () => {
      switch (questionIndex) {
        case 0:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{
                fontSize: 20, fontWeight: 600, color: "var(--text-primary)",
                marginBottom: 24, lineHeight: 1.4,
              }}>
                {t("launchpad.q1")}
              </div>
              <textarea
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder={t("launchpad.q1_placeholder")}
                autoFocus
                style={{
                  width: "100%", minHeight: 80, padding: 16,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${tealAlpha(0.12)}`,
                  borderRadius: 12, color: "var(--text-primary)",
                  fontSize: 15, lineHeight: 1.6, resize: "none", outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = tealAlpha(0.3)}
                onBlur={e => { if (!skills.trim()) e.currentTarget.style.borderColor = tealAlpha(0.12); }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {SKILL_PILLS.map(s => (
                  <button key={s} onClick={() => setSkills(prev => prev ? `${prev}, ${s}` : s)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.4)", fontSize: 12,
                    cursor: "pointer", transition: "all 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = tealAlpha(0.2); e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                  >{s}</button>
                ))}
              </div>
            </div>
          );

        case 1:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q2")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIME_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setTimeAvailable(opt.value)} style={{
                    padding: "16px 20px", borderRadius: 12, textAlign: "left",
                    border: timeAvailable === opt.value ? `1px solid ${tealAlpha(0.4)}` : "1px solid rgba(255,255,255,0.06)",
                    background: timeAvailable === opt.value ? tealAlpha(0.06) : "rgba(255,255,255,0.02)",
                    color: timeAvailable === opt.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                    fontSize: 14, cursor: "pointer", transition: "all 200ms",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: timeAvailable === opt.value ? `2px solid ${TEAL}` : "1px solid rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {timeAvailable === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEAL }} />}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );

        case 2:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q3")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {CAPITAL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setCapital(opt.value)} style={{
                    padding: "16px 20px", borderRadius: 12, textAlign: "center",
                    border: capital === opt.value ? `1px solid ${tealAlpha(0.4)}` : "1px solid rgba(255,255,255,0.06)",
                    background: capital === opt.value ? tealAlpha(0.06) : "rgba(255,255,255,0.02)",
                    color: capital === opt.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                    fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 200ms",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );

        case 3:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q4")}
              </div>
              <div style={{ padding: "0 8px" }}>
                <input
                  type="range" min={1} max={10} value={riskTolerance}
                  onChange={e => setRiskTolerance(Number(e.target.value))}
                  style={{ width: "100%", accentColor: TEAL }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("launchpad.conservative")}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: TEAL }}>{riskTolerance}/10</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("launchpad.aggressive")}</span>
                </div>
              </div>
            </div>
          );

        case 4:
          return (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24, lineHeight: 1.4 }}>
                {t("launchpad.q5")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRIORITY_OPTIONS.map(p => (
                  <button key={p} onClick={() => togglePriority(p)} style={{
                    padding: "10px 18px", borderRadius: 24,
                    border: priorities.includes(p) ? `1px solid ${tealAlpha(0.4)}` : "1px solid rgba(255,255,255,0.08)",
                    background: priorities.includes(p) ? tealAlpha(0.08) : "rgba(255,255,255,0.02)",
                    color: priorities.includes(p) ? TEAL : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: priorities.includes(p) ? 600 : 400,
                    cursor: "pointer", transition: "all 150ms",
                  }}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 12 }}>
                {t("launchpad.select_multiple")}
              </div>
            </div>
          );

        default: return null;
      }
    };

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 16px 32px" : "40px 24px",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{ maxWidth: 560, width: "100%" }}>

          {/* Progress */}
          <div style={{ display: "flex", gap: 4, marginBottom: 40 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= questionIndex ? TEAL : "rgba(255,255,255,0.06)",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>

          {/* Step indicator */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
            textTransform: "uppercase", color: tealAlpha(0.5), marginBottom: 24,
          }}>
            {t("launchpad.step")} {questionIndex + 1} / 5
          </div>

          {renderQuestion()}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <button
              onClick={questionIndex === 0 ? reset : prevQuestion}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "10px 18px",
                color: "rgba(255,255,255,0.4)", fontSize: 13,
                cursor: "pointer", transition: "all 150ms",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            >
              <ChevronLeft size={14} />
              {questionIndex === 0 ? t("launchpad.back") : t("launchpad.previous")}
            </button>

            <button
              onClick={nextQuestion}
              disabled={!canProceed()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: canProceed() ? TEAL : tealAlpha(0.2),
                border: "none", borderRadius: 8, padding: "10px 24px",
                color: canProceed() ? "#fff" : "rgba(255,255,255,0.3)",
                fontSize: 13, fontWeight: 600,
                cursor: canProceed() ? "pointer" : "not-allowed",
                transition: "all 200ms",
              }}
            >
              {questionIndex === 4 ? t("launchpad.analyze") : t("launchpad.next")}
              <ChevronRight size={14} />
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ═══ ANALYZING STATE ═══ */
  if (phase === "analyzing") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.3s ease-out" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            border: `1px solid ${tealAlpha(0.2)}`, background: tealAlpha(0.05),
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <span className="spinner" style={{
              width: 24, height: 24, borderWidth: 2,
              borderColor: tealAlpha(0.2), borderTopColor: TEAL,
            }} />
          </div>
          <div style={{
            fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)", marginBottom: 8,
          }}>
            {t("launchpad.analyzing")}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {t("launchpad.analyzing_desc")}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ RESULTS STATE ═══ */
  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: isMobile ? "24px 16px" : "40px 24px",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ maxWidth: 720, width: "100%" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 32, animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: tealAlpha(0.15), display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Check size={14} style={{ color: TEAL }} />
          </div>
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)",
          }}>
            {t("launchpad.results_title")}
          </span>
        </div>

        {error ? (
          <div style={{
            padding: 20, borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)",
            color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24,
          }}>
            {error}
          </div>
        ) : (
          <div style={{
            fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 28,
          }}>
            {t("launchpad.results_desc")}
          </div>
        )}

        {/* Idea cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          {ideas.map((idea, i) => {
            const scoreColor = idea.matchScore >= 80 ? "#22c55e" : idea.matchScore >= 60 ? "#f59e0b" : "#ef4444";
            return (
              <div key={i} style={{
                padding: 20, borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                animation: `fadeInUp 0.3s ease-out`,
                animationDelay: `${i * 0.1}s`,
                animationFillMode: "both",
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: isMobile ? "flex-start" : "center" }}>
                  {/* Score circle */}
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    border: `2px solid ${scoreColor}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                      {idea.matchScore}
                    </span>
                    <span style={{ fontSize: 8, color: scoreColor, opacity: 0.7 }}>%</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      {idea.name}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      {idea.description}
                    </div>
                  </div>
                </div>

                {/* Why it matches */}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5,
                    textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8,
                  }}>
                    Why it matches
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {idea.whyItMatches?.map((reason, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        <Check size={12} style={{ color: TEAL, flexShrink: 0, marginTop: 2 }} />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meta */}
                <div style={{
                  display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap",
                }}>
                  {[
                    { label: "Revenue in", value: idea.estimatedTimeToRevenue },
                    { label: "Capital", value: idea.capitalNeeded },
                    { label: "Risk", value: idea.riskLevel },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{m.label}:</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={reset} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "10px 20px",
            color: "rgba(255,255,255,0.5)", fontSize: 13,
            cursor: "pointer",
          }}>
            <Rocket size={14} /> {t("launchpad.start_over")}
          </button>
        </div>
      </div>
    </div>
  );
}
