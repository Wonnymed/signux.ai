"use client";
import { useState, useRef, useEffect } from "react";
import { Users, Loader2, RotateCcw, ArrowUp, MessageSquare, Search, Target, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { signuxFetch } from "../lib/api-client";

type Persona = { name: string; role: string; personality: string; goals: string[]; pushback_points: string[]; negotiation_style: string };
type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intel" | "strategy" | "practice" | "debrief";

type IntelData = {
  counterparty_profile: string;
  batna_analysis: { your_batna: string; their_batna: string; who_needs_it_more: string };
  zopa: { your_range: string; their_likely_range: string; overlap: string };
  power_balance: { your_leverage: string[]; their_leverage: string[]; balance: string };
  intel_flags: { flag: string; severity: string; source: string }[];
  recommended_approach: string;
  opening_anchor: string;
};

type StrategyData = {
  anchoring: { your_anchor: string; justification: string; their_likely_counter: string };
  concession_plan: { order: number; concession: string; value_to_you: string; value_to_them: string; condition: string }[];
  walk_away: { number: string; signal: string; exit_phrase: string };
  framing: { their_frame: string; your_reframe: string };
  escalation_plan: { stage: number; tactic: string; if_blocked: string }[];
  psychological_tactics: string[];
  questions_to_ask: string[];
  phrases_to_use: string[];
  things_to_avoid: string[];
};

type DebriefData = {
  performance_score: number;
  wins: string[];
  losses: string[];
  missed_opportunities: string[];
  counterparty_tactics: string[];
  lessons: string[];
  next_steps: string[];
  verdict: string;
};

const PHASES: { key: Phase; label: string; icon: any; color: string }[] = [
  { key: "intel", label: "Intel", icon: Search, color: "#3B82F6" },
  { key: "strategy", label: "Strategy", icon: Target, color: "#F97316" },
  { key: "practice", label: "Practice", icon: Users, color: "#22C55E" },
  { key: "debrief", label: "Debrief", icon: FileText, color: "#A855F7" },
];

export default function NegotiationSim({ lang }: { lang: string }) {
  const [phase, setPhase] = useState<Phase>("intel");
  const [context, setContext] = useState("");
  const [contextLocked, setContextLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Intel
  const [intel, setIntel] = useState<IntelData | null>(null);
  // Strategy
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  // Practice
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  // Debrief
  const [debriefNotes, setDebriefNotes] = useState("");
  const [debrief, setDebrief] = useState<DebriefData | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const examples = [
    { q: "VC pitch for $500K seed funding. My SaaS has $8K MRR, 15% MoM growth.", cat: "Pitch" },
    { q: "Salary negotiation with my employer. I want a 25% raise, current $90K.", cat: "Salary" },
    { q: "Negotiating a $50K annual contract with an enterprise client.", cat: "Sales" },
  ];

  const reset = () => {
    setPhase("intel"); setContext(""); setContextLocked(false);
    setIntel(null); setStrategy(null); setPersona(null);
    setMessages([]); setInput(""); setFeedbackText(""); setShowFeedback(false);
    setDebriefNotes(""); setDebrief(null);
  };

  /* ═══ Phase Actions ═══ */
  const runIntel = async (ctx?: string) => {
    const c = ctx || context;
    if (!c.trim()) return;
    setContext(c); setContextLocked(true); setLoading(true); setIntel(null);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context: c.trim(), action: "intel", lang }) });
      const data = await res.json();
      if (data.intel) setIntel(data.intel);
    } catch {}
    setLoading(false);
  };

  const runStrategy = async () => {
    if (!context.trim()) return;
    setLoading(true); setStrategy(null);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context: context.trim(), action: "strategy", lang }) });
      const data = await res.json();
      if (data.strategy) setStrategy(data.strategy);
    } catch {}
    setLoading(false);
  };

  const startPractice = async () => {
    if (!context.trim()) return;
    setLoading(true);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context: context.trim(), action: "setup", lang }) });
      const { persona: p } = await res.json();
      setPersona(p);
      const openRes = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context: context.trim(), persona: p, action: "respond", lang, messages: [{ role: "user", content: "Hello, thanks for meeting with me today." }] }) });
      const openText = await openRes.text();
      setMessages([{ role: "assistant", content: openText }]);
    } catch {}
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !persona) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setLoading(true);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context, persona, action: "respond", lang, messages: newMsgs }) });
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
    setLoading(true); setShowFeedback(true);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context, persona, messages, action: "feedback", lang }) });
      const { feedback } = await res.json();
      setFeedbackText(feedback);
    } catch { setFeedbackText("Could not generate feedback."); }
    setLoading(false);
  };

  const runDebrief = async () => {
    if (!debriefNotes.trim()) return;
    setLoading(true); setDebrief(null);
    try {
      const res = await signuxFetch("/api/negotiate", { method: "POST", body: JSON.stringify({ context: context.trim(), action: "debrief", debrief_notes: debriefNotes.trim(), lang }) });
      const data = await res.json();
      if (data.debrief) setDebrief(data.debrief);
    } catch {}
    setLoading(false);
  };

  /* ═══ Phase Tabs ═══ */
  const PhaseNav = () => (
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {PHASES.map((p, i) => {
        const Icon = p.icon;
        const active = phase === p.key;
        return (
          <button key={p.key} onClick={() => setPhase(p.key)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 8px", borderRadius: 8, border: "none",
            background: active ? `${p.color}15` : "transparent",
            color: active ? p.color : "var(--text-tertiary)",
            fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 150ms",
          }}>
            <Icon size={12} />
            {p.label}
          </button>
        );
      })}
    </div>
  );

  /* ═══ Context Input (shown when not locked) ═══ */
  if (!contextLocked) {
    return (
      <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={14} style={{ color: "#F97316" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Negotiation War Room</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Intel → Strategy → Practice → Debrief</div>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(249,115,22,0.1)", borderRadius: 14, background: "var(--card-bg)", padding: "12px 16px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={context} onChange={e => setContext(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runIntel(); } }}
            placeholder="Describe the negotiation... e.g., Tomorrow I meet a VC to pitch for $500K seed funding. My SaaS has $8K MRR and 15% MoM growth."
            rows={3}
            style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", resize: "none", lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => runIntel()} disabled={!context.trim() || loading} style={{
              padding: "6px 16px", borderRadius: 50, border: "none",
              background: context.trim() && !loading ? "#F97316" : "var(--card-border)",
              color: context.trim() && !loading ? "var(--text-inverse)" : "var(--text-tertiary)",
              fontSize: 12, fontWeight: 600, cursor: context.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase",
            }}>
              {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={12} />}
              Start Intel
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {examples.map((ex, i) => (
            <div key={i} onClick={() => { setContext(ex.q); runIntel(ex.q); }} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
              background: "var(--card-bg)", border: "1px solid var(--card-border)", cursor: "pointer", transition: "all 150ms",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; }}
            >
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>{ex.q}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, background: "var(--card-bg)", color: "var(--text-tertiary)", border: "1px solid var(--card-border)" }}>{ex.cat}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ═══ War Room (locked context) ═══ */
  return (
    <div style={{ maxWidth: 680, width: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={16} style={{ color: "#F97316" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>War Room</span>
        </div>
        <button onClick={reset} style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
          border: "1px solid var(--border-primary)", background: "transparent", cursor: "pointer",
          fontSize: 10, color: "var(--text-tertiary)",
        }}>
          <RotateCcw size={10} /> New
        </button>
      </div>

      {/* Context summary */}
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "6px 10px", borderRadius: 6, background: "var(--bg-secondary)", marginBottom: 12, lineHeight: 1.4 }}>
        {context.length > 120 ? context.slice(0, 120) + "..." : context}
      </div>

      <PhaseNav />

      {/* ═══ INTEL PHASE ═══ */}
      {phase === "intel" && (
        <>
          {loading && !intel && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Loader2 size={24} style={{ color: "#3B82F6", animation: "spin 1s linear infinite", marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Gathering intelligence...</div>
            </div>
          )}
          {intel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* BATNA */}
              <Card title="BATNA Analysis" color="#3B82F6">
                <Row label="Your BATNA" value={intel.batna_analysis.your_batna} />
                <Row label="Their BATNA" value={intel.batna_analysis.their_batna} />
                <Row label="Who needs it more" value={intel.batna_analysis.who_needs_it_more} highlight />
              </Card>
              {/* ZOPA */}
              <Card title="Zone of Possible Agreement" color="#22C55E">
                <Row label="Your range" value={intel.zopa.your_range} />
                <Row label="Their likely range" value={intel.zopa.their_likely_range} />
                <Row label="Overlap" value={intel.zopa.overlap} highlight />
              </Card>
              {/* Power Balance */}
              <Card title="Power Balance" color="#F97316">
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <strong>Your leverage:</strong> {intel.power_balance.your_leverage?.join(" • ")}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <strong>Their leverage:</strong> {intel.power_balance.their_leverage?.join(" • ")}
                </div>
                <div style={{
                  display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                  background: intel.power_balance.balance === "favorable" ? "rgba(34,197,94,0.1)" : intel.power_balance.balance === "unfavorable" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  color: intel.power_balance.balance === "favorable" ? "#22c55e" : intel.power_balance.balance === "unfavorable" ? "#ef4444" : "#f59e0b",
                }}>{intel.power_balance.balance?.toUpperCase()}</div>
              </Card>
              {/* Flags */}
              {intel.intel_flags?.length > 0 && (
                <Card title="Intel Flags" color="#EF4444">
                  {intel.intel_flags.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0" }}>
                      <AlertTriangle size={11} style={{ color: f.severity === "HIGH" ? "#ef4444" : "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{f.flag}</div>
                    </div>
                  ))}
                </Card>
              )}
              {/* Recommendation */}
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", marginBottom: 4, textTransform: "uppercase" }}>Recommended Approach</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{intel.recommended_approach}</div>
                {intel.opening_anchor && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <strong>Opening anchor:</strong> {intel.opening_anchor}
                  </div>
                )}
              </div>
              <button onClick={() => { setPhase("strategy"); if (!strategy) runStrategy(); }} style={{
                padding: "10px", borderRadius: 8, border: "none", background: "#F97316", color: "#000",
                fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
              }}>
                Continue to Strategy →
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ STRATEGY PHASE ═══ */}
      {phase === "strategy" && (
        <>
          {loading && !strategy && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Loader2 size={24} style={{ color: "#F97316", animation: "spin 1s linear infinite", marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Building strategy...</div>
            </div>
          )}
          {strategy && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Card title="Anchoring" color="#F97316">
                <Row label="Your anchor" value={strategy.anchoring.your_anchor} highlight />
                <Row label="Justification" value={strategy.anchoring.justification} />
                <Row label="Their likely counter" value={strategy.anchoring.their_likely_counter} />
              </Card>
              <Card title="Concession Plan" color="#F59E0B">
                {strategy.concession_plan?.map((c, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: i < strategy.concession_plan.length - 1 ? "1px solid var(--border-primary)" : "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>#{c.order}: {c.concession}</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Value to you: {c.value_to_you} | To them: {c.value_to_them} | Condition: {c.condition}</div>
                  </div>
                ))}
              </Card>
              <Card title="Walk Away" color="#EF4444">
                <Row label="Your floor" value={strategy.walk_away.number} highlight />
                <Row label="How to signal" value={strategy.walk_away.signal} />
                <Row label="Exit phrase" value={strategy.walk_away.exit_phrase} />
              </Card>
              <Card title="Escalation Plan" color="#6366F1">
                {strategy.escalation_plan?.map((s, i) => (
                  <div key={i} style={{ padding: "4px 0", fontSize: 11, color: "var(--text-secondary)" }}>
                    <strong>Stage {s.stage}:</strong> {s.tactic} <span style={{ color: "var(--text-tertiary)" }}>| If blocked: {s.if_blocked}</span>
                  </div>
                ))}
              </Card>
              {strategy.questions_to_ask?.length > 0 && (
                <Card title="Questions to Ask" color="#3B82F6">
                  {strategy.questions_to_ask.map((q, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>• {q}</div>
                  ))}
                </Card>
              )}
              {strategy.things_to_avoid?.length > 0 && (
                <Card title="Things to Avoid" color="#EF4444">
                  {strategy.things_to_avoid.map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>✗ {t}</div>
                  ))}
                </Card>
              )}
              <button onClick={() => { setPhase("practice"); if (!persona) startPractice(); }} style={{
                padding: "10px", borderRadius: 8, border: "none", background: "#22C55E", color: "#000",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                Start Practice →
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ PRACTICE PHASE ═══ */}
      {phase === "practice" && (
        <>
          {loading && messages.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Loader2 size={24} style={{ color: "#22C55E", animation: "spin 1s linear infinite", marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Setting up counterpart...</div>
            </div>
          )}
          {showFeedback ? (
            <div>
              <div style={{ border: "1px solid rgba(249,115,22,0.15)", borderRadius: 14, background: "var(--card-bg)", padding: 20 }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: 32 }}>
                    <Loader2 size={24} style={{ color: "#F97316", animation: "spin 1s linear infinite", marginBottom: 12 }} />
                    <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Analyzing your negotiation...</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 15, lineHeight: 1.7 }}><MarkdownRenderer content={feedbackText} /></div>
                )}
              </div>
              {!loading && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
                  <button onClick={() => { setMessages([]); setShowFeedback(false); startPractice(); }} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 50,
                    border: "1px solid var(--card-border)", background: "none", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                  }}><RotateCcw size={10} /> Practice Again</button>
                  <button onClick={() => setPhase("debrief")} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 50,
                    border: "none", background: "#A855F7", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>Go to Debrief →</button>
                </div>
              )}
            </div>
          ) : messages.length > 0 && (
            <div>
              {/* Persona header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={12} style={{ color: "#22C55E" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{persona?.name}</span>
                  <span style={{ fontSize: 8, letterSpacing: 1, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22C55E", fontFamily: "var(--font-mono)", fontWeight: 600 }}>IN CHARACTER</span>
                </div>
                <button onClick={getFeedback} disabled={messages.length < 2 || loading} style={{
                  padding: "4px 10px", borderRadius: 50, border: "1px solid var(--card-border)",
                  background: "none", color: "var(--text-secondary)", fontSize: 10, cursor: messages.length >= 2 && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 4,
                }}><MessageSquare size={10} /> End & Feedback</button>
              </div>
              {/* Chat */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: 14, background: "var(--card-bg)", padding: 14, maxHeight: 340, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px", borderRadius: 12,
                      background: m.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
                      color: m.role === "user" ? "#000" : "var(--text-primary)", fontSize: 12, lineHeight: 1.5,
                    }}>
                      {m.content}
                      {m.role === "assistant" && i === messages.length - 1 && loading && (
                        <span style={{ display: "inline-block", width: 2, height: 12, background: "#22C55E", marginLeft: 3, animation: "smoothBlink 1.2s ease-in-out infinite", verticalAlign: "text-bottom", borderRadius: 1 }} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              {/* Input */}
              <div style={{ display: "flex", gap: 6, alignItems: "center", border: "1px solid var(--card-border)", borderRadius: 50, background: "var(--card-bg)", padding: "4px 4px 4px 14px" }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(); }} placeholder="Your response..." disabled={loading}
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit" }} />
                <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: input.trim() && !loading ? "#22C55E" : "var(--bg-tertiary)",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "default", color: input.trim() && !loading ? "#000" : "var(--text-tertiary)",
                }}><ArrowUp size={12} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ DEBRIEF PHASE ═══ */}
      {phase === "debrief" && (
        <>
          {!debrief ? (
            <div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                The negotiation happened. Tell us how it went — what you said, what they said, the outcome. Be specific.
              </p>
              <textarea value={debriefNotes} onChange={e => setDebriefNotes(e.target.value)} placeholder="E.g.: I opened at $600K, they countered at $300K. We settled at $450K with a 20% equity dilution. They pushed hard on the board seat — I conceded. The meeting lasted 45 minutes..."
                style={{ width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 13, resize: "vertical", lineHeight: 1.5, outline: "none", fontFamily: "inherit" }} />
              <button onClick={runDebrief} disabled={!debriefNotes.trim() || loading} style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none", marginTop: 10,
                background: debriefNotes.trim() && !loading ? "#A855F7" : "var(--bg-tertiary)",
                color: debriefNotes.trim() && !loading ? "#fff" : "var(--text-tertiary)",
                fontSize: 12, fontWeight: 700, cursor: debriefNotes.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={12} />}
                Analyze My Negotiation
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Score */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px", borderRadius: 10, background: `${debrief.performance_score >= 7 ? "#22c55e" : debrief.performance_score >= 5 ? "#f59e0b" : "#ef4444"}10`, border: `1px solid ${debrief.performance_score >= 7 ? "#22c55e" : debrief.performance_score >= 5 ? "#f59e0b" : "#ef4444"}25` }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: debrief.performance_score >= 7 ? "#22c55e" : debrief.performance_score >= 5 ? "#f59e0b" : "#ef4444" }}>{debrief.performance_score}/10</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Performance Score</span>
              </div>
              {debrief.wins?.length > 0 && <Card title="Wins" color="#22C55E">{debrief.wins.map((w, i) => <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>✓ {w}</div>)}</Card>}
              {debrief.losses?.length > 0 && <Card title="Losses" color="#EF4444">{debrief.losses.map((l, i) => <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>✗ {l}</div>)}</Card>}
              {debrief.counterparty_tactics?.length > 0 && <Card title="Tactics They Used" color="#F59E0B">{debrief.counterparty_tactics.map((t, i) => <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>• {t}</div>)}</Card>}
              {debrief.lessons?.length > 0 && <Card title="Lessons for Next Time" color="#6366F1">{debrief.lessons.map((l, i) => <div key={i} style={{ fontSize: 11, color: "var(--text-secondary)", padding: "3px 0" }}>{i + 1}. {l}</div>)}</Card>}
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#A855F7", marginBottom: 4, textTransform: "uppercase" }}>Verdict</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{debrief.verdict}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══ Helpers ═══ */
function Card({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${color}18`, background: `${color}05` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: "3px 0", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
      <strong style={{ color: highlight ? "var(--text-primary)" : "var(--text-secondary)" }}>{label}:</strong> {value}
    </div>
  );
}
