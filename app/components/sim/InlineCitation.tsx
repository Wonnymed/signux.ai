"use client";

import { useState } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import type { Citation } from "@/app/lib/types/simulation";

type InlineCitationProps = {
  citation: Citation;
};

function getConfidenceColor(c: number) {
  if (c >= 7) return "#10B981";
  if (c >= 4) return "#F59E0B";
  return "#F43F5E";
}

export default function InlineCitation({ citation }: InlineCitationProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <span
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: "var(--radius-full)",
            background: hovered
              ? "rgba(124,58,237,0.20)"
              : "rgba(124,58,237,0.10)",
            color: "#7C3AED",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            verticalAlign: "super",
            marginLeft: 1,
            marginRight: 1,
            lineHeight: 1,
            transition: "background 150ms ease-out",
          }}
        >
          {citation.id}
        </span>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="center"
          sideOffset={8}
          style={{
            width: 280,
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            animationDuration: "150ms",
          }}
        >
          {/* Agent info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(124,58,237,0.12)",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {citation.agent_name.charAt(0)}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {citation.agent_name}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 600,
                color: getConfidenceColor(citation.confidence),
              }}
            >
              {citation.confidence}/10
            </span>
          </div>

          {/* Claim */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            &ldquo;{citation.claim}&rdquo;
          </p>

          <HoverCard.Arrow
            style={{ fill: "var(--surface-raised)" }}
            width={12}
            height={6}
          />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
