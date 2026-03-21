"use client";
import { motion } from "framer-motion";

type AgentData = {
  agentId: string;
  name: string;
  avatar: string;
  color: string;
  text: string;
  sentiment: string;
  confidence: number;
  changedMind: boolean;
  failed?: boolean;
};

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onToggle}
      style={{
        padding: isMobile ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "var(--card-bg)",
        border: agent.failed
          ? "1px solid rgba(107,114,128,0.2)"
          : agent.changedMind
            ? "1px solid rgba(212,175,55,0.3)"
            : `1px solid ${agent.color}18`,
        cursor: "pointer",
        transition: "border-color 200ms, box-shadow 200ms",
        overflow: "hidden",
        opacity: agent.failed ? 0.5 : 1,
      }}
      whileHover={{
        borderColor: `${agent.color}40`,
        boxShadow: `0 0 12px ${agent.color}10`,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 18 }}>{agent.avatar}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: agent.color,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {agent.name}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: sentimentColor(agent.sentiment),
            }} />
            <span style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
            }}>
              {String(agent.sentiment || "neutral")} · {String(agent.confidence ?? 5)}/10
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
            background: "rgba(212,175,55,0.1)",
            color: "#D4AF37",
            fontWeight: 600,
            flexShrink: 0,
          }}>
            CHANGED
          </span>
        ) : null}
        {!agent.failed && typeof agent.text === "string" && /previous simulation|last time|earlier scenario|prior analysis|your .* simulation/i.test(agent.text) && (
          <span style={{
            fontSize: 8,
            padding: "1px 5px",
            borderRadius: 3,
            background: "rgba(139,92,246,0.1)",
            color: "#8B5CF6",
            fontWeight: 600,
            flexShrink: 0,
          }}>
            MEMORY
          </span>
        )}
      </div>

      {/* Text */}
      <p style={{
        fontSize: isMobile ? 11 : 12,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        margin: 0,
        ...(expanded
          ? {}
          : {
              display: "-webkit-box",
              WebkitLineClamp: isMobile ? 2 : 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }),
      }}>
        {typeof agent.text === "string" ? agent.text : String(agent.text ?? "")}
      </p>
    </motion.div>
  );
}
