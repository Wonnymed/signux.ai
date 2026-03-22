"use client";
import { motion } from "framer-motion";

const ROUND_LABELS = [
  "Framing the decision",
  "Anchoring the outside view",
  "Testing financial viability",
  "Checking regulation & entry",
  "Mapping the execution path",
  "Simulating competitive attack",
  "Testing strategic coherence",
  "Reading regime & timing",
  "Finding best intervention",
  "Final synthesis & vote",
];

type RoundTimelineProps = {
  completedRound: number;
  activeRound: number;
  setActiveRound: (r: number) => void;
  currentRoundLoading?: { round: number; label: string; model: string } | null;
  isMobile?: boolean;
};

export default function RoundTimeline({
  completedRound,
  activeRound,
  setActiveRound,
  currentRoundLoading,
  isMobile,
}: RoundTimelineProps) {
  return (
    <div style={{ padding: isMobile ? "12px 8px 8px" : "16px 20px 8px" }}>
      {/* Round dots */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isMobile ? "flex-start" : "center",
        gap: isMobile ? 2 : 4,
        ...(isMobile ? {
          overflowX: "auto" as const,
          WebkitOverflowScrolling: "touch" as const,
          scrollbarWidth: "none" as const,
          msOverflowStyle: "none" as const,
          paddingBottom: 4,
        } : {}),
      }}>
        {Array.from({ length: 10 }, (_, i) => {
          const roundNum = i + 1;
          const isComplete = roundNum <= completedRound;
          const isCurrent = currentRoundLoading?.round === roundNum;
          const isActive = roundNum === activeRound;

          return (
            <button
              key={i}
              onClick={() => isComplete && setActiveRound(roundNum)}
              title={`R${roundNum}: ${ROUND_LABELS[i]}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "none",
                border: "none",
                cursor: isComplete ? "pointer" : "default",
                opacity: isComplete || isCurrent ? 1 : 0.4,
                padding: isMobile ? "2px 4px" : "2px 6px",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isComplete
                    ? "var(--accent)"
                    : isCurrent
                    ? "transparent"
                    : "var(--border-primary)",
                  border: isCurrent
                    ? "2px solid var(--accent)"
                    : "none",
                  boxShadow: isCurrent
                    ? "0 0 0 3px rgba(200,168,78,0.2)"
                    : "none",
                  transition: "all 200ms ease",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                {isCurrent && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                )}
              </div>
              <span style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)",
                fontWeight: isActive ? 600 : 400,
              }}>
                {roundNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active round label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 6,
        minHeight: 22,
      }}>
        {currentRoundLoading ? (
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}>
            Round {currentRoundLoading.round}: {currentRoundLoading.label}
          </span>
        ) : completedRound > 0 ? (
          <span style={{
            fontSize: 13,
            color: "var(--text-secondary)",
          }}>
            Round {activeRound}: {ROUND_LABELS[activeRound - 1]}
          </span>
        ) : null}
      </div>
    </div>
  );
}
