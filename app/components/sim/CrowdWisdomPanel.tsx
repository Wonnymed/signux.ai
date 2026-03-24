"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Lightbulb } from "lucide-react";
import type { CrowdWisdomResult, AdvisorPersona } from "@/lib/agents/advisors";

type CrowdWisdomPanelProps = {
  crowdResult: CrowdWisdomResult | null;
  personas: AdvisorPersona[] | null;
  isLoading: boolean;
};

const STAKEHOLDER_LABELS: Record<string, { emoji: string; label: string }> = {
  customers: { emoji: "👥", label: "Customers" },
  competitors: { emoji: "⚔️", label: "Competitors" },
  experts: { emoji: "🎓", label: "Experts" },
  community: { emoji: "🏘️", label: "Community" },
  supply_chain: { emoji: "📦", label: "Supply Chain" },
  indirect: { emoji: "💼", label: "Indirect" },
  wildcards: { emoji: "🃏", label: "Wildcards" },
};

function getPositionStyle(position: string) {
  switch (position) {
    case "support":
      return { bg: "rgba(16,185,129,0.12)", color: "#10B981", label: "SUPPORT" };
    case "concern":
      return { bg: "rgba(244,63,94,0.12)", color: "#F43F5E", label: "CONCERN" };
    default:
      return { bg: "rgba(0,0,0,0.06)", color: "var(--text-tertiary)", label: "NEUTRAL" };
  }
}

function getConfidenceColor(c: number) {
  if (c >= 7) return "#10B981";
  if (c >= 4) return "#F59E0B";
  return "#F43F5E";
}

export default function CrowdWisdomPanel({ crowdResult, personas, isLoading }: CrowdWisdomPanelProps) {
  const [open, setOpen] = useState(true);

  // Render nothing if no data and not loading
  if (!crowdResult && !isLoading) return null;

  const audit = crowdResult?.audit_trail;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--surface-raised)",
      }}
    >
      {/* ── 1. Header Bar ── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          background: "var(--accent-glow)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Users size={16} strokeWidth={1.5} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>
          {isLoading && !crowdResult
            ? "Crowd Wisdom · Generating local voices..."
            : `Crowd Wisdom · ${crowdResult?.advisors.length ?? 20} Local Voices`}
        </span>
        {crowdResult && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "var(--radius-full)",
              background: "var(--accent-muted)",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            Quality: {crowdResult.quality_score}/100
          </span>
        )}
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          style={{
            color: "var(--icon-secondary)",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 150ms ease-out",
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Collapsible Body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Loading skeleton */}
              {isLoading && !crowdResult && (
                <>
                  <div style={{ height: 10, borderRadius: 5, background: "var(--surface-2)" }} className="skeleton-pulse" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton-pulse"
                        style={{
                          height: 72,
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-1)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {crowdResult && (
                <>
                  {/* ── 2. Sentiment Bar ── */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        height: 10,
                        borderRadius: 5,
                        overflow: "hidden",
                        background: "var(--surface-2)",
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${crowdResult.sentiment.support}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{ background: "#10B981", height: "100%" }}
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${crowdResult.sentiment.neutral}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                        style={{ background: "var(--border-strong)", height: "100%" }}
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${crowdResult.sentiment.concern}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                        style={{ background: "#F43F5E", height: "100%" }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "#10B981" }}>Support {crowdResult.sentiment.support}%</span>
                      <span style={{ color: "var(--text-tertiary)" }}>Neutral {crowdResult.sentiment.neutral}%</span>
                      <span style={{ color: "#F43F5E" }}>Concern {crowdResult.sentiment.concern}%</span>
                    </div>
                  </div>

                  {/* ── 3. Key Insight Box ── */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "var(--accent-muted)",
                      borderLeft: "3px solid var(--accent)",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <Lightbulb size={16} strokeWidth={1.5} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
                        {crowdResult.key_insight}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
                        {crowdResult.consensus_shift}
                      </p>
                    </div>
                  </div>

                  {/* ── 4. Stakeholder Coverage ── */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(crowdResult.stakeholder_coverage).map(([type, count]) => {
                      const meta = STAKEHOLDER_LABELS[type];
                      if (!meta || count === 0) return null;
                      return (
                        <span
                          key={type}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                            background: "var(--surface-2)",
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {meta.emoji} {meta.label} {count}
                        </span>
                      );
                    })}
                  </div>

                  {/* ── 5. Advisor Grid ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {crowdResult.advisors.map((advisor, i) => {
                      const pos = getPositionStyle(advisor.position);
                      const persona = personas?.find((p) => p.id === advisor.advisor_id);
                      return (
                        <motion.div
                          key={`${advisor.advisor_id}_${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.2, ease: "easeOut" }}
                          style={{
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-1)",
                            border: "1px solid var(--border-subtle)",
                            display: "flex",
                            gap: 10,
                            minHeight: 0,
                            maxHeight: 88,
                            overflow: "hidden",
                          }}
                        >
                          {/* Emoji avatar */}
                          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                            {persona?.emoji || "👤"}
                          </span>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {advisor.advisor_name}
                              </span>
                              <span
                                style={{
                                  padding: "1px 7px",
                                  borderRadius: "var(--radius-full)",
                                  background: pos.bg,
                                  color: pos.color,
                                  fontSize: 9,
                                  fontWeight: 600,
                                  letterSpacing: 0.3,
                                  flexShrink: 0,
                                }}
                              >
                                {pos.label}
                              </span>
                            </div>
                            {persona && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-tertiary)",
                                  margin: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {persona.role}
                              </p>
                            )}
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                                margin: "4px 0 0",
                                lineHeight: 1.4,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical" as const,
                                overflow: "hidden",
                              }}
                            >
                              {advisor.insight}
                            </p>
                          </div>

                          {/* Confidence */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: getConfidenceColor(advisor.confidence),
                              flexShrink: 0,
                              alignSelf: "flex-end",
                            }}
                          >
                            {advisor.confidence}/10
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* ── 6. Audit Footer ── */}
                  {audit && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-disabled)",
                        textAlign: "right",
                        margin: 0,
                      }}
                    >
                      {audit.advisors_completed + audit.advisors_failed} advisors · {audit.advisors_completed} completed
                      {audit.advisors_failed > 0 ? ` · ${audit.advisors_failed} failed` : ""} ·{" "}
                      {(audit.duration_ms / 1000).toFixed(1)}s · Haiku
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
