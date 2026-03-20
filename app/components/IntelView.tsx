"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Shield, Search, Crosshair, Swords, GitBranch, Users, Map, ChevronLeft, Microscope } from "lucide-react";
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

const TOOLS = [
  {
    id: "threat-radar" as IntelTool,
    name: "Threat Radar",
    description: "What could hurt your business right now?",
    icon: Shield,
    color: "#DC2626",
    command: "/threats",
  },
  {
    id: "deal-xray" as IntelTool,
    name: "Deal X-Ray",
    description: "Is this deal too good to be true?",
    icon: Crosshair,
    color: "#F59E0B",
    command: "/xray",
  },
  {
    id: "war-game" as IntelTool,
    name: "War Game",
    description: "How will your competitors react?",
    icon: Swords,
    color: "#8B5CF6",
    command: "/wargame",
  },
  {
    id: "causal-map" as IntelTool,
    name: "Causal Map",
    description: "Did that change actually cause the result?",
    icon: GitBranch,
    color: "#06B6D4",
    command: "/causal",
  },
  {
    id: "negotiation" as IntelTool,
    name: "Negotiation War Room",
    description: "Walk in prepared. Walk out winning.",
    icon: Users,
    color: "#F97316",
    command: "/negotiate",
  },
  {
    id: "scenarios" as IntelTool,
    name: "Scenario Planner",
    description: "What could happen next — and how to prepare",
    icon: Map,
    color: "#22C55E",
    command: "/scenarios",
  },
  {
    id: "autopsy" as IntelTool,
    name: "Decision Autopsy",
    description: "What went right, what went wrong, and why",
    icon: Microscope,
    color: "#A855F7",
    command: "/autopsy",
  },
];

export default function IntelView({ lang, onContinueInChat, onSetMode, isLoggedIn, tier }: IntelViewProps) {
  const [activeTool, setActiveTool] = useState<IntelTool>("menu");
  const isMobile = useIsMobile();

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

    if (activeTool === "deep-research") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <ResearchView
            lang={lang}
            onContinueInChat={onContinueInChat}
            onSetMode={onSetMode}
            isLoggedIn={isLoggedIn}
            tier={tier}
          />
        </div>
      );
    }

    if (activeTool === "threat-radar") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <ThreatRadar lang={lang} />
        </div>
      );
    }

    if (activeTool === "deal-xray") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <DealXRay lang={lang} />
        </div>
      );
    }

    if (activeTool === "war-game") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <WarGame lang={lang} />
        </div>
      );
    }

    if (activeTool === "causal-map") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <CausalMap lang={lang} />
        </div>
      );
    }

    if (activeTool === "negotiation") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <NegotiationSim lang={lang} />
        </div>
      );
    }

    if (activeTool === "scenarios") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <ScenarioPlanner lang={lang} />
        </div>
      );
    }

    if (activeTool === "autopsy") {
      return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {backButton}
          <DecisionAutopsy lang={lang} />
        </div>
      );
    }
  }

  /* ═══ MENU STATE ═══ */
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "calc(100vh - 120px)",
      padding: "20px 16px", maxWidth: 760, margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: isMobile ? 10 : 14,
        background: "rgba(220,38,38,0.08)", display: "flex",
        alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        <Shield size={isMobile ? 18 : 24} style={{ color: "#DC2626" }} />
      </div>

      <h1 style={{
        fontFamily: "var(--font-brand)", fontWeight: 700,
        fontSize: isMobile ? 20 : 28, letterSpacing: 3, color: "var(--text-primary)",
        marginBottom: 4, textAlign: "center",
      }}>
        <span style={{ color: "#DC2626" }}>INTEL</span>
        <span style={{ fontWeight: 300, opacity: 0.2, marginLeft: 8 }}>ENGINE</span>
      </h1>

      <p style={{
        fontFamily: "var(--font-mono)", fontSize: isMobile ? 9 : 10, letterSpacing: isMobile ? 1 : 2,
        color: "#DC2626", textTransform: "uppercase", marginBottom: isMobile ? 16 : 24,
        opacity: 0.7,
      }}>
        Know what others don&apos;t
      </p>

      {/* Knowledge badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 50,
        background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)",
        marginBottom: 28, fontSize: 11, color: "var(--text-tertiary)",
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#DC2626" }} />
        Specialized intelligence tools powered by proprietary knowledge
      </div>

      {/* Tools grid — responsive */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
        gap: isMobile ? 8 : 10, width: "100%", maxWidth: 680, marginBottom: 12,
      }}>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="interactive-card"
            style={{
              display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8,
              padding: isMobile ? "12px 10px" : "16px 14px", borderRadius: isMobile ? 10 : 12,
              border: `1px solid ${tool.color}18`,
              background: `${tool.color}06`,
              textAlign: "left",
              minHeight: 44,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${tool.color}40`;
              (e.currentTarget as HTMLElement).style.background = `${tool.color}10`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${tool.color}18`;
              (e.currentTarget as HTMLElement).style.background = `${tool.color}06`;
            }}
          >
            <tool.icon size={isMobile ? 16 : 18} style={{ color: tool.color }} />
            <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {tool.name}
            </div>
            <div style={{ fontSize: isMobile ? 9 : 11, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
              {tool.description}
            </div>
          </button>
        ))}
      </div>

      {/* Deep Research — full width row below */}
      <button
        onClick={() => setActiveTool("deep-research")}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 10,
          border: "1px solid rgba(107,138,255,0.15)",
          background: "rgba(107,138,255,0.04)",
          cursor: "pointer", width: "100%", maxWidth: 680,
          textAlign: "left", transition: "all 200ms",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(107,138,255,0.35)";
          e.currentTarget.style.background = "rgba(107,138,255,0.08)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(107,138,255,0.15)";
          e.currentTarget.style.background = "rgba(107,138,255,0.04)";
        }}
      >
        <Search size={16} style={{ color: "#6B8AFF" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Deep Research
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Get the full picture from multiple sources
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          /research
        </span>
      </button>

      {/* Disclaimer */}
      <p style={{
        fontSize: 11, color: "var(--text-tertiary)", marginTop: 20,
        textAlign: "center", opacity: 0.5,
      }}>
        Always verify critical decisions with qualified professionals.
      </p>
    </div>
  );
}
