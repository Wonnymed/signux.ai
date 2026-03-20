"use client";
import { useState, useRef } from "react";
import { Scan, AlertTriangle, CheckCircle, XCircle, HelpCircle, RotateCcw, Upload, FileText, X } from "lucide-react";
import { signuxFetch } from "../lib/api-client";
import LoadingOracle from "./LoadingOracle";

type VerifiedClaim = {
  claim: string;
  status: "VERIFIED" | "UNVERIFIABLE" | "SUSPICIOUS" | "FALSE";
  note: string;
};

type RedFlag = {
  flag: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
};

type XRayResult = {
  trust_score: number;
  verdict: string;
  verdict_summary: string;
  verified_claims: VerifiedClaim[];
  red_flags: RedFlag[];
  hidden_incentives: string[];
  missing_information: string[];
  game_theory_analysis: string;
  counter_strategy: string;
  recommendation: string;
};

function trustColor(score: number): string {
  if (score <= 3) return "#ef4444";
  if (score <= 5) return "#f97316";
  if (score <= 7) return "#f59e0b";
  return "#22c55e";
}

function verdictLabel(v: string): { text: string; color: string } {
  switch (v) {
    case "WALK_AWAY": return { text: "WALK AWAY", color: "#ef4444" };
    case "NEGOTIATE_HARDER": return { text: "NEGOTIATE HARDER", color: "#f59e0b" };
    case "PROCEED_WITH_CAUTION": return { text: "PROCEED WITH CAUTION", color: "#f97316" };
    case "PROCEED": return { text: "PROCEED", color: "#22c55e" };
    default: return { text: v, color: "#f59e0b" };
  }
}

function ClaimIcon({ status }: { status: string }) {
  switch (status) {
    case "VERIFIED": return <CheckCircle size={13} style={{ color: "#22c55e", flexShrink: 0 }} />;
    case "FALSE": return <XCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />;
    case "SUSPICIOUS": return <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />;
    default: return <HelpCircle size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />;
  }
}

export default function DealXRay({ lang }: { lang: string }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<XRayResult | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileText(reader.result as string);
    reader.readAsText(file);
  };

  const removeFile = () => { setFileName(""); setFileText(""); if (fileRef.current) fileRef.current.value = ""; };

  const analyze = async () => {
    if (!description.trim() && !fileText) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await signuxFetch("/api/deal-xray", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          document_text: fileText || undefined,
          lang,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setError("Could not analyze deal. Try again.");
    }
    setLoading(false);
  };

  const reset = () => { setResult(null); setDescription(""); setError(""); removeFile(); };

  if (loading) {
    return <LoadingOracle mode="intel" />;
  }

  if (result) {
    const tc = trustColor(result.trust_score);
    const vl = verdictLabel(result.verdict);
    return (
      <div style={{ padding: "20px 16px", maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Scan size={18} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Deal X-Ray</span>
          </div>
          <button onClick={reset} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 8, border: "1px solid var(--border-primary)", background: "transparent",
            cursor: "pointer", fontSize: 11, color: "var(--text-secondary)",
          }}>
            <RotateCcw size={12} /> New analysis
          </button>
        </div>

        {/* Trust Score + Verdict */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "16px 20px",
          borderRadius: 12, marginBottom: 20,
          background: `${tc}10`, border: `1px solid ${tc}30`,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            border: `3px solid ${tc}`, background: `${tc}10`,
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: tc }}>{result.trust_score}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: vl.color, marginBottom: 2 }}>{vl.text}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{result.verdict_summary}</div>
          </div>
        </div>

        {/* Verified Claims */}
        {result.verified_claims.length > 0 && (
          <Section title="Verified Claims">
            {result.verified_claims.map((c, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, padding: "8px 0",
                borderBottom: i < result.verified_claims.length - 1 ? "1px solid var(--border-primary)" : "none",
              }}>
                <ClaimIcon status={c.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 2 }}>{c.claim}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span style={{
                      fontWeight: 600,
                      color: c.status === "VERIFIED" ? "#22c55e" : c.status === "FALSE" ? "#ef4444" : c.status === "SUSPICIOUS" ? "#f59e0b" : "var(--text-tertiary)",
                    }}>{c.status}</span>
                    {c.note && <> — {c.note}</>}
                  </div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Red Flags */}
        {result.red_flags.length > 0 && (
          <Section title="Red Flags">
            {result.red_flags.map((f, i) => (
              <div key={i} style={{
                padding: "8px 10px", borderRadius: 8, marginBottom: 6,
                background: f.severity === "HIGH" ? "rgba(239,68,68,0.05)" : "transparent",
                border: `1px solid ${f.severity === "HIGH" ? "rgba(239,68,68,0.15)" : "var(--border-primary)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertTriangle size={12} style={{ color: f.severity === "HIGH" ? "#ef4444" : f.severity === "MEDIUM" ? "#f59e0b" : "var(--text-tertiary)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{f.flag}</span>
                  <span style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 700,
                    background: f.severity === "HIGH" ? "rgba(239,68,68,0.1)" : f.severity === "MEDIUM" ? "rgba(245,158,11,0.1)" : "var(--bg-tertiary)",
                    color: f.severity === "HIGH" ? "#ef4444" : f.severity === "MEDIUM" ? "#f59e0b" : "var(--text-tertiary)",
                  }}>{f.severity}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.explanation}</div>
              </div>
            ))}
          </Section>
        )}

        {/* Hidden Incentives */}
        {result.hidden_incentives.length > 0 && (
          <Section title="Hidden Incentives">
            {result.hidden_incentives.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                • {h}
              </div>
            ))}
          </Section>
        )}

        {/* Missing Information */}
        {result.missing_information.length > 0 && (
          <Section title="Missing Information">
            {result.missing_information.map((m, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", lineHeight: 1.5 }}>
                ? {m}
              </div>
            ))}
          </Section>
        )}

        {/* Game Theory */}
        {result.game_theory_analysis && (
          <Section title="Game Theory Analysis">
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.game_theory_analysis}</div>
          </Section>
        )}

        {/* Counter Strategy */}
        {result.counter_strategy && (
          <Section title="Counter Strategy">
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.counter_strategy}</div>
          </Section>
        )}

        {/* Recommendation */}
        {result.recommendation && (
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginTop: 4,
            background: `${tc}08`, border: `1px solid ${tc}20`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Recommendation</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.recommendation}</div>
          </div>
        )}
      </div>
    );
  }

  /* ═══ Input State ═══ */
  return (
    <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Scan size={20} style={{ color: "#f59e0b" }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Deal X-Ray</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
        Describe the deal, partnership, or investment opportunity. We'll verify claims, detect red flags, and analyze counterparty incentives.
      </p>

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="E.g.: A company is offering us an exclusive distribution deal for their product in LATAM. They claim $2M ARR, 20% MoM growth, and want us to commit $150K upfront for inventory."
        style={{
          width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10,
          border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          color: "var(--text-primary)", fontSize: 13, resize: "vertical",
          lineHeight: 1.5, outline: "none", fontFamily: "inherit",
        }}
        onKeyDown={e => { if (e.key === "Enter" && e.metaKey) analyze(); }}
      />

      {/* File upload */}
      <div style={{ marginTop: 10, marginBottom: 16 }}>
        {fileName ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            borderRadius: 8, border: "1px solid var(--border-primary)", background: "var(--bg-secondary)",
          }}>
            <FileText size={14} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{fileName}</span>
            <button onClick={removeFile} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", padding: 2 }}>
              <X size={14} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
            borderRadius: 8, border: "1px dashed var(--border-primary)", background: "transparent",
            cursor: "pointer", fontSize: 11, color: "var(--text-tertiary)", width: "100%",
          }}>
            <Upload size={13} /> Attach document (pitch deck, term sheet, contract — text files)
          </button>
        )}
        <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json" onChange={handleFile} style={{ display: "none" }} />
      </div>

      <button onClick={analyze} disabled={!description.trim() && !fileText} style={{
        width: "100%", padding: "12px", borderRadius: 10, border: "none",
        background: (description.trim() || fileText) ? "#f59e0b" : "var(--bg-tertiary)",
        color: (description.trim() || fileText) ? "#000" : "var(--text-tertiary)",
        fontSize: 13, fontWeight: 700, cursor: (description.trim() || fileText) ? "pointer" : "default",
      }}>
        X-Ray This Deal
      </button>

      {error && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 10, textAlign: "center" }}>{error}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
