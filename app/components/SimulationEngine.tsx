"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Check, AlertTriangle, Download, ChevronDown, ChevronRight,
  FileText, RotateCcw, MessageSquare, BarChart3, Network,
  Globe, Users, Clock, Zap, Search, Shield, Activity, Play,
  Wand2, Loader2, Eye, X, Share2, Lock, Link2, Paperclip, Columns,
  TrendingUp, TrendingDown, Minus, Save, FileDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import { useEnhance } from "../lib/useEnhance";
import MarkdownRenderer from "./MarkdownRenderer";
import { signuxFetch } from "../lib/api-client";
import type { SimAgent, SimResult, Mode } from "../lib/types";
import RoundTimeline from "./RoundTimeline";
import AgentCard from "./AgentCard";
import EvolutionTracker from "./EvolutionTracker";
import VerdictPanel from "./VerdictPanel";
import { parseSignuxMetadata, type SignuxVote, type SignuxTimelineEvent, type SignuxSentiment, type SignuxSource, type SignuxFollowup } from "../lib/parseMetadata";
import { AGENT_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, ENTITY_COLORS, DEFAULT_ENTITY_COLOR } from "../lib/types";

const SIM_EXAMPLE_KEYS = ["sim.example.1", "sim.example.2", "sim.example.3"];
const SIM_STAGE_KEYS = ["stage.intelligence", "stage.0", "stage.1", "stage.2", "stage.3", "stage.4", "stage.universes", "stage.verdict"];
const SIM_STAGE_ICONS = [Globe, Network, Users, Zap, MessageSquare, FileText, Columns, BarChart3];

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
  streamingUniverses?: (any | null)[];
  streamingVerdict?: any | null;
  // 10x10 Engine props
  engineAgents?: any[];
  engineRounds?: any[];
  engineCurrentRound?: { round: number; label: string; model: string } | null;
  engineVerdict?: any | null;
  engineEvolution?: any[];
  engineDone?: boolean;
  onSaveSimulation?: () => Promise<void>;
  simulationSaved?: boolean;
  simulationUsage?: { used: number; limit: number };
  onLoadDemo?: () => void;
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
  const { simulating, simResult, simScenario, setSimScenario, simStage, simLiveAgents, simTotalAgents, simStartTime, onSimulate, onReset, simStarting, simAgentMessages, onSetMode, lang, isLoggedIn, tier, streamingUniverses, streamingVerdict, engineAgents, engineRounds, engineCurrentRound, engineVerdict, engineEvolution, engineDone, onSaveSimulation, simulationSaved, simulationUsage, onLoadDemo } = props;
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
  const [showAuthGate, setShowAuthGate] = useState(false);

  // 10x10 Canvas state
  const [activeRound, setActiveRound] = useState(1);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  // Auto-advance activeRound when new rounds arrive
  useEffect(() => {
    if (engineRounds && engineRounds.length > 0) {
      setActiveRound(engineRounds.length);
    }
  }, [engineRounds?.length]);

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
  const [compareSnapshot, setCompareSnapshot] = useState<{
    scenario: string; rounds: any[]; verdict: any; evolution: any[];
  } | null>(null);

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
    setIsDemo(true);
    setSimScenario(DEMO_SCENARIO);
    if (onLoadDemo) {
      onLoadDemo();
    } else {
      onSimulate(DEMO_SCENARIO);
    }
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
      if (!isLoggedIn) {
        // Guest: allow 1 free simulation, then show auth gate
        const guestUsed = typeof window !== "undefined" && localStorage.getItem("signux-guest-simulation");
        if (guestUsed) { setShowAuthGate(true); return; }
        if (typeof window !== "undefined") localStorage.setItem("signux-guest-simulation", "true");
      } else if (tier === "free") { setShowPaywall(true); return; }
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
      if (!isLoggedIn) { setShowAuthGate(true); return; }
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

        {/* Compare mode banner */}
        {compareSnapshot && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 10, marginBottom: 12,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
            width: "100%",
          }}>
            <Columns size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6" }}>Comparing with Simulation A</div>
              <div style={{
                fontSize: 10, color: "var(--text-tertiary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
              }}>
                {compareSnapshot.scenario.slice(0, 80)}{compareSnapshot.scenario.length > 80 ? "..." : ""}
              </div>
            </div>
            <button onClick={() => setCompareSnapshot(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-tertiary)", padding: 4, flexShrink: 0,
            }}>
              <X size={14} />
            </button>
          </div>
        )}

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

        {/* Usage counter */}
        {simulationUsage && !compareMode && (
          <div style={{
            display: "flex", justifyContent: "center", marginTop: 8,
          }}>
            <span style={{
              fontSize: 10, color: simulationUsage.used >= simulationUsage.limit ? "#EF4444" : "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}>
              {simulationUsage.used}/{simulationUsage.limit === Infinity ? "∞" : simulationUsage.limit} simulations this month
              {simulationUsage.used >= simulationUsage.limit && (
                <span
                  onClick={() => window.location.href = "/pricing"}
                  style={{ color: "#D4AF37", cursor: "pointer", marginLeft: 6 }}
                >
                  Upgrade →
                </span>
              )}
            </span>
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
            10 AI specialists · 10 debate rounds
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

        {/* ── DEMO — subtle chip (always visible) ── */}
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
            transition: "opacity 200ms",
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <Play size={10} style={{ color: "var(--accent)" }} />
            See a demo simulation
          </button>
        </div>

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
                You've used all your free simulations this month. Upgrade to Pro for 20/month.
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

        {/* Auth gate modal (instead of redirect) */}
        {showAuthGate && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          }} onClick={() => setShowAuthGate(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              maxWidth: 380, padding: "32px 28px", borderRadius: 16,
              background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>&#9889;</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, margin: "0 0 8px" }}>
                Sign up to unlock simulations
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20, lineHeight: 1.5 }}>
                Create a free account to run AI-powered business simulations with 10 expert agents debating your scenario.
              </p>
              <button
                onClick={() => { if (typeof window !== "undefined") window.location.href = "/signup"; }}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  background: "#D4AF37", border: "none", color: "#000",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                Create free account
              </button>
              <button
                onClick={() => setShowAuthGate(false)}
                style={{
                  width: "100%", padding: "10px", borderRadius: 10,
                  background: "transparent", border: "1px solid var(--border-secondary)",
                  color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer",
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  /* ═══ RUNNING STATE — 3 UNIVERSE ANIMATED CANVAS ═══ */
  if (simulating) {
    const progressPct = Math.min(((simStage + 1) / 8) * 100, 100);
    const doneAgents = simLiveAgents.filter(a => a.done).length;
    const elapsed = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
    const risk = calculateRiskScore(simLiveAgents, simAgentMessages);

    // Check if streaming universes have arrived
    const hasStreamingUniverses = streamingUniverses && streamingUniverses.some(u => u !== null);

    // Check if 10x10 engine is active
    const hasEngineData = engineAgents && engineAgents.length > 0;

    const sentimentDotColor = (s: string) =>
      s === "positive" ? "#10B981" : s === "negative" ? "#EF4444" : s === "warning" ? "#F59E0B" : "var(--text-tertiary)";

    const engineSentimentColor = (s: string) => {
      const map: Record<string, string> = {
        confident: "#10B981", optimistic: "#22c55e", excited: "#10B981", convinced: "#10B981",
        cautious: "#F59E0B", neutral: "#6B7280", concerned: "#F59E0B",
        worried: "#EF4444", skeptical: "#EF4444", contrarian: "#EC4899",
      };
      return map[s] || "#6B7280";
    };

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
      { id: "A", label: "UNIVERSE A", subtitle: "OPTIMISTIC", color: "#10B981", glow: "rgba(16,185,129,0.06)", borderGlow: "rgba(16,185,129,0.15)", msgs: universeA, probability: Math.max(15, 35 - universeC.length * 2), trendIcon: TrendingUp, profitDir: "+", riskLabel: "Low" },
      { id: "B", label: "UNIVERSE B", subtitle: "REALISTIC", color: "#3B82F6", glow: "rgba(59,130,246,0.06)", borderGlow: "rgba(59,130,246,0.15)", msgs: universeB, probability: 50, trendIcon: Minus, profitDir: "~", riskLabel: "Medium", featured: true },
      { id: "C", label: "UNIVERSE C", subtitle: "PESSIMISTIC", color: "#F59E0B", glow: "rgba(245,158,11,0.06)", borderGlow: "rgba(245,158,11,0.15)", msgs: universeC, probability: Math.min(35, 15 + universeC.length * 2), trendIcon: TrendingDown, profitDir: "-", riskLabel: "High" },
    ];

    // Normalize probabilities to 100%
    const totalProb = UNIVERSES.reduce((s, u) => s + u.probability, 0);
    UNIVERSES.forEach(u => { u.probability = Math.round((u.probability / totalProb) * 100); });

    // Find which universe has majority vote
    const maxMsgs = Math.max(universeA.length, universeB.length, universeC.length);
    const winningUniverse = universeA.length === maxMsgs ? "A" : universeB.length === maxMsgs ? "B" : "C";
    const votePercent = simAgentMessages.length > 0 ? Math.round((maxMsgs / simAgentMessages.length) * 100) : 0;
    const winningColor = UNIVERSES.find(u => u.id === winningUniverse)?.color || "#D4AF37";

    // Mini sparkline data generation based on message count
    const generateSparkline = (msgs: AgentMessage[], direction: string) => {
      const points = 12;
      const data: number[] = [];
      for (let i = 0; i < points; i++) {
        const base = direction === "+" ? 20 + i * 6 : direction === "-" ? 80 - i * 5 : 45 + Math.sin(i * 0.8) * 15;
        data.push(base + (Math.sin(i * 1.2 + msgs.length) * 10));
      }
      return data;
    };

    // Timeline months for vertical timeline
    const timelineMonths = ["M1", "M3", "M6", "M9", "M12", "M18", "M24"];

    const UniverseColumn = ({ u, index }: { u: typeof UNIVERSES[0]; index: number }) => {
      const TrendIcon = u.trendIcon;
      const sparkData = generateSparkline(u.msgs, u.profitDir);
      const sparkMax = Math.max(...sparkData);
      const sparkMin = Math.min(...sparkData);
      const sparkRange = sparkMax - sparkMin || 1;
      const sparkPath = sparkData.map((v, i) => {
        const x = (i / (sparkData.length - 1)) * 100;
        const y = 100 - ((v - sparkMin) / sparkRange) * 100;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ");

      // Calculate how far along the timeline we are
      const timelineProgress = Math.min(u.msgs.length / 6, 1);

      return (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            border: (u as any).featured ? `2px solid #D4AF37` : `1px solid ${u.color}25`,
            background: `linear-gradient(180deg, ${u.glow} 0%, transparent 60%)`,
            boxShadow: (u as any).featured
              ? `0 0 60px ${u.color}10, 0 0 30px rgba(212,175,55,0.08), inset 0 1px 0 ${u.color}15`
              : `0 0 40px ${u.color}06, inset 0 1px 0 ${u.color}10`,
            overflow: "hidden",
            minWidth: 0,
            position: "relative",
          }}
        >
          {/* Gold ring for featured (Realistic) */}
          {(u as any).featured && (
            <div style={{
              position: "absolute", inset: -1, borderRadius: 17,
              border: "1px solid rgba(212,175,55,0.25)",
              pointerEvents: "none", zIndex: 1,
            }} />
          )}

          {/* Column header */}
          <div style={{
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${u.color}15`,
            background: `${u.color}05`,
            position: "relative",
            zIndex: 2,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: u.color,
                    boxShadow: `0 0 12px ${u.color}80`,
                  }}
                />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  color: u.color, fontFamily: "var(--font-mono)",
                }}>
                  {u.label}
                </span>
              </div>
              <motion.span
                key={u.probability}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontSize: 18, fontWeight: 800, color: u.color,
                  fontFamily: "var(--font-mono)", lineHeight: 1,
                }}
              >
                {u.probability}%
              </motion.span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500, marginBottom: 10 }}>
              {u.subtitle}
            </div>

            {/* Metrics row */}
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{
                flex: 1, padding: "6px 8px", borderRadius: 8,
                background: `${u.color}08`, border: `1px solid ${u.color}12`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <TrendIcon size={10} style={{ color: u.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: u.color }}>{u.profitDir === "+" ? "↑" : u.profitDir === "-" ? "↓" : "→"} P&L</span>
                </div>
                <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Profit</div>
              </div>
              <div style={{
                flex: 1, padding: "6px 8px", borderRadius: 8,
                background: `${u.color}08`, border: `1px solid ${u.color}12`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: u.color }}>{u.msgs.length}</div>
                <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Reports</div>
              </div>
              <div style={{
                flex: 1, padding: "6px 8px", borderRadius: 8,
                background: `${u.color}08`, border: `1px solid ${u.color}12`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: u.color }}>{u.riskLabel}</div>
                <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Risk</div>
              </div>
            </div>

            {/* Mini P&L Sparkline */}
            <div style={{ marginTop: 8, height: 32, position: "relative", overflow: "hidden", borderRadius: 6 }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id={`grad-${u.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={u.color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={u.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${sparkPath} L100,100 L0,100 Z`} fill={`url(#grad-${u.id})`} />
                <path d={sparkPath} fill="none" stroke={u.color} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Vertical Timeline + Agent Messages */}
          <div ref={u.id === "B" ? feedRef : undefined} style={{
            flex: 1, overflowY: "auto", padding: "10px 10px 10px 14px",
            display: "flex", flexDirection: "column", gap: 0,
            position: "relative",
          }}>
            {/* Timeline track */}
            <div style={{
              position: "absolute", left: 18, top: 10, bottom: 10,
              width: 2, background: `${u.color}12`, borderRadius: 1,
              zIndex: 0,
            }}>
              <motion.div
                animate={{ height: `${timelineProgress * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{
                  width: "100%", background: `${u.color}50`, borderRadius: 1,
                }}
              />
            </div>

            {u.msgs.length === 0 ? (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: 20, gap: 12,
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={18} style={{ color: u.color, opacity: 0.5 }} />
                </motion.div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Agents analyzing...
                </span>
                {/* Ghost timeline markers */}
                {timelineMonths.slice(0, 4).map((m, i) => (
                  <motion.div
                    key={m}
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                    style={{
                      width: "80%", height: 24, borderRadius: 6,
                      background: `${u.color}06`, border: `1px solid ${u.color}08`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {u.msgs.map((msg, i) => {
                  const cc = AGENT_CATEGORY_COLORS[msg.category || ""] || DEFAULT_CATEGORY_COLOR;
                  const monthLabel = timelineMonths[Math.min(i, timelineMonths.length - 1)];
                  return (
                    <motion.div
                      key={`${u.id}-${i}`}
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        padding: "10px 12px 10px 24px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-secondary)",
                        borderLeft: `2px solid ${u.color}40`,
                        marginBottom: 6,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        position: "absolute", left: -7, top: 14,
                        width: 10, height: 10, borderRadius: "50%",
                        background: "var(--bg-primary)",
                        border: `2px solid ${u.color}60`,
                        zIndex: 2,
                      }}>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 + 0.2, type: "spring" }}
                          style={{
                            width: 4, height: 4, borderRadius: "50%",
                            background: u.color, margin: "auto",
                            marginTop: 1,
                          }}
                        />
                      </div>

                      {/* Month label */}
                      <div style={{
                        position: "absolute", left: -36, top: 12,
                        fontSize: 8, fontWeight: 700, color: `${u.color}60`,
                        fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                      }}>
                        {monthLabel}
                      </div>

                      {/* Agent header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.08 + 0.1, type: "spring", stiffness: 300 }}
                          style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: cc.bg,
                            border: `1.5px solid ${cc.color}40`,
                            display: "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: cc.color, flexShrink: 0,
                          }}
                        >
                          {msg.agentName.charAt(0)}
                        </motion.div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {msg.agentName}
                          </div>
                        </div>
                        {msg.round != null && (
                          <span style={{
                            fontSize: 8, color: `${u.color}80`, fontFamily: "var(--font-mono)",
                            padding: "1px 5px", borderRadius: 4,
                            background: `${u.color}10`,
                          }}>
                            R{msg.round}
                          </span>
                        )}
                      </div>

                      {/* Message content */}
                      <div style={{
                        fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)",
                        whiteSpace: "pre-wrap", maxHeight: 100, overflow: "hidden",
                        maskImage: (msg.content?.length || 0) > 250 ? "linear-gradient(to bottom, black 70%, transparent)" : undefined,
                        WebkitMaskImage: (msg.content?.length || 0) > 250 ? "linear-gradient(to bottom, black 70%, transparent)" : undefined,
                      }}>
                        {msg.content}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      );
    };

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

        {/* Top status bar — war-room aesthetic */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: isMobile ? "10px 16px" : "12px 24px",
            borderBottom: "1px solid var(--border-secondary)",
            background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)",
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Zap size={14} style={{ color: "#D4AF37" }} />
          </motion.div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            color: "#D4AF37", fontFamily: "var(--font-mono)",
          }}>
            SIMULATION RUNNING
          </span>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "2px 10px", borderRadius: 50,
            background: "rgba(212,175,55,0.06)",
            border: "1px solid rgba(212,175,55,0.12)",
          }}>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {doneAgents}/{simTotalAgents || "?"} agents
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "2px 10px", borderRadius: 50,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-secondary)",
          }}>
            <Clock size={10} style={{ color: "var(--text-tertiary)" }} />
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {elapsed}s
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
          }}>
            Stage {simStage + 1}/8
          </span>
          {/* Animated progress bar */}
          <div style={{
            width: isMobile ? 80 : 140, height: 4, borderRadius: 2,
            background: "var(--bg-tertiary)", overflow: "hidden",
            position: "relative",
          }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg, #D4AF37, #F5D680)",
                position: "relative",
              }}
            />
            {/* Shimmer effect */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: 0, width: "30%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                borderRadius: 2,
              }}
            />
          </div>
        </motion.div>

        {/* 10x10 ENGINE — 4-Zone Canvas */}
        {hasEngineData ? (
          <div style={{
            flex: 1, overflowY: "auto",
            display: "flex", flexDirection: "column",
          }}>
            {/* ZONA 1: Round Timeline */}
            <RoundTimeline
              completedRound={engineRounds?.length || 0}
              activeRound={activeRound}
              setActiveRound={setActiveRound}
              currentRoundLoading={engineCurrentRound}
              isMobile={isMobile}
            />

            {/* Main content area */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: isMobile ? "0 12px 90px" : "0 20px 90px",
            }}>
              <div style={{ maxWidth: 900, margin: "0 auto" }}>

                {/* ZONA 2: Agent Grid — debate of the selected round */}
                {(() => {
                  const currentRoundData = (engineRounds || []).find((r: any) => r.round === activeRound);
                  const currentRoundAgents = currentRoundData?.agents || [];

                  if (currentRoundAgents.length === 0 && !engineCurrentRound) {
                    // No rounds yet — skeleton
                    return (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 10,
                        marginBottom: 16,
                      }}>
                        {Array.from({ length: 10 }, (_, i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.15, 0.3, 0.15] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                            style={{
                              padding: "14px", borderRadius: 12,
                              background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
                              minHeight: 80,
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-tertiary)" }} />
                              <div>
                                <div style={{ width: 80, height: 10, borderRadius: 4, background: "var(--bg-tertiary)", marginBottom: 4 }} />
                                <div style={{ width: 50, height: 8, borderRadius: 4, background: "var(--bg-tertiary)" }} />
                              </div>
                            </div>
                            <div style={{ width: "90%", height: 8, borderRadius: 4, background: "var(--bg-tertiary)", marginBottom: 4 }} />
                            <div style={{ width: "70%", height: 8, borderRadius: 4, background: "var(--bg-tertiary)" }} />
                          </motion.div>
                        ))}
                      </div>
                    );
                  }

                  if (currentRoundAgents.length === 0 && engineCurrentRound) {
                    // Current round is loading — show loading skeleton with agent names
                    return (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 10,
                        marginBottom: 16,
                      }}>
                        {(engineAgents || []).map((ag: any, i: number) => (
                          <motion.div
                            key={ag.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{
                              padding: "12px 14px", borderRadius: 12,
                              background: "var(--card-bg)",
                              border: `1px solid ${ag.color}12`,
                              minHeight: 72,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 18 }}>{ag.avatar}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: ag.color }}>{ag.name}</span>
                              <Loader2 size={10} style={{ marginLeft: "auto", color: ag.color, opacity: 0.5, animation: "spin 1.5s linear infinite" }} />
                            </div>
                            <motion.div
                              animate={{ opacity: [0.1, 0.25, 0.1] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.12 }}
                              style={{ width: "85%", height: 8, borderRadius: 4, background: `${ag.color}15`, marginBottom: 4 }}
                            />
                            <motion.div
                              animate={{ opacity: [0.08, 0.2, 0.08] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.12 + 0.2 }}
                              style={{ width: "60%", height: 8, borderRadius: 4, background: `${ag.color}10` }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 10,
                      marginBottom: 16,
                    }}>
                      {currentRoundAgents.map((agent: any, i: number) => (
                        <AgentCard
                          key={agent.agentId}
                          agent={agent}
                          index={i}
                          expanded={expandedAgent === agent.agentId}
                          onToggle={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* ZONA 3: Evolution Tracker */}
                {engineEvolution && engineEvolution.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <EvolutionTracker
                      evolution={engineEvolution}
                      activeRound={activeRound}
                      onSelectRound={setActiveRound}
                      isMobile={isMobile}
                      compact
                    />
                  </div>
                ) : (engineRounds || []).length >= 2 ? (
                  // Build partial evolution from available rounds
                  <div style={{ marginBottom: 16 }}>
                    <EvolutionTracker
                      evolution={(engineAgents || []).map((ag: any) => ({
                        agentId: ag.id,
                        name: ag.name,
                        avatar: ag.avatar,
                        color: ag.color,
                        arc: (engineRounds || []).map((r: any) => {
                          const agentInRound = (r.agents || []).find((a: any) => a.agentId === ag.id);
                          return {
                            round: r.round,
                            sentiment: agentInRound?.sentiment || "neutral",
                            confidence: agentInRound?.confidence || 5,
                            changedMind: agentInRound?.changedMind || false,
                          };
                        }),
                      }))}
                      activeRound={activeRound}
                      onSelectRound={setActiveRound}
                      isMobile={isMobile}
                      compact
                    />
                  </div>
                ) : null}

                {/* ZONA 4: Verdict Panel — after Round 10 */}
                <AnimatePresence>
                  {engineVerdict && (
                    <div style={{ marginBottom: 16 }}>
                      <VerdictPanel verdict={engineVerdict} isMobile={isMobile} />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : hasStreamingUniverses ? (
          /* Streaming Universe Cards — real data arriving live */
          <div style={{
            flex: 1, overflowY: "auto",
            padding: isMobile ? "12px 12px 90px" : "16px 20px 90px",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: 14, maxWidth: 1200, margin: "0 auto",
            }}>
              {[0, 1, 2].map(idx => {
                const su = streamingUniverses?.[idx];
                const skeletonColors = ["#10B981", "#3B82F6", "#F59E0B"];
                const skeletonLabels = ["Best Case", "Most Likely", "Worst Case"];
                const skeletonSubtitles = ["OPTIMISTIC", "REALISTIC", "PESSIMISTIC"];

                if (!su) {
                  /* Skeleton placeholder */
                  return (
                    <motion.div
                      key={`skeleton-${idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.4 }}
                      style={{
                        borderRadius: 14, overflow: "hidden",
                        border: `1px solid ${skeletonColors[idx]}15`,
                        background: `linear-gradient(180deg, ${skeletonColors[idx]}04 0%, transparent 60%)`,
                        display: "flex", flexDirection: "column",
                        minHeight: 320,
                      }}
                    >
                      <div style={{
                        padding: "14px 16px",
                        borderBottom: `1px solid ${skeletonColors[idx]}10`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <motion.div
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{ width: 10, height: 10, borderRadius: "50%", background: skeletonColors[idx] }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-tertiary)" }}>{skeletonLabels[idx]}</div>
                            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: skeletonColors[idx], fontFamily: "var(--font-mono)" }}>{skeletonSubtitles[idx]}</div>
                          </div>
                        </div>
                        <motion.div
                          animate={{ opacity: [0.2, 0.5, 0.2] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ width: 40, height: 20, borderRadius: 6, background: `${skeletonColors[idx]}15` }}
                        />
                      </div>
                      {/* Skeleton metrics */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border-secondary)" }}>
                        {[0, 1, 2, 3].map(mi => (
                          <div key={mi} style={{ padding: "10px 14px", background: "var(--card-bg)" }}>
                            <motion.div
                              animate={{ opacity: [0.15, 0.3, 0.15] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: mi * 0.15 }}
                              style={{ width: "60%", height: 8, borderRadius: 4, background: "var(--text-tertiary)", marginBottom: 6 }}
                            />
                            <motion.div
                              animate={{ opacity: [0.1, 0.25, 0.1] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: mi * 0.15 + 0.1 }}
                              style={{ width: "40%", height: 14, borderRadius: 4, background: "var(--text-tertiary)" }}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Skeleton timeline */}
                      <div style={{ padding: "14px 16px", flex: 1 }}>
                        {[0, 1, 2].map(ti => (
                          <motion.div
                            key={ti}
                            animate={{ opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: ti * 0.2 }}
                            style={{ width: `${80 - ti * 15}%`, height: 10, borderRadius: 4, background: "var(--text-tertiary)", marginBottom: 10 }}
                          />
                        ))}
                      </div>
                      {/* Generating indicator */}
                      <div style={{
                        padding: "10px 16px", borderTop: "1px solid var(--border-secondary)",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <Loader2 size={12} style={{ color: skeletonColors[idx], animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {idx === 0 ? "Spawning optimistic agents..." : idx === 1 ? "Analyzing realistic scenario..." : "Stress-testing worst case..."}
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                /* Real universe data — slide in */
                return (
                  <motion.div
                    key={`universe-${idx}`}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      borderRadius: 14, overflow: "hidden",
                      border: su.id === "B" ? "2px solid #D4AF3740" : `1px solid ${su.color}20`,
                      background: "var(--card-bg)",
                      boxShadow: su.id === "B" ? "0 0 24px rgba(212,175,55,0.06)" : "none",
                      display: "flex", flexDirection: "column",
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                      borderBottom: `1px solid ${su.color}20`, background: `${su.color}06`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: su.color }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{su.label}</div>
                          <div style={{ fontSize: 9, letterSpacing: "0.15em", color: su.color, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{su.subtitle}</div>
                        </div>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{ fontSize: 22, fontWeight: 800, color: su.color, fontFamily: "var(--font-mono)" }}
                      >
                        {su.probability}%
                      </motion.div>
                    </div>
                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border-secondary)" }}>
                      {[
                        { label: "Revenue", value: su.revenue, color: su.id === "A" ? "#10B981" : su.id === "C" ? "#EF4444" : "var(--text-primary)" },
                        { label: "ROI", value: su.roi, color: su.roi?.startsWith("+") ? "#10B981" : su.roi?.startsWith("-") ? "#EF4444" : "var(--text-primary)" },
                        { label: "Risk", value: su.riskLabel, color: su.riskLabel === "Low" ? "#10B981" : su.riskLabel === "High" ? "#EF4444" : "#F59E0B" },
                        { label: "Timeline", value: su.timeline, color: "var(--text-primary)" },
                      ].map((met, mi) => (
                        <motion.div
                          key={mi}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: mi * 0.08, duration: 0.3 }}
                          style={{ padding: "10px 14px", background: "var(--card-bg)" }}
                        >
                          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{met.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: met.color, fontFamily: "var(--font-mono)" }}>{met.value}</div>
                        </motion.div>
                      ))}
                    </div>
                    {/* Outcome */}
                    {su.outcome && (
                      <div style={{ padding: "12px 16px", borderTop: `1px solid var(--border-secondary)` }}>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{su.outcome}</div>
                      </div>
                    )}
                    {/* Timeline events */}
                    {su.events && su.events.length > 0 && (
                      <div style={{ padding: "10px 16px 14px" }}>
                        <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                          TIMELINE
                        </div>
                        {su.events.slice(0, 4).map((ev: any, ei: number) => (
                          <motion.div
                            key={ei}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ei * 0.1, duration: 0.3 }}
                            style={{ display: "flex", gap: 10, minHeight: 28 }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                                background: sentimentDotColor(ev.sentiment),
                              }} />
                              {ei < Math.min(su.events.length, 4) - 1 && <div style={{ width: 1, flex: 1, background: "var(--border-secondary)", marginTop: 2 }} />}
                            </div>
                            <div style={{ paddingBottom: 6 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{ev.period}</div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{typeof ev.text === "string" ? ev.text.slice(0, 80) : ""}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Streaming Verdict */}
            <AnimatePresence>
              {streamingVerdict && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    maxWidth: 1200, margin: "16px auto 0",
                    padding: "18px 24px", borderRadius: 14,
                    background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                      CROSS-UNIVERSE VERDICT
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      style={{
                        fontSize: 22, fontWeight: 800, fontFamily: "var(--font-brand)", letterSpacing: 2,
                        color: streamingVerdict.result === "GO" ? "#22c55e" : streamingVerdict.result === "CAUTION" ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {streamingVerdict.result}
                    </motion.div>
                  </div>
                  <div style={{ width: 1, height: 36, background: "var(--border-secondary)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{streamingVerdict.viabilityScore?.toFixed(1)}</div>
                    <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>VIAB.</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: streamingVerdict.estimatedROI?.startsWith("-") ? "#EF4444" : "#10B981", fontFamily: "var(--font-mono)" }}>{streamingVerdict.estimatedROI}</div>
                    <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>EST. ROI</div>
                  </div>
                  {streamingVerdict.reasoning && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{streamingVerdict.reasoning}</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : isMobile ? (
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "12px 12px 90px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {UNIVERSES.map((u, i) => (
              <UniverseColumn key={u.id} u={u} index={i} />
            ))}
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", gap: 14,
            padding: "16px 20px 90px",
            overflow: "hidden",
          }}>
            {UNIVERSES.map((u, i) => (
              <UniverseColumn key={u.id} u={u} index={i} />
            ))}
          </div>
        )}

        {/* Footer bar — voting + actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", alignItems: isMobile ? "stretch" : "center",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 6 : 10,
            padding: isMobile ? "10px 12px" : "12px 20px",
            background: "linear-gradient(180deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.95) 100%)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid var(--border-secondary)",
            flexWrap: "wrap",
            zIndex: 10,
          }}
        >
          {/* Voting indicator with animated bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 14px", borderRadius: 50,
            background: `${winningColor}08`,
            border: `1px solid ${winningColor}20`,
          }}>
            <BarChart3 size={13} style={{ color: winningColor }} />
            <span style={{ fontSize: 12, color: winningColor, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {votePercent}%
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              favor Universe {winningUniverse}
            </span>
            {/* Mini vote bar */}
            <div style={{
              width: 60, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.05)", overflow: "hidden",
            }}>
              <motion.div
                animate={{ width: `${votePercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  height: "100%", borderRadius: 2,
                  background: winningColor,
                }}
              />
            </div>
          </div>

          {!isMobile && <div style={{ flex: 1 }} />}

          {/* Action buttons */}
          <div style={{
            display: "flex", gap: isMobile ? 6 : 0,
            flexWrap: "wrap",
            ...(isMobile ? { width: "100%" } : {}),
          }}>
          {[
            { label: isMobile ? "Variable" : "Mudar variável ao vivo", icon: <Eye size={12} />, onClick: () => setGodEyeOpen(!godEyeOpen) },
            { label: isMobile ? "Compare" : "Comparar A vs B", icon: <Columns size={12} />, onClick: () => {
              setCompareSnapshot({
                scenario: simScenario,
                rounds: engineRounds || [],
                verdict: engineVerdict,
                evolution: engineEvolution || [],
              });
              onReset();
            }},
            { label: simulationSaved ? "Saved!" : isMobile ? "Save" : "Salvar Simulação", icon: simulationSaved ? <Check size={12} /> : <Save size={12} />, onClick: () => onSaveSimulation?.(), disabled: simulationSaved },
            { label: isMobile ? "PDF" : "Export PDF", icon: <FileDown size={12} />, onClick: () => {
              import("../lib/exportPdf").then(({ exportSimulationPdf }) => {
                exportSimulationPdf({ scenario: simScenario, rounds: engineRounds || [], verdict: engineVerdict, evolution: engineEvolution || [] });
              });
            }},
          ].map((btn: any, i: number) => (
            <button key={i} onClick={btn.onClick} disabled={btn.disabled} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: isMobile ? "6px 10px" : "7px 16px", borderRadius: 50,
              border: btn.disabled ? "1px solid rgba(16,185,129,0.3)" : i === 1 ? "1px solid rgba(212,175,55,0.3)" : "1px solid var(--border-secondary)",
              background: btn.disabled ? "rgba(16,185,129,0.08)" : i === 1 ? "rgba(212,175,55,0.08)" : "transparent",
              color: btn.disabled ? "#10B981" : i === 1 ? "#D4AF37" : "var(--text-tertiary)",
              fontSize: 11, fontWeight: i === 1 || btn.disabled ? 600 : 400,
              cursor: btn.disabled ? "default" : "pointer", transition: "all 150ms",
              whiteSpace: "nowrap", opacity: btn.disabled ? 0.8 : 1,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)"; e.currentTarget.style.color = "#D4AF37"; e.currentTarget.style.background = "rgba(212,175,55,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = i === 1 ? "rgba(212,175,55,0.3)" : "var(--border-secondary)"; e.currentTarget.style.color = i === 1 ? "#D4AF37" : "var(--text-tertiary)"; e.currentTarget.style.background = i === 1 ? "rgba(212,175,55,0.08)" : "transparent"; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
          </div>
        </motion.div>
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

  /* ═══ COMPARE A vs B RESULT VIEW ═══ */
  if (simResult?.engineData && engineDone && compareSnapshot) {
    const simA = compareSnapshot;
    const simB = { scenario: simScenario, rounds: engineRounds || [], verdict: engineVerdict, evolution: engineEvolution || [] };

    const renderSide = (sim: typeof simA, label: string, color: string, borderColor: string) => {
      const v = sim.verdict || {};
      const isProceed = (v.proceedCount || 0) >= 6;
      return (
        <div style={{
          borderRadius: 12, border: `1px solid ${borderColor}`,
          padding: 16, background: "var(--card-bg)", flex: 1, minWidth: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
          </div>
          <div style={{
            fontSize: 10, color: "var(--text-tertiary)", marginBottom: 10,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
          }}>
            {sim.scenario.slice(0, 60)}{sim.scenario.length > 60 ? "..." : ""}
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)",
            color: isProceed ? "#10B981" : "#EF4444", lineHeight: 1,
          }}>
            {v.proceedCount || 0}-{v.stopCount || 0}
          </div>
          <div style={{ fontSize: 10, color: isProceed ? "#10B981" : "#EF4444", marginBottom: 10 }}>
            {isProceed ? "PROCEED" : "STOP"}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37", fontFamily: "var(--font-mono)" }}>{v.viability || 0}/10</div>
              <div style={{ fontSize: 8, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>VIABILITY</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{v.avgConfidence || 0}</div>
              <div style={{ fontSize: 8, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>AVG CONF</div>
            </div>
            {v.estimatedROI && v.estimatedROI !== "N/A" && (
              <div>
                <div style={{
                  fontSize: 18, fontWeight: 800, fontFamily: "var(--font-mono)",
                  color: v.estimatedROI.startsWith("-") ? "#EF4444" : "#10B981",
                }}>{v.estimatedROI}</div>
                <div style={{ fontSize: 8, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>EST. ROI</div>
              </div>
            )}
          </div>
          {v.verdict && (
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 10px" }}>
              {v.verdict}
            </p>
          )}
          {v.patterns && v.patterns.length > 0 && (
            <div>
              <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Patterns</div>
              {v.patterns.slice(0, 4).map((p: any, i: number) => (
                <div key={i} style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 3, lineHeight: 1.4 }}>
                  • {p.title}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    // Compute diffs
    const diffs: { label: string; a: string; b: string; winner: "A" | "B" | "tie" }[] = [];
    const va = simA.verdict || {};
    const vb = simB.verdict || {};
    if (va.viability !== vb.viability) {
      diffs.push({ label: "Viability", a: `${va.viability || 0}/10`, b: `${vb.viability || 0}/10`, winner: (va.viability || 0) > (vb.viability || 0) ? "A" : "B" });
    }
    if (va.proceedCount !== vb.proceedCount) {
      diffs.push({ label: "Votes", a: `${va.proceedCount || 0}-${va.stopCount || 0}`, b: `${vb.proceedCount || 0}-${vb.stopCount || 0}`, winner: (va.proceedCount || 0) > (vb.proceedCount || 0) ? "A" : "B" });
    }
    if (va.avgConfidence !== vb.avgConfidence) {
      diffs.push({ label: "Avg Confidence", a: `${va.avgConfidence || 0}`, b: `${vb.avgConfidence || 0}`, winner: (va.avgConfidence || 0) > (vb.avgConfidence || 0) ? "A" : "B" });
    }
    if (va.estimatedROI !== vb.estimatedROI) {
      diffs.push({ label: "Est. ROI", a: va.estimatedROI || "N/A", b: vb.estimatedROI || "N/A", winner: "tie" });
    }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: isMobile ? "16px 16px 0" : "20px 24px 0",
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-brand)", letterSpacing: 1 }}>
              Compare A vs B
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              Side-by-side analysis of two simulation outcomes
            </div>
          </div>
          <button onClick={() => { setCompareSnapshot(null); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 16px", borderRadius: 50,
            border: "1px solid var(--border-secondary)", background: "transparent",
            color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer",
          }}>
            <RotateCcw size={12} /> New simulation
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: isMobile ? 16 : 24,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Side by side */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 16,
          }}>
            {renderSide(simA, "Simulation A", "#D4AF37", "rgba(212,175,55,0.2)")}
            {renderSide(simB, "Simulation B", "#3B82F6", "rgba(59,130,246,0.2)")}
          </div>

          {/* Key Differences */}
          {diffs.length > 0 && (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
            }}>
              <div style={{
                fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)",
                textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10,
              }}>
                Key Differences
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {diffs.map((d, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", width: 100 }}>{d.label}</span>
                    <span style={{
                      fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, width: 60,
                      color: d.winner === "A" ? "#D4AF37" : "var(--text-secondary)",
                    }}>{d.a}</span>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>vs</span>
                    <span style={{
                      fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, width: 60,
                      color: d.winner === "B" ? "#3B82F6" : "var(--text-secondary)",
                    }}>{d.b}</span>
                    {d.winner !== "tie" && (
                      <span style={{
                        fontSize: 8, padding: "1px 6px", borderRadius: 3, fontWeight: 700, marginLeft: "auto",
                        background: d.winner === "A" ? "rgba(212,175,55,0.1)" : "rgba(59,130,246,0.1)",
                        color: d.winner === "A" ? "#D4AF37" : "#3B82F6",
                      }}>
                        {d.winner} WINS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dissent comparison */}
          {(va.dissents?.length > 0 || vb.dissents?.length > 0) && (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 16,
            }}>
              {[{ v: va, label: "A", color: "#D4AF37" }, { v: vb, label: "B", color: "#3B82F6" }].map(({ v: sv, label, color }) => (
                <div key={label} style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.08)",
                }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color, marginBottom: 6, letterSpacing: 0.5 }}>
                    DISSENTS — {label}
                  </div>
                  {(sv.dissents || []).map((d: any, i: number) => (
                    <div key={i} style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4, lineHeight: 1.4 }}>
                      {d.avatar} <strong>{d.agent}:</strong> &ldquo;{d.note}&rdquo;
                    </div>
                  ))}
                  {(!sv.dissents || sv.dissents.length === 0) && (
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic" }}>No dissents</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ 10x10 ENGINE RESULT STATE ═══ */
  if (simResult?.engineData && engineDone) {
    const duration = simStartTime ? Math.floor((Date.now() - simStartTime) / 1000) : 0;
    const meta = simResult.metadata || {};

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: isMobile ? "16px 16px 0" : "20px 24px 0",
          flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-brand)", letterSpacing: 1 }}>
              {t("sim.complete")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              {meta.agents_count} agents · {meta.rounds} rounds · {meta.total_interactions} interactions · {duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setGodEyeOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: isMobile ? "6px 12px" : "8px 18px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--mode-sim-border)",
              background: "var(--mode-sim-bg)", color: "var(--mode-sim)",
              fontSize: isMobile ? 11 : 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}>
              <Eye size={isMobile ? 12 : 14} /> What if?
            </button>
            <button onClick={onReset} style={{
              fontSize: isMobile ? 11 : 13, color: "var(--text-secondary)", background: "transparent",
              border: "1px solid var(--border-primary)", padding: isMobile ? "6px 12px" : "8px 16px",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
            }}>
              {t("sim.new_simulation")}
            </button>
          </div>
        </div>

        {/* ZONA 1: Round Timeline */}
        <RoundTimeline
          completedRound={engineRounds?.length || 0}
          activeRound={activeRound}
          setActiveRound={setActiveRound}
          isMobile={isMobile}
        />

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: isMobile ? "0 12px 120px" : "0 24px 120px",
        }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* ZONA 4: Verdict Panel */}
          {engineVerdict && (
            <div style={{ marginBottom: 20 }}>
              <VerdictPanel verdict={engineVerdict} isMobile={isMobile} />
            </div>
          )}

          {/* ZONA 2: Agent Grid — browseable by round */}
          {(() => {
            const currentRoundData = (engineRounds || []).find((r: any) => r.round === activeRound);
            const currentRoundAgents = currentRoundData?.agents || [];
            if (currentRoundAgents.length === 0) return null;
            return (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
                marginBottom: 20,
              }}>
                {currentRoundAgents.map((agent: any, i: number) => (
                  <AgentCard
                    key={agent.agentId}
                    agent={agent}
                    index={i}
                    expanded={expandedAgent === agent.agentId}
                    onToggle={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
                  />
                ))}
              </div>
            );
          })()}

          {/* ZONA 3: Evolution */}
          {engineEvolution && engineEvolution.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <EvolutionTracker
                evolution={engineEvolution}
                activeRound={activeRound}
                onSelectRound={setActiveRound}
                onAgentClick={(id) => setExpandedAgent(id)}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* Full debate transcript — collapsible */}
          {engineRounds && engineRounds.length > 0 && (
            <div style={{
              padding: "16px 20px", borderRadius: 12, marginBottom: 20,
              background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
            }}>
              <div style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)", textTransform: "uppercase" as const,
                letterSpacing: 1, marginBottom: 12,
              }}>
                Full Debate Transcript
              </div>
              {engineRounds.map((round: any) => {
                const isCollapsed = collapsedSections[`er-${round.round}`] !== false;
                return (
                  <div key={round.round} style={{ marginBottom: 4 }}>
                    <button
                      onClick={() => toggleSection(`er-${round.round}`)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 0", background: "none", border: "none",
                        cursor: "pointer", color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border-secondary)",
                      }}
                    >
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: round.round <= 5 ? "#3B82F6" : "#8B5CF6",
                        fontFamily: "var(--font-mono)",
                      }}>Round {round.round}</span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{round.label}</span>
                    </button>
                    {!isCollapsed && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 8, padding: "10px 0",
                      }}>
                        {(round.agents || []).map((agent: any, ai: number) => (
                          <AgentCard
                            key={agent.agentId}
                            agent={agent}
                            index={ai}
                            expanded={expandedAgent === `t-${round.round}-${agent.agentId}`}
                            onToggle={() => setExpandedAgent(expandedAgent === `t-${round.round}-${agent.agentId}` ? null : `t-${round.round}-${agent.agentId}`)}
                            isMobile={isMobile}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Variable Editor for re-simulation */}
          <div style={{
            padding: "16px 20px", borderRadius: 12,
            background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
          }}>
            <div style={{
              fontSize: 10, fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)", textTransform: "uppercase" as const,
              letterSpacing: 1, marginBottom: 10,
            }}>
              Re-simulate with changes
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Change a variable... e.g. 'Budget doubled' or 'Competitor launches first'"
                value={whatIfInput}
                onChange={e => setWhatIfInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && whatIfInput.trim()) handleWhatIf(whatIfInput); }}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)",
                  color: "var(--text-primary)", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={() => { if (whatIfInput.trim()) handleWhatIf(whatIfInput); }}
                disabled={!whatIfInput.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 8,
                  background: whatIfInput.trim() ? "var(--accent)" : "rgba(255,255,255,0.05)",
                  color: whatIfInput.trim() ? "#000" : "var(--text-tertiary)",
                  fontSize: 13, fontWeight: 600, border: "none",
                  cursor: whatIfInput.trim() ? "pointer" : "default",
                }}
              >
                <Zap size={14} /> Re-simulate
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Budget doubled", "Timeline cut in half", "Competitor launches first", "Market downturn 20%"].map(chip => (
                <button key={chip} onClick={() => handleWhatIf(chip)} style={{
                  padding: "5px 12px", borderRadius: 50, fontSize: 11,
                  background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)",
                  color: "#D4AF37", cursor: "pointer",
                }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>

          </div>
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

  // Use real backend universe data if available, fallback to derived data
  const backendUniverses = simResult.universes;
  const backendVerdict = simResult.verdict;

  const goVotes = backendVerdict?.goVotes || vote?.go || 2;
  const cautionVotes = backendVerdict?.cautionVotes || vote?.caution || 3;
  const stopVotes = backendVerdict?.stopVotes || vote?.stop || 1;
  const totalVoteCount = goVotes + cautionVotes + stopVotes;
  const viabilityScore = backendVerdict?.viabilityScore?.toFixed(1) || (vote?.confidence_avg ? (vote.confidence_avg / 10).toFixed(1) : "7.0");
  const verdictResult = backendVerdict?.result || vote?.result || "CAUTION";
  const verdictConfidence = backendVerdict?.confidence || vote?.confidence_avg || 50;
  const estimatedROI = backendVerdict?.estimatedROI || `+${Math.round((goVotes / totalVoteCount) * 100)}%`;
  const verdictReasoning = backendVerdict?.reasoning || "";
  const steerTowardA = backendVerdict?.steerTowardA || [];
  const avoidC = backendVerdict?.avoidC || [];

  const AGENT_EMOJI: Record<string, string> = {
    strategy: "\uD83C\uDFAF", market: "\uD83D\uDCC8", financial: "\uD83D\uDCCA", finance: "\uD83D\uDCCA",
    risk: "\u26A0\uFE0F", devil: "\uD83D\uDC79", operations: "\u2699\uFE0F", operation: "\u2699\uFE0F",
    legal: "\u2696\uFE0F", lawyer: "\u2696\uFE0F", tech: "\uD83D\uDCBB", customer: "\uD83D\uDC64",
  };
  const getEmoji = (name: string, role?: string) => {
    const lower = (role || name || "").toLowerCase();
    for (const [key, emoji] of Object.entries(AGENT_EMOJI)) {
      if (lower.includes(key)) return emoji;
    }
    return "\uD83E\uDD16";
  };

  const sentimentDotColor = (s: string) =>
    s === "positive" ? "#10B981" : s === "negative" ? "#EF4444" : s === "warning" ? "#F59E0B" : "var(--text-tertiary)";

  // Build resultUniverses from backend data or fallback to derived
  const resultUniverses = backendUniverses && backendUniverses.length === 3
    ? backendUniverses.map((u, i) => ({
        ...u,
        featured: u.id === "B",
        msgs: simulation.filter((_: any, idx: number) => idx % 3 === i),
      }))
    : (() => {
        // Fallback: derive from agent messages
        const resultUniA: any[] = [];
        const resultUniB: any[] = [];
        const resultUniC: any[] = [];
        simulation.forEach((msg: any, i: number) => {
          const role = (msg.role || msg.agentName || "").toLowerCase();
          const cat = (msg.category || "").toLowerCase();
          if (role.includes("strategy") || role.includes("market") || role.includes("operation") || cat.includes("opportunity")) resultUniA.push(msg);
          else if (role.includes("financial") || role.includes("customer") || role.includes("tech") || cat.includes("finance")) resultUniB.push(msg);
          else if (role.includes("risk") || role.includes("devil") || role.includes("legal") || cat.includes("risk")) resultUniC.push(msg);
          else [resultUniA, resultUniB, resultUniC][i % 3].push(msg);
        });
        return [
          {
            id: "A", label: "Best Case", subtitle: "OPTIMISTIC", color: "#10B981",
            probability: Math.round((goVotes / totalVoteCount) * 100),
            riskLabel: "Low", revenue: "High", roi: "+120%", timeline: "6 mo",
            outcome: "", trigger: "", events: reportTimeline.filter((_: any, i: number) => i % 3 === 0).slice(0, 4).map((e: any) => ({ period: e.period, text: e.event, sentiment: (e.probability || 0) >= 0.5 ? "positive" : "neutral" })),
            keyInsights: [], agentQuotes: [], msgs: resultUniA,
          },
          {
            id: "B", label: "Most Likely", subtitle: "REALISTIC", color: "#3B82F6", featured: true,
            probability: Math.round((cautionVotes / totalVoteCount) * 100),
            riskLabel: "Medium", revenue: "Moderate", roi: "+45%", timeline: "9 mo",
            outcome: "", trigger: "", events: reportTimeline.filter((_: any, i: number) => i % 3 === 1).slice(0, 4).map((e: any) => ({ period: e.period, text: e.event, sentiment: "neutral" })),
            keyInsights: [], agentQuotes: [], msgs: resultUniB,
          },
          {
            id: "C", label: "Worst Case", subtitle: "PESSIMISTIC", color: "#F59E0B",
            probability: Math.round((stopVotes / totalVoteCount) * 100),
            riskLabel: "High", revenue: "Low", roi: "-15%", timeline: "12 mo",
            outcome: "", trigger: "", events: reportTimeline.filter((_: any, i: number) => i % 3 === 2).slice(0, 4).map((e: any) => ({ period: e.period, text: e.event, sentiment: (e.probability || 0) < 0.3 ? "negative" : "warning" })),
            keyInsights: [], agentQuotes: [], msgs: resultUniC,
          },
        ];
      })();

  const winResultUni = resultUniverses.reduce((a: any, b: any) => a.probability > b.probability ? a : b);
  const [showFullReport, setShowFullReport] = useState(false);

  return (
    <>
    {/* ═══════ WIDE CANVAS — 3 UNIVERSE COLUMNS ═══════ */}
    <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "24px 12px 120px" : "24px 24px 120px", position: "relative" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Top bar ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 24, flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-brand)", letterSpacing: 1 }}>
              {t("sim.complete")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              {meta.agents_count} agents {"\u00B7"} {meta.rounds} rounds {"\u00B7"} {meta.total_interactions} interactions {"\u00B7"} {duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

        {/* ── 3 Universe Columns ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 16, marginBottom: 28,
        }}>
          {resultUniverses.map((uni: any, uIdx: number) => {
            const lastMsgs = (uni.agentQuotes && uni.agentQuotes.length > 0)
              ? uni.agentQuotes.map((q: any) => ({ agentName: q.agent, role: q.role, content: q.quote }))
              : (uni.msgs || []).slice(-3);
            const m = { revenue: uni.revenue || "N/A", roi: uni.roi || "N/A", timeline: uni.timeline || "N/A" };
            const favorCount = uni.id === "A" ? goVotes : uni.id === "C" ? stopVotes : cautionVotes;
            return (
              <motion.div
                key={uni.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: uIdx * 0.12, duration: 0.45 }}
                style={{
                  borderRadius: 14, overflow: "hidden",
                  border: uni.featured ? "2px solid #D4AF3740" : "1px solid var(--border-secondary)",
                  background: "var(--card-bg)",
                  boxShadow: uni.featured ? "0 0 24px rgba(212,175,55,0.06)" : "none",
                  display: "flex", flexDirection: "column",
                }}
              >
                {/* Universe header */}
                <div style={{
                  padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: `1px solid ${uni.color}20`,
                  background: `${uni.color}06`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: uni.color }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{uni.label}</div>
                      <div style={{ fontSize: 9, letterSpacing: "0.15em", color: uni.color, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{uni.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: uni.color, fontFamily: "var(--font-mono)" }}>
                    {uni.probability}%
                  </div>
                </div>

                {/* 2x2 metrics */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
                  background: "var(--border-secondary)",
                }}>
                  {[
                    { label: "Revenue", value: m.revenue, color: uni.id === "A" ? "#10B981" : uni.id === "C" ? "#EF4444" : "var(--text-primary)" },
                    { label: "ROI", value: m.roi, color: m.roi.startsWith("+") ? "#10B981" : m.roi.startsWith("-") ? "#EF4444" : "var(--text-primary)" },
                    { label: "Risk", value: uni.riskLabel, color: uni.riskLabel === "Low" ? "#10B981" : uni.riskLabel === "High" ? "#EF4444" : "#F59E0B" },
                    { label: "Timeline", value: m.timeline, color: "var(--text-primary)" },
                  ].map((met, mi) => (
                    <div key={mi} style={{ padding: "10px 14px", background: "var(--card-bg)" }}>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{met.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: met.color, fontFamily: "var(--font-mono)" }}>{met.value}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                {uni.events.length > 0 && (
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                      TIMELINE
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {uni.events.map((ev: any, ei: number) => (
                        <div key={ei} style={{ display: "flex", gap: 10, minHeight: 36 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sentimentDotColor(ev.sentiment), flexShrink: 0, marginTop: 3 }} />
                            {ei < uni.events.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border-secondary)", marginTop: 2 }} />}
                          </div>
                          <div style={{ paddingBottom: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{ev.period}</div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{typeof ev.text === "string" ? ev.text.slice(0, 80) : ""}{typeof ev.text === "string" && ev.text.length > 80 ? "..." : ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Debate */}
                {lastMsgs.length > 0 && (
                  <div style={{ padding: "0 16px 14px" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                      AGENT DEBATE
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {lastMsgs.map((msg: any, mi: number) => (
                        <div key={mi} style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, display: "flex", gap: 6 }}>
                          <span style={{ flexShrink: 0 }}>{getEmoji(msg.agentName, msg.role)}</span>
                          <span><strong style={{ color: "var(--text-primary)" }}>{msg.agentName}:</strong> {"\u201C"}{typeof msg.content === "string" ? msg.content.slice(0, 90) : ""}{typeof msg.content === "string" && msg.content.length > 90 ? "..." : ""}{"\u201D"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vote count + mini bar */}
                <div style={{
                  padding: "10px 16px", borderTop: "1px solid var(--border-secondary)",
                  display: "flex", alignItems: "center", gap: 10, marginTop: "auto",
                }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {favorCount}/{totalVoteCount} agents
                  </div>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--bg-tertiary)" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: uni.color,
                      width: `${Math.round((favorCount / totalVoteCount) * 100)}%`, transition: "width 600ms ease",
                    }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Verdict Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          style={{
            padding: "18px 24px", borderRadius: 14, marginBottom: 28,
            background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
              AGENT CONSENSUS
            </div>
            <div style={{
              fontSize: 22, fontWeight: 800, fontFamily: "var(--font-brand)", letterSpacing: 2,
              color: verdictResult === "GO" ? "#22c55e" : verdictResult === "CAUTION" ? "#f59e0b" : verdictResult === "STOP" ? "#ef4444" : "var(--text-primary)",
            }}>
              {verdictResult}
            </div>
          </div>

          <div style={{ width: 1, height: 36, background: "var(--border-secondary)" }} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{viabilityScore}</div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>VIAB.</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: estimatedROI.startsWith("-") ? "#EF4444" : "#10B981", fontFamily: "var(--font-mono)" }}>{estimatedROI}</div>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>EST. ROI</div>
          </div>

          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Agent votes</span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{winResultUni.probability}% favor {"\u201C"}{winResultUni.label}{"\u201D"}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--bg-tertiary)", display: "flex", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#10B981", width: `${resultUniverses[0].probability}%`, transition: "width 600ms" }} />
              <div style={{ height: "100%", background: "#3B82F6", width: `${resultUniverses[1].probability}%`, transition: "width 600ms" }} />
              <div style={{ height: "100%", background: "#F59E0B", width: `${resultUniverses[2].probability}%`, transition: "width 600ms" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 9, color: "#10B981" }}>{goVotes} GO</span>
              <span style={{ fontSize: 9, color: "#3B82F6" }}>{cautionVotes} CAUTION</span>
              <span style={{ fontSize: 9, color: "#F59E0B" }}>{stopVotes} STOP</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Verdict Reasoning + Strategy ── */}
      {(verdictReasoning || steerTowardA.length > 0 || avoidC.length > 0) && (
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : verdictReasoning ? "1fr 1fr 1fr" : "1fr 1fr",
              gap: 16, marginBottom: 28,
            }}
          >
            {verdictReasoning && (
              <div style={{
                padding: "18px 20px", borderRadius: 14,
                background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--text-tertiary)", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                  VERDICT REASONING
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {verdictReasoning}
                </p>
              </div>
            )}
            {steerTowardA.length > 0 && (
              <div style={{
                padding: "18px 20px", borderRadius: 14,
                background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.12)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#10B981", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                  HOW TO STEER TOWARD BEST CASE
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {steerTowardA.map((action: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", gap: 8 }}>
                      <span style={{ color: "#10B981", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {avoidC.length > 0 && (
              <div style={{
                padding: "18px 20px", borderRadius: 14,
                background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.12)",
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#F59E0B", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                  HOW TO AVOID WORST CASE
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {avoidC.map((safeguard: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, display: "flex", gap: 8 }}>
                      <span style={{ color: "#F59E0B", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{safeguard}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Variable Editor — Re-simulate with changes ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto 24px" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          style={{
            padding: "20px 24px", borderRadius: 14,
            background: "var(--card-bg)", border: "1px solid var(--border-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Zap size={14} style={{ color: "#D4AF37" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Change a variable</span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              — Modify any variable and see how all 3 universes react
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder='e.g. "What if the budget was $500K instead?"'
              value={whatIfInput}
              onChange={e => setWhatIfInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && whatIfInput.trim()) handleWhatIf(whatIfInput); }}
              style={{
                flex: 1, minWidth: 200, padding: "11px 16px", borderRadius: 10,
                border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: 13, outline: "none",
                fontFamily: "var(--font-sans)",
                transition: "border-color 200ms, box-shadow 200ms",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.06)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <button
              onClick={() => { if (whatIfInput.trim()) handleWhatIf(whatIfInput); }}
              disabled={!whatIfInput.trim()}
              style={{
                padding: "11px 22px", borderRadius: 10,
                background: whatIfInput.trim() ? "#D4AF37" : "var(--bg-tertiary)",
                color: whatIfInput.trim() ? "#000" : "var(--text-tertiary)",
                border: "none", fontSize: 13, fontWeight: 700, cursor: whatIfInput.trim() ? "pointer" : "default",
                fontFamily: "var(--font-brand)", letterSpacing: 0.5,
                transition: "all 200ms",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Zap size={13} /> Re-simulate
            </button>
          </div>
          {/* Quick variable suggestions from the scenario */}
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {[
              "Budget doubled",
              "Timeline cut in half",
              "Competitor launches first",
              "Market downturn 20%",
            ].map((suggestion, si) => (
              <button
                key={si}
                onClick={() => setWhatIfInput(suggestion)}
                style={{
                  padding: "4px 12px", borderRadius: 50,
                  border: "1px solid var(--border-secondary)",
                  background: "transparent", color: "var(--text-tertiary)",
                  fontSize: 10, cursor: "pointer", transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)"; e.currentTarget.style.color = "#D4AF37"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-secondary)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════ NORMAL WIDTH CONTAINER ═══════ */}
      <div style={{ maxWidth: "clamp(600px, 52vw, 820px)", margin: "0 auto" }}>

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

        {/* Collapsible Full Report */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <button
            onClick={() => setShowFullReport(!showFullReport)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "14px 20px", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: "var(--text-primary)", transition: "all 150ms",
            }}
          >
            {showFullReport ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>{showFullReport ? "Hide" : "Show"} Full Report</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Report {"\u00B7"} Simulation {"\u00B7"} Graph
            </span>
          </button>
          {showFullReport && (
            <div style={{ marginTop: 12 }}>
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
      </div>

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
    </>
  );
}
