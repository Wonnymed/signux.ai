"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Search, CircleSlash, Eye, ArrowRight } from "lucide-react";
import MarkdownRenderer from "../../components/MarkdownRenderer";

type SharedResult = {
  id: string;
  type: "simulation" | "research" | "reality_check";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  views: number;
  created_at: string;
};

const TYPE_CONFIG = {
  simulation: { label: "Simulation", icon: Activity, color: "#D4AF37" },
  research: { label: "Research Report", icon: Search, color: "#6B8AFF" },
  reality_check: { label: "Reality Check", icon: CircleSlash, color: "#22c55e" },
};

export default function SharePage() {
  const { id } = useParams();
  const [data, setData] = useState<SharedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share?id=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-primary)", color: "var(--text-primary)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, border: "2px solid var(--border-primary)",
            borderTopColor: "#D4AF37", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading shared result...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-primary)", color: "var(--text-primary)",
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Result not found</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
            This shared link may have expired or been removed.
          </p>
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 24px", borderRadius: 8,
            background: "#D4AF37", color: "#000", fontSize: 13, fontWeight: 600,
            textDecoration: "none",
          }}>
            Go to Signux AI
          </a>
        </div>
      </div>
    );
  }

  const config = TYPE_CONFIG[data.type];
  const Icon = config.icon;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid var(--border-primary)",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/icons/signux-icon-gold-32.png" alt="Signux" width={24} height={24} />
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
        </a>
        <a href="/chat" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 20px", borderRadius: 8,
          background: "#D4AF37", color: "#000", fontSize: 12, fontWeight: 600,
          textDecoration: "none", fontFamily: "var(--font-brand)", letterSpacing: 1,
        }}>
          Try it free <ArrowRight size={12} />
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Type badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 50,
          background: `${config.color}15`, border: `1px solid ${config.color}30`,
          marginBottom: 16,
        }}>
          <Icon size={14} style={{ color: config.color }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: config.color, letterSpacing: 1, fontFamily: "var(--font-brand)" }}>
            {config.label.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 28, fontWeight: 600, lineHeight: 1.3, marginBottom: 8,
          color: "var(--text-primary)",
        }}>
          {data.title}
        </h1>

        {/* Meta */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 32,
          fontSize: 12, color: "var(--text-secondary)",
        }}>
          <span>{new Date(data.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Eye size={12} /> {data.views} views
          </span>
        </div>

        {/* Report content */}
        <div style={{
          background: "var(--bg-secondary)", borderRadius: 12,
          border: "1px solid var(--border-primary)", padding: 32,
        }}>
          <MarkdownRenderer content={data.content} />
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center", marginTop: 48, padding: 32,
          background: "var(--bg-secondary)", borderRadius: 12,
          border: "1px solid var(--border-primary)",
        }}>
          <p style={{
            fontSize: 18, fontWeight: 600, marginBottom: 8,
            color: "var(--text-primary)",
          }}>
            Want to run your own {data.type === "simulation" ? "simulation" : data.type === "research" ? "research" : "reality check"}?
          </p>
          <p style={{
            fontSize: 13, color: "var(--text-secondary)", marginBottom: 20,
          }}>
            Signux AI helps you think through any business decision before you make it.
          </p>
          <a href="/chat" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 32px", borderRadius: 8,
            background: "#D4AF37", color: "#000", fontSize: 14, fontWeight: 600,
            textDecoration: "none", fontFamily: "var(--font-brand)", letterSpacing: 1,
          }}>
            Start free <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
