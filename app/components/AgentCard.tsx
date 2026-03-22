"use client";
import { motion } from "framer-motion";
import { cleanAgentResponse } from "../lib/utils";

type AgentData = {
  agentId: string;
  name: string;
  avatar?: string;
  color: string;
  text: string;
  sentiment: string;
  confidence: number;
  changedMind: boolean;
  failed?: boolean;
};

/* Per-agent name colors — subtle personality, no background pollution */
const AGENT_NAME_COLORS: Record<string, string> = {
  strategist: "#A8A29E",
  strategy: "#A8A29E",
  finance: "#7DD3FC",
  financial: "#7DD3FC",
  operator: "#FCD34D",
  operations: "#FCD34D",
  execution: "#FCD34D",
  market: "#6EE7B7",
  risk: "#FCA5A5",
  innovator: "#C4B5FD",
  innovation: "#C4B5FD",
  devil: "#FDBA74",
  adversary: "#FDBA74",
  competitive: "#FDBA74",
  global: "#5EEAD4",
  human: "#F9A8D4",
  customer: "#F9A8D4",
  futurist: "#A5B4FC",
  base: "#A8A29E",
  demand: "#6EE7B7",
  regulatory: "#FCA5A5",
  regime: "#FCA5A5",
  intervention: "#C4B5FD",
  decision: "#A5B4FC",
  unit: "#7DD3FC",
};

function getAgentNameColor(name: string, fallbackColor: string): string {
  const lower = (name || "").toLowerCase();
  for (const [key, color] of Object.entries(AGENT_NAME_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return fallbackColor;
}

const SENTIMENT_COLORS: Record<string, string> = {
  confident: "#10B981",
  optimistic: "#22c55e",
  excited: "#10B981",
  convinced: "#10B981",
  cautious: "#F59E0B",
  neutral: "#6B7280",
  skeptical: "#F59E0B",
  worried: "#EF4444",
  concerned: "#EF4444",
  contrarian: "#EC4899",
  positive: "#10B981",
  negative: "#EF4444",
  warning: "#F59E0B",
};

export function sentimentColor(s: string) {
  return SENTIMENT_COLORS[s] || "#6B7280";
}

type AgentCardProps = {
  agent: AgentData;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  isMobile?: boolean;
};

export default function AgentCard({ agent, index, expanded, onToggle, isMobile }: AgentCardProps) {
  const nameColor = getAgentNameColor(agent.name, agent.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onToggle}
      style={{
        padding: isMobile ? "10px 12px" : "12px 14px",
        borderRadius: 10,
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        cursor: "pointer",
        transition: "border-color 200ms",
        overflow: "hidden",
        opacity: agent.failed ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: nameColor,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {agent.name}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: sentimentColor(agent.sentiment),
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
            }}>
              {String(agent.confidence ?? 5)}/10
            </span>
          </div>
        </div>
        {agent.failed ? (
          <span style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(239,68,68,0.1)",
            color: "#EF4444",
            fontWeight: 600,
            flexShrink: 0,
          }}>
            FAILED
          </span>
        ) : agent.changedMind ? (
          <span style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-secondary)",
            fontWeight: 600,
            flexShrink: 0,
          }}>
            CHANGED
          </span>
        ) : null}
      </div>

      {/* Text */}
      <p style={{
        fontSize: 12,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: 0,
        ...(expanded
          ? {}
          : {
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }),
      }}>
        {cleanAgentResponse(typeof agent.text === "string" ? agent.text : String(agent.text ?? ""))}
      </p>
    </motion.div>
  );
}
