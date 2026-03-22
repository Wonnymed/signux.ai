"use client";
import { useState, useRef, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Copy, Check, ShieldAlert, Scale, Wrench } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { ENGINES } from "../lib/engines";
import { signuxFetch } from "../lib/api-client";
import type { EngineResponse } from "../lib/types";
import MarkdownResult from "./MarkdownResult";

const ENGINE = ENGINES.protect;

function isFallbackResponse(r: any): boolean {
  return r?.notes?.some?.((n: string) => n.includes("structured parsing failed"));
}

const FRAGILITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Low Fragility",    color: "var(--positive)", bg: "rgba(62,207,142,0.08)",  border: "rgba(62,207,142,0.2)" },
  medium: { label: "Medium Fragility", color: "var(--warning)",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  high:   { label: "High Fragility",   color: "var(--negative)", bg: "rgba(247,91,91,0.08)",  border: "rgba(247,91,91,0.2)" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  watch:    { label: "Watch",    color: "var(--text-tertiary)" },
  act_soon: { label: "Act Soon", color: "var(--warning)" },
  act_now:  { label: "Act Now",  color: "var(--negative)" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  low: "var(--negative)",
  medium: "var(--warning)",
  high: "var(--positive)",
};

/* Risk cell color based on likelihood + impact */
function riskCellColor(likelihood: string, impact: string): { bg: string; border: string } {
  const l = likelihood === "high" ? 3 : likelihood === "medium" ? 2 : 1;
  const i = impact === "catastrophic" ? 4 : impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  const score = l * i;
  if (score >= 9) return { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" };
  if (score >= 6) return { bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)" };
  if (score >= 4) return { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" };
  return { bg: "var(--bg-card)", border: "var(--border-primary)" };
}

const LEVEL_COLORS: Record<string, string> = {
  low: "var(--positive)",
  medium: "var(--warning)",
  high: "var(--negative)",
  catastrophic: "#DC2626",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "var(--text-tertiary)",
  medium: "var(--warning)",
  high: "var(--negative)",
};

type ProtectResult = EngineResponse & {
  fragility_level?: string;
  fragility_rationale?: string;
  top_threat?: {
    name: string; description: string; likelihood: string;
    impact: string; urgency: string; mitigation: string;
  };
  risk_matrix?: { name: string; description: string; likelihood: string; impact: string; mitigation: string }[];
  compliance_exposure?: { area: string; exposure: string; severity: string; action: string }[];
  operational_fragilities?: { fragility: string; consequence: string; fix: string }[];
};

export default function ProtectEngine({ lang }: { lang?: string }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProtectResult | null>(null);
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
      const res = await signuxFetch("/api/protect", {
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
      `Fragility: ${result.fragility_level}`,
      result.fragility_rationale,
      "",
      result.top_threat ? `## Top Threat\n${result.top_threat.name}: ${result.top_threat.description}\nMitigation: ${result.top_threat.mitigation}` : "",
      "",
      "## Risk Matrix",
      ...(result.risk_matrix || []).map(r => `- ${r.name} [${r.likelihood}/${r.impact}]: ${r.mitigation}`),
      "",
      "## Compliance Exposure",
      ...(result.compliance_exposure || []).map(c => `- ${c.area} (${c.severity}): ${c.exposure}`),
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
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 8,
            }}>
              <Shield size={20} strokeWidth={1.5} style={{ color: ENGINE.color }} />
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
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Shield size={15} />}
              {loading ? "Scanning risks..." : ENGINE.cta}
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
            New scan
          </button>
        </div>
        <MarkdownResult content={result.executive_summary} />
      </div>
    );
  }

  const fragility = FRAGILITY_CONFIG[result.fragility_level || "medium"] || FRAGILITY_CONFIG.medium;
  const topThreat = result.top_threat;
  const risks = result.risk_matrix || [];
  const compliance = result.compliance_exposure || [];
  const fragilities = result.operational_fragilities || [];

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
          New scan
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
          background: fragility.bg, color: fragility.color, border: `1px solid ${fragility.border}`,
          textTransform: "uppercase",
        }}>
          {fragility.label}
        </span>
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5, padding: "3px 10px", borderRadius: 100,
          border: "1px solid var(--border-primary)", color: CONFIDENCE_COLORS[result.confidence] || "var(--text-tertiary)",
        }}>
          {result.confidence} confidence
        </span>
      </div>

      {/* Executive summary */}
      <div style={{
        padding: "16px 20px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-primary)",
        marginBottom: 20, fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)",
      }}>
        {result.executive_summary}
        {result.fragility_rationale && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {result.fragility_rationale}
          </div>
        )}
      </div>

      {/* Top threat */}
      {topThreat && (
        <div style={{
          padding: "16px 20px", borderRadius: 10,
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)",
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ShieldAlert size={16} style={{ color: "var(--negative)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1,
              color: "var(--negative)", textTransform: "uppercase",
            }}>
              Top threat
            </span>
            {topThreat.urgency && (
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 100,
                border: "1px solid rgba(239,68,68,0.2)",
                color: (URGENCY_CONFIG[topThreat.urgency] || URGENCY_CONFIG.watch).color,
                textTransform: "uppercase", letterSpacing: 0.5, marginLeft: "auto",
              }}>
                {(URGENCY_CONFIG[topThreat.urgency] || URGENCY_CONFIG.watch).label}
              </span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
            {topThreat.name}
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            {topThreat.description}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
              border: "1px solid var(--border-secondary)", color: LEVEL_COLORS[topThreat.likelihood] || "var(--text-tertiary)",
            }}>
              {topThreat.likelihood} likelihood
            </span>
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
              border: "1px solid var(--border-secondary)", color: LEVEL_COLORS[topThreat.impact] || "var(--text-tertiary)",
            }}>
              {topThreat.impact} impact
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.04)" }}>
            Mitigation: {topThreat.mitigation}
          </div>
        </div>
      )}

      {/* Risk matrix */}
      {risks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
            color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase",
          }}>
            Risk matrix
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {risks.map((risk, i) => {
              const cell = riskCellColor(risk.likelihood, risk.impact);
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: cell.bg, border: `1px solid ${cell.border}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
                    {risk.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                      border: "1px solid var(--border-secondary)", color: LEVEL_COLORS[risk.likelihood] || "var(--text-tertiary)",
                    }}>
                      {risk.likelihood}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 100,
                      border: "1px solid var(--border-secondary)", color: LEVEL_COLORS[risk.impact] || "var(--text-tertiary)",
                    }}>
                      {risk.impact} impact
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
                    {risk.description}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                    Mitigation: {risk.mitigation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance exposure */}
      {compliance.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Scale size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Compliance exposure
            </span>
          </div>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-primary)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {compliance.map((c, i) => (
              <div key={i} style={{
                padding: "12px 16px",
                borderBottom: i < compliance.length - 1 ? "1px solid var(--border-secondary)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.area}</span>
                  <span style={{
                    fontSize: 9, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 100,
                    border: "1px solid var(--border-secondary)",
                    color: SEVERITY_COLORS[c.severity] || "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {c.severity}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                  {c.exposure}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Action: {c.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational fragilities */}
      {fragilities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Wrench size={12} style={{ color: "var(--text-tertiary)" }} />
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1.5,
              color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              Operational fragilities
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fragilities.map((f, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                  {f.fragility}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
                  If it breaks: {f.consequence}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Fix: {f.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main mitigation */}
      <div style={{
        padding: "14px 20px", borderRadius: 10,
        background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
        marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase" }}>
            Priority mitigation
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
