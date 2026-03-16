"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getProfile, updateProfile, type UserProfile } from "./lib/profile";

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

const SIM_EXAMPLES = [
  "Importar eletrônicos da China para o Brasil",
  "Abrir empresa em Hong Kong morando no Brasil",
  "Vender café premium para distribuidor na China",
];

const AGENT_LABELS: Record<string, { icon: string; name: string; action: string }> = {
  chinese_supplier: { icon: "🇨🇳", name: "Fornecedor chinês", action: "analisando proposta..." },
  customs_agent: { icon: "📋", name: "Despachante aduaneiro", action: "calculando tarifas..." },
  freight_forwarder: { icon: "📦", name: "Freight forwarder", action: "calculando rotas..." },
  market_analyst: { icon: "📊", name: "Analista de mercado", action: "avaliando viabilidade..." },
  risk_assessor: { icon: "⚠️", name: "Analista de risco", action: "mapeando riscos..." },
  tax_advisor: { icon: "🏛️", name: "Consultor tributário", action: "analisando estrutura..." },
};

type Message = { role: "user" | "assistant"; content: string };

const OPERATIONS = ["Import/Export", "Offshore/Holdings", "Crypto", "Serviços digitais", "E-commerce", "Investimentos", "Outro"];

const MD_COMPONENTS = {
  h1: ({children}: any) => <h1 style={{ fontSize: 20, fontWeight: 500, fontFamily: "'Cormorant Garamond', serif", marginBottom: 12, marginTop: 16, color: "#C9A84C" }}>{children}</h1>,
  h2: ({children}: any) => <h2 style={{ fontSize: 17, fontWeight: 500, fontFamily: "'Cormorant Garamond', serif", marginBottom: 10, marginTop: 14, color: "#C9A84C" }}>{children}</h2>,
  h3: ({children}: any) => <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, marginTop: 12, color: "rgba(255,255,255,0.85)" }}>{children}</h3>,
  p: ({children}: any) => <p style={{ marginBottom: 10, lineHeight: 1.8 }}>{children}</p>,
  ul: ({children}: any) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
  ol: ({children}: any) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
  li: ({children}: any) => <li style={{ marginBottom: 6, lineHeight: 1.7 }}>{children}</li>,
  strong: ({children}: any) => <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{children}</strong>,
  code: ({children}: any) => <code style={{ background: "rgba(201,168,76,0.08)", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#C9A84C" }}>{children}</code>,
  blockquote: ({children}: any) => <blockquote style={{ borderLeft: "2px solid rgba(201,168,76,0.3)", paddingLeft: 16, margin: "12px 0", color: "rgba(255,255,255,0.5)" }}>{children}</blockquote>,
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState("auto");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardName, setOnboardName] = useState("");
  const [onboardCountry, setOnboardCountry] = useState("");
  const [onboardOps, setOnboardOps] = useState<string[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [mode, setMode] = useState<"chat" | "simulate">("chat");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simScenario, setSimScenario] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const profile = getProfile();
    setOnboarded(!!profile);
    if (profile) setProfileName(profile.name);
    fetch("/api/rates").then(r => r.json()).then(setRates).catch(() => {});
  }, []);

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
        body: JSON.stringify({ messages: newMessages, agent, profile: getProfile(), rates }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.response || data.error || "Erro ao processar." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Erro de conexão. Tente novamente." }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const simulate = async () => {
    if (!simScenario.trim()) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: simScenario, context: getProfile() }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch {
      setSimResult({ error: "Erro na simulação. Tente novamente." });
    }
    setSimulating(false);
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

  const canSubmitOnboard = onboardName.trim() && onboardCountry.trim();

  /* ── ONBOARDING FULLSCREEN ── */
  if (onboarded === false) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0A0A0A" }}>
        <div style={{ maxWidth: 440, width: "100%", padding: "48px 40px" }}>
          <div style={{ fontSize: 14, letterSpacing: "0.3em", color: GOLD, fontFamily: SERIF, textAlign: "center", marginBottom: 4 }}>SIGNUX</div>
          <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.15)", textAlign: "center", textTransform: "uppercase", marginBottom: 48 }}>Operational Intelligence</div>
          <div style={{ width: 40, height: 1, background: "rgba(201,168,76,0.2)", margin: "0 auto 48px" }} />
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", marginBottom: 40 }}>Antes de começar, preciso de contexto.</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Seu nome</label>
              <input
                value={onboardName}
                onChange={e => setOnboardName(e.target.value)}
                placeholder="Como quer ser chamado"
                className="onboard-input"
                style={{ width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>País de residência fiscal</label>
              <input
                value={onboardCountry}
                onChange={e => setOnboardCountry(e.target.value)}
                placeholder="Ex: Brasil, Portugal, EUA"
                className="onboard-input"
                style={{ width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              />
            </div>
            <div style={{ marginBottom: 40 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>O que você opera?</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {OPERATIONS.map(op => (
                  <button
                    key={op}
                    onClick={() => setOnboardOps(prev => prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op])}
                    className="onboard-pill"
                    style={{
                      padding: "8px 18px", borderRadius: 20, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
                      background: onboardOps.includes(op) ? "rgba(201,168,76,0.08)" : "transparent",
                      border: onboardOps.includes(op) ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.08)",
                      color: onboardOps.includes(op) ? GOLD : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                if (!canSubmitOnboard) return;
                updateProfile({ name: onboardName.trim(), taxResidence: onboardCountry.trim(), operations: onboardOps });
                setProfileName(onboardName.trim());
                setOnboarded(true);
              }}
              disabled={!canSubmitOnboard}
              style={{
                width: "100%", padding: 16, borderRadius: 8, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A",
                fontSize: 13, fontWeight: 600, fontFamily: SERIF, letterSpacing: "0.15em", textTransform: "uppercase", border: "none",
                cursor: canSubmitOnboard ? "pointer" : "not-allowed", marginTop: 8, opacity: canSubmitOnboard ? 1 : 0.4, transition: "opacity 0.2s",
              }}
            >
              Começar
            </button>
          </div>
        </div>
        <style>{`
          .onboard-input::placeholder { color: rgba(255,255,255,0.15); }
          .onboard-input:focus { border-bottom-color: rgba(201,168,76,0.3) !important; }
          .onboard-pill:hover { border-color: rgba(255,255,255,0.15) !important; }
        `}</style>
      </div>
    );
  }

  if (onboarded === null) return null;

  /* ── Simulation content renderer ── */
  const renderSimulation = () => {
    /* Input screen */
    if (!simResult && !simulating) {
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 4 }}>Simulation Engine</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", marginBottom: 48 }}>Descreva seu cenário. Signux simula com múltiplos agentes.</div>
            <textarea
              value={simScenario}
              onChange={e => setSimScenario(e.target.value)}
              placeholder="Ex: Quero importar 5.000 fones bluetooth de Guangzhou para São Paulo com budget de $15.000"
              style={{
                width: "100%", minHeight: 120, padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 15, lineHeight: 1.7,
                resize: "vertical", outline: "none", fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }} className="sim-examples-grid">
              {SIM_EXAMPLES.map(ex => (
                <div
                  key={ex}
                  onClick={() => setSimScenario(ex)}
                  style={{
                    padding: "12px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.04)",
                    fontSize: 12, color: "rgba(255,255,255,0.25)", cursor: "pointer", transition: "all 0.2s", textAlign: "left", lineHeight: 1.5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
                >
                  {ex}
                </div>
              ))}
            </div>
            <button
              onClick={simulate}
              disabled={!simScenario.trim()}
              style={{
                width: "100%", padding: 16, borderRadius: 10, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A",
                fontSize: 14, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", border: "none", marginTop: 24,
                cursor: simScenario.trim() ? "pointer" : "not-allowed", opacity: simScenario.trim() ? 1 : 0.4, transition: "opacity 0.2s",
                fontFamily: SERIF,
              }}
            >
              Iniciar simulação
            </button>
          </div>
        </div>
      );
    }

    /* Simulating — loading animation */
    if (simulating) {
      const agentIds = ["market_analyst", "risk_assessor", "chinese_supplier", "customs_agent", "freight_forwarder", "tax_advisor"];
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 18, color: "white", marginBottom: 8, fontFamily: SERIF }}>Simulação em andamento...</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginBottom: 32 }}>Múltiplos agentes analisando seu cenário</div>
            {/* Progress bar */}
            <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, marginBottom: 32, overflow: "hidden" }}>
              <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, rgba(201,168,76,0.3))`, borderRadius: 1, animation: "progressPulse 2s ease-in-out infinite", width: "60%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
              {agentIds.map((id, i) => {
                const info = AGENT_LABELS[id];
                if (!info) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 16, animation: i % 2 === 0 ? "agentPulse 1.5s ease-in-out infinite" : `agentPulse 1.5s ease-in-out ${0.3}s infinite` }}>{info.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{info.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{info.action}</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, opacity: 0.4, animation: `dotPulse 1.4s ease-in-out ${i * 0.15}s infinite` }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    /* Result — report + summary cards */
    if (simResult) {
      if (simResult.error) {
        return (
          <div style={{ flex: 1, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>{simResult.error}</div>
              <button onClick={() => { setSimResult(null); }} style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(201,168,76,0.1)", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 13, cursor: "pointer" }}>Tentar novamente</button>
            </div>
          </div>
        );
      }

      const report = simResult.report || "";
      const plan = simResult.plan || {};

      // Extract recommendation from report
      const isGo = /\bGO\b/.test(report) && !/\bNO-GO\b/.test(report.split("RECOMMENDATION")[1] || report.slice(-500));
      const hasNoGo = /\bNO-GO\b/i.test(report.split("RECOMMENDATION")[1] || report.slice(-500));

      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div className="sim-result-layout" style={{ display: "flex", gap: 24, maxWidth: 1100, margin: "0 auto", width: "100%" }}>
            {/* Left — Report */}
            <div style={{ flex: 3, minWidth: 0 }}>
              <div style={{ padding: "24px 28px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Sans', sans-serif" }}>
                <ReactMarkdown components={MD_COMPONENTS}>{report}</ReactMarkdown>
              </div>
            </div>
            {/* Right — Summary cards */}
            <div className="sim-cards" style={{ flex: 2, display: "flex", flexDirection: "column", gap: 12, minWidth: 200 }}>
              {/* Recommendation */}
              <div style={{ padding: "20px 24px", borderRadius: 12, background: hasNoGo ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", border: hasNoGo ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(34,197,94,0.15)", textAlign: "center" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8 }}>Recommendation</div>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: SERIF, color: hasNoGo ? "#ef4444" : "#22c55e" }}>{hasNoGo ? "NO-GO" : "GO"}</div>
              </div>
              {/* Agents used */}
              <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 10 }}>Agentes utilizados</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(plan.agents || []).map((a: string) => {
                    const info = AGENT_LABELS[a];
                    return info ? (
                      <span key={a} style={{ padding: "4px 10px", borderRadius: 12, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        {info.icon} {info.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              {/* Rounds */}
              <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8 }}>Rounds de análise</div>
                <div style={{ fontSize: 24, fontWeight: 300, fontFamily: SERIF, color: "white" }}>{plan.rounds || "—"}</div>
              </div>
              {/* Summary */}
              {plan.summary && (
                <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8 }}>Cenário</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{plan.summary}</div>
                </div>
              )}
              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => { setSimResult(null); setSimScenario(""); }}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                >
                  Nova simulação
                </button>
                <button
                  onClick={() => {
                    const text = `SIGNUX SIMULATION REPORT\n${"=".repeat(40)}\n\nScenario: ${simScenario}\nAgents: ${(plan.agents || []).join(", ")}\nRounds: ${plan.rounds}\n\n${report}`;
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "signux-simulation.txt";
                    a.click();
                  }}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)", color: GOLD, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.06)"; }}
                >
                  Salvar relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ── MAIN APP ── */
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

        {/* Mode toggle */}
        <div style={{ display: "flex", marginBottom: 24, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setMode("chat")} style={{ flex: 1, padding: "10px 0", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: mode === "chat" ? "rgba(201,168,76,0.08)" : "transparent", color: mode === "chat" ? GOLD : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>Chat</button>
          <button onClick={() => setMode("simulate")} style={{ flex: 1, padding: "10px 0", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: mode === "simulate" ? "rgba(201,168,76,0.08)" : "transparent", color: mode === "simulate" ? GOLD : "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>Simulate</button>
        </div>

        {mode === "chat" && (
          <>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 16 }}>Agents</div>
            <div style={{ flex: 1 }}>
              {AGENTS.map((a, idx) => (
                <div key={a.id}>
                  <div
                    onClick={() => { setAgent(a.id); setSidebarOpen(false); }}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
                      background: agent === a.id ? "rgba(201,168,76,0.04)" : "transparent",
                      border: agent === a.id ? "1px solid rgba(201,168,76,0.08)" : "1px solid transparent",
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
                  {idx < AGENTS.length - 1 && (
                    <div style={{ height: 1, background: "rgba(255,255,255,0.03)", margin: "2px 12px" }} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "simulate" && (
          <>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 16 }}>Simulation Agents</div>
            <div style={{ flex: 1 }}>
              {Object.entries(AGENT_LABELS).map(([id, info], idx) => (
                <div key={id}>
                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 16 }}>{info.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{info.name}</div>
                    </div>
                  </div>
                  {idx < Object.keys(AGENT_LABELS).length - 1 && (
                    <div style={{ height: 1, background: "rgba(255,255,255,0.03)", margin: "2px 12px" }} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => { if (mode === "chat") { setMessages([]); } else { setSimResult(null); setSimScenario(""); } setSidebarOpen(false); }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "8px 0", background: "none", border: "none", textAlign: "left", fontFamily: "'DM Sans', sans-serif", marginTop: "auto", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(201,168,76,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")}
        >
          {mode === "chat" ? "Nova conversa" : "Nova simulação"}
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A0A0A", minWidth: 0 }}>
        {/* Header */}
        <header style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSidebarOpen(true)} className="mobile-menu-btn" style={{ display: "none", background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", padding: 4 }}>☰</button>
            {mode === "chat" ? (
              <>
                <span style={{ fontSize: 16 }}>{activeAgent.icon}</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{activeAgent.label}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 16 }}>🧪</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Simulation Engine</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {rates && (
              <div className="rates-ticker" style={{ fontSize: 9, color: "rgba(255,255,255,0.12)" }}>
                USD/BRL {rates.USDBRL?.toFixed(2)} · USD/CNY {rates.USDCNY?.toFixed(2)} · USD/HKD {rates.USDHKD?.toFixed(2)}
              </div>
            )}
            {mode === "chat" && messages.length > 0 && (
              <button
                onClick={() => {
                  const text = messages.map(m => (m.role === "user" ? "Você: " : "Signux: ") + m.content).join("\n\n---\n\n");
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "signux-conversa.txt";
                  a.click();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.15)", padding: 4, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")}
                title="Salvar conversa"
              >
                ↓
              </button>
            )}
            <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 12, background: "rgba(201,168,76,0.08)", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Beta</span>
          </div>
        </header>

        {/* Content area */}
        {mode === "simulate" ? renderSimulation() : (
          <>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column" }} className="messages-area">
              {messages.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", maxWidth: 600, margin: "0 auto", width: "100%" }}>
                  <div className="welcome-title" style={{ fontSize: 28, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 4 }}>Olá, {profileName || "Operador"}.</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", marginBottom: 48 }}>O que quer resolver hoje?</div>
                  <div className="suggestions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                    {SUGGESTIONS.map(s => (
                      <div
                        key={s}
                        onClick={() => send(s)}
                        style={{
                          padding: "16px 20px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 13, color: "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s", textAlign: "left", lineHeight: 1.5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(201,168,76,0.02)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800, margin: "0 auto", width: "100%" }}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: m.role === "user" ? "70%" : "80%",
                        padding: m.role === "user" ? "14px 20px" : "20px 24px",
                        borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: m.role === "user" ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                        border: m.role === "user" ? "1px solid rgba(201,168,76,0.08)" : "1px solid rgba(255,255,255,0.04)",
                        fontSize: 14, lineHeight: m.role === "user" ? 1.7 : 1.8,
                        color: m.role === "user" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
                        ...(m.role === "user" ? { whiteSpace: "pre-wrap" as const } : {}),
                        wordBreak: "break-word", fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {m.role === "user" ? m.content : (
                        <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div style={{ alignSelf: "flex-start", padding: "20px 24px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(201,168,76,0.4)", animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
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
                    flex: 1, resize: "none", padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none",
                    fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="send-btn"
                  style={{
                    width: 44, height: 44, borderRadius: 12, background: GOLD, border: "none",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: input.trim() && !loading ? 1 : 0.3, transition: "opacity 0.2s, transform 0.15s", flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 20, color: "#0A0A0A", fontWeight: "bold", lineHeight: 1 }}>↑</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes agentPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes progressPulse {
          0% { width: 20%; opacity: 0.5; }
          50% { width: 70%; opacity: 1; }
          100% { width: 20%; opacity: 0.5; }
        }
        textarea::placeholder { color: rgba(255,255,255,0.15); }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); }
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
          .sim-examples-grid { grid-template-columns: 1fr !important; }
          .welcome-title { font-size: 24px !important; }
          .rates-ticker { display: none !important; }
          .sim-result-layout { flex-direction: column !important; }
          .sim-cards { min-width: 0 !important; }
        }
      `}</style>

    </div>
  );
}
