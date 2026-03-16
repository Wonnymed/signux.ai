"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const GOLD = "#C9A84C";
const SERIF = "'Cormorant Garamond', serif";

const AGENTS = [
  { id: "auto", label: "Auto", desc: "Signux routes automatically", icon: "⚡" },
  { id: "offshore", label: "Offshore", desc: "International structuring", icon: "🏛️" },
  { id: "china", label: "China Ops", desc: "Import & suppliers", icon: "🇨🇳" },
  { id: "opsec", label: "OPSEC", desc: "Crypto security", icon: "🔐" },
  { id: "geointel", label: "GeoIntel", desc: "Geopolitics & macro", icon: "🌍" },
  { id: "language", label: "Language", desc: "Translation & contracts", icon: "🗣️" },
];

const SUGGESTIONS = [
  "Quero abrir empresa em Hong Kong",
  "Melhor estrutura para importar da China",
  "Como proteger $100K em crypto",
  "Impacto do conflito no Oriente Médio",
  "Traduz este contrato em mandarim",
  "Dubai vs Singapura para residência fiscal",
];

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState("auto");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, agent }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.response || data.error || "Erro ao processar." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const activeAgent = AGENTS.find(a => a.id === agent) || AGENTS[0];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 260, background: "#0A0A0A", borderRight: "1px solid rgba(255,255,255,0.06)", padding: 20, flexShrink: 0, display: "flex", flexDirection: "column", zIndex: 50 }}>
        <div style={{ fontSize: 20, letterSpacing: "0.25em", color: GOLD, fontFamily: SERIF, fontWeight: 300 }}>SIGNUX</div>
        <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginTop: 4, marginBottom: 32 }}>Operational Intelligence</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 24 }} />
        <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 16 }}>Agents</div>
        <div style={{ flex: 1 }}>
          {AGENTS.map(a => (
            <div
              key={a.id}
              onClick={() => { setAgent(a.id); setSidebarOpen(false); }}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
                transition: "all 0.2s",
                background: agent === a.id ? "rgba(201,168,76,0.06)" : "transparent",
                border: agent === a.id ? "1px solid rgba(201,168,76,0.1)" : "1px solid transparent",
              }}
              onMouseEnter={e => { if (agent !== a.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={e => { if (agent !== a.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: "white" }}>{a.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setMessages([]); setSidebarOpen(false); }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: "8px 0", background: "none", border: "none", textAlign: "left", fontFamily: "'DM Sans', sans-serif", marginTop: "auto", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(201,168,76,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        >
          + Nova conversa
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A0A0A", minWidth: 0 }}>
        {/* Header */}
        <header style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSidebarOpen(true)} className="mobile-menu-btn" style={{ display: "none", background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", padding: 4 }}>☰</button>
            <span style={{ fontSize: 16 }}>{activeAgent.icon}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{activeAgent.label}</span>
          </div>
          <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 12, background: "rgba(201,168,76,0.08)", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Beta</span>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column" }} className="messages-area">
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", maxWidth: 600, margin: "0 auto", width: "100%" }}>
              <div className="welcome-title" style={{ fontSize: 56, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 4 }}>Signux</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.2)", marginBottom: 48 }}>All signal. Zero noise.</div>
              <div className="suggestions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
                {SUGGESTIONS.map(s => (
                  <div
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                      lineHeight: 1.5,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800, margin: "0 auto", width: "100%" }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: m.role === "user" ? "70%" : "85%",
                    padding: m.role === "user" ? "14px 18px" : "16px 20px",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: m.role === "user" ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                    border: m.role === "user" ? "1px solid rgba(201,168,76,0.08)" : "1px solid rgba(255,255,255,0.04)",
                    fontSize: 14,
                    lineHeight: m.role === "user" ? 1.7 : 1.8,
                    color: m.role === "user" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
                    ...(m.role === "user" ? { whiteSpace: "pre-wrap" as const } : {}),
                    wordBreak: "break-word",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {m.role === "user" ? m.content : (
                    <ReactMarkdown components={{
                      h1: ({children}) => <h1 style={{ fontSize: 20, fontWeight: 500, fontFamily: "'Cormorant Garamond', serif", marginBottom: 12, marginTop: 16, color: "#C9A84C" }}>{children}</h1>,
                      h2: ({children}) => <h2 style={{ fontSize: 17, fontWeight: 500, fontFamily: "'Cormorant Garamond', serif", marginBottom: 10, marginTop: 14, color: "#C9A84C" }}>{children}</h2>,
                      h3: ({children}) => <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, marginTop: 12, color: "rgba(255,255,255,0.85)" }}>{children}</h3>,
                      p: ({children}) => <p style={{ marginBottom: 10, lineHeight: 1.8 }}>{children}</p>,
                      ul: ({children}) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
                      ol: ({children}) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
                      li: ({children}) => <li style={{ marginBottom: 6, lineHeight: 1.7 }}>{children}</li>,
                      strong: ({children}) => <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{children}</strong>,
                      code: ({children}) => <code style={{ background: "rgba(201,168,76,0.08)", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#C9A84C" }}>{children}</code>,
                      blockquote: ({children}) => <blockquote style={{ borderLeft: "2px solid rgba(201,168,76,0.3)", paddingLeft: 16, margin: "12px 0", color: "rgba(255,255,255,0.5)" }}>{children}</blockquote>,
                    }}>{m.content}</ReactMarkdown>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", padding: "16px 20px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }} className="input-area">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 800, margin: "0 auto", width: "100%" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKey}
              placeholder="Pergunte qualquer coisa..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "white",
                fontSize: 14,
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: GOLD,
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: input.trim() && !loading ? 1 : 0.3,
                transition: "opacity 0.2s",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 20, color: "#0A0A0A", fontWeight: "bold", lineHeight: 1 }}>↑</span>
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        textarea::placeholder { color: rgba(255,255,255,0.15); }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .sidebar.open { transform: translateX(0) !important; }
          .mobile-menu-btn { display: block !important; }
          .messages-area { padding: 16px !important; }
          .input-area { padding: 12px 16px !important; }
          .suggestions-grid { grid-template-columns: 1fr !important; }
          .welcome-title { font-size: 40px !important; }
        }
      `}</style>

    </div>
  );
}
