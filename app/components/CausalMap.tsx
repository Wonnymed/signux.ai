"use client";
import { useState } from "react";
import { GitBranch, RotateCcw, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { signuxFetch } from "../lib/api-client";
import LoadingOracle from "./LoadingOracle";

type CausalLink = { from: string; to: string; confidence: string; evidence: string };
type Confounder = { variable: string; impact: string; how_to_test: string };
type CausalResult = {
  hypothesis: string;
  causal_confidence: number;
  causal_chain: CausalLink[];
  confounders: Confounder[];
  alternative_explanations: string[];
  how_to_verify: string[];
  verdict: string;
};

function confidenceColor(c: number): string {
  if (c < 0.3) return "#ef4444";
  if (c < 0.5) return "#f97316";
  if (c < 0.7) return "#f59e0b";
  return "#22c55e";
}

function linkColor(c: string): string {
  if (c === "HIGH") return "#22c55e";
  if (c === "MEDIUM") return "#f59e0b";
  return "#ef4444";
}

const PRESETS = [
  "My sales went up 30% after I hired a new marketer",
  "Revenue dropped when we raised prices 20%",
  "Our churn decreased after adding onboarding emails",
  "Leads increased after switching to a new landing page",
];

/* ═══ SVG Causal Flow Diagram ═══ */
function CausalFlowDiagram({ chain }: { chain: CausalLink[] }) {
  if (chain.length === 0) return null;

  const nodeH = 36;
  const nodeW = 140;
  const gapY = 52;
  const padX = 20;
  const svgW = nodeW + padX * 2;
  const svgH = (chain.length + 1) * gapY + 20;

  // Collect unique nodes in order
  const nodes: string[] = [];
  for (const link of chain) {
    if (!nodes.includes(link.from)) nodes.push(link.from);
    if (!nodes.includes(link.to)) nodes.push(link.to);
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", maxWidth: 320, margin: "0 auto", display: "block" }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--text-tertiary)" />
        </marker>
      </defs>
      {/* Nodes */}
      {nodes.map((node, i) => {
        const x = padX;
        const y = i * gapY + 10;
        return (
          <g key={node}>
            <rect x={x} y={y} width={nodeW} height={nodeH} rx={8} fill="var(--bg-secondary)" stroke="var(--border-primary)" strokeWidth={1} />
            <text x={x + nodeW / 2} y={y + nodeH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize={9} fontWeight={600}>
              {node.length > 22 ? node.slice(0, 22) + "…" : node}
            </text>
          </g>
        );
      })}
      {/* Arrows */}
      {chain.map((link, i) => {
        const fromIdx = nodes.indexOf(link.from);
        const toIdx = nodes.indexOf(link.to);
        if (fromIdx === -1 || toIdx === -1) return null;
        const x = padX + nodeW / 2;
        const y1 = fromIdx * gapY + 10 + nodeH;
        const y2 = toIdx * gapY + 10;
        const color = linkColor(link.confidence);
        return (
          <g key={i}>
            <line x1={x} y1={y1} x2={x} y2={y2 - 2} stroke={color} strokeWidth={2} markerEnd="url(#arrowhead)" />
            <text x={x + 8} y={(y1 + y2) / 2} fill={color} fontSize={8} fontWeight={600}>{link.confidence}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CausalMap({ lang }: { lang: string }) {
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CausalResult | null>(null);
  const [error, setError] = useState("");

  const analyze = async (text?: string) => {
    const input = text || situation;
    if (!input.trim()) return;
    setSituation(input);
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await signuxFetch("/api/causal-map", {
        method: "POST",
        body: JSON.stringify({ situation: input.trim(), lang }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("Could not analyze causality. Try again.");
    }
    setLoading(false);
  };

  const reset = () => { setResult(null); setSituation(""); setError(""); };

  if (loading) {
    return <LoadingOracle mode="intel" />;
  }

  if (result) {
    const cc = confidenceColor(result.causal_confidence);
    const pct = Math.round(result.causal_confidence * 100);
    return (
      <div style={{ padding: "20px 16px", maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GitBranch size={18} style={{ color: "#6366F1" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Causal Map</span>
          </div>
          <button onClick={reset} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, border: "1px solid var(--border-primary)", background: "transparent",
            cursor: "pointer", fontSize: 11, color: "var(--text-secondary)",
          }}>
            <RotateCcw size={12} /> New analysis
          </button>
        </div>

        {/* Hypothesis & Confidence */}
        <div style={{
          padding: "14px 16px", borderRadius: 10, marginBottom: 16,
          background: `${cc}10`, border: `1px solid ${cc}25`,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Hypothesis</div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 10 }}>{result.hypothesis}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Causal Confidence:</div>
            <div style={{
              flex: 1, height: 6, borderRadius: 3, background: "var(--bg-tertiary)", overflow: "hidden",
            }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: cc, transition: "width 500ms" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: cc }}>{pct}%</span>
          </div>
        </div>

        {/* Causal Flow Diagram */}
        {result.causal_chain.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Causal Chain</div>
            <CausalFlowDiagram chain={result.causal_chain} />
            {/* Chain details */}
            <div style={{ marginTop: 8 }}>
              {result.causal_chain.map((link, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0",
                  borderBottom: i < result.causal_chain.length - 1 ? "1px solid var(--border-primary)" : "none",
                }}>
                  {link.confidence === "HIGH" ? <CheckCircle size={13} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} /> :
                   link.confidence === "MEDIUM" ? <HelpCircle size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} /> :
                   <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />}
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-primary)" }}>
                      <strong>{link.from}</strong> → <strong>{link.to}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{link.evidence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confounders */}
        {result.confounders.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: "middle", color: "#f59e0b" }} />
              Confounders (Hidden Variables)
            </div>
            {result.confounders.map((c, i) => (
              <div key={i} style={{
                padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                border: "1px solid rgba(245,158,11,0.12)", background: "rgba(245,158,11,0.03)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{c.variable}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>{c.impact}</div>
                <div style={{ fontSize: 10, color: "#6366F1" }}>Test: {c.how_to_test}</div>
              </div>
            ))}
          </div>
        )}

        {/* Alternative Explanations */}
        {result.alternative_explanations.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Alternative Explanations</div>
            {result.alternative_explanations.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                {i + 1}. {a}
              </div>
            ))}
          </div>
        )}

        {/* How to Verify */}
        {result.how_to_verify.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>How to Verify</div>
            {result.how_to_verify.map((v, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                ✓ {v}
              </div>
            ))}
          </div>
        )}

        {/* Verdict */}
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: `${cc}08`, border: `1px solid ${cc}20`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Verdict</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.verdict}</div>
        </div>
      </div>
    );
  }

  /* ═══ Input State ═══ */
  return (
    <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <GitBranch size={20} style={{ color: "#6366F1" }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Causal Map</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
        Describe what happened and what you think caused it. We'll map the causal chain, identify confounders, and tell you how confident you should really be.
      </p>

      <textarea
        value={situation}
        onChange={e => setSituation(e.target.value)}
        placeholder="E.g.: My sales went up 30% after I hired a new marketer. I think the marketer is the reason."
        style={{
          width: "100%", minHeight: 100, padding: "12px 14px", borderRadius: 10,
          border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          color: "var(--text-primary)", fontSize: 13, resize: "vertical",
          lineHeight: 1.5, outline: "none", fontFamily: "inherit",
        }}
        onKeyDown={e => { if (e.key === "Enter" && e.metaKey) analyze(); }}
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button key={p} onClick={() => analyze(p)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 11,
            border: "1px solid rgba(99,102,241,0.12)", background: "rgba(99,102,241,0.03)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}>
            {p.length > 45 ? p.slice(0, 45) + "..." : p}
          </button>
        ))}
      </div>

      <button onClick={() => analyze()} disabled={!situation.trim()} style={{
        width: "100%", padding: "12px", borderRadius: 10, border: "none",
        background: situation.trim() ? "#6366F1" : "var(--bg-tertiary)",
        color: situation.trim() ? "#fff" : "var(--text-tertiary)",
        fontSize: 13, fontWeight: 700, cursor: situation.trim() ? "pointer" : "default",
      }}>
        Map Causality
      </button>

      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 10, textAlign: "center" }}>{error}</div>}
    </div>
  );
}
