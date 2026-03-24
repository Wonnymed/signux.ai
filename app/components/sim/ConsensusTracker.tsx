"use client";

import { motion } from "framer-motion";
import type { ConsensusState } from "@/app/lib/types/simulation";

type ConsensusTrackerProps = {
  consensus: ConsensusState;
};

export default function ConsensusTracker({ consensus }: ConsensusTrackerProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        background: "var(--surface-raised)",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          margin: "0 0 12px",
        }}
      >
        Consensus
      </p>

      {/* Stacked bar */}
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--surface-2)",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${consensus.proceed}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "#10B981", height: "100%" }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${consensus.delay}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{ background: "#F59E0B", height: "100%" }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${consensus.abandon}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          style={{ background: "#F43F5E", height: "100%" }}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 12,
          fontWeight: 400,
        }}
      >
        <span style={{ color: "#10B981" }}>Proceed {consensus.proceed}%</span>
        <span style={{ color: "#F59E0B" }}>Delay {consensus.delay}%</span>
        <span style={{ color: "#F43F5E" }}>Abandon {consensus.abandon}%</span>
      </div>

      {/* Avg confidence */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 400,
          color: "var(--text-tertiary)",
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Avg confidence: {consensus.avg_confidence}/10
      </p>
    </div>
  );
}
