"use client";
import { useState } from "react";
import { Map, ChevronDown, ChevronUp, RotateCcw, ShieldAlert, Sparkles, TrendingDown, Zap } from "lucide-react";
import { signuxFetch } from "../lib/api-client";
import LoadingOracle from "./LoadingOracle";

type TimelineEvent = { month: number; event: string };

type Scenario = {
  name: string;
  quadrant: string;
  probability: string;
  narrative: string;
  timeline: TimelineEvent[];
  early_warnings: string[];
  recommended_actions: string[];
  impact_on_you: string;
};

type ScenarioResult = {
  scenarios: Scenario[];
  hedging_strategy: string;
  monitoring_plan: string;
  biggest_uncertainty: string;
};

const PRESETS = [
  "SaaS B2B in Latin America",
  "E-commerce cross-border EU",
  "Crypto exchange global",
  "Import/export emerging markets",
];

const QUADRANT_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  "Blue Sky":   { icon: Sparkles,     color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "Optimistic + Continuity" },
  "Wild Card":  { icon: Zap,          color: "#22c55e", bg: "rgba(34,197,94,0.06)",  border: "rgba(34,197,94,0.18)",  label: "Optimistic + Disruption" },
  "Slow Burn":  { icon: TrendingDown, color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "Pessimistic + Continuity" },
  "Black Swan": { icon: ShieldAlert,  color: "#ef4444", bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.18)",  label: "Pessimistic + Disruption" },
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: "1px solid var(--card-border)", background: "var(--card-bg)",
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function ScenarioPlanner({ lang }: { lang?: string }) {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const run = async () => {
    if (!context.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await signuxFetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: context.trim(), lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Scenario planning failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (name: string) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  /* ═══ INPUT STATE ═══ */
  if (!result && !loading) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Map size={22} style={{ color: "#A855F7" }} />
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)", margin: 0 }}>
            Scenario Planner
          </h2>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          Describe your market and what you want to plan for. We'll generate 4 alternative futures in a 2×2 matrix with timelines, early warnings, and a hedging strategy.
        </p>

        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="e.g. I run a SaaS for SMBs in Brazil, selling CRM tools at $49/mo. Planning to expand to Mexico..."
          rows={4}
          style={{
            width: "100%", padding: 14, borderRadius: 10, fontSize: 14,
            border: "1px solid var(--border-primary)", background: "var(--input-bg)",
            color: "var(--text-primary)", resize: "vertical", fontFamily: "inherit",
            outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "#A855F7"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => setContext(p)} style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 20,
              border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
              color: "var(--text-tertiary)", cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>{error}</div>}

        <button onClick={run} disabled={!context.trim()} style={{
          marginTop: 20, padding: "12px 28px", borderRadius: 50, fontWeight: 600,
          fontSize: 14, cursor: context.trim() ? "pointer" : "not-allowed",
          background: context.trim() ? "#A855F7" : "var(--bg-tertiary)",
          color: context.trim() ? "#fff" : "var(--text-tertiary)",
          border: "none", fontFamily: "var(--font-brand)", letterSpacing: 1,
        }}>
          Generate Scenarios
        </button>
      </div>
    );
  }

  /* ═══ LOADING STATE ═══ */
  if (loading) {
    return <LoadingOracle mode="intel" />;
  }

  /* ═══ RESULT STATE ═══ */
  const scenarios = result!.scenarios || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Map size={22} style={{ color: "#A855F7" }} />
          <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)", margin: 0 }}>
            Scenario Planner
          </h2>
        </div>
        <button onClick={() => { setResult(null); setContext(""); }} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8, fontSize: 11,
          border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          color: "var(--text-secondary)", cursor: "pointer",
        }}>
          <RotateCcw size={12} /> New plan
        </button>
      </div>

      {/* 2×2 Matrix Visual */}
      <div style={{ marginBottom: 28, position: "relative" }}>
        {/* Axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>
          <span>Continuity</span>
          <span>Disruption</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {/* Top row: Optimistic */}
          {["Blue Sky", "Wild Card"].map(name => {
            const s = scenarios.find(sc => sc.name === name);
            const meta = QUADRANT_META[name] || QUADRANT_META["Blue Sky"];
            const Icon = meta.icon;
            return (
              <div key={name} onClick={() => s && toggle(name)} style={{
                padding: 16, borderRadius: 12, cursor: s ? "pointer" : "default",
                border: `1px solid ${meta.border}`, background: meta.bg,
                transition: "all 200ms",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: meta.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{name}</span>
                  {s && <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>{s.probability}</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{meta.label}</div>
                {s && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {expanded[name] ? s.narrative : (s.narrative || "").slice(0, 120) + (s.narrative?.length > 120 ? "..." : "")}
                </div>}
              </div>
            );
          })}
          {/* Bottom row: Pessimistic */}
          {["Slow Burn", "Black Swan"].map(name => {
            const s = scenarios.find(sc => sc.name === name);
            const meta = QUADRANT_META[name] || QUADRANT_META["Slow Burn"];
            const Icon = meta.icon;
            return (
              <div key={name} onClick={() => s && toggle(name)} style={{
                padding: 16, borderRadius: 12, cursor: s ? "pointer" : "default",
                border: `1px solid ${meta.border}`, background: meta.bg,
                transition: "all 200ms",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: meta.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{name}</span>
                  {s && <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>{s.probability}</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4 }}>{meta.label}</div>
                {s && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {expanded[name] ? s.narrative : (s.narrative || "").slice(0, 120) + (s.narrative?.length > 120 ? "..." : "")}
                </div>}
              </div>
            );
          })}
        </div>

        {/* Y-axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "var(--text-tertiary)", marginTop: 6 }}>
          <span>Optimistic ↑</span>
          <span>↓ Pessimistic</span>
        </div>
      </div>

      {/* Expanded Scenario Cards */}
      {scenarios.filter(s => expanded[s.name]).map(s => {
        const meta = QUADRANT_META[s.name] || QUADRANT_META["Blue Sky"];
        return (
          <Card key={s.name} style={{ marginBottom: 16, borderColor: meta.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: meta.color }}>{s.name}</span>
              <button onClick={() => toggle(s.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}>
                <ChevronUp size={16} />
              </button>
            </div>

            {/* Full narrative */}
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>
              {s.narrative}
            </div>

            {/* Timeline */}
            {s.timeline && s.timeline.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Timeline</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {s.timeline.map((ev, i) => (
                    <div key={i} style={{
                      flex: "1 1 140px", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${meta.border}`, background: meta.bg,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 4 }}>Month {ev.month}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{ev.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Early Warnings */}
            {s.early_warnings && s.early_warnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Early Warnings</div>
                {s.early_warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: "#f59e0b", flexShrink: 0 }}>⚠</span> {w}
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Actions */}
            {s.recommended_actions && s.recommended_actions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Recommended Actions</div>
                {s.recommended_actions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>→</span> {a}
                  </div>
                ))}
              </div>
            )}

            {/* Impact */}
            {s.impact_on_you && (
              <div style={{
                padding: 12, borderRadius: 8, background: "var(--bg-secondary)",
                border: "1px solid var(--border-primary)", fontSize: 12,
                color: "var(--text-secondary)", lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Impact on you: </span>
                {s.impact_on_you}
              </div>
            )}
          </Card>
        );
      })}

      {/* Bottom Section: Hedging + Monitoring + Uncertainty */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
        <Card>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "#A855F7", marginBottom: 8 }}>Hedging Strategy</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {result!.hedging_strategy || "—"}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "#3b82f6", marginBottom: 8 }}>Monitoring Plan</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {result!.monitoring_plan || "—"}
          </div>
        </Card>
      </div>

      {result!.biggest_uncertainty && (
        <Card style={{ marginTop: 12, borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)" }}>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", color: "#ef4444", marginBottom: 8 }}>Biggest Uncertainty</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontWeight: 500 }}>
            {result!.biggest_uncertainty}
          </div>
        </Card>
      )}
    </div>
  );
}
