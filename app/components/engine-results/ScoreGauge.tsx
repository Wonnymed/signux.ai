"use client";
import React from "react";

interface ScoreGaugeProps {
  score: number;
  label: string;
}

function scoreColor(score: number): string {
  if (score >= 8) return "var(--positive)";
  if (score >= 5) return "var(--warning)";
  return "var(--negative)";
}

export default function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(10, score));
  const color = scoreColor(clamped);
  const pct = clamped * 10;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 20,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            color,
          }}
        >
          {clamped}
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 400 }}>/10</span>
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--border-primary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 2,
            background: color,
            transition: "width 0.4s ease-out",
          }}
        />
      </div>
    </div>
  );
}
