"use client";
import { useState } from "react";
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Minus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { signuxFetch } from "../lib/api-client";
import LoadingOracle from "./LoadingOracle";

type ThreatAxis = {
  name: string;
  score: number;
  threats: string[];
  trend: "rising" | "stable" | "declining";
};

type TopThreat = {
  threat: string;
  probability: string;
  impact: string;
  timeframe: string;
  mitigation: string;
};

type ThreatResult = {
  overall_threat_level: string;
  score: number;
  axes: ThreatAxis[];
  top_threats: TopThreat[];
  early_warnings: string[];
  recommended_actions: string[];
};

const PRESETS = [
  "E-commerce cross-border",
  "SaaS B2B",
  "Crypto exchange",
  "Import/export",
];

const LEVEL_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  LOW: { color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
  MODERATE: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
  ELEVATED: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  HIGH: { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

function scoreColor(s: number): string {
  if (s <= 3) return "#22c55e";
  if (s <= 5) return "#f59e0b";
  if (s <= 7) return "#f97316";
  return "#ef4444";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising") return <TrendingUp size={12} style={{ color: "#ef4444" }} />;
  if (trend === "declining") return <TrendingDown size={12} style={{ color: "#22c55e" }} />;
  return <Minus size={12} style={{ color: "var(--text-tertiary)" }} />;
}

/* ═══ SVG Radar Chart ═══ */
function RadarChart({ axes }: { axes: ThreatAxis[] }) {
  if (axes.length < 5) return null;
  const cx = 140, cy = 140, R = 110;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const gridLevels = [2, 4, 6, 8, 10];

  function point(idx: number, val: number): [number, number] {
    const angle = startAngle + idx * angleStep;
    const r = (val / 10) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const dataPoints = axes.map((a, i) => point(i, a.score));
  const polygon = dataPoints.map(p => p.join(",")).join(" ");

  return (
    <svg viewBox="0 0 280 280" style={{ width: "100%", maxWidth: 280, margin: "0 auto", display: "block" }}>
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: 5 }, (_, i) => point(i, level));
        return (
          <polygon
            key={level}
            points={pts.map(p => p.join(",")).join(" ")}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={level === 10 ? 1 : 0.5}
            opacity={0.4}
          />
        );
      })}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const [px, py] = point(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="var(--border-primary)" strokeWidth={0.5} opacity={0.3} />;
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth={2} />
      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={scoreColor(axes[i].score)} stroke="var(--bg-primary)" strokeWidth={2} />
      ))}
      {/* Labels */}
      {axes.map((a, i) => {
        const [lx, ly] = point(i, 12.5);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontSize={10} fontWeight={600}>
            {a.name}
          </text>
        );
      })}
    </svg>
  );
}

export default function ThreatRadar({ lang }: { lang: string }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [error, setError] = useState("");
  const [expandedAxis, setExpandedAxis] = useState<string | null>(null);

  const analyze = async (desc?: string) => {
    const text = desc || description;
    if (!text.trim()) return;
    setDescription(text);
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await signuxFetch("/api/threat-radar", {
        method: "POST",
        body: JSON.stringify({ description: text.trim(), lang }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("Could not analyze threats. Try again.");
    }
    setLoading(false);
  };

  const reset = () => { setResult(null); setDescription(""); setError(""); setExpandedAxis(null); };

  if (loading) {
    return <LoadingOracle mode="intel" />;
  }

  if (result) {
    const lc = LEVEL_COLORS[result.overall_threat_level] || LEVEL_COLORS.MODERATE;
    return (
      <div style={{ padding: "20px 16px", maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={18} style={{ color: lc.color }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Threat Radar</span>
          </div>
          <button onClick={reset} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, border: "1px solid var(--border-primary)", background: "transparent",
            cursor: "pointer", fontSize: 11, color: "var(--text-secondary)",
          }}>
            <RotateCcw size={12} /> New scan
          </button>
        </div>

        {/* Threat Level Badge */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          padding: "16px 20px", borderRadius: 12, marginBottom: 20,
          background: lc.bg, border: `1px solid ${lc.border}`,
        }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: lc.color }}>{result.score.toFixed(1)}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: lc.color }}>{result.overall_threat_level}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Overall Threat Level</div>
          </div>
        </div>

        {/* Radar Chart */}
        <div style={{ marginBottom: 20 }}>
          <RadarChart axes={result.axes} />
        </div>

        {/* Axis Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {result.axes.map(axis => {
            const expanded = expandedAxis === axis.name;
            return (
              <div key={axis.name} style={{
                borderRadius: 10, border: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)", overflow: "hidden",
              }}>
                <button onClick={() => setExpandedAxis(expanded ? null : axis.name)} style={{
                  display: "flex", alignItems: "center", width: "100%", padding: "10px 14px",
                  border: "none", background: "transparent", cursor: "pointer", gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${scoreColor(axis.score)}15`, fontSize: 12, fontWeight: 800, color: scoreColor(axis.score),
                  }}>
                    {axis.score}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>{axis.name}</span>
                  <TrendIcon trend={axis.trend} />
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{axis.trend}</span>
                  {expanded ? <ChevronUp size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}
                </button>
                {expanded && (
                  <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--border-primary)" }}>
                    {axis.threats.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0", lineHeight: 1.5 }}>
                        • {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Top Threats */}
        {result.top_threats.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: "middle", color: "#ef4444" }} />
              Top Threats
            </div>
            {result.top_threats.map((t, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{t.threat}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: t.probability === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: t.probability === "HIGH" ? "#ef4444" : "#f59e0b" }}>
                    P: {t.probability}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: t.impact === "SEVERE" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: t.impact === "SEVERE" ? "#ef4444" : "#f59e0b" }}>
                    I: {t.impact}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    {t.timeframe}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <strong>Mitigation:</strong> {t.mitigation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Early Warnings */}
        {result.early_warnings.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Early Warning Signals</div>
            {result.early_warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                ⚡ {w}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {result.recommended_actions.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Recommended Actions</div>
            {result.recommended_actions.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                {i + 1}. {a}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ═══ Input State ═══ */
  return (
    <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Shield size={20} style={{ color: "#ef4444" }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Threat Radar</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
        Describe your business and key operations. We'll scan for current threats across market, regulatory, operational, cyber, and geopolitical axes.
      </p>

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="E.g.: I run an e-commerce store importing electronics from Shenzhen to Brazil. Annual revenue $500K. Sell on MercadoLivre and own website. 2 employees."
        style={{
          width: "100%", minHeight: 100, padding: "12px 14px", borderRadius: 10,
          border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          color: "var(--text-primary)", fontSize: 13, resize: "vertical",
          lineHeight: 1.5, outline: "none", fontFamily: "inherit",
        }}
        onKeyDown={e => { if (e.key === "Enter" && e.metaKey) analyze(); }}
      />

      {/* Presets */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button key={p} onClick={() => analyze(p)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 11,
            border: "1px solid rgba(239,68,68,0.12)", background: "rgba(239,68,68,0.03)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}>
            {p}
          </button>
        ))}
      </div>

      <button onClick={() => analyze()} disabled={!description.trim()} style={{
        width: "100%", padding: "12px", borderRadius: 10, border: "none",
        background: description.trim() ? "#ef4444" : "var(--bg-tertiary)",
        color: description.trim() ? "#fff" : "var(--text-tertiary)",
        fontSize: 13, fontWeight: 700, cursor: description.trim() ? "pointer" : "default",
      }}>
        Scan Threats
      </button>

      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 10, textAlign: "center" }}>{error}</div>}
    </div>
  );
}
