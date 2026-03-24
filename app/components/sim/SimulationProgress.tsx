"use client";

import { Check, Loader2, Circle, SkipForward } from "lucide-react";
import type { RoundState } from "@/app/lib/hooks/useSimulationStream";

type SimulationProgressProps = {
  rounds: RoundState[];
  currentRound: number;
  totalRounds?: number;
};

export default function SimulationProgress({
  rounds,
  currentRound,
  totalRounds = 10,
}: SimulationProgressProps) {
  // Build all 10 rounds — fill in pending ones that haven't arrived yet
  const allRounds: RoundState[] = [];
  for (let i = 1; i <= totalRounds; i++) {
    const existing = rounds.find((r) => r.round === i);
    if (existing) {
      allRounds.push(existing);
    } else {
      allRounds.push({
        round: i,
        title: `Round ${i}`,
        description: "",
        status: "pending",
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          margin: "0 0 12px",
        }}
      >
        Rounds {currentRound > 0 ? `${currentRound}/${totalRounds}` : ""}
      </p>

      {allRounds.map((r, i) => {
        const isActive = r.status === "active";
        const isComplete = r.status === "complete";
        const isSkipped = r.status === "skipped";
        const isPending = r.status === "pending";
        const isLast = i === allRounds.length - 1;

        return (
          <div
            key={r.round}
            style={{ display: "flex", gap: 10, position: "relative" }}
          >
            {/* Vertical connector line */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  left: 9,
                  top: 20,
                  width: 2,
                  height: "calc(100% - 4px)",
                  background: isComplete || isSkipped
                    ? "#10B981"
                    : isActive
                      ? "var(--accent)"
                      : "var(--border-default)",
                  opacity: isPending ? 0.3 : isSkipped ? 0.5 : 1,
                  transition: "all 300ms ease-out",
                }}
              />
            )}

            {/* Status indicator */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: isComplete
                  ? "rgba(16,185,129,0.12)"
                  : isActive
                    ? "var(--accent-muted)"
                    : isSkipped
                      ? "rgba(16,185,129,0.06)"
                      : "transparent",
                border: isComplete
                  ? "2px solid #10B981"
                  : isActive
                    ? "2px solid var(--accent)"
                    : isSkipped
                      ? "1px solid rgba(16,185,129,0.3)"
                      : "1px solid var(--border-default)",
                transition: "all 300ms ease-out",
                opacity: isPending ? 0.4 : 1,
              }}
            >
              {isComplete ? (
                <Check size={10} strokeWidth={3} color="#10B981" />
              ) : isActive ? (
                <Loader2
                  size={10}
                  strokeWidth={2.5}
                  color="var(--accent)"
                  className="spin-icon"
                />
              ) : isSkipped ? (
                <SkipForward size={8} strokeWidth={2} color="#10B981" />
              ) : (
                <Circle size={6} strokeWidth={0} fill="var(--text-tertiary)" style={{ opacity: 0.3 }} />
              )}
            </div>

            {/* Round info */}
            <div style={{ paddingBottom: 12, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--accent)"
                    : isComplete
                      ? "var(--text-secondary)"
                      : isSkipped
                        ? "var(--text-tertiary)"
                        : "var(--text-tertiary)",
                  transition: "color 300ms ease-out",
                  opacity: isPending ? 0.4 : isSkipped ? 0.6 : 1,
                  display: "block",
                  lineHeight: 1.3,
                }}
              >
                {r.title}
              </span>
              {r.description && !isPending && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    opacity: isSkipped ? 0.5 : 0.7,
                    display: "block",
                    lineHeight: 1.3,
                    marginTop: 1,
                  }}
                >
                  {r.description}
                </span>
              )}
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
