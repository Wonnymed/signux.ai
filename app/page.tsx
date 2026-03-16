"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getProfile, updateProfile } from "./lib/profile";

const GOLD = "#C9A84C";
const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";

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
  { emoji: "🇨🇳", text: "Importar 3.000 smartwatches de Guangzhou para o Brasil via FOB" },
  { emoji: "🏛️", text: "Abrir holding em Hong Kong morando no Brasil, volume de $20K/mês" },
  { emoji: "☕", text: "Exportar café especial brasileiro para distribuidores na China" },
];

const SIM_STAGES = [
  { icon: "🔍", label: "Extraindo entidades e relações" },
  { icon: "👥", label: "Gerando agentes especializados" },
  { icon: "⚡", label: "Rodando simulação multi-agente" },
  { icon: "💬", label: "Agentes debatendo cenários" },
  { icon: "📊", label: "Compilando relatório final" },
];

const ENTITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  product: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
  country: { bg: "rgba(34,197,94,0.1)", color: "#22C55E", border: "rgba(34,197,94,0.15)" },
  company: { bg: "rgba(168,85,247,0.1)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  market: { bg: "rgba(168,85,247,0.1)", color: "#A855F7", border: "rgba(168,85,247,0.15)" },
  regulation: { bg: "rgba(239,68,68,0.1)", color: "#EF4444", border: "rgba(239,68,68,0.15)" },
  currency: { bg: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "rgba(201,168,76,0.15)" },
  person: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "rgba(59,130,246,0.15)" },
};
const DEFAULT_ENTITY_COLOR = { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.1)" };

type Message = { role: "user" | "assistant"; content: string };

const OPERATIONS = ["Import/Export", "Offshore/Holdings", "Crypto", "Serviços digitais", "E-commerce", "Investimentos", "Outro"];

const MD_COMPONENTS = {
  h1: ({ children }: any) => <h1 style={{ fontSize: 20, fontWeight: 500, fontFamily: SERIF, marginBottom: 12, marginTop: 16, color: GOLD }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontSize: 17, fontWeight: 500, fontFamily: SERIF, marginBottom: 10, marginTop: 14, color: GOLD }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, marginTop: 12, color: "rgba(255,255,255,0.85)" }}>{children}</h3>,
  p: ({ children }: any) => <p style={{ marginBottom: 10, lineHeight: 1.8 }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ paddingLeft: 20, marginBottom: 10 }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ marginBottom: 6, lineHeight: 1.7 }}>{children}</li>,
  strong: ({ children }: any) => <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{children}</strong>,
  code: ({ children }: any) => <code style={{ background: "rgba(201,168,76,0.08)", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: GOLD }}>{children}</code>,
  blockquote: ({ children }: any) => <blockquote style={{ borderLeft: `2px solid rgba(201,168,76,0.3)`, paddingLeft: 16, margin: "12px 0", color: "rgba(255,255,255,0.5)" }}>{children}</blockquote>,
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
  const [simStage, setSimStage] = useState(0);
  const [simLiveAgents, setSimLiveAgents] = useState<{ emoji: string; name: string; done: boolean }[]>([]);
  const [resultTab, setResultTab] = useState<"report" | "simulation" | "graph">("report");
  const [tokenCount, setTokenCount] = useState(0);
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

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

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
            if (data.type === "text") {
              assistantContent += data.text;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            } else if (data.type === "done") {
              setTokenCount(prev => prev + (data.tokens || 0));
            } else if (data.type === "error") {
              if (!assistantContent) {
                assistantContent = data.error || "Erro ao processar.";
                setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
              }
            }
          } catch {}
        }
      }

      if (!assistantContent) {
        setMessages([...newMessages, { role: "assistant", content: "Erro ao processar." }]);
      }
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
    setSimLiveAgents([]);
    setSimStage(0);
    setResultTab("report");

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: simScenario, context: getProfile() }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              setSimStage(data.stage);
            } else if (data.type === "agent_start") {
              setSimLiveAgents(prev => [...prev, { emoji: data.emoji, name: data.agentName, done: false }]);
            } else if (data.type === "agent_done") {
              setSimLiveAgents(prev => prev.map(a => a.name === data.agentName && !a.done ? { ...a, done: true } : a));
            } else if (data.type === "complete") {
              setSimResult(data.result);
            } else if (data.type === "error") {
              setSimResult({ error: data.error || "Erro na simulação." });
            }
          } catch {}
        }
      }
    } catch {
      setSimResult({ error: "Erro na simulação. Tente novamente." });
    }
    setSimulating(false);
  };

  const exportReport = () => {
    if (!simResult || simResult.error) return;
    const agents = (simResult.stages?.agents || []).map((a: any) => `${a.emoji} ${a.name} — ${a.role}`).join("\n");
    const sim = (simResult.simulation || []).map((m: any) => `[${m.emoji} ${m.agentName} — Round ${m.round}]\n${m.content}`).join("\n\n---\n\n");
    const text = `SIGNUX AI — SIMULATION REPORT\n${"=".repeat(50)}\n\nDate: ${new Date().toLocaleString()}\nAgents: ${simResult.metadata?.agents_count}\nRounds: ${simResult.metadata?.rounds}\nInteractions: ${simResult.metadata?.total_interactions}\n\nAGENTS:\n${agents}\n\n${"=".repeat(50)}\n\nFULL REPORT:\n\n${simResult.report}\n\n${"=".repeat(50)}\n\nSIMULATION LOG:\n\n${sim}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signux-simulation-${Date.now()}.txt`;
    a.click();
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

  /* ══════════════════════════════════════════════════════ */
  /* ONBOARDING FULLSCREEN                                  */
  /* ══════════════════════════════════════════════════════ */
  if (onboarded === false) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0A0A0A" }}>
        <div style={{ maxWidth: 440, width: "100%", padding: "48px 40px" }}>
          <div style={{ fontSize: 14, letterSpacing: "0.3em", color: GOLD, fontFamily: SERIF, textAlign: "center", marginBottom: 4 }}>SIGNUX</div>
          <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.15)", textAlign: "center", textTransform: "uppercase", marginBottom: 48 }}>Operational Intelligence</div>
          <div style={{ width: 40, height: 1, background: "rgba(201,168,76,0.2)", margin: "0 auto 48px" }} />
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", marginBottom: 40 }}>Antes de começar, preciso de contexto.</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Seu nome</label>
              <input value={onboardName} onChange={e => setOnboardName(e.target.value)} placeholder="Como quer ser chamado" className="onboard-input"
                style={{ width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 15, fontFamily: SANS, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>País de residência fiscal</label>
              <input value={onboardCountry} onChange={e => setOnboardCountry(e.target.value)} placeholder="Ex: Brasil, Portugal, EUA" className="onboard-input"
                style={{ width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 15, fontFamily: SANS, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 40 }}>
              <label style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>O que você opera?</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {OPERATIONS.map(op => (
                  <button key={op} onClick={() => setOnboardOps(prev => prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op])} className="onboard-pill"
                    style={{ padding: "8px 18px", borderRadius: 20, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: SANS,
                      background: onboardOps.includes(op) ? "rgba(201,168,76,0.08)" : "transparent",
                      border: onboardOps.includes(op) ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.08)",
                      color: onboardOps.includes(op) ? GOLD : "rgba(255,255,255,0.35)" }}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { if (!canSubmitOnboard) return; updateProfile({ name: onboardName.trim(), taxResidence: onboardCountry.trim(), operations: onboardOps }); setProfileName(onboardName.trim()); setOnboarded(true); }}
              disabled={!canSubmitOnboard}
              style={{ width: "100%", padding: 16, borderRadius: 8, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A", fontSize: 13, fontWeight: 600, fontFamily: SERIF, letterSpacing: "0.15em", textTransform: "uppercase", border: "none", cursor: canSubmitOnboard ? "pointer" : "not-allowed", marginTop: 8, opacity: canSubmitOnboard ? 1 : 0.4, transition: "opacity 0.2s" }}>
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

  /* ══════════════════════════════════════════════════════ */
  /* SIMULATION RENDERER                                    */
  /* ══════════════════════════════════════════════════════ */
  const renderSimulation = () => {
    /* ── INPUT ── */
    if (!simResult && !simulating) {
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="sim-input-container" style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
            <div className="sim-pulse-icon" style={{ fontSize: 48, color: GOLD, marginBottom: 24 }}>◉</div>
            <div style={{ fontSize: 36, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 4 }}>Simulation Engine</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, marginBottom: 48 }}>
              Descreva um cenário de negócio. Signux cria agentes especializados,<br />simula a operação e entrega um relatório completo.
            </div>
            <textarea
              value={simScenario} onChange={e => setSimScenario(e.target.value)}
              placeholder="Ex: Quero importar 5.000 fones bluetooth de Shenzhen para São Paulo. Budget de $15.000. Nunca importei antes."
              className="sim-textarea"
              style={{ width: "100%", minHeight: 140, padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 15, lineHeight: 1.7, fontFamily: SANS, resize: "vertical", outline: "none" }}
            />
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginTop: 32, marginBottom: 16, textTransform: "uppercase" }}>Cenários exemplo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SIM_EXAMPLES.map(ex => (
                <div key={ex.text} onClick={() => setSimScenario(ex.text)}
                  className="sim-example-card"
                  style={{ padding: "14px 20px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s", textAlign: "left", width: "100%" }}>
                  {ex.emoji} {ex.text}
                </div>
              ))}
            </div>
            <button onClick={simulate} disabled={!simScenario.trim()}
              style={{ width: "100%", padding: 18, borderRadius: 12, background: "linear-gradient(135deg, #C9A84C, #A0832A)", color: "#0A0A0A", fontSize: 13, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", border: "none", cursor: simScenario.trim() ? "pointer" : "not-allowed", marginTop: 32, opacity: simScenario.trim() ? 1 : 0.3, transition: "opacity 0.2s", fontFamily: SERIF }}>
              Iniciar Simulação
            </button>
          </div>
        </div>
      );
    }

    /* ── SIMULATING ── */
    if (simulating) {
      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontFamily: SERIF, color: "white", marginBottom: 8 }}>Simulação em andamento</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 48 }}>Múltiplos agentes analisando seu cenário...</div>
            {/* Pipeline stages */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0, textAlign: "left" }}>
              {SIM_STAGES.map((stage, idx) => {
                const isDone = idx < simStage;
                const isCurrent = idx === simStage;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0" }}>
                    <span style={{ fontSize: 18, width: 28, textAlign: "center", ...(isDone ? { color: GOLD } : isCurrent ? { animation: "iconPulse 1.5s ease-in-out infinite" } : { opacity: 0.2 }) }}>
                      {isDone ? "✓" : stage.icon}
                    </span>
                    <span style={{ fontSize: 14, fontFamily: SANS, ...(isDone ? { color: "rgba(255,255,255,0.5)" } : isCurrent ? { color: "white", fontWeight: 500 } : { color: "rgba(255,255,255,0.15)" }) }}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Live agent updates */}
            {simLiveAgents.length > 0 && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 4 }}>Agentes</div>
                {simLiveAgents.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 14, ...(a.done ? {} : { animation: "iconPulse 1.5s ease-in-out infinite" }) }}>{a.emoji}</span>
                    <span style={{ fontSize: 12, color: a.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)", flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 10, color: a.done ? GOLD : "rgba(255,255,255,0.15)" }}>{a.done ? "✓" : "..."}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Progress bar */}
            <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, marginTop: 24 }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #C9A84C, #A0832A)", borderRadius: 1, transition: "width 0.5s ease", width: `${(simStage / 4) * 100}%` }} />
            </div>
          </div>
        </div>
      );
    }

    /* ── ERROR ── */
    if (simResult?.error) {
      return (
        <div style={{ flex: 1, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>{simResult.error}</div>
            <button onClick={() => setSimResult(null)} style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(201,168,76,0.1)", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>Tentar novamente</button>
          </div>
        </div>
      );
    }

    /* ── RESULT ── */
    if (simResult) {
      const meta = simResult.metadata || {};
      const stagesData = simResult.stages || {};
      const simAgents = stagesData.agents || [];
      const simParams = stagesData.simulation_parameters || {};
      const graph = stagesData.graph || {};
      const simulation = simResult.simulation || [];

      return (
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }} className="sim-result-outer">
          {/* Header */}
          <div className="sim-result-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, maxWidth: 1000, margin: "0 auto 32px", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 24, fontFamily: SERIF, color: "white" }}>Resultado da Simulação</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setSimResult(null); setSimScenario(""); }}
                style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", background: "transparent", border: "1px solid rgba(255,255,255,0.06)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: SANS, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                Nova simulação
              </button>
              <button onClick={exportReport}
                style={{ fontSize: 12, color: "#0A0A0A", background: GOLD, border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: SANS, fontWeight: 500 }}>
                Exportar
              </button>
            </div>
          </div>

          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {/* Metadata cards */}
            <div className="sim-meta-cards" style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
              {[
                { value: `${meta.agents_count || 0}`, label: "Especialistas" },
                { value: `${meta.rounds || 0}`, label: "Rodadas" },
                { value: `${meta.total_interactions || 0}`, label: "Interações" },
                { value: simParams.scenario_type || "—", label: "Tipo" },
              ].map(card => (
                <div key={card.label} style={{ flex: "1 1 140px", padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 18, fontFamily: SERIF, color: GOLD, marginBottom: 4 }}>{card.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* Agents */}
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginBottom: 16, textTransform: "uppercase" }}>Agentes na simulação</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {simAgents.map((a: any) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 16 }}>{a.emoji}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{a.name}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{a.role}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {(["report", "simulation", "graph"] as const).map(tab => (
                <button key={tab} onClick={() => setResultTab(tab)}
                  style={{ padding: "12px 24px", fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", background: "none", border: "none", borderBottom: resultTab === tab ? `2px solid ${GOLD}` : "2px solid transparent", color: resultTab === tab ? GOLD : "rgba(255,255,255,0.25)", fontFamily: SANS, transition: "all 0.2s", textTransform: "capitalize" }}>
                  {tab === "report" ? "Relatório" : tab === "simulation" ? "Simulação" : "Grafo"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {resultTab === "report" && (
              <div style={{ padding: "24px 28px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.75)", fontFamily: SANS }}>
                <ReactMarkdown components={MD_COMPONENTS}>{simResult.report || ""}</ReactMarkdown>
              </div>
            )}

            {resultTab === "simulation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {simulation.map((msg: any, i: number) => (
                  <div key={i} style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 20 }}>{msg.emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "white" }}>{msg.agentName}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{msg.role}</span>
                      <span style={{ fontSize: 10, color: "rgba(201,168,76,0.4)", marginLeft: "auto", padding: "2px 8px", borderRadius: 10, background: "rgba(201,168,76,0.06)" }}>Round {msg.round}</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  </div>
                ))}
              </div>
            )}

            {resultTab === "graph" && (
              <div>
                {/* Entities */}
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginBottom: 16, textTransform: "uppercase" }}>Entidades</div>
                <div style={{ marginBottom: 32 }}>
                  {(graph.entities || []).map((e: any, i: number) => {
                    const c = ENTITY_COLORS[e.type] || DEFAULT_ENTITY_COLOR;
                    return (
                      <span key={i} style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12, marginRight: 6, marginBottom: 6, display: "inline-block", background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        {e.name} <span style={{ opacity: 0.6, fontSize: 10 }}>({e.type})</span>
                      </span>
                    );
                  })}
                </div>

                {/* Relationships */}
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginBottom: 16, textTransform: "uppercase" }}>Relações</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(graph.relationships || []).map((r: any, i: number) => (
                    <div key={i} style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{r.from}</span>
                      <span style={{ color: GOLD, margin: "0 8px" }}>→</span>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{r.to}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 8 }}>({r.type})</span>
                      {r.details && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{r.details}</div>}
                    </div>
                  ))}
                </div>

                {/* Key variables */}
                {graph.key_variables?.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginTop: 32, marginBottom: 16, textTransform: "uppercase" }}>Variáveis-chave</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {graph.key_variables.map((v: string, i: number) => (
                        <span key={i} style={{ padding: "4px 12px", borderRadius: 12, fontSize: 12, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.1)", color: "rgba(255,255,255,0.4)" }}>{v}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Critical questions */}
                {graph.critical_questions?.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", marginTop: 32, marginBottom: 16, textTransform: "uppercase" }}>Questões críticas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {graph.critical_questions.map((q: string, i: number) => (
                        <div key={i} style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{q}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  /* ══════════════════════════════════════════════════════ */
  /* MAIN APP                                               */
  /* ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
          <button onClick={() => setMode("chat")}
            style={{ flex: 1, padding: "10px 0", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", background: mode === "chat" ? "rgba(201,168,76,0.06)" : "transparent", color: mode === "chat" ? GOLD : "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", fontFamily: SANS, transition: "all 0.2s" }}>
            Chat
          </button>
          <button onClick={() => { setMode("simulate"); setSimResult(null); setSimulating(false); }}
            style={{ flex: 1, padding: "10px 0", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", background: mode === "simulate" ? "rgba(201,168,76,0.06)" : "transparent", color: mode === "simulate" ? GOLD : "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", fontFamily: SANS, transition: "all 0.2s" }}>
            Simulate
          </button>
        </div>

        {mode === "chat" && (
          <>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 16 }}>Agents</div>
            <div style={{ flex: 1 }}>
              {AGENTS.map((a, idx) => (
                <div key={a.id}>
                  <div onClick={() => { setAgent(a.id); setSidebarOpen(false); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
                      background: agent === a.id ? "rgba(201,168,76,0.04)" : "transparent",
                      border: agent === a.id ? "1px solid rgba(201,168,76,0.08)" : "1px solid transparent" }}
                    onMouseEnter={e => { if (agent !== a.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (agent !== a.id) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 18 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, color: "white" }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{a.desc}</div>
                    </div>
                  </div>
                  {idx < AGENTS.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.03)", margin: "2px 12px" }} />}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "simulate" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", marginBottom: 16 }}>Pipeline</div>
            {SIM_STAGES.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { if (mode === "chat") { setMessages([]); } else { setSimResult(null); setSimScenario(""); setSimulating(false); } setSidebarOpen(false); }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", cursor: "pointer", padding: "8px 0", background: "none", border: "none", textAlign: "left", fontFamily: SANS, marginTop: "auto", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(201,168,76,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")}>
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
                <span style={{ fontSize: 16 }}>◉</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Simulation Engine</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {tokenCount > 0 && <div className="rates-ticker" style={{ fontSize: 9, color: "rgba(255,255,255,0.1)" }}>{tokenCount.toLocaleString()} tokens</div>}
            {rates && <div className="rates-ticker" style={{ fontSize: 9, color: "rgba(255,255,255,0.12)" }}>USD/BRL {rates.USDBRL?.toFixed(2)} · USD/CNY {rates.USDCNY?.toFixed(2)} · USD/HKD {rates.USDHKD?.toFixed(2)}</div>}
            {mode === "chat" && messages.length > 0 && (
              <button onClick={() => { const text = messages.map(m => (m.role === "user" ? "Você: " : "Signux: ") + m.content).join("\n\n---\n\n"); const blob = new Blob([text], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "signux-conversa.txt"; a.click(); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.15)", padding: 4, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")} title="Salvar conversa">↓</button>
            )}
            <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 12, background: "rgba(201,168,76,0.08)", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Beta</span>
          </div>
        </header>

        {/* Content */}
        {mode === "simulate" ? renderSimulation() : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column" }} className="messages-area">
              {messages.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", maxWidth: 600, margin: "0 auto", width: "100%" }}>
                  <div className="welcome-title" style={{ fontSize: 28, fontFamily: SERIF, fontWeight: 300, color: "white", marginBottom: 4 }}>Olá, {profileName || "Operador"}.</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", marginBottom: 48 }}>O que quer resolver hoje?</div>
                  <div className="suggestions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                    {SUGGESTIONS.map(s => (
                      <div key={s} onClick={() => send(s)}
                        style={{ padding: "16px 20px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.2s", textAlign: "left", lineHeight: 1.5 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(201,168,76,0.02)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800, margin: "0 auto", width: "100%" }}>
                  {messages.map((m, i) => (
                    <div key={i}
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
                        wordBreak: "break-word", fontFamily: SANS,
                      }}>
                      {m.role === "user" ? m.content : <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>}
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
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }} className="input-area">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 800, margin: "0 auto", width: "100%" }}>
                <textarea ref={inputRef} value={input} onChange={handleTextareaInput} onKeyDown={handleKey} placeholder="Pergunte qualquer coisa..." rows={1}
                  style={{ flex: 1, resize: "none", padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none", fontFamily: SANS, transition: "border-color 0.2s" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.15)")} onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")} />
                <button onClick={() => send()} disabled={!input.trim() || loading} className="send-btn"
                  style={{ width: 44, height: 44, borderRadius: 12, background: GOLD, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", opacity: input.trim() && !loading ? 1 : 0.3, transition: "opacity 0.2s, transform 0.15s", flexShrink: 0 }}>
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
        @keyframes iconPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .sim-pulse-icon {
          animation: simPulse 3s ease-in-out infinite;
        }
        @keyframes simPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        textarea::placeholder { color: rgba(255,255,255,0.15); }
        .sim-textarea:focus { border-color: rgba(201,168,76,0.15) !important; }
        .sim-example-card:hover { border-color: rgba(201,168,76,0.08) !important; color: rgba(255,255,255,0.5) !important; }
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
          .welcome-title { font-size: 24px !important; }
          .rates-ticker { display: none !important; }
          .sim-input-container { padding: 0 !important; }
          .sim-result-outer { padding: 20px !important; }
          .sim-result-header { flex-direction: column !important; align-items: flex-start !important; }
          .sim-meta-cards { display: grid !important; grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
