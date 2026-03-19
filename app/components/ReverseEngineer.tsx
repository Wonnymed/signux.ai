"use client";
import { useState, useRef } from "react";
import { Copy, Loader2, RotateCcw, ArrowRight } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { signuxFetch } from "../lib/api-client";

type Stage = "idle" | "researching" | "generating" | "complete" | "error";

export default function ReverseEngineer({ lang }: { lang: string }) {
  const [input, setInput] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [stageLabel, setStageLabel] = useState("");
  const [researchSummary, setResearchSummary] = useState("");
  const [playbook, setPlaybook] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const run = async (q?: string) => {
    const query = q || input;
    if (!query.trim()) return;
    setInput(query);
    setStage("researching");
    setStageLabel("Researching the business model...");
    setResearchSummary("");
    setPlaybook("");
    setError("");

    try {
      abortRef.current = new AbortController();
      const res = await signuxFetch("/api/reverse-engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: query.trim(), targetMarket: targetMarket.trim(), lang }),
        signal: abortRef.current.signal,
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "stage") {
                setStageLabel(data.label);
                if (data.label.includes("playbook")) setStage("generating");
              } else if (data.type === "research_done") {
                setResearchSummary(data.summary);
              } else if (data.type === "playbook") {
                setPlaybook(data.content);
              } else if (data.type === "complete") {
                setStage("complete");
              } else if (data.type === "error") {
                setError(data.message);
                setStage("error");
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError("Analysis failed. Try again.");
        setStage("error");
      }
    }
  };

  const reset = () => {
    setStage("idle");
    setInput("");
    setTargetMarket("");
    setPlaybook("");
    setResearchSummary("");
    setError("");
    abortRef.current?.abort();
  };

  const examples = [
    { q: "Notion — workspace tool at $10/user/mo", cat: "SaaS" },
    { q: "Gymshark — DTC fitness apparel", cat: "DTC" },
    { q: "Lemon Squeezy — payment platform for creators", cat: "Fintech" },
  ];

  return (
    <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Copy size={14} style={{ color: "#F97316" }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reverse Engineer</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Copy any business model adapted to your market</div>
        </div>
      </div>

      {/* Idle state */}
      {stage === "idle" && (
        <>
          <div style={{
            border: "1px solid rgba(249,115,22,0.1)",
            borderRadius: 14, background: "var(--card-bg)",
            padding: "12px 16px", marginBottom: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") run(); }}
              placeholder="Paste a URL or describe a business to reverse engineer..."
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", width: "100%",
                marginBottom: 8,
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={targetMarket}
                onChange={e => setTargetMarket(e.target.value)}
                placeholder="Your target market (e.g., Brazil, Southeast Asia)"
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  color: "var(--text-secondary)", fontSize: 12, fontFamily: "inherit",
                }}
              />
              <button onClick={() => run()} disabled={!input.trim()} style={{
                padding: "6px 16px", borderRadius: 50, border: "none",
                background: input.trim() ? "#F97316" : "var(--card-border)",
                color: input.trim() ? "#fff" : "var(--text-tertiary)",
                fontSize: 12, fontWeight: 600, cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 4,
                fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                Reverse Engineer
              </button>
            </div>
          </div>

          {/* Examples */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {examples.map((ex, i) => (
              <div key={i} onClick={() => run(ex.q)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                cursor: "pointer", transition: "all 150ms",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.15)"; }}
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

      {/* Loading states */}
      {(stage === "researching" || stage === "generating") && (
        <div style={{
          border: "1px solid rgba(249,115,22,0.15)",
          borderRadius: 14, background: "var(--card-bg)",
          padding: 24,
        }}>
          {/* Progress steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: researchSummary ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {researchSummary ? (
                  <span style={{ fontSize: 12, color: "#22c55e" }}>&#10003;</span>
                ) : (
                  <Loader2 size={12} style={{ color: "#F97316", animation: "spin 1s linear infinite" }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, color: researchSummary ? "var(--text-secondary)" : "var(--text-primary)", fontWeight: 500 }}>
                  Research business model
                </div>
                {researchSummary && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>
                    {researchSummary.slice(0, 200)}...
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: stage === "generating" ? "rgba(249,115,22,0.12)" : "var(--card-hover-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {stage === "generating" ? (
                  <Loader2 size={12} style={{ color: "#F97316", animation: "spin 1s linear infinite" }} />
                ) : (
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>2</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: stage === "generating" ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: stage === "generating" ? 500 : 400 }}>
                Generate adaptation playbook
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
            {stageLabel}
          </div>
        </div>
      )}

      {/* Complete state */}
      {stage === "complete" && playbook && (
        <div style={{
          border: "1px solid rgba(249,115,22,0.15)",
          borderRadius: 14, background: "var(--card-bg)",
          padding: 20,
        }}>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <Copy size={10} style={{ color: "#F97316" }} />
            REVERSE ENGINEERED: {input.slice(0, 60)}{input.length > 60 ? "..." : ""}
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            <MarkdownRenderer content={playbook} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 50,
              border: "1px solid var(--card-border)", background: "none",
              color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
            }}>
              <RotateCcw size={12} /> New analysis
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>
          <button onClick={reset} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 50,
            border: "1px solid var(--card-border)", background: "none",
            color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
          }}>
            <RotateCcw size={12} /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
