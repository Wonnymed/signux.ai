"use client";
import { useState, useRef, useEffect } from "react";
import { Swords, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Copy, Check, ShieldAlert, Target, Crosshair, Eye } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES } from "../lib/engines";
import { signuxFetch } from "../lib/api-client";
import type { EngineResponse } from "../lib/types";
import MarkdownResult from "./MarkdownResult";

const ENGINE = ENGINES.compete;

function isFallbackResponse(r: any): boolean {
  return r?.notes?.some?.((n: string) => n.includes("structured parsing failed"));
}

const THREAT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: "var(--positive)", bg: "rgba(62,207,142,0.06)",  border: "rgba(62,207,142,0.12)" },
  medium: { color: "var(--warning)",  bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)" },
  high:   { color: "var(--negative)", bg: "rgba(247,91,91,0.06)",  border: "rgba(247,91,91,0.12)" },
};

const OPP_SIZE_COLORS: Record<string, { color: string; label: string }> = {
  small:  { color: "var(--text-tertiary)", label: "Small" },
  medium: { color: "var(--warning)",       label: "Medium" },
  large:  { color: "var(--positive)",      label: "Large" },
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

type CompeteResult = EngineResponse & {
  competitive_set?: { name: string; positioning: string; strengths: string[]; weaknesses: string[]; threat_level: string; market_share_estimate: string }[];
  likely_response?: { scenario: string; competitor: string; timeline: string; your_counter: string };
  weakest_flank?: { area: string; why: string; mitigation: string };
  strongest_advantage?: { area: string; why: string; how_to_leverage: string };
  market_gaps?: { gap: string; opportunity_size: string; why_unfilled: string; how_to_capture: string }[];
  counter_moves?: { move: string; target: string; expected_impact: string; timeline: string }[];
};

export default function CompeteEngine({ lang }: { lang?: string }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompeteResult | null>(null);
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
      const res = await signuxFetch("/api/compete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), lang }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
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
      "## Competitive Set",
      ...(result.competitive_set || []).map(c => `- ${c.name} (${c.threat_level} threat, ${c.market_share_estimate}): ${c.positioning}`),
      "",
      result.likely_response ? `## Likely Response\n${result.likely_response.competitor}: ${result.likely_response.scenario}\nCounter: ${result.likely_response.your_counter}` : "",
      "",
      result.weakest_flank ? `## Weakest Flank\n${result.weakest_flank.area}: ${result.weakest_flank.why}` : "",
      result.strongest_advantage ? `## Strongest Advantage\n${result.strongest_advantage.area}: ${result.strongest_advantage.why}` : "",
      "",
      "## Counter-Moves",
      ...(result.counter_moves || []).map((m, i) => `${i + 1}. ${m.move} → ${m.expected_impact}`),
      "",
      "## Next Actions",
      ...(result.next_actions || []).map((a, i) => `${i + 1}. ${a}`),
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleReset = () => {
    setResult(null); setQuery(""); setError("");
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
              <Swords size={20} strokeWidth={1.5} style={{ color: ENGINE.color }} />
              <span style={{
                fontSize: 24, fontWeight: 300, letterSpacing: 6,
                color: "var(--text-primary)", fontFamily: "var(--font-brand)",
              }}>
                {ENGINE.name.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>{ENGINE.subtitle}</p>
          </div>

          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 12, padding: 2, marginBottom: 16,
          }}>
            <textarea
              ref={textareaRef} value={query}
              onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={ENGINE.placeholder} rows={4}
              style={{
                width: "100%", padding: "14px 16px", background: "transparent",
                border: "none", outline: "none", resize: "vertical",
                color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6,
                fontFamily: "var(--font-sans)", minHeight: 100,
              }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, justifyContent: "center" }}>
            {ENGINE.chips.map(chip => (
              <span key={chip} style={{
                fontSize: 11, color: "var(--text-tertiary)", padding: "4px 10px", borderRadius: 100,
                border: "1px solid var(--border-secondary)", fontFamily: "var(--font-mono)", letterSpacing: 0.3,
              }}>{chip}</span>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={handleSubmit} disabled={!query.trim() || loading} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", borderRadius: 8,
              background: query.trim() ? "var(--accent)" : "var(--bg-secondary)",
              color: query.trim() ? "#09090B" : "var(--text-tertiary)",
              border: "none", cursor: query.trim() ? "pointer" : "default",
              fontSize: 13, fontWeight: 500, transition: "all 150ms", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Swords size={15} />}
              {loading ? "Mapping competitors..." : ENGINE.cta}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 8,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              color: "var(--negative)", fontSize: 13, textAlign: "center",
            }}>{error}</div>
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

  const competitors = result.competitive_set || [];
  const response = result.likely_response;
  const flank = result.weakest_flank;
  const advantage = result.strongest_advantage;
  const gaps = result.market_gaps || [];
  const moves = result.counter_moves || [];

  return (
    <div ref={resultRef} style={{
      maxWidth: 720, margin: "0 auto", padding: isMobile ? "24px 16px 80px" : "40px 32px 80px",
      animation: "fadeInUp 0.3s ease-out",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button onClick={handleReset} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
          border: "1px solid var(--border-primary)", background: "transparent",
          color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
        }}>
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} />
          New analysis
        </button>
        <button onClick={handleCopy} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
          border: "1px solid var(--border-primary)", background: "transparent",
          color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Title + meta */}
      <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 400, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>
        {result.title}
      </h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5, padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)", color: CONFIDENCE_COLORS[result.confidence] || "var(--text-tertiary)",
        }}>
          {result.confidence} confidence
        </span>
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5, padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)", color: "var(--text-secondary)",
        }}>
          {STATUS_LABELS[result.status] || result.status}
        </span>
      </div>

      {/* Executive summary */}
      <div style={{
        padding: "16px 20px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        marginBottom: 24, fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)",
      }}>
        {result.executive_summary}
      </div>

      {/* Competitive set */}
      {competitors.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <Eye size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Competitive set
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {competitors.map((c, i) => {
              const threat = THREAT_COLORS[c.threat_level] || THREAT_COLORS.medium;
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                      {c.name}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                        background: threat.bg, color: threat.color, border: `1px solid ${threat.border}`,
                        textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        {c.threat_level} threat
                      </span>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                        border: "1px solid var(--border-secondary)", color: "var(--text-tertiary)",
                      }}>
                        {c.market_share_estimate}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                    {c.positioning}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--positive)", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                        Strengths
                      </div>
                      {c.strengths.map((s, j) => (
                        <div key={j} style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, padding: "1px 0" }}>
                          {s}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--negative)", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                        Weaknesses
                      </div>
                      {c.weaknesses.map((w, j) => (
                        <div key={j} style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, padding: "1px 0" }}>
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Likely competitor response */}
      {response && (
        <div style={{
          padding: "16px 20px", borderRadius: 10,
          background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Target size={14} style={{ color: "#F97316" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
              color: "#F97316", textTransform: "uppercase",
            }}>
              Likely competitor response
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
            {response.competitor}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
            {response.scenario}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
              border: "1px solid var(--border-secondary)", color: "var(--text-tertiary)",
            }}>
              {response.timeline}
            </span>
          </div>
          <div style={{
            fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5,
            padding: "8px 12px", borderRadius: 6, background: "rgba(249,115,22,0.04)",
          }}>
            Your counter: {response.your_counter}
          </div>
        </div>
      )}

      {/* Weakest flank + Strongest advantage */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {flank && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <ShieldAlert size={13} style={{ color: "var(--negative)" }} />
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
                color: "var(--negative)", textTransform: "uppercase",
              }}>
                Weakest flank
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              {flank.area}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
              {flank.why}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Defend: {flank.mitigation}
            </div>
          </div>
        )}
        {advantage && (
          <div style={{
            padding: "14px 16px", borderRadius: 10,
            background: "rgba(62,207,142,0.04)", border: "1px solid rgba(62,207,142,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Crosshair size={13} style={{ color: "var(--positive)" }} />
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
                color: "var(--positive)", textTransform: "uppercase",
              }}>
                Strongest advantage
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              {advantage.area}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
              {advantage.why}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Leverage: {advantage.how_to_leverage}
            </div>
          </div>
        )}
      </div>

      {/* Market gaps */}
      {gaps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase",
          }}>
            Market gaps
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {gaps.map((g, i) => {
              const size = OPP_SIZE_COLORS[g.opportunity_size] || OPP_SIZE_COLORS.medium;
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--border-primary)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{g.gap}</span>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                      border: "1px solid var(--border-secondary)", color: size.color,
                    }}>
                      {size.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 4 }}>
                    {g.why_unfilled}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Capture: {g.how_to_capture}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Counter-moves */}
      {moves.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <Swords size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Recommended counter-moves
            </span>
          </div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {moves.map((m, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < moves.length - 1 ? "1px solid var(--border-secondary)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{
                  fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent)",
                  fontWeight: 500, minWidth: 18, marginTop: 1,
                }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>
                    {m.move}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4, lineHeight: 1.5 }}>
                    Target: {m.target}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                      background: "rgba(62,207,142,0.08)", color: "var(--positive)",
                    }}>
                      {m.expected_impact}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                      border: "1px solid var(--border-secondary)", color: "var(--text-tertiary)",
                    }}>
                      {m.timeline}
                    </span>
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
            Top competitive move
          </div>
          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {result.main_recommendation}
          </div>
        </div>
      </div>

      {/* Key risks + opportunities */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {result.key_risks && result.key_risks.length > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5, color: "var(--negative)", marginBottom: 10, textTransform: "uppercase" }}>
              Key risks
            </div>
            {result.key_risks.map((risk, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                <AlertTriangle size={11} style={{ color: "var(--negative)", marginTop: 4, flexShrink: 0 }} />
                {risk}
              </div>
            ))}
          </div>
        )}
        {result.key_opportunities && result.key_opportunities.length > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5, color: "var(--positive)", marginBottom: 10, textTransform: "uppercase" }}>
              Key opportunities
            </div>
            {result.key_opportunities.map((opp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                <CheckCircle2 size={11} style={{ color: "var(--positive)", marginTop: 4, flexShrink: 0 }} />
                {opp}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next actions */}
      {result.next_actions && result.next_actions.length > 0 && (
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-primary)", marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5, color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase" }}>
            Next actions
          </div>
          {result.next_actions.map((action, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
              <ArrowRight size={12} style={{ color: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
              {action}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {result.notes && result.notes.length > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-secondary)", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          {result.notes.map((note, i) => (
            <p key={i} style={{ margin: i < result.notes.length - 1 ? "0 0 6px" : 0 }}>{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
