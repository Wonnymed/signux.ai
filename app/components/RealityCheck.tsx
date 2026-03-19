"use client";
import { useState } from "react";
import { CircleSlash, TrendingUp, TrendingDown, Minus, ArrowRight, Loader2, RotateCcw, Share2 } from "lucide-react";
import { signuxFetch } from "../lib/api-client";

type RCResult = {
  verdict: "GO" | "CAUTION" | "STOP";
  confidence: number;
  one_liner: string;
  metrics: { label: string; value: string; trend: string; color: string }[];
  pros: { point: string; source: string }[];
  cons: { point: string; source: string }[];
  bottom_line: string;
  better_alternative: string | null;
  data_freshness: string;
};

export default function RealityCheck({ lang }: { lang: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RCResult | null>(null);
  const [error, setError] = useState("");

  const check = async (q?: string) => {
    const question = q || query;
    if (!question.trim()) return;
    setQuery(question);
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await signuxFetch("/api/reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), lang }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("Could not analyze. Try again.");
    }
    setLoading(false);
  };

  const reset = () => { setResult(null); setQuery(""); setError(""); };

  const [sharing, setSharing] = useState(false);

  const shareResult = async () => {
    if (!result) return;
    setSharing(true);
    try {
      const content = `# Reality Check: ${query}\n\n**Verdict:** ${result.verdict} (${result.confidence}% confidence)\n\n${result.one_liner}\n\n## Metrics\n${result.metrics.map((m: any) => `- **${m.label}:** ${m.value}`).join("\n")}\n\n## Better Alternative\n${result.better_alternative}`;
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reality_check",
          title: query || "Reality Check",
          content,
          metadata: { verdict: result.verdict, confidence: result.confidence },
        }),
      });
      const { id } = await res.json();
      const url = `${window.location.origin}/share/${id}`;
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch {
      alert("Failed to create share link");
    } finally {
      setSharing(false);
    }
  };

  const verdictColors = {
    GO: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", text: "#22c55e" },
    CAUTION: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", text: "#f59e0b" },
    STOP: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", text: "#ef4444" },
  };

  const examples = [
    { q: "Should I buy a $2,000 AI marketing course in 2026?", cat: "Purchase" },
    { q: "Is dropshipping still viable in 2026?", cat: "Timing" },
    { q: "Should I quit my job to go full-time on my startup doing $3K/mo?", cat: "Career" },
    { q: "Are Facebook Ads still worth it for local businesses?", cat: "Channel" },
    { q: "Is it worth learning Rust as a web developer?", cat: "Skills" },
  ];

  return (
    <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>

      {/* Header badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircleSlash size={14} style={{ color: "#ef4444" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reality Check</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Honest verdict with real data in 10 seconds</div>
        </div>
      </div>

      {/* Input */}
      {!result && !loading && (
        <>
          <div style={{
            border: "1px solid rgba(239,68,68,0.1)",
            borderRadius: 14, background: "var(--card-bg)",
            padding: "12px 16px", marginBottom: 12,
            display: "flex", gap: 10, alignItems: "center",
            transition: "all 200ms",
          }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") check(); }}
              placeholder="Is it still worth it to..."
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit",
              }}
            />
            <button onClick={() => check()} disabled={!query.trim() || loading} style={{
              padding: "6px 16px", borderRadius: 50, border: "none",
              background: query.trim() ? "#ef4444" : "var(--card-border)",
              color: query.trim() ? "var(--text-inverse)" : "var(--text-tertiary)",
              fontSize: 12, fontWeight: 600, cursor: query.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
            }}>
              Check
            </button>
          </div>

          {/* Examples */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {examples.map((ex, i) => (
              <div key={i} onClick={() => check(ex.q)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                cursor: "pointer", transition: "all 150ms",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; }}
              >
                <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>{ex.q}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1,
                  textTransform: "uppercase", padding: "2px 6px", borderRadius: 3,
                  background: "var(--card-bg)", color: "var(--text-tertiary)",
                  border: "1px solid var(--card-border)",
                }}>{ex.cat}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Loader2 size={24} style={{ color: "#ef4444", animation: "spin 1s linear infinite", marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Searching for real data...</div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{
          border: `1px solid ${verdictColors[result.verdict]?.border || verdictColors.CAUTION.border}`,
          borderRadius: 14,
          background: verdictColors[result.verdict]?.bg || verdictColors.CAUTION.bg,
          padding: 20,
        }}>
          {/* Verdict header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 32,
              color: verdictColors[result.verdict]?.text || verdictColors.CAUTION.text, lineHeight: 1,
            }}>
              {result.verdict}
            </div>
            <div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{result.one_liner}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {Math.round((result.confidence || 0.5) * 100)}% confidence · Data from {result.data_freshness || "recent"}
              </div>
            </div>
          </div>

          {/* Metrics */}
          {result.metrics && result.metrics.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(result.metrics.length, 4)}, 1fr)`, gap: 8, marginBottom: 16 }}>
              {result.metrics.slice(0, 4).map((m, i) => (
                <div key={i} style={{
                  padding: "10px 8px", borderRadius: 8, textAlign: "center",
                  background: "var(--card-bg)", border: "1px solid var(--card-border)",
                }}>
                  <div style={{
                    fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 16,
                    color: m.color === "green" ? "#22c55e" : m.color === "amber" ? "#f59e0b" : "#ef4444",
                    lineHeight: 1, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                  }}>
                    {m.value}
                    {m.trend === "up" && <TrendingUp size={10} />}
                    {m.trend === "down" && <TrendingDown size={10} />}
                    {m.trend === "stable" && <Minus size={10} />}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 0.5, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pros & Cons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            {result.pros?.map((p, i) => (
              <div key={`pro-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 8, color: "#22c55e" }}>+</div>
                <span style={{ color: "var(--text-secondary)" }}>{p.point}</span>
              </div>
            ))}
            {result.cons?.map((c, i) => (
              <div key={`con-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 8, color: "#ef4444" }}>-</div>
                <span style={{ color: "var(--text-secondary)" }}>{c.point}</span>
              </div>
            ))}
          </div>

          {/* Bottom line */}
          <div style={{
            padding: "12px 14px", borderRadius: 8,
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6,
            fontStyle: "italic", marginBottom: result.better_alternative ? 12 : 0,
          }}>
            {result.bottom_line}
          </div>

          {/* Alternative suggestion */}
          {result.better_alternative && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(107,138,255,0.06)", border: "1px solid rgba(107,138,255,0.12)",
              fontSize: 12, color: "var(--text-secondary)",
            }}>
              <ArrowRight size={14} style={{ flexShrink: 0, marginTop: 1, color: "#6B8AFF" }} />
              <span>Instead: {result.better_alternative}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button onClick={reset} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 50,
              border: "1px solid var(--card-border)", background: "none",
              color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
            }}>
              <RotateCcw size={12} /> New check
            </button>
            <button onClick={shareResult} disabled={sharing} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 50,
              border: "1px solid var(--card-border)", background: "none",
              color: "var(--text-secondary)", fontSize: 12,
              cursor: sharing ? "wait" : "pointer", opacity: sharing ? 0.6 : 1,
            }}>
              <Share2 size={12} /> {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 12, marginTop: 12 }}>{error}</div>}
    </div>
  );
}
