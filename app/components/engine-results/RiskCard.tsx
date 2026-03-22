"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";

interface RiskCardProps {
  risk: string;
  likelihood: string;
  impact: string;
  mitigation: string;
}

const LEVEL_COLOR: Record<string, string> = {
  low: "var(--positive)",
  medium: "var(--warning)",
  high: "var(--negative)",
  catastrophic: "#DC2626",
};

function levelColor(v: string): string {
  return LEVEL_COLOR[v?.toLowerCase()] || "var(--neutral)";
}

function cellBg(likelihood: string, impact: string): string {
  const w: Record<string, number> = { low: 1, medium: 2, high: 3, catastrophic: 4 };
  const score = (w[likelihood?.toLowerCase()] || 1) * (w[impact?.toLowerCase()] || 1);
  if (score >= 6) return "rgba(239,68,68,0.04)";
  if (score >= 3) return "rgba(245,158,11,0.04)";
  return "rgba(113,113,122,0.04)";
}

function cellBorder(likelihood: string, impact: string): string {
  const w: Record<string, number> = { low: 1, medium: 2, high: 3, catastrophic: 4 };
  const score = (w[likelihood?.toLowerCase()] || 1) * (w[impact?.toLowerCase()] || 1);
  if (score >= 6) return "1px solid rgba(239,68,68,0.12)";
  if (score >= 3) return "1px solid rgba(245,158,11,0.12)";
  return "1px solid var(--border-primary)";
}

export default function RiskCard({ risk, likelihood, impact, mitigation }: RiskCardProps) {
  return (
    <div
      style={{
        background: cellBg(likelihood, impact),
        border: cellBorder(likelihood, impact),
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AlertTriangle size={13} color="var(--negative)" style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {risk}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: 0.5,
            padding: "2px 8px",
            borderRadius: 100,
            color: levelColor(likelihood),
            border: `1px solid ${levelColor(likelihood)}22`,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {likelihood} likelihood
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: 0.5,
            padding: "2px 8px",
            borderRadius: 100,
            color: levelColor(impact),
            border: `1px solid ${levelColor(impact)}22`,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {impact} impact
        </span>
      </div>

      {mitigation && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            MITIGATION{" "}
          </span>
          {mitigation}
        </div>
      )}
    </div>
  );
}
