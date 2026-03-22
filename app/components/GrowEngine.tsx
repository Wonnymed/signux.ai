"use client";
import { useState, useRef, useEffect } from "react";
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Copy, Check, Zap, FlaskConical, DollarSign, Radio } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES } from "../lib/engines";
import { signuxFetch } from "../lib/api-client";
import type { EngineResponse } from "../lib/types";
import MarkdownResult from "./MarkdownResult";

const ENGINE = ENGINES.grow;

function isFallbackResponse(r: any): boolean {
  return r?.notes?.some?.((n: string) => n.includes("structured parsing failed"));
}

const IMPACT_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: "rgba(62,207,142,0.08)", color: "var(--positive)" },
  medium: { bg: "rgba(245,158,11,0.08)", color: "var(--warning)" },
  low: { bg: "rgba(113,113,122,0.08)", color: "var(--neutral)" },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "var(--positive)" },
  moderate: { label: "Moderate", color: "var(--warning)" },
  hard: { label: "Hard", color: "var(--negative)" },
};

const FIT_COLORS: Record<string, string> = {
  high: "var(--positive)",
  medium: "var(--warning)",
  low: "var(--text-tertiary)",
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

type GrowResult = EngineResponse & {
  main_bottleneck?: { description: string; severity: string; suggested_fix: string };
  highest_leverage_move?: { title: string; description: string; expected_impact: string; effort: string };
  growth_levers?: { name: string; description: string; expected_impact: string; difficulty: string; why_it_matters: string }[];
  channel_priorities?: { channel: string; fit: string; rationale: string; first_action: string }[];
  pricing_opportunities?: { opportunity: string; rationale: string; expected_lift: string }[];
  experiments?: { name: string; hypothesis: string; timeline: string; success_metric: string }[];
};

export default function GrowEngine({ lang }: { lang?: string }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GrowResult | null>(null);
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
      const res = await signuxFetch("/api/grow", {
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
    const text = [
      `# ${result.title}`,
      result.executive_summary,
      "",
      `Confidence: ${result.confidence}`,
      `Status: ${result.status}`,
      "",
      "## Main Recommendation",
      result.main_recommendation,
      "",
      result.highest_leverage_move ? `## Highest Leverage Move\n${result.highest_leverage_move.title}\n${result.highest_leverage_move.description}\nExpected impact: ${result.highest_leverage_move.expected_impact}` : "",
      "",
      "## Growth Levers",
      ...(result.growth_levers || []).map(l => `- ${l.name} (${l.expected_impact} impact, ${l.difficulty}): ${l.why_it_matters}`),
      "",
      "## Key Risks",
      ...(result.key_risks || []).map(r => `- ${r}`),
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
              <TrendingUp size={20} strokeWidth={1.5} style={{ color: ENGINE.color }} />
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
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <TrendingUp size={15} />}
              {loading ? "Analyzing growth..." : ENGINE.cta}
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

  if (isFallbackResponse(result)) {
    return (
      <div ref={resultRef} style={{
        maxWidth: 720, margin: "0 auto", padding: isMobile ? "24px 16px 80px" : "40px 32px 80px",
        animation: "fadeInUp 0.3s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <button onClick={handleReset} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-primary)",
            background: "transparent", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
          }}>
            <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
            New analysis
          </button>
        </div>
        <MarkdownResult content={result.executive_summary} />
      </div>
    );
  }

  const hlm = result.highest_leverage_move;
  const levers = result.growth_levers || [];
  const channels = result.channel_priorities || [];
  const pricing = result.pricing_opportunities || [];
  const experiments = result.experiments || [];
  const bottleneck = result.main_bottleneck;

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
          cursor: "pointer",
        }}>
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
          New analysis
        </button>
        <button onClick={handleCopy} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-primary)",
          background: "transparent", color: "var(--text-tertiary)", fontSize: 12,
          cursor: "pointer",
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
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)",
          color: CONFIDENCE_COLORS[result.confidence] || "var(--text-tertiary)",
        }}>
          {result.confidence} confidence
        </span>
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

      {/* Highest leverage move */}
      {hlm && (
        <div style={{
          padding: "16px 20px", borderRadius: 10,
          background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
          marginBottom: 20,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
          }}>
            <Zap size={14} style={{ color: "var(--accent)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
              color: "var(--accent)", textTransform: "uppercase",
            }}>
              Highest leverage move
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
            {hlm.title}
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            {hlm.description}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)", padding: "3px 10px",
              borderRadius: 100, background: "rgba(62,207,142,0.08)",
              color: "var(--positive)", border: "1px solid rgba(62,207,142,0.15)",
            }}>
              {hlm.expected_impact}
            </span>
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)", padding: "3px 10px",
              borderRadius: 100, border: "1px solid var(--border-primary)",
              color: "var(--text-tertiary)",
            }}>
              {hlm.effort} effort
            </span>
          </div>
        </div>
      )}

      {/* Main bottleneck */}
      {bottleneck && (
        <div style={{
          padding: "14px 20px", borderRadius: 10,
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
          marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <AlertTriangle size={16} style={{ color: "var(--negative)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--negative)", marginBottom: 4, textTransform: "uppercase" }}>
              Growth bottleneck — {bottleneck.severity}
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

      {/* Growth levers grid */}
      {levers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase",
          }}>
            Growth levers
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}>
            {levers.map((lever, i) => {
              const impact = IMPACT_COLORS[lever.expected_impact] || IMPACT_COLORS.medium;
              const diff = DIFFICULTY_LABELS[lever.difficulty] || DIFFICULTY_LABELS.moderate;
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
                    {lever.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                      borderRadius: 100, background: impact.bg, color: impact.color,
                    }}>
                      {lever.expected_impact} impact
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                      borderRadius: 100, border: "1px solid var(--border-secondary)",
                      color: diff.color,
                    }}>
                      {diff.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                    {lever.why_it_matters}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel priorities */}
      {channels.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <Radio size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Channel priorities
            </span>
          </div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {channels.map((ch, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < channels.length - 1 ? "1px solid var(--border-secondary)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
                  minWidth: 16, marginTop: 2,
                }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                      {ch.channel}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "1px 6px",
                      borderRadius: 100, border: "1px solid var(--border-secondary)",
                      color: FIT_COLORS[ch.fit] || "var(--text-tertiary)",
                    }}>
                      {ch.fit} fit
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 4 }}>
                    {ch.rationale}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    First step: {ch.first_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing opportunities */}
      {pricing.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <DollarSign size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Pricing opportunities
            </span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}>
            {pricing.map((p, i) => (
              <div key={i} style={{
                padding: "14px 16px", borderRadius: 10,
                background: "var(--bg-card)", border: "1px solid var(--border-primary)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                  {p.opportunity}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 6 }}>
                  {p.rationale}
                </div>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                  borderRadius: 100, background: "rgba(62,207,142,0.08)",
                  color: "var(--positive)",
                }}>
                  {p.expected_lift}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experiments */}
      {experiments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <FlaskConical size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Recommended experiments
            </span>
          </div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {experiments.map((exp, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < experiments.length - 1 ? "1px solid var(--border-secondary)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {exp.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px",
                    borderRadius: 100, border: "1px solid var(--border-secondary)",
                    color: "var(--text-tertiary)",
                  }}>
                    {exp.timeline}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                  {exp.hypothesis}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Metric: {exp.success_metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
