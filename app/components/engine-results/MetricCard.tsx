"use client";
import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: string;
}

export default function MetricCard({ label, value, sublabel, accent }: MetricCardProps) {
  const accentColor = accent || "var(--text-primary)";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
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
          fontSize: 22,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          color: accentColor,
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {sublabel && (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </span>
      )}
    </div>
  );
}
