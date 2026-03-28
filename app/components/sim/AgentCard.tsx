"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { AgentReport } from "@/app/lib/types/simulation";

const AGENT_COLORS: Record<string, string> = {
  decision_chair: "#C75B2A",
  base_rate_archivist: "#8B6F4E",
  demand_signal_analyst: "#F59E0B",
  unit_economics_auditor: "#10B981",
  regulatory_gatekeeper: "#C9970D",
  competitive_intel: "#F97316",
  execution_operator: "#E8784A",
  capital_allocator: "#06B6D4",
  scenario_planner: "#B8860B",
  intervention_optimizer: "#14B8A6",
  customer_reality: "#E8784A",
  // Legacy mock IDs
  "base-rate": "#8B6F4E",
  "demand-signal": "#F59E0B",
  "unit-econ": "#10B981",
  regulatory: "#C9970D",
  "competitive-intel": "#F97316",
  execution: "#E8784A",
  capital: "#06B6D4",
  scenario: "#B8860B",
  intervention: "#14B8A6",
  chair: "#C75B2A",
};

function getAgentColor(id: string): string {
  return AGENT_COLORS[id] || "#C75B2A";
}

function getPositionStyle(position: string) {
  switch (position) {
    case "proceed":
      return { bg: "rgba(16,185,129,0.12)", color: "#10B981", label: "PROCEED" };
    case "delay":
      return { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "DELAY" };
    case "abandon":
      return { bg: "rgba(244,63,94,0.12)", color: "#C9970D", label: "ABANDON" };
    default:
      return { bg: "var(--surface-2)", color: "var(--text-secondary)", label: position.toUpperCase() };
  }
}

function getConfidenceColor(c: number) {
  if (c >= 7) return "#10B981";
  if (c >= 4) return "#F59E0B";
  return "#C9970D";
}

type AgentCardProps = {
  agent: AgentReport;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  history?: AgentReport[];
};

export default function AgentCard({ agent, index, expanded, onToggle, history = [] }: AgentCardProps) {
  const color = getAgentColor(agent.agent_id);
  const pos = getPositionStyle(agent.position);
  const confColor = getConfidenceColor(agent.confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        background: "var(--surface-raised)",
        cursor: "pointer",
        transition: "border-color 150ms ease-out",
      }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `${color}1A`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {agent.agent_name.charAt(0)}
        </div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {agent.agent_name}
          </p>
        </div>

        {/* Confidence */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: confColor,
            flexShrink: 0,
          }}
        >
          {agent.confidence}/10
        </span>

        {/* Position badge */}
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "var(--radius-full)",
            background: pos.bg,
            color: pos.color,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          {pos.label}
        </span>

        {/* Expand arrow */}
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          style={{
            color: "var(--icon-secondary)",
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 150ms ease-out",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Key argument — always 2-line clamp when collapsed, full when expanded */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginTop: 12,
          ...(!expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {agent.key_argument}
      </p>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {agent.evidence && agent.evidence.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Evidence
                  </p>
                  {agent.evidence.map((e, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        margin: "2px 0",
                        lineHeight: 1.5,
                      }}
                    >
                      • {e}
                    </p>
                  ))}
                </div>
              )}
              {agent.risks_identified && agent.risks_identified.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Risks Identified
                  </p>
                  {agent.risks_identified.map((r, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        margin: "2px 0",
                        lineHeight: 1.5,
                      }}
                    >
                      • {r}
                    </p>
                  ))}
                </div>
              )}
              {agent.changed_mind && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#F59E0B",
                    fontStyle: "italic",
                  }}
                >
                  Changed position: {agent.change_reason}
                </p>
              )}
              {/* Previous rounds */}
              {history.length > 1 && (
                <div style={{ marginTop: 4 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Previous Rounds ({history.length - 1})
                  </p>
                  {history.slice(0, -1).map((prev, i) => {
                    const prevPos = getPositionStyle(prev.position);
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-1)",
                          marginBottom: 4,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-full)",
                            background: prevPos.bg,
                            color: prevPos.color,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                            marginRight: 6,
                          }}
                        >
                          {prevPos.label}
                        </span>
                        <span style={{ color: getConfidenceColor(prev.confidence), fontWeight: 500 }}>
                          {prev.confidence}/10
                        </span>
                        {" — "}
                        {prev.key_argument.length > 120
                          ? prev.key_argument.slice(0, 120) + "…"
                          : prev.key_argument}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
