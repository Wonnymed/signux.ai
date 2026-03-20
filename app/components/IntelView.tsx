"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Shield, Search, Eye, Swords, GitBranch, Target, Map, ChevronLeft, FileSearch } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";

const ThreatRadar = dynamic(() => import("./ThreatRadar"), { ssr: false });
const DealXRay = dynamic(() => import("./DealXRay"), { ssr: false });
const WarGame = dynamic(() => import("./WarGame"), { ssr: false });
const CausalMap = dynamic(() => import("./CausalMap"), { ssr: false });
const NegotiationSim = dynamic(() => import("./NegotiationSim"), { ssr: false });
const ScenarioPlanner = dynamic(() => import("./ScenarioPlanner"), { ssr: false });
const ResearchView = dynamic(() => import("./ResearchView"), { ssr: false });
const DecisionAutopsy = dynamic(() => import("./DecisionAutopsy"), { ssr: false });

type IntelTool = "menu" | "threat-radar" | "deal-xray" | "war-game" | "causal-map" | "negotiation" | "scenarios" | "deep-research" | "autopsy";

type IntelViewProps = {
  lang: string;
  onContinueInChat?: (report: string) => void;
  onSetMode?: (m: any) => void;
  isLoggedIn?: boolean;
  tier?: string;
};

/* ═══ ToolCard Component ═══ */
function ToolCard({ icon, name, desc, command, color, onClick }: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  command: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="interactive-card"
      style={{
        display: "flex", flexDirection: "column",
        padding: "16px 18px", borderRadius: 12,
        border: "1px solid var(--border-secondary)",
        background: "var(--card-bg)",
        textAlign: "left", cursor: "pointer",
        transition: "all 200ms ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}30`;
        e.currentTarget.style.boxShadow = `0 4px 20px ${color}08, 0 0 0 1px ${color}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-secondary)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Color accent top line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}40, transparent)`,
        borderRadius: "12px 12px 0 0",
        opacity: 0.5,
      }} />

      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}10`,
        border: `1px solid ${color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color,
        marginBottom: 12,
      }}>
        {icon}
      </div>

      {/* Name + command */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", marginBottom: 4,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
        }}>
          {name}
        </span>
        <span style={{
          fontSize: 9, fontFamily: "var(--font-mono)",
          color: "var(--text-tertiary)", opacity: 0.5,
        }}>
          {command}
        </span>
      </div>

      {/* Description */}
      <span style={{
        fontSize: 12, color: "var(--text-tertiary)",
        lineHeight: 1.4,
      }}>
        {desc}
      </span>
    </button>
  );
}

export default function IntelView({ lang, onContinueInChat, onSetMode, isLoggedIn, tier }: IntelViewProps) {
  const [activeTool, setActiveTool] = useState<IntelTool>("menu");
  const [intelQuery, setIntelQuery] = useState("");
  const isMobile = useIsMobile();

  const activateTool = (toolId: IntelTool) => {
    setActiveTool(toolId);
    setIntelQuery("");
  };

  const detectBestTool = (query: string) => {
    const q = query.toLowerCase();
    if (/threat|risk|danger|hurt|vulnerable|weak/i.test(q)) {
      activateTool("threat-radar");
    } else if (/deal|partnership|offer|contract|legit|too good|trust/i.test(q)) {
      activateTool("deal-xray");
    } else if (/competitor|compete|react|response|war|battle/i.test(q)) {
      activateTool("war-game");
    } else if (/cause|why|change|effect|result|because/i.test(q)) {
      activateTool("causal-map");
    } else if (/negotiat|prepare|meeting|pitch|terms/i.test(q)) {
      activateTool("negotiation");
    } else if (/scenario|future|happen|plan|next/i.test(q)) {
      activateTool("scenarios");
    } else if (/went wrong|mistake|learn|autopsy|post-mortem|review/i.test(q)) {
      activateTool("autopsy");
    } else {
      activateTool("deep-research");
    }
  };

  /* ═══ TOOL VIEWS ═══ */
  if (activeTool !== "menu") {
    const backButton = (
      <button onClick={() => setActiveTool("menu")} style={{
        display: "flex", alignItems: "center", gap: 6,
        alignSelf: "flex-start", margin: "12px 16px 0",
        background: "none", border: "none", cursor: "pointer",
        fontSize: 13, color: "var(--text-tertiary)",
      }}>
        <ChevronLeft size={16} /> Back to Intel
      </button>
    );

    const toolWrapper = (child: React.ReactNode) => (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
        {backButton}
        {child}
      </div>
    );

    if (activeTool === "deep-research") return toolWrapper(
      <ResearchView lang={lang} onContinueInChat={onContinueInChat} onSetMode={onSetMode} isLoggedIn={isLoggedIn} tier={tier} />
    );
    if (activeTool === "threat-radar") return toolWrapper(<ThreatRadar lang={lang} />);
    if (activeTool === "deal-xray") return toolWrapper(<DealXRay lang={lang} />);
    if (activeTool === "war-game") return toolWrapper(<WarGame lang={lang} />);
    if (activeTool === "causal-map") return toolWrapper(<CausalMap lang={lang} />);
    if (activeTool === "negotiation") return toolWrapper(<NegotiationSim lang={lang} />);
    if (activeTool === "scenarios") return toolWrapper(<ScenarioPlanner lang={lang} />);
    if (activeTool === "autopsy") return toolWrapper(<DecisionAutopsy lang={lang} />);
  }

  /* ═══ COMMAND CENTER — MENU STATE ═══ */
  const DEFENSE_COLOR = "#ef4444";
  const OFFENSE_COLOR = "#f59e0b";
  const ANALYSIS_COLOR = "#8b5cf6";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      padding: isMobile ? "24px 16px 120px" : "24px 24px 120px",
      maxWidth: 768, margin: "0 auto", width: "100%",
    }}>

      {/* ═══ COMPACT HEADER ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, marginBottom: 6, paddingTop: isMobile ? 8 : 16,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Shield size={14} style={{ color: "#ef4444" }} />
        </div>
        <span style={{
          fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 700,
          letterSpacing: 3, color: "var(--text-primary)",
        }}>
          INTEL ENGINE
        </span>
      </div>
      <p style={{
        textAlign: "center", fontSize: 13, color: "var(--text-tertiary)",
        marginBottom: isMobile ? 16 : 20,
      }}>
        Know what others don&apos;t — specialized intelligence tools
      </p>

      {/* ═══ UNIVERSAL INPUT ═══ */}
      <div style={{ maxWidth: 600, margin: `0 auto ${isMobile ? 20 : 28}px`, width: "100%" }}>
        <div style={{
          display: "flex", alignItems: "center",
          padding: "12px 16px", borderRadius: 12,
          border: "1px solid var(--border-secondary)",
          background: "var(--card-bg)",
          gap: 10,
        }}>
          <Search size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Describe what you need intel on..."
            value={intelQuery}
            onChange={(e) => setIntelQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && intelQuery.trim()) {
                detectBestTool(intelQuery);
              }
            }}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "var(--text-primary)", fontSize: 14, outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          {intelQuery.trim() && (
            <button onClick={() => detectBestTool(intelQuery)} style={{
              padding: "6px 14px", borderRadius: 50,
              background: "var(--accent)", color: "#000",
              fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
              Analyze →
            </button>
          )}
        </div>
        <div style={{
          display: "flex", gap: isMobile ? 6 : 10, justifyContent: "center",
          marginTop: 8, fontSize: 10, color: "var(--text-tertiary)",
          flexWrap: "wrap",
        }}>
          <span>&quot;Is this partnership legit?&quot;</span>
          <span>·</span>
          <span>&quot;What threats should I watch?&quot;</span>
          <span>·</span>
          <span>&quot;How will competitors react?&quot;</span>
        </div>
      </div>

      {/* ═══ CATEGORY: DEFENSE — Protect & Detect ═══ */}
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: DEFENSE_COLOR,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", color: DEFENSE_COLOR,
            fontFamily: "var(--font-mono)",
          }}>
            Protect & Detect
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 10,
        }}>
          <ToolCard
            icon={<Shield size={18} />}
            name="Threat Radar"
            desc="Map every threat to your business"
            command="/threats"
            color={DEFENSE_COLOR}
            onClick={() => activateTool("threat-radar")}
          />
          <ToolCard
            icon={<Eye size={18} />}
            name="Deal X-Ray"
            desc="Detect lies and red flags in deals"
            command="/xray"
            color={DEFENSE_COLOR}
            onClick={() => activateTool("deal-xray")}
          />
          <ToolCard
            icon={<Map size={18} />}
            name="Scenario Planner"
            desc="Prepare for multiple futures"
            command="/scenarios"
            color={DEFENSE_COLOR}
            onClick={() => activateTool("scenarios")}
          />
        </div>
      </div>

      {/* ═══ CATEGORY: OFFENSE — Attack & Compete ═══ */}
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: OFFENSE_COLOR,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", color: OFFENSE_COLOR,
            fontFamily: "var(--font-mono)",
          }}>
            Attack & Compete
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 10,
        }}>
          <ToolCard
            icon={<Swords size={18} />}
            name="War Game"
            desc="Predict competitor moves and counter-strategies"
            command="/wargame"
            color={OFFENSE_COLOR}
            onClick={() => activateTool("war-game")}
          />
          <ToolCard
            icon={<Target size={18} />}
            name="Negotiation War Room"
            desc="Enter prepared. Leave winning."
            command="/negotiate"
            color={OFFENSE_COLOR}
            onClick={() => activateTool("negotiation")}
          />
        </div>
      </div>

      {/* ═══ CATEGORY: ANALYSIS — Understand & Learn ═══ */}
      <div style={{ marginBottom: isMobile ? 20 : 24 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: ANALYSIS_COLOR,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase", color: ANALYSIS_COLOR,
            fontFamily: "var(--font-mono)",
          }}>
            Understand & Learn
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 10,
        }}>
          <ToolCard
            icon={<GitBranch size={18} />}
            name="Causal Map"
            desc="Find what actually caused the result"
            command="/causal"
            color={ANALYSIS_COLOR}
            onClick={() => activateTool("causal-map")}
          />
          <ToolCard
            icon={<FileSearch size={18} />}
            name="Decision Autopsy"
            desc="Learn from wins and failures"
            command="/autopsy"
            color={ANALYSIS_COLOR}
            onClick={() => activateTool("autopsy")}
          />
          <ToolCard
            icon={<Search size={18} />}
            name="Deep Research"
            desc="Multi-source intelligence report"
            command="/research"
            color={ANALYSIS_COLOR}
            onClick={() => activateTool("deep-research")}
          />
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{
        textAlign: "center", fontSize: 10,
        color: "var(--text-tertiary)", opacity: 0.4,
        marginTop: 4, paddingBottom: 24,
      }}>
        Always verify critical decisions with qualified professionals.
      </p>
    </div>
  );
}
