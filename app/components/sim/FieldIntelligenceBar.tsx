"use client";

import { useState } from "react";
import type { FieldScan } from "@/lib/simulation/field-intelligence";

type Props = {
  fieldScans: FieldScan[];
  personaCount: number;
};

export default function FieldIntelligenceBar({ fieldScans, personaCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  const allInsights = fieldScans.flatMap((s) => s.insights);
  const positive = allInsights.filter((i) => i.sentiment === "positive").length;
  const negative = allInsights.filter((i) => i.sentiment === "negative").length;
  const neutral = allInsights.filter((i) => i.sentiment === "neutral").length;
  const totalMs = fieldScans.reduce((sum, s) => sum + s.scan_duration_ms, 0);

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-1)",
        overflow: "hidden",
      }}
    >
      {/* Summary bar */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 14 }}>📡</span>
        <span style={{ fontWeight: 500 }}>
          Field Intelligence Network
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>
          {allInsights.length} insights from {personaCount} local voices
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
          }}
        >
          {positive > 0 && (
            <span style={{ color: "#10B981" }}>+{positive}</span>
          )}
          {negative > 0 && (
            <span style={{ color: "#C9970D" }}>-{negative}</span>
          )}
          {neutral > 0 && (
            <span style={{ color: "var(--text-tertiary)" }}>{neutral} neutral</span>
          )}
          <span style={{ color: "var(--text-tertiary)" }}>
            {(totalMs / 1000).toFixed(1)}s
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {/* Expanded insights */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {fieldScans.map((scan, si) => (
            <div key={si}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  margin: "0 0 6px",
                }}
              >
                Scan {si + 1} — {scan.focus_area} (Round {scan.round})
              </p>
              {scan.insights.map((insight, ii) => (
                <div
                  key={ii}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 0",
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      marginTop: 5,
                      background:
                        insight.sentiment === "positive"
                          ? "#10B981"
                          : insight.sentiment === "negative"
                            ? "#C9970D"
                            : "var(--text-tertiary)",
                    }}
                  />
                  <div>
                    <span style={{ color: "var(--text-primary)" }}>
                      {insight.insight}
                    </span>
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        marginLeft: 6,
                        fontSize: 11,
                      }}
                    >
                      — {insight.advisor_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
