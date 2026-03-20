"use client";
import { useState, useRef, useEffect } from "react";
import {
  Check, AlertTriangle, Download, ChevronDown, ChevronRight,
  FileText, RotateCcw, MessageSquare, BarChart3, Network,
  Globe, Users, Clock, Zap, Search, Shield, Activity, Play,
  Wand2, Loader2, Eye, X, Share2, Lock, Link2, Paperclip, Columns,
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

  // Parallel Futures state
  const [parallelFutures, setParallelFutures] = useState<string | null>(null);
  const [loadingFutures, setLoadingFutures] = useState(false);

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

  // Parallel Futures handler
  const generateParallelFutures = async () => {
    if (!simResult) return;
    setLoadingFutures(true);
    const rawReport = simResult.report || "";
    const { metadata: rMeta } = parseSignuxMetadata(rawReport);
    const prompt = `Based on this COMPLETED simulation:

ORIGINAL SCENARIO: ${simScenario}
ORIGINAL RESULT: Verdict: ${rMeta?.vote?.result || "N/A"}. Confidence: ${rMeta?.vote?.confidence_avg || "N/A"}%.
KEY RISKS: ${rawReport.slice(0, 800)}

Generate 3 PARALLEL FUTURES — divergent timelines showing how this plays out under different conditions.

## 🟢 UNIVERSE A — Best Case
**Probability: X%**
**12-month outcome:** [1 sentence]
**How it unfolds:**
- Month 1-2: [what happens]
- Month 3-6: [what happens]
- Month 6-12: [what happens]
**What triggers this future:** [key condition]
**Revenue projection:** [estimate]

---

## 🟡 UNIVERSE B — Most Likely
**Probability: X%**
**12-month outcome:** [1 sentence]
**How it unfolds:**
- Month 1-2: [what happens]
- Month 3-6: [what happens]
- Month 6-12: [what happens]
**What triggers this future:** [default conditions]
**Revenue projection:** [estimate]

---

## 🔴 UNIVERSE C — Worst Case
**Probability: X%**
**12-month outcome:** [1 sentence]
**How it unfolds:**
- Month 1-2: [what happens]
- Month 3-6: [what happens]
- Month 6-12: [what happens]
**What triggers this future:** [what goes wrong]
**Revenue projection:** [estimate]

---

## 🎯 HOW TO STEER TOWARD UNIVERSE A
1. [Specific action]
2. [Specific action]
3. [Specific action]

## 🛡️ HOW TO AVOID UNIVERSE C
1. [Specific safeguard]
2. [Specific safeguard]
3. [Specific safeguard]

Include: <!-- signux_parallel: {"universes": [{"id": "A", "name": "Best Case", "probability": 25, "revenue": "$X", "outcome": "summary"}, {"id": "B", "name": "Most Likely", "probability": 55, "revenue": "$X", "outcome": "summary"}, {"id": "C", "name": "Worst Case", "probability": 20, "revenue": "$X", "outcome": "summary"}]} -->`;

    try {
      const res = await signuxFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], profile: null }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
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
              if (data.type === "text") fullText += data.text;
            } catch {}
          }
        }
      }
      setParallelFutures(fullText);
    } catch {}
    setLoadingFutures(false);
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const quickScenarios = [
      "Open a franchise in 3 new cities",
      "Launch a SaaS at $29/mo",
      "Expand to the Korean market",
      "Raise a $2M seed round",
      "Cut costs 30% without layoffs",
      "Partner with a competitor",
    ];

    const handleRun = () => {
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
    };

    const handleCompare = () => {
      if (!scenarioA.trim() || !scenarioB.trim()) return;
      if (!isLoggedIn) { window.location.href = "/signup"; return; }
      if (tier === "free") { setShowPaywall(true); return; }
      const comparisonPrompt = `COMPARE TWO SCENARIOS SIDE BY SIDE:\n\nSCENARIO A: ${scenarioA}\n\nSCENARIO B: ${scenarioB}\n\nAnalyze BOTH scenarios using the same criteria. Then provide a clear comparison:\n\n## Scenario A: [Short name]\n[Brief analysis — viability, risks, potential]\n\n## Scenario B: [Short name]\n[Brief analysis — viability, risks, potential]\n\n## ⚖️ Head-to-Head Comparison\n\n| Criteria | Scenario A | Scenario B | Winner |\n|---|---|---|---|\n| Viability Score | X/10 | X/10 | A/B |\n| Risk Level | Low/Med/High | Low/Med/High | A/B |\n| Expected ROI | X% | X% | A/B |\n| Time to Results | X months | X months | A/B |\n| Capital Required | $X | $X | A/B |\n| Competition | Low/Med/High | Low/Med/High | A/B |\n\n## 🏆 Verdict\n**Winner: Scenario [A/B]** — [1 paragraph explaining why, acknowledging trade-offs]\n\n## 🤔 Consider This\n- If your priority is [X], choose Scenario A because...\n- If your priority is [Y], choose Scenario B because...\n- A hybrid approach might be: [suggestion combining best of both]`;
      setSimScenario(comparisonPrompt);
      onSimulate(comparisonPrompt);
    };

    return (
      <section style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: isMobile ? "calc(100vh - 52px)" : "calc(100vh - 60px)",
        padding: isMobile ? "0 20px 120px" : "0 32px 120px",
        paddingTop: isMobile ? "8vh" : "clamp(60px, 12vh, 140px)",
        width: "100%",
        position: "relative",
      }}>

        {/* ── HERO HEADER — matches WelcomeScreen ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 16 : 24,
        }}>
          <div style={{
            width: isMobile ? 44 : 72,
            height: isMobile ? 44 : 72,
            borderRadius: isMobile ? 14 : 20,
            background: "rgba(212,175,55,0.06)",
            border: "1px solid rgba(212,175,55,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Zap size={isMobile ? 22 : 36} style={{ color: "#D4AF37" }} />
          </div>
          <span style={{
            fontFamily: "var(--font-brand)",
            fontSize: isMobile ? 28 : "clamp(32px, 3vw, 48px)",
            fontWeight: 800,
            letterSpacing: "clamp(6px, 0.6vw, 10px)",
            color: "var(--text-primary)",
          }}>
            SIMULATE
          </span>
        </div>
        <p style={{
          textAlign: "center",
          fontSize: 14,
          color: "var(--text-tertiary)",
          marginBottom: isMobile ? "clamp(24px, 4vh, 40px)" : "clamp(32px, 6vh, 60px)",
          maxWidth: 500,
        }}>
          See the future before it happens — and choose the best path
        </p>

        <div style={{
          width: "100%",
          maxWidth: isMobile ? 680 : "clamp(600px, 52vw, 820px)",
        }}>

        {/* ── MAIN INPUT CONTAINER ── */}
        {!compareMode && (
          <div style={{ width: "100%" }}>
            <div style={{
              borderRadius: 14,
              border: simScenario.trim()
                ? "1px solid rgba(212,175,55,0.25)"
                : "1px solid var(--border-secondary)",
              background: "var(--card-bg)",
              overflow: "hidden",
              transition: "border-color 200ms, box-shadow 200ms",
              boxShadow: simScenario.trim()
                ? "0 0 20px rgba(212,175,55,0.04)"
                : "none",
            }}>
              <textarea
                value={simScenario}
                onChange={e => setSimScenario(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "e") {
                    e.preventDefault();
                    handleEnhance();
                  }
                }}
                placeholder="Describe any business scenario… Ex: I want to open a coffee franchise in 3 cities with a $200K budget…"
                rows={isMobile ? 3 : 4}
                style={{
                  width: "100%", padding: "16px 18px 8px",
                  background: "transparent", border: "none",
                  color: "var(--text-primary)", fontSize: 14,
                  lineHeight: 1.6, resize: "none", outline: "none",
                  fontFamily: "var(--font-body)",
                  opacity: enhancing ? 0.5 : 1,
                }}
              />

              {/* Bottom bar: upload + enhance + simulate */}
              <div style={{
                display: "flex", alignItems: "center",
                padding: "8px 12px", gap: 6,
                borderTop: "1px solid var(--border-secondary)",
              }}>
                <button onClick={() => setShowUrlInput(!showUrlInput)} style={{
                  display: "flex", alignItems: "center", gap: isMobile ? 0 : 4,
                  padding: "5px 10px", borderRadius: 6,
                  background: "transparent",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-tertiary)", fontSize: 11,
                  cursor: "pointer",
                }}>
                  <Link2 size={12} />
                  {!isMobile && <span style={{ marginLeft: 4 }}>URL</span>}
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  display: "flex", alignItems: "center", gap: isMobile ? 0 : 4,
                  padding: "5px 10px", borderRadius: 6,
                  background: "transparent",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-tertiary)", fontSize: 11,
                  cursor: "pointer",
                }}>
                  <Paperclip size={12} />
                  {!isMobile && <span style={{ marginLeft: 4 }}>File</span>}
                </button>
                <input type="file" ref={fileInputRef} hidden
                  accept=".pdf,.txt,.csv,.doc,.docx,.json,.md"
                  onChange={e => handleFileUpload(e.target.files?.[0])}
                />

                {/* Uploaded file indicator */}
                {seedFileName && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 4,
                    background: "rgba(212,175,55,0.06)",
                    border: "1px solid rgba(212,175,55,0.12)",
                    fontSize: 10, color: "var(--accent)",
                    maxWidth: 120, overflow: "hidden",
                  }}>
                    <FileText size={10} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {seedFileName.slice(0, 20)}{seedFileName.length > 20 ? "..." : ""}
                    </span>
                    <button onClick={() => { setSeedMaterial(""); setSeedFileName(""); }} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-tertiary)", fontSize: 11, padding: 0, marginLeft: 2, flexShrink: 0,
                    }}>
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* Enhance button */}
                {simScenario.trim().length >= 10 && (
                  <button
                    onClick={handleEnhance}
                    disabled={enhancing}
                    title="Enhance (⌘E)"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 6,
                      border: "1px solid var(--border-secondary)",
                      background: wasEnhanced ? "rgba(212,175,55,0.08)" : "transparent",
                      color: wasEnhanced ? "var(--accent)" : "var(--text-tertiary)",
                      fontSize: 11, cursor: enhancing ? "wait" : "pointer",
                    }}
                  >
                    {enhancing ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={11} />}
                    {isMobile ? "" : wasEnhanced ? "Enhanced" : "Enhance"}
                  </button>
                )}

                <div style={{ flex: 1 }} />

                {/* SIMULATE BUTTON — always visible */}
                <button
                  onClick={handleRun}
                  disabled={!simScenario.trim() || simStarting}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 20px", borderRadius: 50,
                    background: simScenario.trim() && !simStarting ? "var(--accent)" : "rgba(255,255,255,0.05)",
                    color: simScenario.trim() && !simStarting ? "#000" : "var(--text-tertiary)",
                    fontSize: 13, fontWeight: 700, border: "none",
                    cursor: simScenario.trim() && !simStarting ? "pointer" : "default",
                    opacity: simScenario.trim() && !simStarting ? 1 : 0.4,
                    transition: "all 300ms ease",
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {simStarting ? (
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Play size={13} fill={simScenario.trim() && !simStarting ? "#000" : "var(--text-tertiary)"} />
                  )}
                  {simStarting ? "Starting..." : "SIMULATE FUTURE"}
                </button>
              </div>

              {/* URL input (expandable) */}
              {showUrlInput && (
                <div style={{
                  display: "flex", gap: 6, padding: "8px 12px",
                  borderTop: "1px solid var(--border-secondary)",
                }}>
                  <input
                    type="url"
                    placeholder="https://competitor-site.com or article URL..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleUrlPaste(); if (e.key === "Escape") setShowUrlInput(false); }}
                    autoFocus
                    style={{
                      flex: 1, padding: "6px 10px", borderRadius: 6,
                      border: "1px solid var(--border-secondary)",
                      background: "var(--bg-secondary)", color: "var(--text-primary)",
                      fontSize: 12, outline: "none",
                    }}
                  />
                  <button onClick={() => {
                    handleUrlPaste();
                    setShowUrlInput(false);
                  }} style={{
                    padding: "6px 12px", borderRadius: 6,
                    background: "var(--accent)", color: "#000",
                    fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  }}>Add</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPARE A vs B (replaces main textarea when active) ── */}
        {compareMode && (
          <div style={{ width: "100%" }}>
            <div style={{
              display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#3b82f6",
                  fontFamily: "var(--font-mono)", marginBottom: 4, letterSpacing: 0.5,
                }}>SCENARIO A</div>
                <textarea
                  value={scenarioA}
                  onChange={(e) => setScenarioA(e.target.value)}
                  placeholder="First scenario..."
                  rows={isMobile ? 3 : 4}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: "1px solid rgba(59,130,246,0.15)",
                    background: "rgba(59,130,246,0.03)",
                    color: "var(--text-primary)", fontSize: 13,
                    resize: "none", outline: "none",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#8b5cf6",
                  fontFamily: "var(--font-mono)", marginBottom: 4, letterSpacing: 0.5,
                }}>SCENARIO B</div>
                <textarea
                  value={scenarioB}
                  onChange={(e) => setScenarioB(e.target.value)}
                  placeholder="Second scenario..."
                  rows={isMobile ? 3 : 4}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: "1px solid rgba(139,92,246,0.15)",
                    background: "rgba(139,92,246,0.03)",
                    color: "var(--text-primary)", fontSize: 13,
                    resize: "none", outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
              <button
                onClick={handleCompare}
                disabled={!scenarioA.trim() || !scenarioB.trim() || simStarting}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px", borderRadius: 50,
                  background: (scenarioA.trim() && scenarioB.trim()) ? "var(--accent)" : "rgba(255,255,255,0.05)",
                  color: (scenarioA.trim() && scenarioB.trim()) ? "#000" : "var(--text-tertiary)",
                  fontSize: 13, fontWeight: 700, border: "none",
                  cursor: (scenarioA.trim() && scenarioB.trim()) ? "pointer" : "default",
                  opacity: (scenarioA.trim() && scenarioB.trim()) ? 1 : 0.4,
                }}
              >
                <Columns size={13} /> Compare →
              </button>
              <button
                onClick={() => { setCompareMode(false); setScenarioA(""); setScenarioB(""); }}
                style={{
                  padding: "8px 14px", borderRadius: 50,
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

        {/* ── QUICK SCENARIOS — chips ── */}
        <div style={{
          margin: "8px auto 0", padding: "0",
          display: "flex", alignItems: "center", gap: 6,
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : undefined,
          WebkitOverflowScrolling: isMobile ? "touch" : undefined,
          scrollbarWidth: "none" as const,
          paddingBottom: isMobile ? 4 : 0,
          width: "100%",
        }}>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>
            Try:
          </span>
          {quickScenarios.map((sc, i) => (
            <button key={i} onClick={() => setSimScenario(sc)} style={{
              padding: "5px 11px", borderRadius: 50,
              border: "1px solid var(--border-secondary)",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: 11, cursor: "pointer",
              transition: "all 150ms",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-secondary)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            >
              {sc}
            </button>
          ))}
        </div>

        {/* ── TEAM INFO + CONTROLS ── */}
        <div style={{
          margin: "12px auto 0", width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {customAgents.filter(a => a.active).length} AI specialists · 3 debate rounds
          </span>

          <button onClick={() => setShowAgentCustomizer(!showAgentCustomizer)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--border-secondary)",
            background: "transparent", color: "var(--text-tertiary)",
            fontSize: 10, cursor: "pointer",
          }}>
            <Users size={11} />
            Customize team
            <ChevronDown size={10} style={{
              transform: showAgentCustomizer ? "rotate(180deg)" : "none",
              transition: "transform 200ms",
            }} />
          </button>

          {!compareMode && (
            <button onClick={() => setCompareMode(true)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid var(--border-secondary)",
              background: "transparent", color: "var(--text-tertiary)",
              fontSize: 10, cursor: "pointer",
            }}>
              <Columns size={11} />
              Compare A vs B
            </button>
          )}
        </div>

        {/* ── CUSTOMIZE TEAM (expandable) ── */}
        {showAgentCustomizer && (
          <div style={{ margin: "10px auto 0", width: "100%" }}>
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              border: "1px solid var(--border-secondary)", background: "var(--card-bg)",
            }}>
              <div style={{
                fontSize: 10, color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                marginBottom: 8, textTransform: "uppercase" as const,
              }}>
                Active specialists
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {customAgents.filter(a => a.active).map((agent) => (
                  <button key={agent.id} onClick={() => {
                    setCustomAgents(customAgents.map(a => a.id === agent.id ? { ...a, active: false } : a));
                  }} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 50,
                    background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)",
                    fontSize: 11, color: "var(--text-primary)", cursor: "pointer",
                  }}>
                    {agent.name} <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{"\u2715"}</span>
                  </button>
                ))}
              </div>

              <div style={{
                fontSize: 10, color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                marginBottom: 6, textTransform: "uppercase" as const,
              }}>
                Add specialist
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
          </div>
        )}

        {/* ── DEMO — subtle chip ── */}
        {!isLoggedIn && !demoUsed && (
          <div style={{
            margin: "8px auto 0", width: "100%",
            textAlign: "center",
          }}>
            <button onClick={runDemoSimulation} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 50,
              border: "1px dashed rgba(212,175,55,0.2)",
              background: "transparent",
              color: "var(--text-tertiary)", fontSize: 10,
              cursor: "pointer",
            }}>
              <Play size={10} style={{ color: "var(--accent)" }} />
              See a demo simulation
            </button>
          </div>
        )}

        {/* ── DISCLAIMER ── */}
        <p style={{
          textAlign: "center", fontSize: 10,
          color: "var(--text-tertiary)", opacity: 0.3,
          marginTop: 16, paddingBottom: 20,
        }}>
          Simulations take 60-120s. Always verify with qualified professionals.
        </p>

        </div>

        {/* Paywall modal */}
        {showPaywall && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }} onClick={() => setShowPaywall(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "var(--bg-primary)", borderRadius: 16,
              padding: 32, maxWidth: 400, width: "90%",
              border: "1px solid var(--border-secondary)",
              textAlign: "center",
            }}>
              <Lock size={32} style={{ color: "var(--accent)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                Upgrade to Pro
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                Simulations require a Pro plan. Upgrade to unlock unlimited predictions.
              </p>
              <button onClick={() => { window.location.href = "/pricing"; }} style={{
                padding: "10px 24px", borderRadius: 50,
                background: "var(--accent)", color: "#000",
                fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
              }}>
                View Plans
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  /* ═══ RUNNING STATE — 3 UNIVERSE CANVAS ═══ */
  if (simulating) {
    const progressPct = Math.min(((simStage + 1) / 6) * 100, 100);
    const doneAgents = simLiveAgents.filter(a => a.done).length;
    const elapsed = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
    const risk = calculateRiskScore(simLiveAgents, simAgentMessages);

    // Classify agent messages into 3 universes based on role/category
    const universeA: AgentMessage[] = [];
    const universeB: AgentMessage[] = [];
    const universeC: AgentMessage[] = [];

    simAgentMessages.forEach((msg, i) => {
      const role = (msg.role || msg.agentName || "").toLowerCase();
      const cat = (msg.category || "").toLowerCase();
      if (role.includes("strategy") || role.includes("market") || role.includes("operation") || cat.includes("opportunity")) {
        universeA.push(msg);
      } else if (role.includes("financial") || role.includes("customer") || role.includes("tech") || cat.includes("finance")) {
        universeB.push(msg);
      } else if (role.includes("risk") || role.includes("devil") || role.includes("legal") || cat.includes("risk")) {
        universeC.push(msg);
      } else {
        [universeA, universeB, universeC][i % 3].push(msg);
      }
    });

    const UNIVERSES = [
      { id: "A", label: "UNIVERSE A", subtitle: "OPTIMISTIC", color: "#10B981", glow: "rgba(16,185,129,0.08)", msgs: universeA, probability: Math.max(15, 35 - universeC.length * 2) },
      { id: "B", label: "UNIVERSE B", subtitle: "REALISTIC", color: "#3B82F6", glow: "rgba(59,130,246,0.08)", msgs: universeB, probability: 50 },
      { id: "C", label: "UNIVERSE C", subtitle: "PESSIMISTIC", color: "#F59E0B", glow: "rgba(245,158,11,0.08)", msgs: universeC, probability: Math.min(35, 15 + universeC.length * 2) },
    ];

    // Normalize probabilities to 100%
    const totalProb = UNIVERSES.reduce((s, u) => s + u.probability, 0);
    UNIVERSES.forEach(u => { u.probability = Math.round((u.probability / totalProb) * 100); });

    // Find which universe has majority vote
    const maxMsgs = Math.max(universeA.length, universeB.length, universeC.length);
    const winningUniverse = universeA.length === maxMsgs ? "A" : universeB.length === maxMsgs ? "B" : "C";
    const votePercent = simAgentMessages.length > 0 ? Math.round((maxMsgs / simAgentMessages.length) * 100) : 0;

    const UniverseColumn = ({ u }: { u: typeof UNIVERSES[0] }) => (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        border: `1px solid ${u.color}20`,
        background: u.glow,
        boxShadow: `0 0 40px ${u.color}06, inset 0 1px 0 ${u.color}10`,
        overflow: "hidden",
        minWidth: 0,
        transition: "box-shadow 300ms",
      }}>
        {/* Column header */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: `1px solid ${u.color}15`,
          background: `${u.color}05`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: u.color,
                boxShadow: `0 0 8px ${u.color}60`,
                animation: "skeletonPulse 2s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: u.color, fontFamily: "var(--font-mono)",
              }}>
                {u.label}
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, color: u.color,
              padding: "2px 8px", borderRadius: 50,
              background: `${u.color}15`, fontFamily: "var(--font-mono)",
            }}>
              {u.probability}%
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>
            {u.subtitle}
          </div>

          {/* Mini metrics */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{
              flex: 1, padding: "6px 8px", borderRadius: 8,
              background: `${u.color}08`, border: `1px solid ${u.color}10`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: u.color }}>{u.msgs.length}</div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Reports</div>
            </div>
            <div style={{
              flex: 1, padding: "6px 8px", borderRadius: 8,
              background: `${u.color}08`, border: `1px solid ${u.color}10`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: u.color }}>{risk.score}</div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Risk</div>
            </div>
          </div>
        </div>

        {/* Timeline + Messages feed */}
        <div ref={u.id === "B" ? feedRef : undefined} style={{
          flex: 1, overflowY: "auto", padding: "8px 10px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {u.msgs.length === 0 ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-tertiary)" }}>
                <span className="loading-dots" style={{ transform: "scale(0.6)" }}><span /><span /><span /></span>
                Analyzing...
              </span>
            </div>
          ) : (
            u.msgs.map((msg, i) => {
              const cc = AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR;
              return (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-secondary)",
                  borderLeft: `2px solid ${u.color}40`,
                  animation: "fadeInUp 0.3s ease-out",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: cc.bg, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 600, color: cc.color, flexShrink: 0,
                    }}>
                      {msg.agentName.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.agentName}
                      </div>
                    </div>
                    {msg.round != null && (
                      <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>R{msg.round}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden",
                    maskImage: (msg.content?.length || 0) > 300 ? "linear-gradient(to bottom, black 75%, transparent)" : undefined,
                    WebkitMaskImage: (msg.content?.length || 0) > 300 ? "linear-gradient(to bottom, black 75%, transparent)" : undefined,
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative",
      }}>
        {/* Probability particles */}
        <div className="probability-particles">
          {Array.from({ length: isMobile ? 6 : 12 }, (_, i) => (
            <span key={i} style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${8 + Math.random() * 12}s`,
              animationDelay: `${Math.random() * 5}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              opacity: 0.1 + Math.random() * 0.15,
            }} />
          ))}
        </div>

        {/* Top status bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: isMobile ? "10px 16px" : "10px 24px",
          borderBottom: "1px solid var(--border-secondary)",
          background: "rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}>
          <Zap size={14} style={{ color: "#D4AF37" }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
            color: "#D4AF37", fontFamily: "var(--font-mono)",
          }}>
            SIMULATION RUNNING
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {doneAgents}/{simTotalAgents || "?"} agents · {elapsed}s
          </span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
          }}>
            Stage {simStage + 1}/6
          </span>
          {/* Progress bar */}
          <div style={{
            width: 120, height: 3, borderRadius: 2,
            background: "var(--bg-tertiary)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: "#D4AF37",
              width: `${progressPct}%`,
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>

        {/* 3-Universe Canvas */}
        {isMobile ? (
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "12px 12px 80px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {UNIVERSES.map(u => (
              <UniverseColumn key={u.id} u={u} />
            ))}
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", gap: 12,
            padding: "16px 20px 80px",
            overflow: "hidden",
          }}>
            {UNIVERSES.map(u => (
              <UniverseColumn key={u.id} u={u} />
            ))}
          </div>
        )}

        {/* Footer bar — voting + actions */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: isMobile ? "10px 12px" : "10px 20px",
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border-secondary)",
          flexWrap: "wrap",
          zIndex: 10,
        }}>
          {/* Voting indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 12px", borderRadius: 50,
            background: "rgba(212,175,55,0.06)",
            border: "1px solid rgba(212,175,55,0.12)",
          }}>
            <BarChart3 size={12} style={{ color: "#D4AF37" }} />
            <span style={{ fontSize: 11, color: "#D4AF37", fontWeight: 600 }}>
              {votePercent}% favor Universe {winningUniverse}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Action buttons */}
          {[
            { label: "Live Variable", icon: <Eye size={11} />, onClick: () => setGodEyeOpen(!godEyeOpen) },
            { label: "Compare", icon: <Columns size={11} />, onClick: () => {} },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 50,
              border: "1px solid var(--border-secondary)",
              background: "transparent", color: "var(--text-tertiary)",
              fontSize: 10, cursor: "pointer", transition: "all 150ms",
              whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)"; e.currentTarget.style.color = "#D4AF37"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
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
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "24px 16px 120px" : "24px 24px 120px", position: "relative" }}>
      <div style={{ maxWidth: "clamp(600px, 52vw, 820px)", margin: "0 auto" }}>
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
              <div className={vote.result === "GO" ? "confidence-glow-high" : vote.result === "CAUTION" ? "confidence-glow-medium" : "confidence-glow-low"} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 20px", borderRadius: "var(--radius-md)",
                background: vote.result === "GO" ? "rgba(34,197,94,0.06)"
                  : vote.result === "CAUTION" ? "rgba(245,158,11,0.06)"
                  : "rgba(239,68,68,0.06)",
                border: `1px solid ${vote.result === "GO" ? "rgba(34,197,94,0.15)"
                  : vote.result === "CAUTION" ? "rgba(245,158,11,0.15)"
                  : "rgba(239,68,68,0.15)"}`,
              }}>
                <div className="verdict-container" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div className="verdict-ring" style={{ color: vote.result === "GO" ? "#22c55e" : vote.result === "CAUTION" ? "#f59e0b" : "#ef4444" }} />
                  <div style={{
                    fontSize: 28, fontWeight: 800,
                    color: vote.result === "GO" ? "#22c55e" : vote.result === "CAUTION" ? "#f59e0b" : "#ef4444",
                    fontFamily: "var(--font-brand)", letterSpacing: 2,
                    textShadow: `0 0 20px ${vote.result === "GO" ? "rgba(34,197,94,0.4)" : vote.result === "CAUTION" ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                  }}>
                    {vote.result}
                  </div>
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

            {/* ═══ PARALLEL FUTURES ═══ */}
            {!parallelFutures && !loadingFutures && (
              <button onClick={generateParallelFutures} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 20px", borderRadius: 12, marginTop: 16,
                border: "1px solid rgba(212,175,55,0.2)",
                background: "linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(139,92,246,0.04) 100%)",
                color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 200ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2 C 7 8, 7 16, 12 22"/><path d="M12 2 C 17 8, 17 16, 12 22"/><line x1="2" y1="12" x2="22" y2="12"/>
                </svg>
                Explore parallel futures — see 3 possible outcomes
              </button>
            )}

            {loadingFutures && (
              <div style={{
                display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10,
                marginTop: 16,
              }}>
                {[
                  { color: "#22c55e", label: "Best Case", emoji: "\uD83D\uDFE2" },
                  { color: "#f59e0b", label: "Most Likely", emoji: "\uD83D\uDFE1" },
                  { color: "#ef4444", label: "Worst Case", emoji: "\uD83D\uDD34" },
                ].map((u, i) => (
                  <div key={i} style={{
                    padding: "16px 14px", borderRadius: 12, textAlign: "center",
                    border: `1px solid ${u.color}22`,
                    background: `${u.color}06`,
                    animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{u.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: u.color }}>{u.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>Simulating...</div>
                  </div>
                ))}
              </div>
            )}

            {parallelFutures && (() => {
              const { cleanContent: futuresText, metadata: futuresMeta } = parseSignuxMetadata(parallelFutures);
              return (
                <div style={{ marginTop: 16 }}>
                  {futuresMeta.parallel && (
                    <div style={{
                      display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8,
                      marginBottom: 16, padding: "12px 14px", borderRadius: 12,
                      background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)",
                    }}>
                      {futuresMeta.parallel.universes.map((u: any) => {
                        const colors: Record<string, string> = { A: "#22c55e", B: "#f59e0b", C: "#ef4444" };
                        const color = colors[u.id] || "#888";
                        return (
                          <div key={u.id} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 4 }}>{u.name}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{u.probability}%</div>
                            <div style={{ height: 4, borderRadius: 2, marginTop: 6, background: `${color}15` }}>
                              <div style={{ height: "100%", borderRadius: 2, background: color, width: `${u.probability}%`, transition: "width 800ms ease" }} />
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 4 }}>{u.revenue}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ padding: "16px", borderRadius: 12, border: "1px solid var(--border-secondary)", background: "var(--card-bg)" }}>
                    <MarkdownRenderer content={futuresText} />
                  </div>
                </div>
              );
            })()}

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
