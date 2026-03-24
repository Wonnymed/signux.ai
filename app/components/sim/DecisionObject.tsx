"use client";

import { useState, forwardRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Share2, RotateCw } from "lucide-react";
import type { DecisionObject as DecisionObjectType } from "@/app/lib/types/simulation";
import InlineCitation from "./InlineCitation";

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  proceed: { label: "PROCEED", color: "#10B981" },
  proceed_with_conditions: { label: "PROCEED WITH CONDITIONS", color: "#7C3AED" },
  delay: { label: "DELAY", color: "#F59E0B" },
  abandon: { label: "ABANDON", color: "#F43F5E" },
};

type DecisionObjectProps = {
  verdict: DecisionObjectType;
};

const DecisionObjectCard = forwardRef<HTMLDivElement, DecisionObjectProps>(function DecisionObjectCard({ verdict }, ref) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const question = searchParams.get("question") || "";
  const rec = RECOMMENDATION_LABELS[verdict.recommendation] || {
    label: verdict.recommendation.toUpperCase(),
    color: "var(--text-primary)",
  };

  // Map citation ids for inline references
  const citationMap = new Map(verdict.citations.map((c) => [c.id, c]));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        border: "1px solid var(--border-default)",
        borderTop: "3px solid #7C3AED",
        borderRadius: "var(--radius-lg)",
        padding: 28,
        background: "var(--surface-raised)",
      }}
    >
      {/* Recommendation badge */}
      <span
        style={{
          display: "inline-block",
          padding: "5px 14px",
          borderRadius: "var(--radius-full)",
          background: `${rec.color}14`,
          color: rec.color,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.8,
        }}
      >
        {rec.label}
      </span>

      {/* Probability + Grade row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 24,
        }}
      >
        {/* Probability ring */}
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width={80} height={80} viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth={6}
            />
            {/* Progress ring */}
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="#7C3AED"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${(verdict.probability / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dasharray 600ms ease-out" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {verdict.probability}%
            </span>
          </div>
        </div>

        {/* Grade */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {verdict.grade}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "var(--text-tertiary)",
              }}
            >
              {verdict.grade_score}/100
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "var(--text-tertiary)",
              marginTop: 4,
            }}
          >
            Simulation grade
          </p>
        </div>
      </div>

      {/* Details */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Main risk */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>
            Main Risk
          </p>
          <p style={{ fontSize: 14, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
            {verdict.main_risk}
            {citationMap.get(2) && (
              <>
                {" "}
                <InlineCitation citation={citationMap.get(2)!} />
              </>
            )}
          </p>
        </div>

        {/* Leverage point */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>
            Leverage Point
          </p>
          <p style={{ fontSize: 14, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
            {verdict.leverage_point}
          </p>
        </div>

        {/* Next action — highlighted */}
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.12)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 500, color: "#7C3AED", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>
            Next Action
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
            {verdict.next_action}
          </p>
        </div>
      </div>

      {/* Citations strip */}
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {verdict.citations.map((c) => (
          <InlineCitation key={c.id} citation={c} />
        ))}
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 4, alignSelf: "center" }}>
          {verdict.citations.length} citations from agent debate
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <ActionButton icon={Download} label="Export" />
        <ActionButton icon={Share2} label="Share" />
        <ActionButton
          icon={RotateCw}
          label="Run Again"
          onClick={() => {
            const params = question ? `?q=${encodeURIComponent(question)}` : "";
            router.push(`/${params}`);
          }}
        />
      </div>
    </motion.div>
  );
});

export default DecisionObjectCard;

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Download;
  label: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border-default)"}`,
        background: "transparent",
        color: hovered ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 13,
        fontWeight: 400,
        cursor: "pointer",
        transition: "all 150ms ease-out",
      }}
    >
      <Icon size={14} strokeWidth={1.5} />
      {label}
    </button>
  );
}
