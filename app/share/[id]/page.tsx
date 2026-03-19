"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import MarkdownRenderer from "../../components/MarkdownRenderer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SharePage() {
  const params = useParams();
  const id = params?.id as string;
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from("shared_results")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setResult(data);
        // Increment view count (fire and forget)
        supabase
          .from("shared_results")
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq("id", id)
          .then(() => {});
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-tertiary)" }}>
      Loading...
    </div>
  );

  if (!result) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-primary)", gap: 16 }}>
      <div style={{ fontSize: 16, color: "var(--text-primary)" }}>Report not found</div>
      <a href="/chat" style={{ color: "var(--accent)", fontSize: 14, textDecoration: "none" }}>Go to Signux AI &rarr;</a>
    </div>
  );

  const typeColors: Record<string, { bg: string; color: string; label: string }> = {
    simulate: { bg: "var(--mode-sim-bg)", color: "var(--mode-sim)", label: "Simulation Report" },
    research: { bg: "var(--mode-res-bg)", color: "var(--mode-res)", label: "Research Report" },
    reality_check: { bg: "rgba(239,68,68,0.08)", color: "#ef4444", label: "Reality Check" },
  };
  const tc = typeColors[result.type] || typeColors.simulate;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid var(--border-secondary)",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-primary)" }}>
          <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 16, letterSpacing: 3 }}>
            SIGNUX <span style={{ fontWeight: 300, opacity: 0.3 }}>AI</span>
          </span>
        </a>
        <a href="/chat" style={{
          padding: "8px 20px", borderRadius: 50, background: "var(--accent)",
          color: "#000", fontWeight: 600, fontSize: 13, textDecoration: "none",
        }}>
          Try Signux AI
        </a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 6, marginBottom: 16,
          background: tc.bg, color: tc.color,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          {tc.label}
        </div>

        {result.title && (
          <h1 style={{ fontFamily: "var(--font-brand)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {result.title}
          </h1>
        )}

        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24 }}>
          Generated {new Date(result.created_at).toLocaleDateString()} &middot; {result.view_count || 1} views
        </div>

        <div style={{
          padding: "24px 28px", borderRadius: 14,
          border: "1px solid var(--card-border)", background: "var(--card-bg)",
          marginBottom: 32, fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)",
        }}>
          <MarkdownRenderer content={result.content} />
        </div>

        {/* CTA */}
        <div style={{
          padding: 24, borderRadius: 14, textAlign: "center",
          background: "var(--mode-sim-bg)", border: "1px solid var(--mode-sim-border)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Run your own analysis on Signux AI
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            6 specialized AI modes. Free to start.
          </div>
          <a href="/chat" style={{
            display: "inline-flex", padding: "12px 32px", borderRadius: 50,
            background: "var(--accent)", color: "#000", fontWeight: 600,
            fontSize: 14, textDecoration: "none",
          }}>
            Start free
          </a>
        </div>
      </div>
    </div>
  );
}
