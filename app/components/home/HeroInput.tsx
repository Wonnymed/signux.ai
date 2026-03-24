"use client";

import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";

type HeroInputProps = {
  onSubmit: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
};

export default function HeroInput({ onSubmit, placeholder, defaultValue = "" }: HeroInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
    },
    [value, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 560 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border-default)"}`,
          borderBottom: focused ? "2px solid var(--accent)" : `1px solid ${hovered ? "var(--border-strong)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-lg)",
          padding: focused ? "12px 16px 11px" : "12px 16px",
          background: "var(--surface-raised)",
          boxShadow: focused
            ? "0 0 0 3px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.06)"
            : hovered
              ? "0 2px 8px rgba(0,0,0,0.08)"
              : "0 1px 4px rgba(0,0,0,0.03)",
          transition: "all var(--transition-normal)",
          gap: 12,
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "What decision are you facing?"}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 15,
            fontWeight: 400,
            color: "var(--text-primary)",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: value.trim() ? "var(--accent)" : "var(--surface-2)",
            color: value.trim() ? "#fff" : "var(--text-disabled)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: value.trim() ? "pointer" : "default",
            transition: "all var(--transition-normal)",
            flexShrink: 0,
          }}
        >
          <ArrowRight size={16} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
