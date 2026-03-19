"use client";
import { Lock, ArrowRight, Zap, Crown } from "lucide-react";

const TIER_INFO: Record<string, { name: string; color: string; icon: any }> = {
  pro: { name: "Pro", color: "#D4AF37", icon: Zap },
  max: { name: "Max", color: "#A855F7", icon: Crown },
};

export default function Paywall({ requiredTier }: { requiredTier: string }) {
  const info = TIER_INFO[requiredTier] || TIER_INFO.pro;
  const Icon = info.icon;

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 40,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: `${info.color}10`, border: `1px solid ${info.color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Lock size={28} style={{ color: info.color }} />
        </div>

        <h2 style={{
          fontSize: 22, fontWeight: 600, marginBottom: 8,
          fontFamily: "var(--font-brand)", letterSpacing: 1,
        }}>
          {requiredTier === "max" ? "This decision needs deeper intelligence" : "You're about to decide without the full picture"}
        </h2>

        <p style={{
          fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5,
          marginBottom: 24,
        }}>
          {requiredTier === "max"
            ? "International operations and investment analysis require the most powerful tools. Max users get the full picture."
            : "Hidden risks, competitor moves, and critical data that Pro users see before every decision."}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.href = "/pricing"}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 10,
              background: info.color, color: "#000", border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-brand)", letterSpacing: 1,
            }}
          >
            <Icon size={16} /> See what you&apos;re missing <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
