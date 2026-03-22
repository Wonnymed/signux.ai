"use client";
import { useState, useRef, useEffect } from "react";
import { UserCheck, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Copy, Check, ShieldAlert, Star, HelpCircle, Clock, Briefcase } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES } from "../lib/engines";
import { signuxFetch } from "../lib/api-client";
import type { EngineResponse } from "../lib/types";

const ENGINE = ENGINES.hire;

const REC_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  hire_now:          { label: "Hire Now",           color: "var(--positive)", bg: "rgba(62,207,142,0.08)",  border: "rgba(62,207,142,0.2)" },
  interview_further: { label: "Interview Further",  color: "var(--warning)",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  delay_hire:        { label: "Delay Hire",          color: "#F97316",         bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
  reject:            { label: "Reject",              color: "var(--negative)", bg: "rgba(247,91,91,0.08)",  border: "rgba(247,91,91,0.2)" },
  use_contractor:    { label: "Use Contractor",      color: "#6E9AFF",         bg: "rgba(110,154,255,0.08)",border: "rgba(110,154,255,0.2)" },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "var(--text-tertiary)",
  medium: "var(--warning)",
  high: "var(--negative)",
  critical: "#DC2626",
};

const CLARITY_CONFIG: Record<string, { color: string; bg: string }> = {
  low:    { color: "var(--negative)", bg: "rgba(247,91,91,0.08)" },
  medium: { color: "var(--warning)",  bg: "rgba(245,158,11,0.08)" },
  high:   { color: "var(--positive)", bg: "rgba(62,207,142,0.08)" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  low: "var(--negative)",
  medium: "var(--warning)",
  high: "var(--positive)",
};

type HireResult = EngineResponse & {
  recommendation?: string;
  recommendation_rationale?: string;
  scores?: { candidate_fit: number; timing: number; role_clarity: string };
  red_flags?: { flag: string; severity: string; detail: string }[];
  strengths?: { strength: string; impact: string }[];
  missing_capabilities?: string[];
  interview_focus_points?: { question_area: string; why: string; sample_question: string }[];
};

/* ═══ Score Gauge ═══ */
function ScoreGauge({ label, value, max = 10, icon }: { label: string; value: number; max?: number; icon: React.ReactNode }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 7 ? "var(--positive)" : value >= 5 ? "var(--warning)" : "var(--negative)";
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: "var(--bg-card)", border: "1px solid var(--border-primary)",
      flex: 1, minWidth: 120,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 300, color, fontFamily: "var(--font-mono)" }}>
          {value}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          /{max}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "var(--border-secondary)" }}>
        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: color, transition: "width 500ms ease" }} />
      </div>
    </div>
  );
}

export default function HireEngine({ lang }: { lang?: string }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HireResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await signuxFetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), lang }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const rec = REC_CONFIG[result.recommendation || ""] || { label: result.recommendation || "" };
    const text = [
      `# ${result.title}`,
      result.executive_summary,
      "",
      `Recommendation: ${rec.label}`,
      result.recommendation_rationale,
      "",
      result.scores ? `Candidate Fit: ${result.scores.candidate_fit}/10 | Timing: ${result.scores.timing}/10 | Role Clarity: ${result.scores.role_clarity}` : "",
      "",
      "## Red Flags",
      ...(result.red_flags || []).map(f => `- [${f.severity}] ${f.flag}: ${f.detail}`),
      "",
      "## Strengths",
      ...(result.strengths || []).map(s => `- ${s.strength}: ${s.impact}`),
      "",
      "## Interview Focus",
      ...(result.interview_focus_points || []).map((p, i) => `${i + 1}. ${p.question_area} — ${p.sample_question}`),
      "",
      "## Next Actions",
      ...(result.next_actions || []).map((a, i) => `${i + 1}. ${a}`),
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setResult(null);
    setQuery("");
    setError("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  /* ═══ INPUT VIEW ═══ */
  if (!result) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", minHeight: "100%",
        padding: isMobile ? "0 16px" : "0 32px",
        paddingTop: isMobile ? "8vh" : "clamp(60px, 14vh, 160px)",
      }}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 8,
            }}>
              <UserCheck size={20} strokeWidth={1.5} style={{ color: ENGINE.color }} />
              <span style={{
                fontSize: 24, fontWeight: 300, letterSpacing: 6,
                color: "var(--text-primary)", fontFamily: "var(--font-brand)",
              }}>
                {ENGINE.name.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
              {ENGINE.subtitle}
            </p>
          </div>

          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 12, padding: 2, marginBottom: 16,
          }}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ENGINE.placeholder}
              rows={4}
              style={{
                width: "100%", padding: "14px 16px", background: "transparent",
                border: "none", outline: "none", resize: "vertical",
                color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6,
                fontFamily: "var(--font-sans)", minHeight: 100,
              }}
            />
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20,
            justifyContent: "center",
          }}>
            {ENGINE.chips.map(chip => (
              <span key={chip} style={{
                fontSize: 11, color: "var(--text-tertiary)",
                padding: "4px 10px", borderRadius: 100,
                border: "1px solid var(--border-secondary)",
                fontFamily: "var(--font-mono)", letterSpacing: 0.3,
              }}>
                {chip}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || loading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 28px", borderRadius: 8,
                background: query.trim() ? "var(--accent)" : "var(--bg-secondary)",
                color: query.trim() ? "#09090B" : "var(--text-tertiary)",
                border: "none", cursor: query.trim() ? "pointer" : "default",
                fontSize: 13, fontWeight: 500, transition: "all 150ms",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <UserCheck size={15} />}
              {loading ? "Evaluating..." : ENGINE.cta}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 8,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              color: "var(--negative)", fontSize: 13, textAlign: "center",
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ RESULT VIEW ═══ */
  const rec = REC_CONFIG[result.recommendation || ""] || REC_CONFIG.interview_further;
  const scores = result.scores;
  const redFlags = result.red_flags || [];
  const strengths = result.strengths || [];
  const missing = result.missing_capabilities || [];
  const interviewPoints = result.interview_focus_points || [];
  const clarity = scores?.role_clarity || "medium";
  const clarityConf = CLARITY_CONFIG[clarity] || CLARITY_CONFIG.medium;

  return (
    <div ref={resultRef} style={{
      maxWidth: 720, margin: "0 auto", padding: isMobile ? "24px 16px 80px" : "40px 32px 80px",
      animation: "fadeInUp 0.3s ease-out",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <button onClick={handleReset} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-primary)",
          background: "transparent", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
        }}>
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
          New evaluation
        </button>
        <button onClick={handleCopy} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-primary)",
          background: "transparent", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: isMobile ? 20 : 24, fontWeight: 400, color: "var(--text-primary)",
        marginBottom: 8, lineHeight: 1.3,
      }}>
        {result.title}
      </h1>

      {/* Meta badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)",
          color: CONFIDENCE_COLORS[result.confidence] || "var(--text-tertiary)",
        }}>
          {result.confidence} confidence
        </span>
      </div>

      {/* Executive summary */}
      <div style={{
        padding: "16px 20px", borderRadius: 10,
        background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        marginBottom: 20, fontSize: 14, lineHeight: 1.7,
        color: "var(--text-secondary)",
      }}>
        {result.executive_summary}
      </div>

      {/* Recommendation badge */}
      <div style={{
        padding: "16px 20px", borderRadius: 10,
        background: rec.bg, border: `1px solid ${rec.border}`,
        marginBottom: 20, display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: rec.bg, border: `1px solid ${rec.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <UserCheck size={20} style={{ color: rec.color }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: rec.color, marginBottom: 2 }}>
            {rec.label}
          </div>
          {result.recommendation_rationale && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {result.recommendation_rationale}
            </div>
          )}
        </div>
      </div>

      {/* Score cards */}
      {scores && (
        <div style={{
          display: "flex", gap: 10, marginBottom: 24,
          flexDirection: isMobile ? "column" : "row",
        }}>
          <ScoreGauge label="Candidate Fit" value={scores.candidate_fit} icon={<Star size={12} style={{ color: "var(--text-tertiary)" }} />} />
          <ScoreGauge label="Timing" value={scores.timing} icon={<Clock size={12} style={{ color: "var(--text-tertiary)" }} />} />
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            flex: 1, minWidth: 120,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Briefcase size={12} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                Role clarity
              </span>
            </div>
            <span style={{
              fontSize: 13, fontFamily: "var(--font-mono)", padding: "4px 12px",
              borderRadius: 100, background: clarityConf.bg, color: clarityConf.color,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {clarity}
            </span>
          </div>
        </div>
      )}

      {/* Red flags */}
      {redFlags.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <ShieldAlert size={12} style={{ color: "var(--negative)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--negative)", textTransform: "uppercase",
            }}>
              Red flags
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {redFlags.map((f, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {f.flag}
                  </span>
                  <span style={{
                    fontSize: 9, fontFamily: "var(--font-mono)", padding: "1px 6px",
                    borderRadius: 100, border: "1px solid rgba(239,68,68,0.2)",
                    color: SEVERITY_COLORS[f.severity] || "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {f.severity}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {f.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <CheckCircle2 size={12} style={{ color: "var(--positive)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--positive)", textTransform: "uppercase",
            }}>
              Strengths
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {strengths.map((s, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(62,207,142,0.04)", border: "1px solid rgba(62,207,142,0.12)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                  {s.strength}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {s.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing capabilities */}
      {missing.length > 0 && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--warning)", marginBottom: 10, textTransform: "uppercase",
          }}>
            Missing capabilities
          </div>
          {missing.map((cap, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0",
              fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
            }}>
              <HelpCircle size={11} style={{ color: "var(--warning)", marginTop: 4, flexShrink: 0 }} />
              {cap}
            </div>
          ))}
        </div>
      )}

      {/* Interview focus points */}
      {interviewPoints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase",
          }}>
            Interview focus points
          </div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {interviewPoints.map((pt, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < interviewPoints.length - 1 ? "1px solid var(--border-secondary)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{
                  fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent)",
                  fontWeight: 500, minWidth: 18, marginTop: 1,
                }}>
                  {i + 1}.
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>
                    {pt.question_area}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6, lineHeight: 1.5 }}>
                    {pt.why}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                    padding: "6px 10px", borderRadius: 6,
                    background: "var(--bg-secondary)", fontStyle: "italic",
                  }}>
                    &ldquo;{pt.sample_question}&rdquo;
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main recommendation */}
      <div style={{
        padding: "14px 20px", borderRadius: 10,
        background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
        marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase" }}>
            Best next action
          </div>
          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {result.main_recommendation}
          </div>
        </div>
      </div>

      {/* Key risks + Key opportunities */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12, marginBottom: 24,
      }}>
        {result.key_risks && result.key_risks.length > 0 && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--negative)", marginBottom: 10, textTransform: "uppercase",
            }}>
              Key risks
            </div>
            {result.key_risks.map((risk, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0",
                fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
              }}>
                <AlertTriangle size={11} style={{ color: "var(--negative)", marginTop: 4, flexShrink: 0 }} />
                {risk}
              </div>
            ))}
          </div>
        )}
        {result.key_opportunities && result.key_opportunities.length > 0 && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--positive)", marginBottom: 10, textTransform: "uppercase",
            }}>
              Key opportunities
            </div>
            {result.key_opportunities.map((opp, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0",
                fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
              }}>
                <CheckCircle2 size={11} style={{ color: "var(--positive)", marginTop: 4, flexShrink: 0 }} />
                {opp}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next actions */}
      {result.next_actions && result.next_actions.length > 0 && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase",
          }}>
            Next actions
          </div>
          {result.next_actions.map((action, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0",
              fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5,
            }}>
              <ArrowRight size={12} style={{ color: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
              {action}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {result.notes && result.notes.length > 0 && (
        <div style={{
          padding: "12px 16px", borderRadius: 8,
          border: "1px solid var(--border-secondary)",
          fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6,
        }}>
          {result.notes.map((note, i) => (
            <p key={i} style={{ margin: i < result.notes.length - 1 ? "0 0 6px" : 0 }}>{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
