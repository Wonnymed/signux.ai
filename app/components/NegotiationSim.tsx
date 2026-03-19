"use client";
import { useState, useRef, useEffect } from "react";
import { Users, Loader2, RotateCcw, ArrowUp, MessageSquare } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { signuxFetch } from "../lib/api-client";

type Persona = {
  name: string;
  role: string;
  personality: string;
  goals: string[];
  pushback_points: string[];
  negotiation_style: string;
};

type Msg = { role: "user" | "assistant"; content: string };
type Stage = "setup" | "practicing" | "feedback";

export default function NegotiationSim({ lang }: { lang: string }) {
  const [stage, setStage] = useState<Stage>("setup");
  const [context, setContext] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startPractice = async (ctx?: string) => {
    const c = ctx || context;
    if (!c.trim()) return;
    setContext(c);
    setLoading(true);
    try {
      const res = await signuxFetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: c.trim(), action: "setup", lang }),
      });
      const { persona: p } = await res.json();
      setPersona(p);

      // Get opening line from persona
      const openRes = await signuxFetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: c.trim(), persona: p, action: "respond", lang,
          messages: [{ role: "user", content: "Hello, thanks for meeting with me today." }],
        }),
      });
      const openText = await openRes.text();
      setMessages([{ role: "assistant", content: openText }]);
      setStage("practicing");
    } catch {
      // Silently fail
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !persona) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await signuxFetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context, persona, action: "respond", lang,
          messages: newMsgs,
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      setMessages([...newMsgs, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages([...newMsgs, { role: "assistant", content: full }]);
        }
      }
    } catch {}
    setLoading(false);
  };

  const getFeedback = async () => {
    if (messages.length < 2) return;
    setLoading(true);
    setStage("feedback");
    try {
      const res = await signuxFetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, persona, messages, action: "feedback", lang }),
      });
      const { feedback } = await res.json();
      setFeedbackText(feedback);
    } catch {
      setFeedbackText("Could not generate feedback. Try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setStage("setup");
    setContext("");
    setPersona(null);
    setMessages([]);
    setInput("");
    setFeedbackText("");
  };

  const examples = [
    { q: "VC pitch for $500K seed funding. My SaaS has $8K MRR, 15% MoM growth.", cat: "Pitch" },
    { q: "Salary negotiation with my employer. I want a 25% raise, current $90K.", cat: "Salary" },
    { q: "Negotiating a $50K annual contract with an enterprise client.", cat: "Sales" },
  ];

  /* ═══ SETUP ═══ */
  if (stage === "setup") {
    return (
      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={14} style={{ color: "#F97316" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Negotiation Practice</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Simulate conversations before the real meeting</div>
          </div>
        </div>

        <div style={{
          border: "1px solid rgba(249,115,22,0.1)", borderRadius: 14,
          background: "var(--card-bg)", padding: "12px 16px", marginBottom: 12,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startPractice(); } }}
            placeholder="Describe the situation... e.g., I have a meeting tomorrow with a VC to pitch for $500K. My SaaS has $8K MRR, 15% MoM growth."
            rows={3}
            style={{
              width: "100%", border: "none", outline: "none", background: "transparent",
              color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit",
              resize: "none", lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => startPractice()} disabled={!context.trim() || loading} style={{
              padding: "6px 16px", borderRadius: 50, border: "none",
              background: context.trim() && !loading ? "#F97316" : "var(--card-border)",
              color: context.trim() && !loading ? "#fff" : "var(--text-tertiary)",
              fontSize: 12, fontWeight: 600, cursor: context.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
            }}>
              {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Users size={12} />}
              Start Practice
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {examples.map((ex, i) => (
            <div key={i} onClick={() => { setContext(ex.q); startPractice(ex.q); }} style={{
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
      </div>
    );
  }

  /* ═══ PRACTICING ═══ */
  if (stage === "practicing") {
    return (
      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} style={{ color: "#F97316" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{persona?.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{persona?.role}</div>
            </div>
            <span style={{
              fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 4,
              background: "rgba(249,115,22,0.1)", color: "#F97316",
              fontFamily: "var(--font-mono)", fontWeight: 600,
              animation: "pulse 2s ease-in-out infinite",
            }}>
              IN CHARACTER
            </span>
          </div>
          <button onClick={getFeedback} disabled={messages.length < 2 || loading} style={{
            padding: "6px 14px", borderRadius: 50, border: "1px solid var(--card-border)",
            background: "none", color: "var(--text-secondary)", fontSize: 11,
            cursor: messages.length >= 2 && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: 4,
            fontFamily: "var(--font-mono)", letterSpacing: 0.5,
          }}>
            <MessageSquare size={10} /> End & Get Feedback
          </button>
        </div>

        {/* Chat */}
        <div style={{
          border: "1px solid var(--card-border)", borderRadius: 14,
          background: "var(--card-bg)", padding: 16,
          maxHeight: 400, overflowY: "auto", marginBottom: 12,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "80%",
                padding: "10px 14px", borderRadius: 14,
                background: m.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
                color: m.role === "user" ? "#000" : "var(--text-primary)",
                fontSize: 13, lineHeight: 1.5,
              }}>
                {m.role === "assistant" && (
                  <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" }}>
                    {persona?.name}
                  </div>
                )}
                {m.content}
                {m.role === "assistant" && i === messages.length - 1 && loading && (
                  <span style={{
                    display: "inline-block", width: 2, height: 14,
                    background: "#F97316", marginLeft: 3,
                    animation: "smoothBlink 1.2s ease-in-out infinite",
                    verticalAlign: "text-bottom", borderRadius: 1,
                  }} />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          border: "1px solid var(--card-border)", borderRadius: 50,
          background: "var(--card-bg)", padding: "6px 6px 6px 16px",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Your response..."
            disabled={loading}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
            }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: input.trim() && !loading ? "#F97316" : "var(--bg-tertiary)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "default",
            color: input.trim() && !loading ? "#fff" : "var(--text-tertiary)",
          }}>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    );
  }

  /* ═══ FEEDBACK ═══ */
  return (
    <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={14} style={{ color: "#F97316" }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Negotiation Feedback</div>
      </div>

      <div style={{
        border: "1px solid rgba(249,115,22,0.15)", borderRadius: 14,
        background: "var(--card-bg)", padding: 20,
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Loader2 size={24} style={{ color: "#F97316", animation: "spin 1s linear infinite", marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Analyzing your negotiation...</div>
          </div>
        ) : (
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            <MarkdownRenderer content={feedbackText} />
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <button onClick={() => { setMessages([]); setStage("practicing"); }} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 50,
            border: "1px solid var(--card-border)", background: "none",
            color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
          }}>
            <RotateCcw size={12} /> Practice Again
          </button>
          <button onClick={reset} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 50,
            border: "1px solid var(--card-border)", background: "none",
            color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
          }}>
            New Scenario
          </button>
        </div>
      )}
    </div>
  );
}
