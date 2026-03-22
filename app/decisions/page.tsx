"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import { ArrowLeft } from "lucide-react";
import { PageShell, PageHeader, EmptyState } from "../components/PageShell";

type Decision = {
  id: string;
  decision_date: string;
  decision_summary: string;
  decision_category: string;
  ai_recommendation: string;
  ai_confidence: string;
  follow_up_date: string;
  outcome: string | null;
  outcome_notes: string | null;
  outcome_date: string | null;
};

export default function DecisionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const supabase = createSupabaseBrowser();
        const { data } = await supabase
          .from("decision_journal")
          .select("*")
          .eq("user_id", user.id)
          .order("decision_date", { ascending: false });
        if (data) setDecisions(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user, authLoading]);

  const setOutcome = async (id: string, outcome: string) => {
    try {
      const supabase = createSupabaseBrowser();
      await supabase.from("decision_journal").update({ outcome, outcome_date: new Date().toISOString() }).eq("id", id);
      setDecisions(prev => prev.map(p => p.id === id ? { ...p, outcome, outcome_date: new Date().toISOString() } : p));
    } catch {}
  };

  const pendingFollowups = decisions.filter(d => !d.outcome && d.follow_up_date && new Date(d.follow_up_date) <= new Date());

  const outcomeColor = (o: string) => {
    if (o === "great" || o === "good") return { bg: "rgba(34,197,94,0.1)", color: "#22c55e" };
    if (o === "neutral") return { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" };
    return { bg: "rgba(239,68,68,0.1)", color: "#ef4444" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <PageShell type="workspace">
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
          eyebrow="Workspace"
          title="Decision Journal"
          subtitle="Track your decisions and learn from outcomes over time."
        />

      {!user && !authLoading && (
        <EmptyState title="Sign in required" description="Sign in to see your decision journal." />
      )}

      {loading && user && (
        <div style={{ textAlign: "center", padding: 40, color: "#52525B", fontSize: 13 }}>Loading...</div>
      )}

      {!loading && user && decisions.length === 0 && (
        <EmptyState
          title="No decisions tracked yet"
          description="Signux automatically tracks important decisions from your conversations."
        />
      )}

      {/* Pending follow-ups */}
      {pendingFollowups.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#A855F7", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Pending follow-ups ({pendingFollowups.length})
          </h2>
          {pendingFollowups.map(d => (
            <div key={d.id} style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(168,85,247,0.12)", background: "rgba(168,85,247,0.03)", marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{d.decision_summary}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
                {d.ai_recommendation}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
                {new Date(d.decision_date).toLocaleDateString()} · {d.decision_category}
                {d.ai_confidence && ` · ${d.ai_confidence} confidence`}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>How did this turn out?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["great", "good", "neutral", "bad", "terrible"].map(outcome => (
                  <button key={outcome} onClick={() => setOutcome(d.id, outcome)} style={{
                    padding: "4px 12px", borderRadius: 6, border: "1px solid var(--card-border)",
                    background: "var(--card-bg)", fontSize: 11, color: "var(--text-secondary)",
                    cursor: "pointer", textTransform: "capitalize", transition: "all 150ms",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#A855F7"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; }}
                  >
                    {outcome}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All decisions */}
      {decisions.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            All decisions ({decisions.length})
          </h2>
          {decisions.map(d => {
            const oc = d.outcome ? outcomeColor(d.outcome) : null;
            return (
              <div key={d.id} style={{
                padding: 14, borderRadius: 10, border: "1px solid var(--card-border)",
                background: "var(--card-bg)", marginBottom: 6,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>{d.decision_summary}</div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {new Date(d.decision_date).toLocaleDateString()} · {d.decision_category}
                    {d.ai_confidence && ` · ${d.ai_confidence}`}
                  </div>
                </div>
                {oc && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4, flexShrink: 0, marginLeft: 8,
                    background: oc.bg, color: oc.color, textTransform: "capitalize",
                  }}>
                    {d.outcome}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </PageShell>
    </div>
  );
}
