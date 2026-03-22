"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Zap, Shield, Eye, FileText, Link2, ArrowLeft, Target } from "lucide-react";
import { useIsMobile } from "../lib/useIsMobile";
import { PageShell, PageHeader, SectionCard, EmptyState } from "../components/PageShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Activity = {
  id: string;
  context_type: string;
  summary: string;
  created_at: string;
  key_insights?: string[];
};

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    simulations: 0,
    intelReports: 0,
    activeWatches: 0,
    decisions: 0,
    sharedResults: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<string | null>(null);
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [contextRes, watchRes, sharedRes, decisionRes, decisionScoresRes] = await Promise.all([
        supabase.from("user_context").select("id, context_type, summary, created_at, key_insights").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("intelligence_watches").select("id").eq("user_id", user.id).eq("status", "active"),
        supabase.from("shared_results").select("id").eq("user_id", user.id),
        supabase.from("decision_journal").select("id").eq("user_id", user.id),
        supabase.from("decision_journal").select("score").eq("user_id", user.id).not("score", "is", null),
      ]);

      const contexts = contextRes.data || [];
      setRecentActivity(contexts.slice(0, 10));
      setStats({
        simulations: contexts.filter(c => c.context_type === "simulation").length,
        intelReports: contexts.filter(c => ["chat", "compete", "research"].includes(c.context_type)).length,
        activeWatches: watchRes.data?.length || 0,
        decisions: decisionRes.data?.length || 0,
        sharedResults: sharedRes.data?.length || 0,
      });
      // Calibration: compute accuracy from decision scores
      const scores = decisionScoresRes.data || [];
      if (scores.length > 0) {
        const accurate = scores.filter((d: any) => d.score >= 6).length;
        setAccuracy((accurate / scores.length * 100).toFixed(0));
        setTrackedCount(scores.length);
      }

      // Load patterns (background, don't block)
      fetch(`/api/patterns?userId=${user.id}`)
        .then(r => r.json())
        .then(d => { if (d.patterns) setPatterns(d.patterns); })
        .catch(() => {});
    } catch {}
    setLoading(false);
  };

  const STAT_CARDS = [
    { label: "Simulations", value: stats.simulations, color: "#C8A84E", icon: Zap },
    { label: "Intel Reports", value: stats.intelReports, color: "#DC2626", icon: Shield },
    { label: "Active Watches", value: stats.activeWatches, color: "#22C55E", icon: Eye },
    { label: "Decisions", value: stats.decisions, color: "#8B5CF6", icon: FileText },
    { label: "Shared", value: stats.sharedResults, color: "#06B6D4", icon: Link2 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <PageShell type="system">
        <a href="/chat" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          color: "#52525B", fontSize: 12, textDecoration: "none",
          marginBottom: 20, transition: "color 180ms ease-out",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#A1A1AA"}
          onMouseLeave={e => e.currentTarget.style.color = "#52525B"}
        >
          <ArrowLeft size={13} strokeWidth={1.5} /> Back to Signux
        </a>

        <PageHeader
          eyebrow="Usage"
          title="Intelligence Dashboard"
          subtitle="Your decision intelligence at a glance"
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#52525B", fontSize: 13 }}>Loading...</div>
        ) : (
          <>
            {/* Stats grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
              gap: 10, marginBottom: 28,
            }}>
              {STAT_CARDS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} style={{
                    padding: "14px 16px", borderRadius: 10,
                    border: "1px solid #27272A",
                    background: "rgba(255,255,255,0.015)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
                      letterSpacing: 0.8, color: "#52525B", marginBottom: 8,
                      textTransform: "uppercase",
                    }}>
                      <Icon size={12} strokeWidth={1.5} style={{ color: stat.color }} /> {stat.label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: "#E4E4E7" }}>
                      {stat.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calibration + Patterns row */}
            <div style={{ display: "grid", gridTemplateColumns: accuracy ? (isMobile ? "1fr" : "200px 1fr") : "1fr", gap: 16, marginBottom: 32 }}>
              {/* Accuracy card */}
              {accuracy && (
                <div style={{
                  padding: "20px 14px", borderRadius: 12,
                  border: "1px solid var(--border-secondary)",
                  background: "var(--card-bg)", textAlign: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                    <Target size={14} style={{ color: parseInt(accuracy) >= 70 ? "#22c55e" : "#f59e0b" }} />
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Prediction Accuracy</span>
                  </div>
                  <div style={{
                    fontSize: 36, fontWeight: 800,
                    color: parseInt(accuracy) >= 70 ? "#22c55e" : parseInt(accuracy) >= 50 ? "#f59e0b" : "#ef4444",
                  }}>
                    {accuracy}%
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
                    Based on {trackedCount} tracked outcomes
                  </div>
                </div>
              )}

              {/* Patterns */}
              {patterns && patterns.patterns && patterns.patterns.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>🧠</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Patterns from your analyses</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {patterns.patterns.map((p: any, i: number) => {
                      const tc: Record<string, { color: string; bg: string; icon: string }> = {
                        strength: { color: "#22c55e", bg: "rgba(34,197,94,0.06)", icon: "💪" },
                        weakness: { color: "#f59e0b", bg: "rgba(245,158,11,0.06)", icon: "⚠️" },
                        blind_spot: { color: "#ef4444", bg: "rgba(239,68,68,0.06)", icon: "👁" },
                      };
                      const cfg = tc[p.type] || tc.strength;
                      return (
                        <div key={i} style={{
                          padding: "10px 12px", borderRadius: 8,
                          background: cfg.bg, border: `1px solid ${cfg.color}15`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                              {p.type.replace("_", " ")}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{p.insight}</div>
                          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{p.evidence}</div>
                        </div>
                      );
                    })}
                  </div>
                  {patterns.recommendation && (
                    <div style={{
                      marginTop: 8, padding: "8px 12px", borderRadius: 8,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 11, color: "var(--text-secondary)",
                    }}>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>Tip:</span> {patterns.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <h2 style={{
              fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
              letterSpacing: 1.6, color: "#52525B", textTransform: "uppercase",
              marginBottom: 12,
            }}>
              Recent Activity
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentActivity.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Run your first simulation or analysis to see results here."
                />
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} style={{
                    padding: "12px 16px", borderRadius: 10,
                    border: "1px solid var(--border-secondary)",
                    background: "var(--card-bg)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: item.context_type === "simulation" ? "rgba(255,255,255,0.03)" : "rgba(220,38,38,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {item.context_type === "simulation" ? (
                        <Zap size={14} style={{ color: "#C8A84E" }} />
                      ) : (
                        <Shield size={14} style={{ color: "#DC2626" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.summary?.slice(0, 100) || item.context_type}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {new Date(item.created_at).toLocaleDateString()} — {item.context_type}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </PageShell>
    </div>
  );
}
