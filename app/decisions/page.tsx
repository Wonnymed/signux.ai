"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { createSupabaseBrowser } from "../lib/supabase-browser";
import {
  FullPageShell, PageHeader, EmptyState, BackLink,
  SectionLabel, ListItem, Badge, AuthGate,
  Z800, Z700, Z600, Z500, Z200,
} from "../components/PageShell";

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
    <FullPageShell type="workspace">
      <BackLink />

      <PageHeader
        eyebrow="Workspace"
        title="Decision Journal"
        subtitle="Track your decisions and learn from outcomes over time."
      />

      {!user && !authLoading && (
        <AuthGate
          title="Sign in to view decisions"
          description="Sign in to see your decision journal and track outcomes."
        />
      )}

      {loading && user && (
        <div style={{ textAlign: "center", padding: 40, color: Z600, fontSize: 13 }}>Loading...</div>
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
          <SectionLabel count={pendingFollowups.length} style={{ color: "#A855F7" }}>
            Pending follow-ups
          </SectionLabel>
          {pendingFollowups.map(d => (
            <div key={d.id} style={{
              padding: 16, borderRadius: 12,
              border: "1px solid rgba(168,85,247,0.12)",
              background: "rgba(168,85,247,0.03)",
              marginBottom: 8,
            }}>
              <div style={{ fontSize: 14, color: Z200, marginBottom: 4 }}>{d.decision_summary}</div>
              <div style={{ fontSize: 11, color: Z600, marginBottom: 4 }}>
                {d.ai_recommendation}
              </div>
              <div style={{ fontSize: 10, color: Z600, marginBottom: 10, fontFamily: "var(--font-mono)" }}>
                {new Date(d.decision_date).toLocaleDateString()} · {d.decision_category}
                {d.ai_confidence && ` · ${d.ai_confidence} confidence`}
              </div>
              <div style={{ fontSize: 11, color: Z500, marginBottom: 8 }}>How did this turn out?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["great", "good", "neutral", "bad", "terrible"].map(outcome => (
                  <button key={outcome} onClick={() => setOutcome(d.id, outcome)} style={{
                    padding: "4px 12px", borderRadius: 6,
                    border: `1px solid ${Z800}`,
                    background: "rgba(255,255,255,0.015)",
                    fontSize: 11, color: Z500,
                    cursor: "pointer", textTransform: "capitalize",
                    transition: "all 180ms ease-out",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#A855F7"; e.currentTarget.style.color = Z200; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = Z800; e.currentTarget.style.color = Z500; }}
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
          <SectionLabel count={decisions.length}>All decisions</SectionLabel>
          {decisions.map(d => {
            const oc = d.outcome ? outcomeColor(d.outcome) : null;
            return (
              <ListItem
                key={d.id}
                badge={oc ? <Badge color={oc.color} bg={oc.bg}>{d.outcome}</Badge> : undefined}
              >
                <div style={{ fontSize: 13, color: Z200, marginBottom: 2 }}>{d.decision_summary}</div>
                <div style={{ fontSize: 10, color: Z600, fontFamily: "var(--font-mono)" }}>
                  {new Date(d.decision_date).toLocaleDateString()} · {d.decision_category}
                  {d.ai_confidence && ` · ${d.ai_confidence}`}
                </div>
              </ListItem>
            );
          })}
        </>
      )}
    </FullPageShell>
  );
}
