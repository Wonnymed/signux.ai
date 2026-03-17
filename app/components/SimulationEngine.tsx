"use client";
import { useState } from "react";
import {
  Check, AlertTriangle, Download, ChevronDown, ChevronRight,
  FileText, RotateCcw, MessageSquare, BarChart3, Network,
  Globe, Users, Clock, Zap, Search,
} from "lucide-react";
import { t } from "../lib/i18n";
import MarkdownRenderer from "./MarkdownRenderer";
import type { SimAgent, SimResult } from "../lib/types";
import { AGENT_CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, ENTITY_COLORS, DEFAULT_ENTITY_COLOR } from "../lib/types";

const SIM_EXAMPLE_KEYS = ["sim.example.1", "sim.example.2", "sim.example.3"];
const SIM_STAGE_KEYS = ["stage.intelligence", "stage.0", "stage.1", "stage.2", "stage.3", "stage.4"];
const SIM_STAGE_ICONS = [Globe, Network, Users, Zap, MessageSquare, FileText];

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
};

export default function SimulationEngine(props: SimulationEngineProps) {
  const { simulating, simResult, simScenario, setSimScenario, simStage, simLiveAgents, simTotalAgents, simStartTime, onSimulate, onReset, simStarting } = props;

  const [resultTab, setResultTab] = useState<"report" | "simulation" | "graph">("report");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  /* ═══ WELCOME STATE ═══ */
  if (!simResult && !simulating) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: 680, width: "100%", textAlign: "center" }}>
          {/* Title */}
          <div style={{
            fontSize: 24, fontWeight: 500, color: "var(--text-primary)",
            marginBottom: 8, animation: "fadeIn 0.4s ease-out",
          }}>
            {t("sim.ecosystem_title")}
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6,
            marginBottom: 40, maxWidth: 480, margin: "0 auto 40px",
          }}>
            {t("sim.ecosystem_subtitle")}
          </div>

          {/* Textarea — larger */}
          <textarea
            value={simScenario}
            onChange={e => setSimScenario(e.target.value)}
            placeholder={t("sim.placeholder")}
            style={{
              width: "100%", minHeight: 120, padding: 20,
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-input)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6,
              resize: "vertical", outline: "none", transition: "border-color 0.2s",
              marginBottom: 16,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--text-tertiary)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border-primary)")}
          />

          {/* Example chips */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            justifyContent: "center", marginBottom: 24,
          }}>
            {SIM_EXAMPLE_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setSimScenario(t(key))}
                className="suggestion-chip"
                style={{
                  padding: "8px 16px", borderRadius: "var(--radius-xl)",
                  background: "transparent", border: "1px solid var(--border-secondary)",
                  fontSize: 13, color: "var(--text-secondary)",
                  cursor: "pointer", transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {/* Start button — full width */}
          <button
            onClick={onSimulate}
            disabled={!simScenario.trim() || simStarting}
            style={{
              width: "100%", padding: 14, borderRadius: "var(--radius-md)",
              background: simScenario.trim() && !simStarting ? "var(--accent)" : "var(--border-primary)",
              color: simScenario.trim() && !simStarting ? "#fff" : "var(--text-tertiary)",
              fontSize: 15, fontWeight: 600, border: "none",
              cursor: simScenario.trim() && !simStarting ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {simStarting && <span className="spinner spinner-white" />}
            {simStarting ? t("sim.starting") : t("sim.start")}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ RUNNING STATE ═══ */
  if (simulating) {
    const progressPct = Math.min(((simStage + 1) / 6) * 100, 100);
    const doneAgents = simLiveAgents.filter(a => a.done).length;

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Linear progress bar */}
          <div style={{
            width: "100%", height: 3, background: "var(--bg-tertiary)",
            borderRadius: 2, marginBottom: 40, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", background: "var(--accent)",
              borderRadius: 2, transition: "width 0.8s ease",
              width: `${progressPct}%`,
            }} />
          </div>

          {/* Stages list */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
            {SIM_STAGE_KEYS.map((key, idx) => {
              const isDone = idx < simStage;
              const isCurrent = idx === simStage;
              return (
                <div key={key} style={{ display: "flex", gap: 14, paddingBottom: idx < 5 ? 0 : 0 }}>
                  {/* Dot column */}
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
                        width: 1, flex: 1, minHeight: 24,
                        background: isDone ? "var(--success)" : "var(--border-secondary)",
                        opacity: isDone ? 0.3 : 1,
                        transition: "background 0.3s",
                      }} />
                    )}
                  </div>
                  {/* Label */}
                  <div style={{ paddingBottom: 20, paddingTop: 1 }}>
                    <span style={{
                      fontSize: 14,
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

          {/* Agent counter */}
          {simTotalAgents > 0 && (
            <div style={{
              fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)",
              marginBottom: 16, animation: "fadeIn 0.3s ease",
            }}>
              {t("sim.agent_progress", { current: String(doneAgents), total: String(simTotalAgents) })}
            </div>
          )}

          {/* Agent items */}
          {simLiveAgents.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {simLiveAgents.map((a, i) => {
                const cc = AGENT_CATEGORY_COLORS[a.category || ""] || DEFAULT_CATEGORY_COLOR;
                return (
                  <div key={`${a.name}-${i}`} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-secondary)",
                    animation: "fadeInUp 0.2s ease-out",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: cc.bg, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600, color: cc.color,
                      flexShrink: 0,
                    }}>
                      {a.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>{a.name}</span>
                    {a.done ? (
                      <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={12} /> {t("sim.agent_done")}
                      </span>
                    ) : (
                      <span className="loading-dots"><span /><span /><span /></span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
