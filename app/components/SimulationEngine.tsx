"use client";
import { useState, useRef, useEffect } from "react";
import {
  Check, AlertTriangle, Download, ChevronDown, ChevronRight,
  FileText, RotateCcw, MessageSquare, BarChart3, Network,
  Globe, Users, Clock, Zap, Search, Shield, Activity, Play,
  Wand2, Loader2, Eye, X, Share2, Lock,
} from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { useEnhance } from "../lib/useEnhance";
import MarkdownRenderer from "./MarkdownRenderer";
import { signuxFetch } from "../lib/api-client";
import type { SimAgent, SimResult, Mode } from "../lib/types";
import { parseSignuxMetadata, type SignuxVote, type SignuxTimelineEvent, type SignuxSentiment, type SignuxSource, type SignuxFollowup } from "../lib/parseMetadata";
import { AGENT_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, ENTITY_COLORS, DEFAULT_ENTITY_COLOR } from "../lib/types";

const SIM_EXAMPLE_KEYS = ["sim.example.1", "sim.example.2", "sim.example.3"];
const SIM_STAGE_KEYS = ["stage.intelligence", "stage.0", "stage.1", "stage.2", "stage.3", "stage.4"];
const SIM_STAGE_ICONS = [Globe, Network, Users, Zap, MessageSquare, FileText];

type AgentMessage = {
  agentId?: string;
  agentName: string;
  role?: string;
  category?: string;
  content: string;
  round?: number;
};

type GodEyeResult = {
  type: "recalc" | "impact";
  agent?: string;
  role?: string;
  analysis?: string;
  content?: string;
};

type InjectionEntry = {
  variable: string;
  impact: string;
  timestamp: number;
};

type SimulationEngineProps = {
  simulating: boolean;
  simResult: SimResult | null;
  simScenario: string;
  setSimScenario: (v: string) => void;
  simStage: number;
  simLiveAgents: SimAgent[];
  simTotalAgents: number;
  simStartTime: number | null;
  onSimulate: (scenarioOverride?: string) => void;
  onReset: () => void;
  simStarting: boolean;
  simAgentMessages: AgentMessage[];
  onSetMode?: (m: Mode) => void;
  lang?: string;
  isLoggedIn?: boolean;
  tier?: string;
};

function calculateRiskScore(agents: SimAgent[], messages: AgentMessage[]): { score: number; label: string; color: string } {
  if (messages.length === 0) return { score: 0, label: "Calculating...", color: "var(--text-tertiary)" };
  const doneCount = agents.filter(a => a.done).length;
  const total = agents.length || 1;
  const completionRatio = doneCount / total;
  const contentLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const avgLength = contentLength / messages.length;
  const riskKeywords = ["risk", "threat", "vulnerability", "danger", "critical", "warning", "alert", "concern", "failure", "exploit"];
  const riskMentions = messages.reduce((sum, m) => {
    const lower = (m.content || "").toLowerCase();
    return sum + riskKeywords.filter(k => lower.includes(k)).length;
  }, 0);
  const riskDensity = riskMentions / messages.length;
  const rawScore = Math.min(100, Math.round(
    (completionRatio * 30) + (Math.min(avgLength / 500, 1) * 30) + (Math.min(riskDensity, 3) / 3 * 40)
  ));
  if (rawScore >= 70) return { score: rawScore, label: "High Risk", color: "var(--error)" };
  if (rawScore >= 40) return { score: rawScore, label: "Medium Risk", color: "var(--warning)" };
  return { score: rawScore, label: "Low Risk", color: "var(--success)" };
}

export default function SimulationEngine(props: SimulationEngineProps) {
  const { simulating, simResult, simScenario, setSimScenario, simStage, simLiveAgents, simTotalAgents, simStartTime, onSimulate, onReset, simStarting, simAgentMessages, onSetMode, lang, isLoggedIn, tier } = props;
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [simAgentMessages]);

  const [resultTab, setResultTab] = useState<"report" | "simulation" | "graph">("report");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // God's Eye state
  const [godEyeOpen, setGodEyeOpen] = useState(false);
  const [godEyeInput, setGodEyeInput] = useState("");
  const [godEyeRunning, setGodEyeRunning] = useState(false);
  const [godEyeResults, setGodEyeResults] = useState<GodEyeResult[]>([]);
  const [injectionHistory, setInjectionHistory] = useState<InjectionEntry[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  // Seed Material state
  const [seedMaterial, setSeedMaterial] = useState("");
  const [seedFileName, setSeedFileName] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // Talk to Agent state
  const [agentChat, setAgentChat] = useState<{ agent: any; context: string } | null>(null);
  const [agentChatInput, setAgentChatInput] = useState("");
  const [agentChatMessages, setAgentChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [agentChatLoading, setAgentChatLoading] = useState(false);

  // What-If inline state
  const [whatIfInput, setWhatIfInput] = useState("");

  // Compare A vs B state
  const [compareMode, setCompareMode] = useState(false);
  const [scenarioA, setScenarioA] = useState("");
  const [scenarioB, setScenarioB] = useState("");

  // Customizable agent roles
  type AgentRole = { id: string; name: string; active: boolean };
  const DEFAULT_ROLES: AgentRole[] = [
    { id: "strategy", name: "Strategy Lead", active: true },
    { id: "financial", name: "Financial Analyst", active: true },
    { id: "risk", name: "Risk Assessor", active: true },
    { id: "market", name: "Market Expert", active: true },
    { id: "operations", name: "Operations Lead", active: true },
    { id: "devil", name: "Devil's Advocate", active: true },
  ];
  const OPTIONAL_ROLES: AgentRole[] = [
    { id: "lawyer", name: "Legal Advisor", active: false },
    { id: "tech", name: "Tech Architect", active: false },
    { id: "hr", name: "HR Specialist", active: false },
    { id: "global", name: "International Expert", active: false },
    { id: "customer", name: "Customer Advocate", active: false },
    { id: "investor", name: "Investor Perspective", active: false },
  ];
  const [customAgents, setCustomAgents] = useState<AgentRole[]>([...DEFAULT_ROLES]);
  const [showAgentCustomizer, setShowAgentCustomizer] = useState(false);

  const isMobile = useIsMobile();
  const pad = isMobile ? "16px" : "24px";
  const { enhance, enhancing, wasEnhanced } = useEnhance("simulate");

  const DEMO_SCENARIO = "I want to launch a premium coffee subscription service targeting remote workers in major US cities. Budget: $50K. I plan to source single-origin beans from Colombia and Ethiopia, roast locally, and deliver weekly. Target price: $35/month for 2 bags. I need to evaluate: market competition (Blue Bottle, Trade Coffee), logistics, customer acquisition strategy, and break-even timeline.";

  const runDemoSimulation = () => {
    if (typeof window !== "undefined" && localStorage.getItem("signux_demo_used")) return;
    setIsDemo(true);
    setSimScenario(DEMO_SCENARIO);
    onSimulate(DEMO_SCENARIO);
    if (typeof window !== "undefined") localStorage.setItem("signux_demo_used", "true");
  };

  const demoUsed = typeof window !== "undefined" && localStorage.getItem("signux_demo_used") === "true";

  const handleEnhance = async () => {
    const result = await enhance(simScenario);
    if (result) {
      setSimScenario(result);
    }
  };

  // Seed material handlers
  const handleFileUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const truncated = text.slice(0, 3000);
      setSeedMaterial(truncated);
      setSeedFileName(file.name);
    } catch {}
  };

  const handleUrlPaste = () => {
    if (!urlInput.trim()) return;
    setSeedMaterial(`[URL Reference: ${urlInput.trim()}]`);
    setSeedFileName(urlInput.trim());
    setShowUrlInput(false);
    setUrlInput("");
  };

  // What-If re-simulation
  const handleWhatIf = (variable: string) => {
    if (!variable.trim()) return;
    const whatIfScenario = `PREVIOUS SIMULATION:\nScenario: ${simScenario}\nResult summary: ${(simResult?.report || "").slice(0, 500)}\n\nNOW RE-SIMULATE WITH THIS CHANGE:\n${variable}\n\nAnalyze how this variable changes the outcome. Compare with the previous simulation. Show what's different.`;
    setWhatIfInput("");
    setSimScenario(whatIfScenario);
    onSimulate(whatIfScenario);
  };

  // Talk to agent handler
  const sendAgentChat = async () => {
    if (!agentChatInput.trim() || agentChatLoading || !agentChat) return;
    const userMsg = agentChatInput.trim();
    setAgentChatInput("");
    setAgentChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAgentChatLoading(true);
    try {
      const res = await signuxFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            ...agentChatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg },
          ],
          systemOverride: agentChat.context,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let fullText = "";
      setAgentChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setAgentChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
      }
    } catch {
      setAgentChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    }
    setAgentChatLoading(false);
  };

  const openAgentChat = (agent: any) => {
    const agentMessages = simulation
      .filter((m: any) => m.agentName === agent.name || m.agentId === agent.id)
      .map((m: any) => m.content)
      .join("\n\n");

    const context = `You are now speaking as ${agent.name}, ${agent.role}. You participated in a multi-agent simulation about this scenario:

"${simScenario}"

Your expertise: ${agent.expertise || agent.knowledge || "Specialist in " + agent.role}
Your personality: ${agent.personality || "Professional and analytical"}
Your bias: ${agent.bias || "None specified"}

Your analysis during the simulation:
${agentMessages || "You participated in the multi-agent debate."}

Stay in character. Answer questions from YOUR perspective as this specialist. Be specific about why you gave your analysis and what risks you see. If the user challenges your analysis, defend it or update it based on new information. Keep responses concise (2-3 paragraphs max). Respond in the same language the user uses.`;

    setAgentChat({ agent, context });
    setAgentChatMessages([]);
    setAgentChatInput("");
  };

  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const runGodEye = async () => {
    if (!godEyeInput.trim() || godEyeRunning || !simResult) return;
    setGodEyeRunning(true);
    setGodEyeResults([]);

    try {
      const res = await signuxFetch("/api/simulate/inject", {
        method: "POST",
        body: JSON.stringify({
          variable: godEyeInput.trim(),
          originalScenario: simScenario,
          agents: simResult.stages?.agents || [],
          previousReport: simResult.report || "",
          lang: lang || "en",
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
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
            if (data.type === "agent_recalc_done") {
              setGodEyeResults(prev => [...prev, { type: "recalc", agent: data.agent, role: data.role, analysis: data.analysis }]);
            } else if (data.type === "impact_report") {
              setGodEyeResults(prev => [...prev, { type: "impact", content: data.content }]);
              setInjectionHistory(prev => [...prev, { variable: godEyeInput, impact: data.content, timestamp: Date.now() }]);
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch (e) {
      console.error("God's Eye failed:", e);
    }
    setGodEyeRunning(false);
  };

  /* ═══ WELCOME STATE ═══ */
  if (!simResult && !simulating) {
    const scenarios = [
      {
        tag: "LAUNCH", dotColor: "#22c55e",
        title: "Open a franchise in 3 new cities",
        fill: "I want to launch a coffee franchise expanding from São Paulo to 3 new cities in Brazil. Budget $200K. Need to evaluate: locations, licensing, supply chain, staffing, and competitive landscape.",
      },
      {
        tag: "SCALE", dotColor: "#3b82f6",
        title: "Expand SaaS product into new market",
        fill: "My SaaS product has 5K users in the US. I want to expand to EU market. Need to evaluate: GDPR compliance, pricing localization, payment processing, legal entity structure, and go-to-market strategy.",
      },
      {
        tag: "OPTIMIZE", dotColor: "#f59e0b",
        title: "Restructure operations to cut 30% costs",
        fill: "My e-commerce company does $2M/year revenue but margins are thin at 8%. I want to restructure operations to cut costs by 30%. Evaluate: supply chain, fulfillment, automation, outsourcing, and renegotiation opportunities.",
      },
    ];

    const capabilities = [
      "Predict outcomes",
      "Find hidden risks",
      "Stress-test anything",
      "See the future first",
    ];

    const agentAvatars = [
      { letter: "R", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6" },
      { letter: "F", bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
      { letter: "A", bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
      { letter: "O", bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
      { letter: "M", bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    ];

    return (
        <section style={{
          minHeight: isMobile ? "75vh" : "85vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "24px 16px 32px" : "32px 24px 40px",
          position: "relative", overflow: "hidden",
          backgroundImage: "linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}>
          {/* Scan line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)",
            animation: "scanDown 4s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          {/* Ambient glow bottom */}
          <div style={{
            position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)",
            width: 400, height: 200,
            background: "radial-gradient(ellipse, rgba(212,175,55,0.04), transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ maxWidth: 720, width: "100%", position: "relative", zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ textAlign: "center", marginBottom: 10, animation: "fadeIn 0.4s ease-out" }}>
            {/* Icon ring */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 8px", position: "relative",
            }}>
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "1px solid rgba(212,175,55,0.08)",
              }} />
              <Zap size={20} style={{ color: "var(--accent)" }} />
            </div>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 0 }}>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 24 : 30, fontWeight: 700,
                letterSpacing: 8, color: "var(--text-primary)",
              }}>
                SIMULATE
              </span>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 24 : 30, fontWeight: 300,
                letterSpacing: 4, color: "var(--text-tertiary)", marginLeft: 8,
              }}>
                ENGINE
              </span>
            </div>

            {/* Subtitle */}
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3,
              textTransform: "uppercase" as const, color: "rgba(212,175,55,0.6)",
              marginTop: 6,
            }}>
              See what happens before it happens
            </div>

            {/* Divider */}
            <div style={{
              width: 48, height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              margin: "8px auto 0",
            }} />
          </div>

          {/* ── CAPABILITY STRIP ── */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center",
            gap: isMobile ? 8 : 16, marginBottom: 8,
            animation: "fadeIn 0.5s ease-out",
          }}>
            {capabilities.map(cap => (
              <div key={cap} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--accent)", opacity: 0.6,
                }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5,
                  textTransform: "uppercase" as const, color: "var(--text-secondary)",
                }}>
                  {cap}
                </span>
              </div>
            ))}
          </div>

          {/* ── DEMO BANNER ── */}
          {!isLoggedIn && !demoUsed && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid var(--mode-sim-border)",
              background: "var(--mode-sim-bg)",
              marginBottom: 10, width: "100%",
              animation: "fadeIn 0.5s ease-out",
            }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                See it work — Watch AI predict the future of a coffee franchise idea
              </span>
              <button onClick={runDemoSimulation} style={{
                padding: "5px 14px", borderRadius: 50,
                background: "var(--mode-sim)", color: "#000",
                fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                whiteSpace: "nowrap" as const, marginLeft: 12,
              }}>
                Run demo
              </button>
            </div>
          )}

          {/* ── SEED MATERIAL ── */}
          <div style={{
            marginBottom: 10, padding: "10px 14px", borderRadius: 10,
            border: seedMaterial ? "1px solid rgba(212,175,55,0.2)" : "1px dashed var(--border-secondary)",
            background: seedMaterial ? "rgba(212,175,55,0.03)" : "var(--bg-secondary)",
            animation: "fadeIn 0.5s ease-out",
          }}>
            {seedMaterial ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {seedFileName || "Context loaded"} ({seedMaterial.length.toLocaleString()} chars)
                </span>
                <button onClick={() => { setSeedMaterial(""); setSeedFileName(""); }} style={{
                  background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2,
                }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textAlign: "center" }}>
                  Add context: paste a URL, upload a file, or drop data
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  {showUrlInput ? (
                    <div style={{ display: "flex", gap: 6, width: "100%" }}>
                      <input
                        autoFocus
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleUrlPaste(); if (e.key === "Escape") setShowUrlInput(false); }}
                        placeholder="https://..."
                        style={{
                          flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 12,
                          border: "1px solid var(--border-secondary)", background: "var(--bg-primary)",
                          color: "var(--text-primary)", outline: "none",
                        }}
                      />
                      <button onClick={handleUrlPaste} style={{
                        padding: "6px 12px", borderRadius: 6, fontSize: 11,
                        background: "var(--accent)", color: "#000", border: "none", cursor: "pointer", fontWeight: 600,
                      }}>Add</button>
                      <button onClick={() => setShowUrlInput(false)} style={{
                        background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2,
                      }}><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setShowUrlInput(true)} style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11,
                        border: "1px solid var(--border-secondary)",
                        background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
                      }}>
                        Paste URL
                      </button>
                      <label style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11,
                        border: "1px solid var(--border-secondary)",
                        color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center",
                      }}>
                        Upload file
                        <input type="file" accept=".pdf,.txt,.csv,.doc,.docx,.json,.md" hidden
                          onChange={e => handleFileUpload(e.target.files?.[0])}
                        />
                      </label>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── INPUT CONTAINER ── */}
          <div
            style={{
              border: simScenario.trim() ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(212,175,55,0.12)",
              borderRadius: 16,
              background: simScenario.trim() ? "var(--card-bg)" : "var(--card-bg)",
              padding: isMobile ? 12 : 16,
              transition: "all 300ms ease",
              boxShadow: simScenario.trim()
                ? "0 0 30px rgba(212,175,55,0.06), 0 0 60px rgba(212,175,55,0.03)"
                : "none",
              marginBottom: 12,
              animation: "fadeIn 0.5s ease-out",
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(212,175,55,0.06), 0 0 60px rgba(212,175,55,0.03)";
              e.currentTarget.style.background = "var(--card-bg)";
            }}
            onBlur={e => {
              if (!simScenario.trim()) {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.12)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "var(--card-bg)";
              }
            }}
          >
            {/* Label */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: 10,
            }}>
              <div style={{
                width: 4, height: 4, borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase" as const, color: "rgba(212,175,55,0.5)",
              }}>
                DESCRIBE YOUR SCENARIO
              </span>
            </div>

            <textarea
              value={simScenario}
              onChange={e => setSimScenario(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === "e") {
                  e.preventDefault();
                  handleEnhance();
                  return;
                }
              }}
              placeholder="I want to open a coffee franchise in 3 new cities with a $200K budget..."
              style={{
                width: "100%", minHeight: 56, padding: 0,
                background: "transparent", border: "none",
                color: "var(--text-primary)", fontSize: 14, lineHeight: 1.5,
                resize: "none", outline: "none",
                fontFamily: "var(--font-sans)",
                opacity: enhancing ? 0.5 : 1, transition: "opacity 150ms ease",
              }}
            />
          </div>

          {/* ── SCENARIO CARDS ── */}
          <div style={{ marginBottom: 8, animation: "fadeIn 0.6s ease-out" }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase" as const, color: "var(--text-tertiary)",
              marginBottom: 8,
            }}>
              QUICK SCENARIOS
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 6,
            }}>
              {scenarios.map(sc => (
                <button
                  key={sc.tag}
                  onClick={() => setSimScenario(sc.fill)}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 10, padding: "8px 12px",
                    cursor: "pointer", transition: "all 200ms",
                    textAlign: "left", position: "relative",
                    borderLeft: "2px solid transparent",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)";
                    e.currentTarget.style.borderLeftColor = "var(--accent)";
                    e.currentTarget.style.background = "rgba(212,175,55,0.03)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--card-border)";
                    e.currentTarget.style.borderLeftColor = "transparent";
                    e.currentTarget.style.background = "var(--card-bg)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: sc.dotColor,
                    }} />
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                      textTransform: "uppercase" as const, color: "var(--text-secondary)",
                    }}>
                      {sc.tag}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: "var(--text-primary)",
                    lineHeight: 1.4,
                  }}>
                    {sc.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── AGENT PREVIEW STRIP (compact) ── */}
          {!isMobile && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "6px 0", marginBottom: 4,
              animation: "fadeIn 0.7s ease-out",
            }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {agentAvatars.map((av, i) => (
                  <div key={av.letter} style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: av.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 600, color: av.color,
                    border: "2px solid var(--bg-primary)",
                    marginLeft: i > 0 ? -5 : 0,
                    zIndex: 5 - i,
                  }}>
                    {av.letter}
                  </div>
                ))}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--card-border)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 500, color: "var(--text-secondary)",
                  border: "2px solid var(--bg-primary)",
                  marginLeft: -5,
                }}>
                  +10
                </div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>15 agents</span> · 3 rounds · 5 risk axes
              </span>
            </div>
          )}

          {/* ── CUSTOMIZE TEAM ── */}
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setShowAgentCustomizer(!showAgentCustomizer)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              border: "1px solid var(--border-secondary)",
              background: "transparent", cursor: "pointer",
              fontSize: 11, color: "var(--text-tertiary)",
              transition: "all 150ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
            >
              <Users size={12} />
              Customize team ({customAgents.filter(a => a.active).length} specialists)
              <span style={{ fontSize: 8, transition: "transform 200ms", transform: showAgentCustomizer ? "rotate(180deg)" : "none" }}>{"\u25BC"}</span>
            </button>

            {showAgentCustomizer && (
              <div style={{
                marginTop: 8, padding: "12px 14px", borderRadius: 10,
                border: "1px solid var(--border-secondary)", background: "var(--bg-tertiary)",
                animation: "fadeIn 0.15s ease",
              }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
                  ACTIVE TEAM
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                  {customAgents.filter(a => a.active).map((agent) => (
                    <button key={agent.id} onClick={() => {
                      setCustomAgents(customAgents.map(a => a.id === agent.id ? { ...a, active: false } : a));
                    }} style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 50,
                      background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)",
                      fontSize: 11, color: "var(--text-primary)", cursor: "pointer",
                    }}>
                      {agent.name} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{"\u2715"}</span>
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
                  ADD SPECIALIST
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[...OPTIONAL_ROLES, ...customAgents.filter(a => !a.active)]
                    .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
                    .filter(a => !customAgents.find(ag => ag.id === a.id && ag.active))
                    .map((agent) => (
                    <button key={agent.id} onClick={() => {
                      if (customAgents.find(a => a.id === agent.id)) {
                        setCustomAgents(customAgents.map(a => a.id === agent.id ? { ...a, active: true } : a));
                      } else {
                        setCustomAgents([...customAgents, { ...agent, active: true }]);
                      }
                    }} style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 50,
                      border: "1px dashed var(--border-secondary)",
                      background: "transparent", fontSize: 11,
                      color: "var(--text-tertiary)", cursor: "pointer",
                    }}>
                      + {agent.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── CTA BUTTON ── */}
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {simScenario.trim().length >= 10 && (
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                title="Enhance your scenario (⌘E)"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 50,
                  border: "1px solid var(--card-border)",
                  background: wasEnhanced ? "var(--accent-soft, rgba(212,175,55,0.1))" : "none",
                  color: wasEnhanced ? "var(--accent)" : "var(--text-tertiary)",
                  fontSize: 11, cursor: enhancing ? "wait" : "pointer",
                  transition: "all 200ms", fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                }}
                onMouseEnter={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; } }}
                onMouseLeave={e => { if (!enhancing && !wasEnhanced) { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.color = "var(--text-tertiary)"; } }}
              >
                {enhancing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={12} />}
                {wasEnhanced ? "Enhanced" : "Enhance"}
              </button>
            )}
            <button
              onClick={() => {
                if (!isLoggedIn) { window.location.href = "/signup"; return; }
                if (tier === "free") { setShowPaywall(true); return; }
                const activeTeam = customAgents.filter(a => a.active);
                const teamPrefix = activeTeam.length !== DEFAULT_ROLES.length || activeTeam.some(a => !DEFAULT_ROLES.find(d => d.id === a.id))
                  ? `\n\nSPECIALIST TEAM FOR THIS SIMULATION:\n${activeTeam.map(a => `- ${a.name}`).join("\n")}\n\nRun the debate with ONLY these specialists. Each should contribute from their specific expertise.`
                  : "";
                const baseScenario = seedMaterial ? `CONTEXT MATERIAL (from ${seedFileName}):\n${seedMaterial}\n\n---\n\nUSER SCENARIO:\n${simScenario}` : simScenario;
                const fullScenario = baseScenario + teamPrefix;
                if (seedMaterial || teamPrefix) { setSimScenario(fullScenario); }
                onSimulate(fullScenario);
              }}
              disabled={!simScenario.trim() || simStarting}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: simScenario.trim() && !simStarting ? "var(--accent)" : "rgba(212,175,55,0.3)",
                color: "var(--bg-primary)", border: "none", borderRadius: 50,
                padding: "12px 32px",
                fontFamily: "var(--font-brand)", fontWeight: 600, fontSize: 14,
                letterSpacing: 2, textTransform: "uppercase" as const,
                cursor: simScenario.trim() && !simStarting ? "pointer" : "not-allowed",
                transition: "all 200ms",
                opacity: simScenario.trim() && !simStarting ? 1 : 0.5,
              }}
              onMouseEnter={e => {
                if (simScenario.trim() && !simStarting) {
                  e.currentTarget.style.filter = "brightness(1.1)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(212,175,55,0.2)";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {simStarting ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(0,0,0,0.2)", borderTopColor: "var(--bg-primary)" }} />
              ) : (
                <Play size={16} />
              )}
              {simStarting ? "INITIALIZING..." : "RUN SIMULATION"}
            </button>
            {!compareMode && (
              <button
                onClick={() => setCompareMode(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: 50,
                  border: "1px solid var(--border-secondary)",
                  background: "transparent", color: "var(--text-secondary)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  transition: "all 200ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="18" rx="1"/>
                  <rect x="14" y="3" width="7" height="18" rx="1"/>
                </svg>
                Compare A vs B
              </button>
            )}
            </div>

            {/* Compare A vs B inputs */}
            {compareMode && (
              <div style={{ width: "100%", marginTop: 16 }}>
                <div style={{
                  display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, width: "100%",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: "#3b82f6",
                      fontFamily: "var(--font-mono)", marginBottom: 6,
                    }}>SCENARIO A</div>
                    <textarea
                      value={scenarioA}
                      onChange={(e) => setScenarioA(e.target.value)}
                      placeholder="First scenario..."
                      style={{
                        width: "100%", minHeight: 100, padding: 12, borderRadius: 10,
                        border: "1px solid rgba(59,130,246,0.2)",
                        background: "rgba(59,130,246,0.03)",
                        color: "var(--text-primary)", fontSize: 13, resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: "#8b5cf6",
                      fontFamily: "var(--font-mono)", marginBottom: 6,
                    }}>SCENARIO B</div>
                    <textarea
                      value={scenarioB}
                      onChange={(e) => setScenarioB(e.target.value)}
                      placeholder="Second scenario..."
                      style={{
                        width: "100%", minHeight: 100, padding: 12, borderRadius: 10,
                        border: "1px solid rgba(139,92,246,0.2)",
                        background: "rgba(139,92,246,0.03)",
                        color: "var(--text-primary)", fontSize: 13, resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      if (!scenarioA.trim() || !scenarioB.trim()) return;
                      if (!isLoggedIn) { window.location.href = "/signup"; return; }
                      if (tier === "free") { setShowPaywall(true); return; }
                      const comparisonPrompt = `COMPARE TWO SCENARIOS SIDE BY SIDE:\n\nSCENARIO A: ${scenarioA}\n\nSCENARIO B: ${scenarioB}\n\nAnalyze BOTH scenarios using the same criteria. Then provide a clear comparison:\n\n## Scenario A: [Short name]\n[Brief analysis — viability, risks, potential]\n\n## Scenario B: [Short name]\n[Brief analysis — viability, risks, potential]\n\n## ⚖️ Head-to-Head Comparison\n\n| Criteria | Scenario A | Scenario B | Winner |\n|---|---|---|---|\n| Viability Score | X/10 | X/10 | A/B |\n| Risk Level | Low/Med/High | Low/Med/High | A/B |\n| Expected ROI | X% | X% | A/B |\n| Time to Results | X months | X months | A/B |\n| Capital Required | $X | $X | A/B |\n| Competition | Low/Med/High | Low/Med/High | A/B |\n\n## 🏆 Verdict\n**Winner: Scenario [A/B]** — [1 paragraph explaining why, acknowledging trade-offs]\n\n## 🤔 Consider This\n- If your priority is [X], choose Scenario A because...\n- If your priority is [Y], choose Scenario B because...\n- A hybrid approach might be: [suggestion combining best of both]`;
                      setSimScenario(comparisonPrompt);
                      onSimulate(comparisonPrompt);
                    }}
                    disabled={!scenarioA.trim() || !scenarioB.trim() || simStarting}
                    style={{
                      padding: "10px 24px", borderRadius: 50,
                      background: scenarioA.trim() && scenarioB.trim() ? "var(--accent)" : "rgba(212,175,55,0.3)",
                      color: "var(--bg-primary)", fontWeight: 600,
                      fontSize: 13, border: "none", cursor: scenarioA.trim() && scenarioB.trim() ? "pointer" : "not-allowed",
                      opacity: scenarioA.trim() && scenarioB.trim() ? 1 : 0.5,
                      fontFamily: "var(--font-brand)", letterSpacing: 1, textTransform: "uppercase" as const,
                    }}
                  >
                    Compare scenarios
                  </button>
                  <button
                    onClick={() => { setCompareMode(false); setScenarioA(""); setScenarioB(""); }}
                    style={{
                      padding: "10px 18px", borderRadius: 50,
                      border: "1px solid var(--border-secondary)",
                      background: "transparent", color: "var(--text-tertiary)",
                      fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{
              fontSize: 11, color: "var(--text-tertiary)",
              marginTop: 16,
            }}>
              Simulations take 60-120s. Always verify with qualified professionals.
            </div>
          </div>

        </div>
        </section>
    );
  }

  /* ═══ RUNNING STATE ═══ */
  if (simulating) {
    const progressPct = Math.min(((simStage + 1) / 6) * 100, 100);
    const doneAgents = simLiveAgents.filter(a => a.done).length;
    const risk = calculateRiskScore(simLiveAgents, simAgentMessages);
    const elapsed = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
    const categoryCount: Record<string, number> = {};
    simAgentMessages.forEach(m => { if (m.category) categoryCount[m.category] = (categoryCount[m.category] || 0) + 1; });

    const leftPanel = (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Progress bar */}
        <div style={{
          width: "100%", height: 3, background: "var(--bg-tertiary)",
          borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", background: "var(--accent)",
            borderRadius: 2, transition: "width 0.8s ease",
            width: `${progressPct}%`,
          }} />
        </div>

        {/* Stages list */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {SIM_STAGE_KEYS.map((key, idx) => {
            const isDone = idx < simStage;
            const isCurrent = idx === simStage;
            const StageIcon = SIM_STAGE_ICONS[idx];
            return (
              <div key={key} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                    background: isDone ? "var(--success)" : isCurrent ? "var(--bg-primary)" : "var(--bg-tertiary)",
                    border: isCurrent ? "2px solid var(--accent)" : isDone ? "none" : "1px solid var(--border-primary)",
                  }}>
                    {isDone && <Check size={11} style={{ color: "var(--text-primary)" }} />}
                    {isCurrent && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
                  </div>
                  {idx < 5 && (
                    <div style={{
                      width: 1, flex: 1, minHeight: 20,
                      background: isDone ? "var(--success)" : "var(--border-secondary)",
                      opacity: isDone ? 0.3 : 1,
                      transition: "background 0.3s",
                    }} />
                  )}
                </div>
                <div style={{ paddingBottom: 16, paddingTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  <StageIcon size={13} style={{ color: isCurrent ? "var(--accent)" : isDone ? "var(--text-tertiary)" : "var(--text-tertiary)", opacity: isDone ? 0.5 : 1 }} />
                  <span style={{
                    fontSize: 13,
                    color: isCurrent ? "var(--text-primary)" : isDone ? "var(--text-secondary)" : "var(--text-tertiary)",
                    fontWeight: isCurrent ? 500 : 400,
                  }}>
                    {t(key)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk Dashboard */}
        <div style={{
          padding: 16, borderRadius: "var(--radius-md)",
          background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Shield size={14} style={{ color: risk.color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Risk Assessment
            </span>
          </div>
          {/* Score bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: risk.color }}>{risk.score}</span>
              <span style={{ fontSize: 11, color: risk.color, fontWeight: 500, alignSelf: "flex-end" }}>{risk.label}</span>
            </div>
            <div style={{ width: "100%", height: 4, background: "var(--bg-tertiary)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: risk.color,
                width: `${risk.score}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{doneAgents}/{simTotalAgents || "?"}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Agents</div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-tertiary)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{simAgentMessages.length}</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Messages</div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(categoryCount).length > 0 && (
          <div style={{
            padding: 16, borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Activity size={14} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Categories
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(categoryCount).map(([cat, count]) => {
                const cc = AGENT_CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cc.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{t(`sim.category.${cat}`)}</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent list */}
        {simLiveAgents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {simLiveAgents.map((a, i) => {
              const cc = AGENT_CATEGORY_COLORS[a.category || ""] || DEFAULT_CATEGORY_COLOR;
              return (
                <div key={`${a.name}-${i}`} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-secondary)",
                  animation: "fadeInUp 0.2s ease-out",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: cc.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: cc.color,
                    flexShrink: 0,
                  }}>
                    {a.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-primary)", flex: 1 }}>{a.name}</span>
                  {a.done ? (
                    <Check size={12} style={{ color: "var(--success)" }} />
                  ) : (
                    <span className="loading-dots" style={{ transform: "scale(0.7)" }}><span /><span /><span /></span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    const rightPanel = (
      <div
        ref={feedRef}
        style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8,
          padding: isMobile ? 0 : "0 4px",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 0 12px", borderBottom: "1px solid var(--border-secondary)",
          position: "sticky", top: 0, background: "var(--bg-primary)", zIndex: 2,
        }}>
          <MessageSquare size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Live Agent Feed
          </span>
          <span style={{
            marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)",
            color: "var(--text-tertiary)",
          }}>
            {simAgentMessages.length} messages
          </span>
        </div>

        {simAgentMessages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-tertiary)", fontSize: 13,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="loading-dots"><span /><span /><span /></span>
              Waiting for agent reports...
            </span>
          </div>
        ) : (
          simAgentMessages.map((msg, i) => {
            const cc = AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR;
            return (
              <div key={i} style={{
                padding: "14px 16px", borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
                borderLeft: `3px solid ${cc.color}`,
                animation: "fadeInUp 0.2s ease-out",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: cc.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: cc.color, flexShrink: 0,
                  }}>
                    {msg.agentName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{msg.agentName}</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      {msg.role}{msg.category && ` · ${t(`sim.category.${msg.category}`)}`}
                      {msg.round != null && ` · Round ${msg.round}`}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap", maxHeight: 200, overflow: "hidden",
                  maskImage: (msg.content?.length || 0) > 600 ? "linear-gradient(to bottom, black 80%, transparent)" : undefined,
                  WebkitMaskImage: (msg.content?.length || 0) > 600 ? "linear-gradient(to bottom, black 80%, transparent)" : undefined,
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    );

    return (
      <div style={{ flex: 1, overflow: "hidden", padding: isMobile ? "16px" : "24px 32px", display: "flex", flexDirection: "column" }}>
        {isMobile ? (
          /* Mobile: single column, feed then agents */
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {leftPanel}
            <div style={{ flex: 1, minHeight: 300, display: "flex", flexDirection: "column" }}>{rightPanel}</div>
          </div>
        ) : (
          /* Desktop: 2-column */
          <div style={{ flex: 1, display: "flex", gap: 24, minHeight: 0 }}>
            <div style={{ width: 300, flexShrink: 0, overflowY: "auto" }}>
              {leftPanel}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {rightPanel}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══ ERROR VIEW ═══ */
  if (simResult?.error) {
    return (
      <div style={{ flex: 1, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", animation: "fadeInUp 0.3s ease-out" }}>
          <AlertTriangle size={48} style={{ color: "var(--error)", marginBottom: 16 }} />
          <div style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 24 }}>{simResult.error}</div>
          <button
            onClick={onReset}
            style={{
              padding: "10px 24px", borderRadius: "var(--radius-sm)",
              background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
              color: "var(--text-primary)", fontSize: 13, cursor: "pointer",
            }}
          >
            {t("sim.try_again")}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ RESULT STATE ═══ */
  if (!simResult) return null;

  const meta = simResult.metadata || {};
  const stagesData = simResult.stages || {};
  const simAgents = stagesData.agents || [];
  const graph = stagesData.graph || {};
  const simulation = simResult.simulation || [];
  const duration = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
  const rawReport = simResult.report || "";
  const { cleanContent: reportText, metadata: reportMeta } = parseSignuxMetadata(rawReport);
  const vote = reportMeta.vote;
  const reportTimeline = reportMeta.timeline;
  const reportSentiment = reportMeta.sentiment;
  const reportSources = reportMeta.sources;
  const reportFollowups = reportMeta.followups;
  const uniqueRounds = [...new Set(simulation.map((m: any) => m.round))].sort();
  const uniqueCategories = [...new Set(simAgents.map((a: any) => a.category).filter(Boolean))] as string[];
  const uniqueAgentNames = [...new Set(simulation.map((m: any) => m.agentName))] as string[];
  const filteredSimulation = agentFilter
    ? (uniqueCategories.includes(agentFilter)
        ? simulation.filter((m: any) => m.category === agentFilter)
        : simulation.filter((m: any) => m.agentName === agentFilter))
    : simulation;

  const reportSections: { heading: string; content: string; level: number }[] = [];
  const rLines = reportText.split("\n");
  let cHead = "", cContent = "", cLevel = 0;
  for (const line of rLines) {
    const h2 = line.match(/^## (.+)/), h3 = line.match(/^### (.+)/);
    if (h2) { if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel }); cHead = h2[1]; cContent = ""; cLevel = 2; }
    else if (h3 && cLevel < 2) { if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel }); cHead = h3[1]; cContent = ""; cLevel = 3; }
    else cContent += line + "\n";
  }
  if (cHead) reportSections.push({ heading: cHead, content: cContent.trim(), level: cLevel });

  const getRiskColor = (text: string) => {
    const l = text.toLowerCase();
    if (l.includes("high") || l.includes("alto")) return { border: "var(--error)", bg: "rgba(239,68,68,0.04)" };
    if (l.includes("medium") || l.includes("médio")) return { border: "var(--warning)", bg: "rgba(245,158,11,0.04)" };
    return { border: "var(--success)", bg: "rgba(16,185,129,0.04)" };
  };

  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const shareResult = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "simulate",
          title: scenario?.slice(0, 200),
          content: reportText,
          metadata: {
            viability_score: meta.viability_score,
            agents_count: meta.agents_count,
            rounds: meta.rounds,
          },
        }),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        setShareUrl(data.url);
        setTimeout(() => setShareUrl(""), 3000);
      }
    } catch {}
    setSharing(false);
  };

  const exportReport = () => {
    const agents = simAgents.map((a: any) => `${a.name} — ${a.role}`).join("\n");
    const sim = simulation.map((m: any) => `[${m.agentName} — Round ${m.round}]\n${m.content}`).join("\n\n---\n\n");
    const text = `SIGNUX AI — SIMULATION REPORT\n${"=".repeat(50)}\n\nDate: ${new Date().toLocaleString()}\nAgents: ${meta.agents_count}\nRounds: ${meta.rounds}\nInteractions: ${meta.total_interactions}\n\nAGENTS:\n${agents}\n\n${"=".repeat(50)}\n\nFULL REPORT:\n\n${reportText}\n\n${"=".repeat(50)}\n\nSIMULATION LOG:\n\n${sim}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `signux-simulation-${Date.now()}.txt`; a.click();
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 32, position: "relative" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 28, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)" }}>
            {t("sim.complete")}
          </div>
          <div style={{ display: "flex", gap: 8, position: "relative", flexWrap: "wrap" }}>
            <button onClick={() => setGodEyeOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--mode-sim-border)",
              background: "var(--mode-sim-bg)", color: "var(--mode-sim)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}>
              <Eye size={14} /> What if?
            </button>
            <button onClick={onReset} style={{
              fontSize: 13, color: "var(--text-secondary)", background: "transparent",
              border: "1px solid var(--border-primary)", padding: "8px 16px",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
            }}>
              {t("sim.new_simulation")}
            </button>
            <button onClick={shareResult} disabled={sharing} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 50,
              border: "1px solid var(--border-secondary)",
              background: shareUrl ? "var(--accent-soft, rgba(212,175,55,0.08))" : "transparent",
              color: shareUrl ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 12, cursor: "pointer", transition: "all 200ms",
            }}>
              <Share2 size={14} />
              {sharing ? "Sharing..." : shareUrl ? "Link copied!" : "Share"}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setExportOpen(!exportOpen)} style={{
                fontSize: 13, color: "var(--text-primary)", background: "var(--accent)", border: "none",
                padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer",
                fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
              }}>
                <Download size={14} /> {t("sim.export")}
              </button>
              {exportOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0,
                  background: "var(--bg-primary)", border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-sm)", padding: 4, minWidth: 180,
                  zIndex: 20, boxShadow: "var(--shadow-lg)", animation: "fadeIn 0.15s ease",
                }}>
                  <button onClick={() => { exportReport(); setExportOpen(false); }} style={{
                    width: "100%", padding: "10px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 12, color: "var(--text-primary)", textAlign: "left",
                    borderRadius: 6, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <FileText size={14} /> {t("sim.export_txt")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta cards — 4 only */}
        <div className="sim-meta-responsive" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 32,
        }}>
          {[
            { value: `${meta.agents_count || 0}`, label: t("sim.specialists") },
            { value: `${meta.rounds || 0}`, label: t("sim.rounds") },
            { value: `${meta.total_interactions || 0}`, label: t("sim.interactions") },
            { value: duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`, label: t("sim.duration") },
          ].map((c, ci) => (
            <div key={ci} style={{
              padding: 16, borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Talk to Agents */}
        {simAgents.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            }}>
              <MessageSquare size={14} style={{ color: "var(--accent)" }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase", color: "var(--accent)",
              }}>
                Talk to Agents
              </span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                — Click an agent to continue the conversation
              </span>
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {simAgents.map((agent: any) => {
                const catColor = AGENT_CATEGORY_COLORS[agent.category as keyof typeof AGENT_CATEGORY_COLORS] || DEFAULT_CATEGORY_COLOR;
                const isActive = agentChat?.agent?.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => openAgentChat(agent)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 24,
                      border: isActive ? `2px solid ${catColor}` : "1px solid var(--border-secondary)",
                      background: isActive ? `${catColor}15` : "var(--bg-secondary)",
                      cursor: "pointer", transition: "all 150ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = catColor; e.currentTarget.style.background = `${catColor}10`; }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--border-secondary)"; e.currentTarget.style.background = "var(--bg-secondary)"; } }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `${catColor}20`, color: catColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, fontFamily: "var(--font-brand)",
                    }}>
                      {agent.name?.charAt(0) || "?"}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                        {agent.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                        {agent.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent Chat Panel */}
        {agentChat && (
          <div style={{
            marginBottom: 28, borderRadius: "var(--radius-md)",
            border: `1px solid ${AGENT_CATEGORY_COLORS[(agentChat.agent.category as keyof typeof AGENT_CATEGORY_COLORS)] || DEFAULT_CATEGORY_COLOR}40`,
            background: "var(--bg-secondary)", overflow: "hidden",
          }}>
            {/* Chat header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-secondary)",
              background: `${AGENT_CATEGORY_COLORS[(agentChat.agent.category as keyof typeof AGENT_CATEGORY_COLORS)] || DEFAULT_CATEGORY_COLOR}08`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `${AGENT_CATEGORY_COLORS[(agentChat.agent.category as keyof typeof AGENT_CATEGORY_COLORS)] || DEFAULT_CATEGORY_COLOR}20`,
                  color: AGENT_CATEGORY_COLORS[(agentChat.agent.category as keyof typeof AGENT_CATEGORY_COLORS)] || DEFAULT_CATEGORY_COLOR,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, fontFamily: "var(--font-brand)",
                }}>
                  {agentChat.agent.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{agentChat.agent.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{agentChat.agent.role}</div>
                </div>
              </div>
              <button onClick={() => setAgentChat(null)} style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4,
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Chat messages */}
            <div style={{ maxHeight: 320, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {agentChatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--text-tertiary)", fontSize: 13 }}>
                  Ask {agentChat.agent.name} about their analysis, challenge their assumptions, or explore deeper.
                </div>
              )}
              {agentChatMessages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
                  background: msg.role === "user" ? "var(--accent)" : "var(--card-bg)",
                  color: msg.role === "user" ? "#000" : "var(--text-secondary)",
                  fontSize: 13, lineHeight: 1.6, border: msg.role === "user" ? "none" : "1px solid var(--border-secondary)",
                }}>
                  {msg.role === "assistant" ? <MarkdownRenderer content={msg.content} /> : msg.content}
                </div>
              ))}
              {agentChatLoading && (
                <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--border-secondary)", fontSize: 13, color: "var(--text-tertiary)" }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
                  {agentChat.agent.name} is thinking...
                </div>
              )}
            </div>

            {/* Chat input */}
            <div style={{
              display: "flex", gap: 8, padding: "12px 16px",
              borderTop: "1px solid var(--border-secondary)",
            }}>
              <input
                value={agentChatInput}
                onChange={e => setAgentChatInput(e.target.value)}
                placeholder={`Ask ${agentChat.agent.name} a question...`}
                disabled={agentChatLoading}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border-secondary)", background: "var(--bg-primary)",
                  color: "var(--text-primary)", fontSize: 13, outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentChat(); } }}
              />
              <button
                onClick={sendAgentChat}
                disabled={!agentChatInput.trim() || agentChatLoading}
                style={{
                  padding: "10px 18px", borderRadius: 8,
                  background: agentChatInput.trim() && !agentChatLoading ? "var(--accent)" : "var(--bg-tertiary)",
                  color: agentChatInput.trim() && !agentChatLoading ? "#000" : "var(--text-tertiary)",
                  border: "none", fontWeight: 600, fontSize: 12, cursor: agentChatInput.trim() && !agentChatLoading ? "pointer" : "default",
                  fontFamily: "var(--font-brand)", letterSpacing: 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Tab selector — pill style */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 28, padding: 4,
          background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-secondary)", width: "fit-content",
        }}>
          {(["report", "simulation", "graph"] as const).map(tab => (
            <button key={tab} onClick={() => setResultTab(tab)} style={{
              padding: "8px 20px", fontSize: 13, cursor: "pointer",
              borderRadius: "var(--radius-sm)", border: "none", transition: "all 0.15s",
              background: resultTab === tab ? "var(--bg-primary)" : "transparent",
              color: resultTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              fontWeight: resultTab === tab ? 500 : 400,
              boxShadow: resultTab === tab ? "var(--shadow-sm)" : "none",
            }}>
              {tab === "report" ? t("sim.tab_report") : tab === "simulation" ? t("sim.tab_simulation") : t("sim.tab_graph")}
            </button>
          ))}
        </div>

        {/* Report tab */}
        {resultTab === "report" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Vote Badge */}
            {vote && (
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 20px", borderRadius: "var(--radius-md)",
                background: vote.result === "GO" ? "rgba(34,197,94,0.06)"
                  : vote.result === "CAUTION" ? "rgba(245,158,11,0.06)"
                  : "rgba(239,68,68,0.06)",
                border: `1px solid ${vote.result === "GO" ? "rgba(34,197,94,0.15)"
                  : vote.result === "CAUTION" ? "rgba(245,158,11,0.15)"
                  : "rgba(239,68,68,0.15)"}`,
              }}>
                <div style={{
                  fontSize: 26, fontWeight: 700,
                  color: vote.result === "GO" ? "#22c55e" : vote.result === "CAUTION" ? "#f59e0b" : "#ef4444",
                  fontFamily: "var(--font-brand)", letterSpacing: 2,
                }}>
                  {vote.result}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>{vote.go} GO</span>
                  {" · "}
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>{vote.caution} CAUTION</span>
                  {" · "}
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>{vote.stop} STOP</span>
                  {vote.dissenters && vote.dissenters.length > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {vote.dissenters.map((d, i) => (
                        <span key={i}>{d.role}: {d.reason}{i < vote.dissenters.length - 1 ? " · " : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{
                  marginLeft: "auto", fontSize: 11,
                  fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
                }}>
                  Avg {vote.confidence_avg}%
                </div>
              </div>
            )}
            {reportSections.length > 0 ? reportSections.map((section, si) => {
              const sKey = `s-${si}`;
              const isCollapsed = collapsedSections[sKey];
              const isRisk = section.heading.toLowerCase().includes("risk");
              return (
                <div key={sKey} style={{
                  borderRadius: "var(--radius-md)", background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)", overflow: "hidden",
                }}>
                  <button onClick={() => toggleSection(sKey)} style={{
                    width: "100%", padding: "16px 20px", background: "none", border: "none",
                    cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{section.heading}</span>
                    {isCollapsed ? <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />}
                  </button>
                  {!isCollapsed && (
                    <div style={{ padding: "0 20px 20px", fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                      {isRisk ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {section.content.split(/(?=^-\s)/m).filter(Boolean).map((risk, ri) => {
                            const rc = getRiskColor(risk);
                            return <div key={ri} style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: rc.bg, borderLeft: `3px solid ${rc.border}`, fontSize: 14 }}><MarkdownRenderer content={risk.trim()} /></div>;
                          })}
                        </div>
                      ) : (
                        <MarkdownRenderer content={section.content} />
                      )}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div style={{ padding: 24, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)" }}>
                <MarkdownRenderer content={reportText} />
              </div>
            )}

            {/* ═══ TIMELINE PROJECTION ═══ */}
            {reportTimeline.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{
                  fontSize: 10, letterSpacing: "0.15em", color: "var(--text-tertiary)",
                  textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10,
                }}>
                  Timeline Projection
                </div>
                <div style={{
                  borderRadius: "var(--radius-md)", overflow: "hidden",
                  border: "1px solid var(--border-secondary)",
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>Period</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>Event</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-secondary)" }}>Impact</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-secondary)", width: 70 }}>Prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportTimeline.map((evt, i) => (
                        <tr key={i} style={{ borderBottom: i < reportTimeline.length - 1 ? "1px solid var(--border-secondary)" : "none" }}>
                          <td style={{ padding: "8px 12px", color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{evt.period}</td>
                          <td style={{ padding: "8px 12px", color: "var(--text-primary)" }}>{evt.event}</td>
                          <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>{evt.impact}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            {evt.probability != null && (
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10,
                                fontFamily: "var(--font-mono)", fontWeight: 600,
                                background: evt.probability >= 0.7 ? "rgba(34,197,94,0.1)" : evt.probability >= 0.4 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                color: evt.probability >= 0.7 ? "#22c55e" : evt.probability >= 0.4 ? "#f59e0b" : "#ef4444",
                              }}>
                                {Math.round(evt.probability * 100)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ SENTIMENT BADGE ═══ */}
            {reportSentiment && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                marginTop: 16, padding: "6px 14px", borderRadius: 50,
                background: reportSentiment.signal === "bullish" ? "rgba(34,197,94,0.08)"
                  : reportSentiment.signal === "bearish" ? "rgba(239,68,68,0.08)"
                  : reportSentiment.signal === "mixed" ? "rgba(245,158,11,0.08)"
                  : "rgba(148,163,184,0.08)",
                border: `1px solid ${
                  reportSentiment.signal === "bullish" ? "rgba(34,197,94,0.25)"
                  : reportSentiment.signal === "bearish" ? "rgba(239,68,68,0.25)"
                  : reportSentiment.signal === "mixed" ? "rgba(245,158,11,0.25)"
                  : "rgba(148,163,184,0.25)"
                }`,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  color: reportSentiment.signal === "bullish" ? "#22c55e"
                    : reportSentiment.signal === "bearish" ? "#ef4444"
                    : reportSentiment.signal === "mixed" ? "#f59e0b"
                    : "#94a3b8",
                }}>
                  {reportSentiment.signal === "bullish" ? "\u25B2" : reportSentiment.signal === "bearish" ? "\u25BC" : "\u25C6"} {reportSentiment.signal}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {Math.round(reportSentiment.confidence * 100)}%
                </span>
                {reportSentiment.reason && (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>— {reportSentiment.reason}</span>
                )}
              </div>
            )}

            {/* ═══ SOURCE CARDS ═══ */}
            {reportSources.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 10, letterSpacing: "0.15em", color: "var(--text-tertiary)",
                  textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8,
                }}>
                  Sources ({reportSources.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {reportSources.map((src, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 10px", borderRadius: 8,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-secondary)",
                      fontSize: 11,
                    }}>
                      <span style={{
                        padding: "1px 4px", borderRadius: 3, fontSize: 8,
                        fontFamily: "var(--font-mono)",
                        background: src.type === "web" ? "rgba(59,130,246,0.1)" : src.type === "kb" ? "rgba(212,175,55,0.1)" : "rgba(168,85,247,0.1)",
                        color: src.type === "web" ? "#3b82f6" : src.type === "kb" ? "var(--accent)" : "#a855f7",
                      }}>
                        {src.type}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>{src.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ FOLLOW-UP SUGGESTIONS ═══ */}
            {reportFollowups.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 10, letterSpacing: "0.15em", color: "var(--text-tertiary)",
                  textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8,
                }}>
                  Explore Next
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {reportFollowups.map((sf, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (props.setSimScenario && props.onSimulate) {
                          props.setSimScenario(sf.question);
                        }
                      }}
                      title={sf.why}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 50,
                        border: "1px solid var(--card-border)",
                        background: "var(--card-bg)",
                        cursor: "pointer", fontSize: 11,
                        color: "var(--text-secondary)",
                        transition: "all 150ms",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--card-border)";
                      }}
                    >
                      {sf.question}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.3 }}><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulation tab */}
        {resultTab === "simulation" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <button onClick={() => setAgentFilter(null)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: "none", background: !agentFilter ? "var(--accent-bg)" : "var(--bg-secondary)", color: !agentFilter ? "var(--accent)" : "var(--text-tertiary)" }}>{t("sim.filter_all")}</button>
              {uniqueCategories.map(cat => {
                const cc = AGENT_CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
                return (
                  <button key={cat} onClick={() => setAgentFilter(agentFilter === cat ? null : cat)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: agentFilter === cat ? `1px solid ${cc.border}` : "1px solid transparent", background: agentFilter === cat ? cc.bg : "var(--bg-secondary)", color: agentFilter === cat ? cc.color : "var(--text-tertiary)" }}>
                    {t(`sim.category.${cat}`)}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {uniqueAgentNames.map(name => (
                <button key={name} onClick={() => setAgentFilter(agentFilter === name ? null : name)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer", border: "none", background: agentFilter === name ? "var(--accent-bg)" : "var(--bg-secondary)", color: agentFilter === name ? "var(--accent)" : "var(--text-tertiary)" }}>{name}</button>
              ))}
            </div>
            {uniqueRounds.map((round: any) => {
              const roundMsgs = filteredSimulation.filter((m: any) => m.round === round);
              if (!roundMsgs.length) return null;
              return (
                <div key={`r-${round}`} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ height: 1, flex: 1, background: "var(--border-secondary)" }} />
                    <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Round {round}</span>
                    <div style={{ height: 1, flex: 1, background: "var(--border-secondary)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {roundMsgs.map((msg: any, i: number) => {
                      const cc = AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR;
                      return (
                        <div key={`${round}-${i}`} style={{ padding: 18, borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)", borderLeft: `3px solid ${cc.color}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: cc.color, flexShrink: 0 }}>{msg.agentName.charAt(0)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{msg.agentName}</div>
                              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{msg.role}{msg.category && ` · ${t(`sim.category.${msg.category}`)}`}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Graph tab */}
        {resultTab === "graph" && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.entities")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {(graph.entities || []).map((e: any, i: number) => {
                const c = ENTITY_COLORS[e.type] || DEFAULT_ENTITY_COLOR;
                return (
                  <div key={i} style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", background: c.bg, border: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 13, color: c.color, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 10, color: c.color, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.type}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.relationships")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {(graph.relationships || []).map((r: any, i: number) => (
                <div key={i} style={{ padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{r.from}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center" }}><div style={{ height: 1, flex: 1, background: "var(--border-primary)" }} /><span style={{ color: "var(--text-tertiary)", margin: "0 6px", fontSize: 12 }}>&rarr;</span><div style={{ height: 1, flex: 1, background: "var(--border-primary)" }} /></div>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{r.to}</span>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}>{r.type?.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
            {graph.key_variables?.length > 0 && (<>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.key_variables")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 32 }}>
                {graph.key_variables.map((v: string, i: number) => <span key={i} style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", fontSize: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)", color: "var(--text-secondary)" }}>{v}</span>)}
              </div>
            </>)}
            {graph.critical_questions?.length > 0 && (<>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase" }}>{t("sim.critical_questions")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {graph.critical_questions.map((q: string, i: number) => <div key={i} style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.04)", borderLeft: "3px solid var(--error)", fontSize: 13, color: "var(--text-secondary)" }}>{q}</div>)}
              </div>
            </>)}
          </div>
        )}

        {/* Injection History */}
        {injectionHistory.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
            }}>
              <Eye size={14} style={{ color: "var(--mode-sim)" }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
                textTransform: "uppercase", color: "var(--mode-sim)",
              }}>
                God&apos;s Eye — Injection History
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {injectionHistory.map((entry, i) => (
                <div key={i} style={{
                  padding: 18, borderRadius: "var(--radius-md)",
                  background: "var(--bg-secondary)", border: "1px solid var(--mode-sim-border)",
                  borderLeft: "3px solid var(--mode-sim)",
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--mode-sim)", marginBottom: 8,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Zap size={12} /> &quot;{entry.variable}&quot;
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                    <MarkdownRenderer content={entry.impact} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* What-If Engine */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        }}>
          <Zap size={14} style={{ color: "var(--mode-sim)" }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
            textTransform: "uppercase", color: "var(--mode-sim)",
          }}>
            What-If Engine
          </span>
        </div>

        {/* Suggested what-ifs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[
            "What if the budget doubles?",
            "What if a key competitor enters?",
            "What if the timeline extends 6 months?",
            "What if regulation changes?",
            "What if demand drops 50%?",
            "What if we pivot the target market?",
          ].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => handleWhatIf(suggestion)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: "1px solid var(--mode-sim-border)",
                background: "var(--mode-sim-bg)",
                fontSize: 11, color: "var(--mode-sim)",
                cursor: "pointer", transition: "all 150ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--mode-sim)"; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--mode-sim-bg)"; e.currentTarget.style.color = "var(--mode-sim)"; }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Custom what-if input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={whatIfInput}
            onChange={e => setWhatIfInput(e.target.value)}
            placeholder="Or type your own: What if..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: "1px solid var(--mode-sim-border)", background: "var(--card-bg)",
              color: "var(--text-primary)", fontSize: 13, outline: "none",
              fontFamily: "var(--font-sans)",
            }}
            onKeyDown={e => { if (e.key === "Enter" && whatIfInput.trim()) handleWhatIf(whatIfInput); }}
          />
          <button
            onClick={() => { if (whatIfInput.trim()) handleWhatIf(whatIfInput); }}
            disabled={!whatIfInput.trim()}
            style={{
              padding: "10px 20px", borderRadius: 8,
              background: whatIfInput.trim() ? "var(--mode-sim)" : "var(--bg-tertiary)",
              color: whatIfInput.trim() ? "#000" : "var(--text-tertiary)",
              border: "none", fontWeight: 600, fontSize: 12, cursor: whatIfInput.trim() ? "pointer" : "default",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Play size={12} /> Re-simulate
          </button>
        </div>
      </div>

      {/* Demo CTA */}
      {isDemo && !isLoggedIn && (
        <div style={{
          padding: 24, borderRadius: 14, textAlign: "center",
          background: "var(--mode-sim-bg)", border: "1px solid var(--mode-sim-border)",
          marginTop: 24,
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Now simulate YOUR business
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Sign up free to run unlimited custom simulations
          </div>
          <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/signup"; }} style={{
            padding: "12px 32px", borderRadius: 50,
            background: "var(--accent)", color: "var(--text-inverse)",
            fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
            fontFamily: "var(--font-brand)", letterSpacing: 1,
            transition: "all 200ms",
          }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
          >
            Sign up free
          </button>
        </div>
      )}

      {/* God's Eye Modal */}
      {godEyeOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={() => !godEyeRunning && setGodEyeOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto",
              borderRadius: 16,
              border: "1px solid var(--mode-sim-border)",
              background: "var(--bg-primary)", padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              animation: "fadeInUp 0.2s ease-out",
              margin: 16,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={18} style={{ color: "var(--mode-sim)" }} />
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 700,
                  letterSpacing: 2, color: "var(--text-primary)",
                }}>
                  GOD&apos;S EYE
                </span>
              </div>
              <button
                onClick={() => !godEyeRunning && setGodEyeOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-tertiary)", padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
              Inject a variable and watch the agents recalculate. What happens if...
            </p>

            {/* Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[
                "Revenue drops 40%",
                "Key employee leaves",
                "New competitor with $10M funding",
                "Regulation changes",
                "Supply chain disruption",
                "Interest rates rise 2%",
              ].map(preset => (
                <button
                  key={preset}
                  onClick={() => setGodEyeInput(preset)}
                  style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: godEyeInput === preset ? "1px solid var(--mode-sim)" : "1px solid var(--card-border)",
                    background: godEyeInput === preset ? "var(--mode-sim-bg)" : "var(--card-bg)",
                    fontSize: 11, color: godEyeInput === preset ? "var(--mode-sim)" : "var(--text-secondary)",
                    cursor: "pointer", transition: "all 150ms",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input */}
            <input
              value={godEyeInput}
              onChange={e => setGodEyeInput(e.target.value)}
              placeholder="What if..."
              disabled={godEyeRunning}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: "1px solid var(--mode-sim-border)", background: "var(--card-bg)",
                color: "var(--text-primary)", fontSize: 14, outline: "none",
                marginBottom: 16, fontFamily: "var(--font-sans)",
              }}
              onKeyDown={e => { if (e.key === "Enter" && godEyeInput.trim() && !godEyeRunning) runGodEye(); }}
            />

            {/* Run button */}
            <button
              onClick={runGodEye}
              disabled={!godEyeInput.trim() || godEyeRunning}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: godEyeInput.trim() && !godEyeRunning ? "var(--mode-sim)" : "var(--bg-tertiary)",
                color: godEyeInput.trim() && !godEyeRunning ? "#000" : "var(--text-tertiary)",
                fontWeight: 600, fontSize: 14, border: "none",
                cursor: godEyeInput.trim() && !godEyeRunning ? "pointer" : "default",
                fontFamily: "var(--font-brand)", letterSpacing: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {godEyeRunning && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {godEyeRunning ? "RECALCULATING..." : "INJECT VARIABLE"}
            </button>

            {/* Results */}
            {godEyeResults.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {godEyeResults.map((r, i) => {
                  if (r.type === "recalc") {
                    return (
                      <div key={i} style={{
                        padding: "12px 14px", borderRadius: 10,
                        background: "var(--bg-secondary)", border: "1px solid var(--border-secondary)",
                      }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <Check size={12} style={{ color: "var(--success)" }} />
                          {r.agent}
                          <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 400 }}>{r.role}</span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                          {r.analysis}
                        </div>
                      </div>
                    );
                  }
                  if (r.type === "impact") {
                    return (
                      <div key={i} style={{
                        padding: 16, borderRadius: 10,
                        background: "var(--mode-sim-bg)", border: "1px solid var(--mode-sim-border)",
                      }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: "var(--mode-sim)", marginBottom: 8,
                          display: "flex", alignItems: "center", gap: 6,
                          fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase",
                        }}>
                          <Zap size={12} /> Impact Report
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                          <MarkdownRenderer content={r.content || ""} />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showPaywall && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          zIndex: 50, borderRadius: 16,
        }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-brand)", marginBottom: 8 }}>
              Your scenario is ready to analyze
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              AI specialists are ready to debate your idea, find hidden risks, and predict outcomes. Unlock to see what they find.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, textAlign: "left", padding: "12px 16px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              {["Risks you haven't considered", "How competitors might respond", "Real projections and numbers", "A clear verdict: go or no-go"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <span style={{ color: "#22c55e", fontSize: 14 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
            <a href="/pricing" style={{
              display: "inline-flex", padding: "12px 28px", borderRadius: 50,
              background: "var(--accent)", color: "#000", fontWeight: 600,
              fontSize: 14, textDecoration: "none",
            }}>
              See what the AI finds →
            </a>
            <button onClick={() => setShowPaywall(false)} style={{
              display: "block", margin: "12px auto 0", background: "none",
              border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
            }}>
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
