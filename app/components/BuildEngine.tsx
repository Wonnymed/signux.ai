"use client";
import { useState, useRef, useEffect } from "react";
import { Hammer, AlertTriangle, CheckCircle2, ArrowRight, ChevronDown, ChevronUp, Loader2, Copy, Check, Circle } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES } from "../lib/engines";
import { signuxFetch } from "../lib/api-client";
import type { EngineResponse } from "../lib/types";

const ENGINE = ENGINES.build;

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  idea: { bg: "rgba(168,85,247,0.08)", color: "#A855F7", border: "rgba(168,85,247,0.2)" },
  validation: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "rgba(245,158,11,0.2)" },
  pilot: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "rgba(59,130,246,0.2)" },
  launch: { bg: "rgba(62,207,142,0.08)", color: "#3ECF8E", border: "rgba(62,207,142,0.2)" },
  scale: { bg: "rgba(200,168,78,0.08)", color: "#C8A84E", border: "rgba(200,168,78,0.2)" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  low: "var(--negative)",
  medium: "var(--warning)",
  high: "var(--positive)",
};

const STATUS_LABELS: Record<string, string> = {
  clear: "Clear path forward",
  promising: "Promising — needs validation",
  fragile: "Fragile — high risk",
  blocked: "Blocked — action required",
  mixed: "Mixed signals",
};

type BuildResult = EngineResponse & {
  current_stage?: string;
  main_bottleneck?: { description: string; severity: string; suggested_fix: string };
  roadmap?: { phase: string; duration: string; goal: string; actions: string[] }[];
  first_30_days?: string[];
  first_90_days?: string[];
};

export default function BuildEngine({ lang }: { lang?: string }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
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
      const res = await signuxFetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), lang }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setExpandedPhase(0);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = [
      `# ${result.title}`,
      result.executive_summary,
      "",
      `Stage: ${result.current_stage || "—"}`,
      `Confidence: ${result.confidence}`,
      `Status: ${result.status}`,
      "",
      "## Main Recommendation",
      result.main_recommendation,
      "",
      result.main_bottleneck ? `## Main Bottleneck\n${result.main_bottleneck.description}\nFix: ${result.main_bottleneck.suggested_fix}` : "",
      "",
      "## First 30 Days",
      ...(result.first_30_days || []).map((a, i) => `${i + 1}. ${a}`),
      "",
      "## Key Risks",
      ...(result.key_risks || []).map(r => `- ${r}`),
      "",
      "## Key Opportunities",
      ...(result.key_opportunities || []).map(o => `- ${o}`),
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
          {/* Header */}
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 8,
            }}>
              <Hammer size={20} strokeWidth={1.5} style={{ color: ENGINE.color }} />
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

          {/* Textarea */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 12, padding: 2, marginBottom: 16,
            transition: "border-color 150ms",
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

          {/* Chips */}
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

          {/* CTA */}
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
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Hammer size={15} />}
              {loading ? "Building plan..." : ENGINE.cta}
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
  const stage = result.current_stage || "idea";
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS.idea;
  const bottleneck = result.main_bottleneck;
  const roadmap = result.roadmap || [];

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
          background: "transparent", color: "var(--text-tertiary)", fontSize: 12,
          cursor: "pointer", transition: "all 150ms",
        }}>
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
          New plan
        </button>
        <button onClick={handleCopy} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-primary)",
          background: "transparent", color: "var(--text-tertiary)", fontSize: 12,
          cursor: "pointer", transition: "all 150ms",
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Title + meta */}
      <h1 style={{
        fontSize: isMobile ? 20 : 24, fontWeight: 400, color: "var(--text-primary)",
        marginBottom: 8, lineHeight: 1.3,
      }}>
        {result.title}
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {/* Stage badge */}
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          padding: "3px 10px", borderRadius: 100,
          background: stageColor.bg, color: stageColor.color,
          border: `1px solid ${stageColor.border}`,
          textTransform: "uppercase",
        }}>
          {stage}
        </span>
        {/* Confidence */}
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)", color: CONFIDENCE_COLORS[result.confidence] || "var(--text-tertiary)",
        }}>
          {result.confidence} confidence
        </span>
        {/* Status */}
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)", color: "var(--text-secondary)",
        }}>
          {STATUS_LABELS[result.status] || result.status}
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

      {/* Main recommendation */}
      <div style={{
        padding: "14px 20px", borderRadius: 10,
        background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
        marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase" }}>
            Main recommendation
          </div>
          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {result.main_recommendation}
          </div>
        </div>
      </div>

      {/* Bottleneck */}
      {bottleneck && (
        <div style={{
          padding: "14px 20px", borderRadius: 10,
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
          marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <AlertTriangle size={16} style={{ color: "var(--negative)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--negative)", marginBottom: 4, textTransform: "uppercase" }}>
              Main bottleneck — {bottleneck.severity}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 6 }}>
              {bottleneck.description}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Fix: {bottleneck.suggested_fix}
            </div>
          </div>
        </div>
      )}

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase",
          }}>
            Execution Roadmap
          </div>
          <div style={{ position: "relative", paddingLeft: 20 }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 5, top: 8, bottom: 8, width: 1,
              background: "var(--border-primary)",
            }} />
            {roadmap.map((phase, i) => {
              const isExpanded = expandedPhase === i;
              return (
                <div key={i} style={{ position: "relative", marginBottom: i < roadmap.length - 1 ? 12 : 0 }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: -17, top: 12, width: 8, height: 8,
                    borderRadius: "50%", border: "2px solid var(--border-hover)",
                    background: i === 0 ? "var(--accent)" : "var(--bg-primary)",
                  }} />
                  <button
                    onClick={() => setExpandedPhase(isExpanded ? null : i)}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      padding: "10px 14px", borderRadius: 8,
                      background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                      transition: "all 150ms",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                          {phase.phase}
                        </span>
                        <span style={{
                          fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8,
                          fontFamily: "var(--font-mono)",
                        }}>
                          {phase.duration}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      {phase.goal}
                    </div>
                    {isExpanded && phase.actions.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-secondary)" }}>
                        {phase.actions.map((action, j) => (
                          <div key={j} style={{
                            display: "flex", alignItems: "flex-start", gap: 8,
                            padding: "4px 0", fontSize: 13, color: "var(--text-secondary)",
                            lineHeight: 1.5,
                          }}>
                            <Circle size={5} style={{ marginTop: 7, flexShrink: 0, color: "var(--text-tertiary)" }} />
                            {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* First 30 / 90 days */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 12, marginBottom: 24,
      }}>
        {result.first_30_days && result.first_30_days.length > 0 && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: ENGINE.color, marginBottom: 10, textTransform: "uppercase",
            }}>
              First 30 days
            </div>
            {result.first_30_days.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0",
                fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
              }}>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
                  minWidth: 16, marginTop: 2,
                }}>
                  {i + 1}.
                </span>
                {item}
              </div>
            ))}
          </div>
        )}
        {result.first_90_days && result.first_90_days.length > 0 && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase",
            }}>
              First 90 days
            </div>
            {result.first_90_days.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0",
                fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
              }}>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
                  minWidth: 16, marginTop: 2,
                }}>
                  {i + 1}.
                </span>
                {item}
              </div>
            ))}
          </div>
        )}
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
