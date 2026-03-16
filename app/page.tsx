"use client";
import { useState, useRef, useEffect } from "react";

const GOLD = "#C9A84C";
const SERIF = "'Cormorant Garamond', serif";

const AGENTS = [
  { id: "auto", label: "Auto", desc: "Signux escolhe o agente", icon: "⚡" },
  { id: "offshore", label: "Offshore", desc: "Estruturação internacional", icon: "🏛️" },
  { id: "china", label: "China Ops", desc: "Importação e fornecedores", icon: "🇨🇳" },
  { id: "opsec", label: "OPSEC", desc: "Segurança crypto", icon: "🔐" },
  { id: "geointel", label: "GeoIntel", desc: "Geopolítica e cenário", icon: "🌍" },
  { id: "language", label: "Language", desc: "Tradução e contratos", icon: "🗣️" },
];

const SUGGESTIONS = [
  "Quero abrir empresa em Hong Kong",
  "Melhor estrutura para importar da China",
  "Como proteger $100K em crypto",
  "Impacto do conflito no Oriente Médio",
  "Traduz este contrato em mandarim",
  "Dubai vs Singapura para mudar residência fiscal",
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
  }, [messages]);

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

  const activeAgent = AGENTS.find(a => a.id === agent) || AGENTS[0];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30 }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          background: "#0A0A0A",
          borderRight: "1px solid var(--border)",
          padding: 20,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: sidebarOpen ? "fixed" : undefined,
          top: sidebarOpen ? 0 : undefined,
          left: sidebarOpen ? 0 : undefined,
          bottom: sidebarOpen ? 0 : undefined,
          zIndex: sidebarOpen ? 40 : undefined,
          transform: typeof window !== "undefined" && window.innerWidth <= 768 && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 0.3s ease",
        }}
        className="sidebar"
      >
        <div style={{ fontSize: 18, letterSpacing: "0.2em", color: GOLD, fontFamily: SERIF, fontWeight: 400, marginBottom: 4 }}>
          SIGNUX
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dimmer)", letterSpacing: "0.1em", marginBottom: 32 }}>
          Operational Intelligence
        </div>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />
        <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-dimmer)", marginBottom: 12, textTransform: "uppercase" }}>
          Agents
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => { setAgent(a.id); setSidebarOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: agent === a.id ? "1px solid rgba(201,168,76,0.12)" : "1px solid transparent",
                background: agent === a.id ? "rgba(201,168,76,0.08)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                color: "white",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (agent !== a.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (agent !== a.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setMessages([]); setSidebarOpen(false); }}
          style={{ fontSize: 11, color: "var(--text-dimmer)", cursor: "pointer", padding: "8px 0", background: "none", border: "none", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dimmer)")}
        >
          + Nova conversa
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A0A0A", minWidth: 0 }}>
        {/* Header */}
        <header style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-btn"
              style={{ display: "none", background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: 4 }}
            >
              ☰
            </button>
            <span style={{ fontSize: 18 }}>{activeAgent.icon}</span>
            <span style={{ fontSize: 14, color: "white" }}>{activeAgent.label}</span>
          </div>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: "rgba(201,168,76,0.1)", color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Beta
          </span>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }} className="messages-area">
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 48, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 8 }}>Signux</div>
              <div style={{ fontSize: 14, color: "var(--text-dimmer)", marginBottom: 40 }}>All signal. Zero noise.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 640, width: "100%" }} className="suggestions-grid">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--text-dim)",
                      textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "border-color 0.2s",
                      lineHeight: 1.5,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {s}
                  </button>
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
                    maxWidth: m.role === "user" ? "70%" : "80%",
                    padding: 14,
                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.role === "user" ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)",
                    border: m.role === "user" ? "1px solid rgba(201,168,76,0.1)" : "1px solid var(--border)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", padding: 14, borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: GOLD,
                          opacity: 0.4,
                          animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }} className="input-area">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 800, margin: "0 auto" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pergunte qualquer coisa..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                maxHeight: 120,
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                color: "white",
                fontSize: 14,
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
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
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: input.trim() && !loading ? 1 : 0.3,
                transition: "opacity 0.2s",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 768px) {
          .sidebar { position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important; z-index: 40 !important; }
          .mobile-menu-btn { display: block !important; }
          .messages-area { padding: 16px !important; }
          .input-area { padding: 12px 16px !important; }
          .suggestions-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
