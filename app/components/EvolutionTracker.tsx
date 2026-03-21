"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";

interface RoundData {
  round: number;
  sentiment: string;
  confidence: number;
  changedMind: boolean;
}

interface AgentEvolution {
  agentId: string;
  name: string;
  avatar: string;
  color: string;
  arc?: RoundData[];
  sentimentOverRounds?: RoundData[];
}

interface Props {
  evolution?: AgentEvolution[];
  agents?: AgentEvolution[];
  activeRound?: number;
  onSelectRound?: (r: number) => void;
  onAgentClick?: (agentId: string) => void;
  isMobile?: boolean;
  compact?: boolean;
}

const SENTIMENT_MAP: Record<string, number> = {
  confident: 9, optimistic: 8, excited: 8, convinced: 9,
  cautious: 5, neutral: 5, skeptical: 3, worried: 2,
  concerned: 2, contrarian: 4,
};

const SENTIMENT_COLORS: Record<string, string> = {
  confident: "#10B981", optimistic: "#10B981", excited: "#10B981", convinced: "#10B981",
  cautious: "#F59E0B", neutral: "#6B7280", skeptical: "#F59E0B",
  worried: "#EF4444", concerned: "#EF4444", contrarian: "#EC4899",
};

export function sentimentColor(s: string) {
  return SENTIMENT_COLORS[s] || "#6B7280";
}

export default function EvolutionTracker({
  evolution, agents: agentsProp, activeRound = 1,
  onSelectRound, onAgentClick, isMobile, compact,
}: Props) {
  const raw = Array.isArray(agentsProp) ? agentsProp : Array.isArray(evolution) ? evolution : [];

  // Normalize: accept both arc and sentimentOverRounds
  // IMPORTANT: useMemo hooks must be called before any early return (React Rules of Hooks)
  const normalized = useMemo(() => raw.map(a => ({
    ...a,
    rounds: a.sentimentOverRounds || a.arc || [],
  })), [raw]);

  // Sort by final confidence
  const sorted = useMemo(() => {
    return [...normalized].sort((a, b) => {
      const aLast = a.rounds[a.rounds.length - 1]?.confidence || 5;
      const bLast = b.rounds[b.rounds.length - 1]?.confidence || 5;
      return bLast - aLast;
    });
  }, [normalized]);

  if (raw.length === 0) return null;

  const changedCount = normalized.filter(a =>
    a.rounds.some(r => r.changedMind)
  ).length;

  const svgW = isMobile ? 60 : 110;
  const svgH = compact ? 16 : 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: compact ? "12px 14px" : "16px 20px",
        borderRadius: 12,
        background: "var(--card-bg)",
        border: "1px solid var(--border-secondary)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: compact ? 8 : 14,
      }}>
        <div style={{
          fontSize: 10, fontFamily: "var(--font-mono)",
          color: "var(--text-tertiary)", textTransform: "uppercase" as const,
          letterSpacing: 1,
        }}>
          Agent Evolution
        </div>
        {!compact && (
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {changedCount}/{normalized.length} changed position
          </div>
        )}
      </div>

      {/* Agent rows */}
      {sorted.map(agent => {
        const points = agent.rounds.map(r => SENTIMENT_MAP[r.sentiment] || 5);
        const confidences = agent.rounds.map(r => r.confidence);
        const lastSentiment = agent.rounds[agent.rounds.length - 1]?.sentiment || "neutral";
        const lastConfidence = confidences[confidences.length - 1] || 5;
        const firstConfidence = confidences[0] || 5;
        const delta = lastConfidence - firstConfidence;
        const anyChanged = agent.rounds.some(r => r.changedMind);

        return (
          <div
            key={agent.agentId}
            onClick={() => onAgentClick?.(agent.agentId)}
            style={{
              display: "flex", alignItems: "center", gap: compact ? 6 : 8,
              marginBottom: compact ? 4 : 8, padding: compact ? "2px 0" : "4px 0",
              cursor: onAgentClick ? "pointer" : "default",
              borderRadius: 6,
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => { if (onAgentClick) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {/* Avatar */}
            <span style={{ fontSize: compact ? 12 : 14, width: 20, textAlign: "center" as const }}>
              {agent.avatar}
            </span>

            {/* Name */}
            <span style={{
              fontSize: 10, color: agent.color,
              width: isMobile ? 60 : 85,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const, fontWeight: 500,
            }}>
              {agent.name.replace("The ", "")}
            </span>

            {/* Sparkline */}
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ flexShrink: 0 }}>
              {/* Midline */}
              <line x1="0" y1={svgH / 2} x2={svgW} y2={svgH / 2}
                stroke="var(--border-secondary)" strokeWidth="0.5" strokeDasharray="2 2" />

              {/* Line */}
              {points.length > 1 && (
                <polyline
                  points={points.map((p, i) => {
                    const x = (i / (points.length - 1)) * (svgW - 4) + 2;
                    const y = svgH - 2 - (p / 10) * (svgH - 4);
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke={agent.color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              )}

              {/* Dots */}
              {points.map((p, i) => {
                const x = points.length > 1 ? (i / (points.length - 1)) * (svgW - 4) + 2 : svgW / 2;
                const y = svgH - 2 - (p / 10) * (svgH - 4);
                const isActive = activeRound === i + 1;
                const changed = agent.rounds[i]?.changedMind;
                const isLast = i === points.length - 1;

                if (!changed && !isActive && !isLast) return null;

                return (
                  <circle
                    key={i}
                    cx={x} cy={y}
                    r={changed ? 3 : isActive ? 2.5 : 2}
                    fill={changed ? "#D4AF37" : sentimentColor(agent.rounds[i]?.sentiment || "neutral")}
                    stroke={isActive ? "#D4AF37" : changed ? "#0F0E0D" : "none"}
                    strokeWidth={isActive ? 1.5 : changed ? 1 : 0}
                    opacity={1}
                    style={{ cursor: onSelectRound ? "pointer" : "default" }}
                    onClick={(e) => { e.stopPropagation(); onSelectRound?.(i + 1); }}
                  />
                );
              })}
            </svg>

            {/* Sentiment dot */}
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: SENTIMENT_COLORS[lastSentiment] || "#6B7280",
              flexShrink: 0,
            }} />

            {/* Confidence */}
            <span style={{
              fontSize: 10, fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)", width: 22,
              textAlign: "right" as const,
            }}>
              {lastConfidence}
            </span>

            {/* Delta */}
            {!compact && (
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono)", width: 24,
                color: delta > 0 ? "#10B981" : delta < 0 ? "#EF4444" : "var(--text-tertiary)",
              }}>
                {delta > 0 ? `+${delta}` : delta === 0 ? "—" : String(delta)}
              </span>
            )}

            {/* Changed badge */}
            {anyChanged && (
              <span style={{
                fontSize: compact ? 7 : 8, padding: "1px 4px", borderRadius: 3,
                background: "rgba(212,175,55,0.1)", color: "#D4AF37",
                fontWeight: 700, letterSpacing: 0.3,
                fontFamily: "var(--font-mono)",
              }}>
                {compact ? "⟳" : `${agent.rounds.filter(r => r.changedMind).length}x`}
              </span>
            )}
          </div>
        );
      })}

      {/* Legend — only in non-compact */}
      {!compact && (
        <div style={{
          display: "flex", gap: 12, marginTop: 10, paddingTop: 8,
          borderTop: "1px solid var(--border-secondary)",
        }}>
          {[
            { color: "#D4AF37", label: "Changed mind" },
            { color: "#10B981", label: "Positive" },
            { color: "#EF4444", label: "Negative" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 8, color: "var(--text-tertiary)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
