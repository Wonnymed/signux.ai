"use client";
import { useState, useRef, useEffect } from "react";
import {
  Check, AlertTriangle, Download, ChevronDown, ChevronRight,
  FileText, RotateCcw, MessageSquare, BarChart3, Network,
  Globe, Users, Clock, Zap, Search, Shield, Activity, Play,
} from "lucide-react";
import { t } from "../lib/i18n";
import { useIsMobile } from "../lib/useIsMobile";
import MarkdownRenderer from "./MarkdownRenderer";
import type { SimAgent, SimResult } from "../lib/types";
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

type SimulationEngineProps = {
  simulating: boolean;
  simResult: SimResult | null;
  simScenario: string;
  setSimScenario: (v: string) => void;
  simStage: number;
  simLiveAgents: SimAgent[];
  simTotalAgents: number;
  simStartTime: number | null;
  onSimulate: () => void;
  onReset: () => void;
  simStarting: boolean;
  simAgentMessages: AgentMessage[];
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
  const { simulating, simResult, simScenario, setSimScenario, simStage, simLiveAgents, simTotalAgents, simStartTime, onSimulate, onReset, simStarting, simAgentMessages } = props;
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
  const isMobile = useIsMobile();
  const pad = isMobile ? "16px" : "24px";

  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  /* ═══ WELCOME STATE ═══ */
  if (!simResult && !simulating) {
    const scenarios = [
      {
        tag: "LAUNCH", dotColor: "#22c55e",
        title: "Open a coffee franchise in 3 cities",
        fill: "I want to open a specialty coffee franchise in São Paulo, Mexico City, and Miami. $150K initial capital per unit. Need to evaluate real estate, supply chain, licensing, and break-even timeline.",
      },
      {
        tag: "SCALE", dotColor: "#3b82f6",
        title: "Expand my SaaS to the European market",
        fill: "B2B SaaS platform with 2K customers in the US, $80K MRR. Want to expand to EU: pricing strategy, GDPR compliance, local payment methods, hiring first EU team, and go-to-market plan.",
      },
      {
        tag: "OPTIMIZE", dotColor: "#f59e0b",
        title: "Restructure costs for a 200-person company",
        fill: "200-employee company spending $3.2M/year on operations. Need to identify cost reduction opportunities across SaaS tools, office space, vendor contracts, and staffing without impacting quality.",
      },
    ];

    const capabilities = [
      "Multi-agent analysis",
      "Adversarial testing",
      "Quantitative models",
      "Risk scoring",
    ];

    const agentAvatars = [
      { letter: "R", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6" },
      { letter: "F", bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
      { letter: "A", bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
      { letter: "O", bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
      { letter: "M", bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    ];

    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
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

        {/* Ambient glow */}
        <div style={{
          position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)",
          width: 400, height: 200,
          background: "radial-gradient(ellipse, rgba(212,175,55,0.04), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 720, width: "100%", position: "relative", zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeIn 0.4s ease-out" }}>
            {/* Icon ring */}
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", position: "relative",
            }}>
              {/* Outer ring */}
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "1px solid rgba(212,175,55,0.08)",
              }} />
              <Zap size={28} style={{ color: "var(--accent)" }} />
            </div>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 0 }}>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 32 : 42, fontWeight: 700,
                letterSpacing: 8, color: "#fff",
              }}>
                SIMULATE
              </span>
              <span style={{
                fontFamily: "var(--font-brand)", fontSize: isMobile ? 32 : 42, fontWeight: 300,
                letterSpacing: 4, color: "#fff", opacity: 0.3, marginLeft: 8,
              }}>
                ENGINE
              </span>
            </div>

            {/* Subtitle */}
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 3,
              textTransform: "uppercase" as const, color: "rgba(212,175,55,0.6)",
              marginTop: 12,
            }}>
              Operational ecosystem simulation
            </div>

            {/* Divider */}
            <div style={{
              width: 48, height: 1,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              margin: "20px auto 0",
            }} />
          </div>

          {/* ── CAPABILITY STRIP ── */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center",
            gap: isMobile ? 16 : 32, marginBottom: 40,
            animation: "fadeIn 0.5s ease-out",
          }}>
            {capabilities.map(cap => (
              <div key={cap} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent)", opacity: 0.6,
                }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5,
                  textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)",
                }}>
                  {cap}
                </span>
              </div>
            ))}
          </div>

          {/* ── INPUT CONTAINER ── */}
          <div
            style={{
              border: simScenario.trim() ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(212,175,55,0.12)",
              borderRadius: 16,
              background: simScenario.trim() ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
              padding: isMobile ? 16 : 20,
              transition: "all 300ms ease",
              boxShadow: simScenario.trim()
                ? "0 0 30px rgba(212,175,55,0.06), 0 0 60px rgba(212,175,55,0.03)"
                : "none",
              marginBottom: 24,
              animation: "fadeIn 0.5s ease-out",
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(212,175,55,0.06), 0 0 60px rgba(212,175,55,0.03)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onBlur={e => {
              if (!simScenario.trim()) {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.12)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
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
                DESCRIBE YOUR OPERATION
              </span>
            </div>

            <textarea
              value={simScenario}
              onChange={e => setSimScenario(e.target.value)}
              placeholder="I want to set up a trading company in Hong Kong that imports electronics from Shenzhen, sells to Brazil and EU, with crypto treasury management..."
              style={{
                width: "100%", minHeight: 88, padding: 0,
                background: "transparent", border: "none",
                color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6,
                resize: "none", outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          {/* ── SCENARIO CARDS ── */}
          <div style={{ marginBottom: 24, animation: "fadeIn 0.6s ease-out" }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2,
              textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)",
              marginBottom: 12,
            }}>
              QUICK SCENARIOS
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 8,
            }}>
              {scenarios.map(sc => (
                <button
                  key={sc.tag}
                  onClick={() => setSimScenario(sc.fill)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "14px 16px",
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
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderLeftColor = "transparent";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: sc.dotColor,
                    }} />
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                      textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)",
                    }}>
                      {sc.tag}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.4,
                  }}>
                    {sc.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── AGENT PREVIEW STRIP ── */}
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.015)",
            marginBottom: 32,
            gap: isMobile ? 16 : 12,
            animation: "fadeIn 0.7s ease-out",
          }}>
            {/* Left: avatars + text */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {agentAvatars.map((av, i) => (
                  <div key={av.letter} style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: av.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: av.color,
                    border: "2px solid var(--bg-primary)",
                    marginLeft: i > 0 ? -6 : 0,
                    zIndex: 5 - i,
                  }}>
                    {av.letter}
                  </div>
                ))}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.4)",
                  border: "2px solid var(--bg-primary)",
                  marginLeft: -6,
                }}>
                  +10
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>15 specialist agents</span> will analyze your operation
                </div>
                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.25)",
                  fontFamily: "var(--font-mono)", marginTop: 2,
                }}>
                  Regulatory, financial, adversarial, operational, market
                </div>
              </div>
            </div>

            {/* Right: stats */}
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
                  color: "rgba(212,175,55,0.7)",
                }}>
                  3
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                  textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)",
                }}>
                  ROUNDS
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600,
                  color: "rgba(212,175,55,0.7)",
                }}>
                  5
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1,
                  textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)",
                }}>
                  RISK AXES
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA BUTTON ── */}
          <div style={{ textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
            <button
              onClick={onSimulate}
              disabled={!simScenario.trim() || simStarting}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: simScenario.trim() && !simStarting ? "var(--accent)" : "rgba(212,175,55,0.3)",
                color: "#000", border: "none", borderRadius: 50,
                padding: "14px 36px",
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
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />
              ) : (
                <Play size={16} />
              )}
              {simStarting ? "INITIALIZING..." : "RUN SIMULATION"}
            </button>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.2)",
              marginTop: 16,
            }}>
              Simulations take 60-120s. Always verify with qualified professionals.
            </div>
          </div>

        </div>
      </div>
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
                    {isDone && <Check size={11} style={{ color: "#fff" }} />}
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
  const reportText = simResult.report || "";
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
    <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 28, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--text-primary)" }}>
            {t("sim.complete")}
          </div>
          <div style={{ display: "flex", gap: 8, position: "relative" }}>
            <button onClick={onReset} style={{
              fontSize: 13, color: "var(--text-secondary)", background: "transparent",
              border: "1px solid var(--border-primary)", padding: "8px 16px",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
            }}>
              {t("sim.new_simulation")}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setExportOpen(!exportOpen)} style={{
                fontSize: 13, color: "#fff", background: "var(--accent)", border: "none",
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
    </div>
  );
}
