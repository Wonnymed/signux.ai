"use client";

import {
  ClipboardList,
  MessageSquare,
  Swords,
  GitMerge,
  Scale,
  Check,
  Loader2,
} from "lucide-react";
import type { SimulationPhase } from "@/app/lib/types/simulation";
import type { PhaseState } from "@/app/lib/hooks/useSimulationStream";
import type { ComponentType } from "react";

const PHASE_META: Record<
  SimulationPhase,
  { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }
> = {
  planning: { label: "Planning", icon: ClipboardList },
  opening: { label: "Opening Analysis", icon: MessageSquare },
  adversarial: { label: "Adversarial Debate", icon: Swords },
  convergence: { label: "Convergence", icon: GitMerge },
  verdict: { label: "Verdict", icon: Scale },
};

type SimulationProgressProps = {
  phases: PhaseState[];
};

export default function SimulationProgress({ phases }: SimulationProgressProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {phases.map((p, i) => {
        const meta = PHASE_META[p.phase];
        const Icon = meta.icon;
        const isActive = p.status === "active";
        const isComplete = p.status === "complete";
        const isPending = p.status === "pending";
        const isLast = i === phases.length - 1;

        return (
          <div key={p.phase} style={{ display: "flex", gap: 12, position: "relative" }}>
            {/* Vertical line connecting phases */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  left: 15,
                  top: 32,
                  width: 2,
                  height: "calc(100% - 16px)",
                  background: isComplete
                    ? "#10B981"
                    : isActive
                      ? "var(--accent)"
                      : "var(--border-default)",
                  opacity: isPending ? 0.4 : 1,
                  transition: "all 300ms ease-out",
                }}
              />
            )}

            {/* Icon circle */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: isComplete
                  ? "rgba(16,185,129,0.12)"
                  : isActive
                    ? "var(--accent-muted)"
                    : "var(--surface-2)",
                border: isActive
                  ? "2px solid var(--accent)"
                  : isComplete
                    ? "2px solid #10B981"
                    : "1px solid var(--border-default)",
                transition: "all 300ms ease-out",
                opacity: isPending ? 0.5 : 1,
              }}
            >
              {isComplete ? (
                <Check size={14} strokeWidth={2.5} color="#10B981" />
              ) : isActive ? (
                <Loader2
                  size={14}
                  strokeWidth={2}
                  color="var(--accent)"
                  className="spin-icon"
                />
              ) : (
                <Icon
                  size={14}
                  strokeWidth={1.5}
                />
              )}
            </div>

            {/* Label */}
            <div
              style={{
                paddingTop: 5,
                paddingBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive
                    ? "var(--accent)"
                    : isComplete
                      ? "var(--text-secondary)"
                      : "var(--text-tertiary)",
                  transition: "color 300ms ease-out",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {meta.label}
              </span>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
