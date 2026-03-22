"use client";
import React from "react";
import { ArrowRight } from "lucide-react";

interface ActionListProps {
  actions: string[];
  title?: string;
}

export default function ActionList({ actions, title }: ActionListProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {title && (
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </span>
      )}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {actions.map((action, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              borderTop: i > 0 ? "1px solid var(--border-secondary)" : undefined,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                minWidth: 18,
                marginTop: 1,
                flexShrink: 0,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <ArrowRight size={11} color="var(--text-tertiary)" style={{ marginTop: 3, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
