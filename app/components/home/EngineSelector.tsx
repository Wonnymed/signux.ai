"use client";

import { useState } from "react";

type Engine = {
  id: string;
  label: string;
  color: string;
};

const ENGINES: Engine[] = [
  { id: "simulate", label: "Simulate", color: "var(--engine-simulate)" },
  { id: "build", label: "Build", color: "var(--engine-build)" },
  { id: "grow", label: "Grow", color: "var(--engine-grow)" },
  { id: "hire", label: "Hire", color: "var(--engine-hire)" },
  { id: "protect", label: "Protect", color: "var(--engine-protect)" },
  { id: "compete", label: "Compete", color: "var(--engine-compete)" },
];

type EngineSelectorProps = {
  active: string;
  onSelect: (id: string) => void;
};

export default function EngineSelector({ active, onSelect }: EngineSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {ENGINES.map((engine) => {
        const isActive = active === engine.id;
        const isHovered = hovered === engine.id;
        return (
          <button
            key={engine.id}
            onClick={() => onSelect(engine.id)}
            onMouseEnter={() => setHovered(engine.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive
                ? engine.color
                : isHovered
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              background: isActive ? "var(--surface-raised)" : "transparent",
              boxShadow: isActive
                ? "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)"
                : "none",
              transition: "all var(--transition-normal)",
              whiteSpace: "nowrap",
              position: "relative",
            }}
          >
            {engine.label}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 16,
                  height: 2,
                  borderRadius: 1,
                  background: engine.color,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
