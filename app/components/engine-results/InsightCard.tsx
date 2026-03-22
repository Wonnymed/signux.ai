"use client";
import React from "react";
import { AlertTriangle, CheckCircle2, Zap, Info } from "lucide-react";

type InsightType = "risk" | "opportunity" | "action" | "info";

interface InsightCardProps {
  title: string;
  content: string;
  type: InsightType;
}

const TYPE_CONFIG: Record<InsightType, { color: string; bg: string; border: string; Icon: typeof Info }> = {
  risk: {
    color: "var(--negative)",
    bg: "rgba(239,68,68,0.04)",
    border: "rgba(239,68,68,0.12)",
    Icon: AlertTriangle,
  },
  opportunity: {
    color: "var(--positive)",
    bg: "rgba(62,207,142,0.04)",
    border: "rgba(62,207,142,0.12)",
    Icon: CheckCircle2,
  },
  action: {
    color: "var(--accent)",
    bg: "var(--accent-subtle)",
    border: "var(--accent-border)",
    Icon: Zap,
  },
  info: {
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.04)",
    border: "rgba(96,165,250,0.12)",
    Icon: Info,
  },
};

export default function InsightCard({ title, content, type }: InsightCardProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const { Icon } = config;

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderLeft: `3px solid ${config.color}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={13} color={config.color} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: 1,
            textTransform: "uppercase",
            color: config.color,
          }}
        >
          {title}
        </span>
      </div>
      <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {content}
      </span>
    </div>
  );
}
