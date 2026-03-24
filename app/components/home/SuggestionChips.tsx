"use client";

import { useState, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const SUGGESTIONS: Record<string, string[][]> = {
  simulate: [
    [
      "Should I raise a Series A now or wait 6 months?",
      "Is it worth expanding to Japan this quarter?",
      "Should we pivot from B2B to B2C?",
      "Acquire this competitor or build in-house?",
    ],
    [
      "Should I shut down the underperforming product line?",
      "Is remote-first sustainable for our stage?",
      "Partner with this enterprise client or stay independent?",
      "Go freemium or keep the paywall?",
    ],
  ],
  build: [
    [
      "Build a mobile app or stay web-only?",
      "Rewrite in TypeScript or keep Python?",
      "Monorepo or multi-repo?",
      "Buy this SaaS tool or build internal?",
    ],
  ],
  grow: [
    [
      "Double down on paid ads or go organic?",
      "Launch in Korea or Southeast Asia first?",
      "Hire a growth lead or keep it founder-led?",
      "Product-led growth or sales-led?",
    ],
  ],
  hire: [
    [
      "Hire a CTO or promote internally?",
      "Open a Seoul office or stay remote?",
      "Senior expensive hire vs two juniors?",
      "Use an agency or build an in-house team?",
    ],
  ],
  protect: [
    [
      "Sue for IP infringement or settle?",
      "Accept this term sheet or negotiate harder?",
      "Fire the underperforming cofounder?",
      "Disclose the data breach now or investigate first?",
    ],
  ],
  compete: [
    [
      "Price below the market leader or match them?",
      "Copy their feature or differentiate?",
      "Target their customers directly?",
      "Announce early to claim the narrative?",
    ],
  ],
};

type SuggestionChipsProps = {
  engine: string;
  onSelect: (suggestion: string) => void;
};

export default function SuggestionChips({ engine, onSelect }: SuggestionChipsProps) {
  const [setIndex, setSetIndex] = useState(0);
  const [refreshHovered, setRefreshHovered] = useState(false);
  const [hoveredChip, setHoveredChip] = useState<number | null>(null);

  const sets = useMemo(() => SUGGESTIONS[engine] || SUGGESTIONS.simulate, [engine]);
  const chips = sets[setIndex % sets.length];

  const handleRefresh = useCallback(() => {
    setSetIndex((prev) => prev + 1);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: 600,
      }}
    >
      {chips.map((chip, i) => (
        <button
          key={`${engine}-${setIndex}-${i}`}
          onClick={() => onSelect(chip)}
          onMouseEnter={() => setHoveredChip(i)}
          onMouseLeave={() => setHoveredChip(null)}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            border: `1px solid ${hoveredChip === i ? "var(--accent)" : "var(--border-default)"}`,
            background: hoveredChip === i ? "var(--accent-glow)" : "transparent",
            color: hoveredChip === i ? "var(--accent)" : "var(--text-secondary)",
            fontSize: 12.5,
            fontWeight: 400,
            cursor: "pointer",
            transition: "all var(--transition-normal)",
            whiteSpace: "nowrap",
            lineHeight: 1.4,
            fontFamily: "inherit",
          }}
        >
          {chip}
        </button>
      ))}
      <button
        onClick={handleRefresh}
        onMouseEnter={() => setRefreshHovered(true)}
        onMouseLeave={() => setRefreshHovered(false)}
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--border-subtle)",
          background: refreshHovered ? "var(--surface-2)" : "transparent",
          color: "var(--icon-secondary)",
          opacity: refreshHovered ? 0.7 : 0.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all var(--transition-normal)",
          flexShrink: 0,
        }}
        title="More suggestions"
      >
        <RefreshCw size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
}
