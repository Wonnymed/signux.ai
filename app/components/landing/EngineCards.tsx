"use client";

import { useState } from "react";
import {
  Zap,
  Hammer,
  TrendingUp,
  UserCheck,
  Shield,
  Swords,
} from "lucide-react";
import type { ComponentType } from "react";

type EngineCard = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  description: string;
};

const ENGINES: EngineCard[] = [
  {
    id: "simulate",
    label: "Simulate",
    icon: Zap,
    color: "#7C3AED",
    description: "Pressure-test any decision with adversarial debate",
  },
  {
    id: "build",
    label: "Build",
    icon: Hammer,
    color: "#10B981",
    description: "Turn an idea into an executable action plan",
  },
  {
    id: "grow",
    label: "Grow",
    icon: TrendingUp,
    color: "#F59E0B",
    description: "Find the fastest path to revenue growth",
  },
  {
    id: "hire",
    label: "Hire",
    icon: UserCheck,
    color: "#06B6D4",
    description: "Evaluate who to hire and when",
  },
  {
    id: "protect",
    label: "Protect",
    icon: Shield,
    color: "#F43F5E",
    description: "Find what could break your business",
  },
  {
    id: "compete",
    label: "Compete",
    icon: Swords,
    color: "#F97316",
    description: "See how rivals move, find where you win",
  },
];

export default function EngineCardsSection() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section
      style={{
        width: "100%",
        background: "#FFFFFF",
        padding: "96px 24px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          Six engines. One decision platform.
        </h2>
        <p
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: "var(--text-secondary)",
            marginTop: 12,
          }}
        >
          Each engine deploys specialized agents for a different type of decision.
        </p>
      </div>

      {/* Cards grid */}
      <div className="engine-cards-grid">
        {ENGINES.map((engine) => {
          const isHovered = hovered === engine.id;
          return (
            <div
              key={engine.id}
              onMouseEnter={() => setHovered(engine.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: 24,
                borderRadius: 12,
                border: `1px solid ${isHovered ? engine.color : "var(--border-default)"}`,
                background: "#FFFFFF",
                cursor: "pointer",
                transition: "all 150ms ease-out",
                transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                boxShadow: isHovered
                  ? `0 8px 24px ${engine.color}14`
                  : "none",
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `${engine.color}1A`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: engine.color,
                  marginBottom: 16,
                }}
              >
                <engine.icon size={22} strokeWidth={1.5} />
              </div>

              {/* Name */}
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {engine.label}
              </p>

              {/* Description */}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  margin: "6px 0 0",
                  lineHeight: 1.6,
                }}
              >
                {engine.description}
              </p>
            </div>
          );
        })}
      </div>

      <style>{`
        .engine-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .engine-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 540px) {
          .engine-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
