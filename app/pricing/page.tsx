"use client";
import { useState } from "react";
import { Check, ArrowRight, Zap, Crown, Loader2 } from "lucide-react";
import { SignuxIcon } from "../components/SignuxIcon";
import { useIsMobile } from "../lib/useIsMobile";
import { Z800, Z700, Z600, Z500, Z400, Z200 } from "../components/PageShell";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "See what AI can do for your business.",
    features: [
      "5 chat messages/day",
      "1 simulation/month",
      "AI business advisor",
      "Multilingual support",
    ],
    excluded: [
      "Research mode",
      "Launchpad",
      "Global Ops",
      "Invest mode",
      "Second Opinion",
      "Challenge This",
    ],
    cta: "Start free",
    color: Z500,
    popular: false,
    icon: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Access every mode. See the future before it happens.",
    features: [
      "Unlimited chat",
      "20 simulations/month",
      "10 deep researches/month",
      "5 Global Ops analyses/month",
      "5 investment analyses/month",
      "Launchpad project tracker",
      "Full Intel suite",
      "Decision journal",
      "Priority support",
    ],
    excluded: [
      "Second Opinion",
      "Challenge This",
      "Opus model",
    ],
    cta: "Upgrade to Pro",
    color: "#C8A84E",
    popular: true,
    icon: Zap,
  },
  {
    id: "max",
    name: "Max",
    price: "$99",
    period: "/month",
    description: "Unlimited everything. No limits, no blind spots.",
    features: [
      "Everything in Pro — unlimited",
      "Unlimited simulations",
      "Unlimited research",
      "Unlimited Global Ops",
      "Unlimited Invest analyses",
      "Second Opinion — 3 perspectives on every answer",
      "Challenge This — stress-test any analysis",
      "Opus model — most powerful AI available",
      "Priority access to new domains",
      "Founding member badge",
      "Early access to new features",
    ],
    excluded: [],
    cta: "Upgrade to Max",
    color: "#A855F7",
    popular: false,
    icon: Crown,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") {
      window.location.href = "/chat";
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        if (res.status === 401) {
          window.location.href = "/login?redirect=/pricing";
        } else {
          alert(data.error);
        }
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: Z200 }}>
      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${Z800}`,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <SignuxIcon variant="gold" size={24} />
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600,
            letterSpacing: 2, color: Z200,
          }}>
            SIGNUX
          </span>
        </a>
        <a href="/chat" style={{
          fontSize: 12, color: Z600, textDecoration: "none",
          transition: "color 180ms ease-out",
        }}
          onMouseEnter={e => e.currentTarget.style.color = Z400}
          onMouseLeave={e => e.currentTarget.style.color = Z600}
        >
          Back to app
        </a>
      </div>

      {/* Header */}
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: isMobile ? "40px 16px 20px" : "60px 32px 20px",
      }}>
        <div style={{
          fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
          letterSpacing: 1.6, color: Z600, textTransform: "uppercase",
          marginBottom: 8,
        }}>
          Billing
        </div>
        <h1 style={{
          fontSize: isMobile ? 24 : 28, fontWeight: 500, marginBottom: 8,
          color: Z200, letterSpacing: 0.2, lineHeight: 1.3, margin: "0 0 8px",
        }}>
          Choose how you want to grow
        </h1>
        <p style={{ fontSize: 13, color: Z500, maxWidth: 460, margin: 0, lineHeight: 1.5 }}>
          Pro gives you access to everything. Max removes all limits.
        </p>
      </div>

      {/* Pro vs Max comparison highlight */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 24,
        padding: isMobile ? "16px 16px 32px" : "20px 32px 40px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: Z500 }}>
          <Zap size={13} style={{ color: "#C8A84E" }} />
          <span><strong style={{ color: "#C8A84E", fontWeight: 600 }}>Pro</strong> — all modes, monthly limits</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: Z500 }}>
          <Crown size={13} style={{ color: "#A855F7" }} />
          <span><strong style={{ color: "#A855F7", fontWeight: 600 }}>Max</strong> — unlimited + exclusive features</span>
        </div>
      </div>

      {/* Plans grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 16, maxWidth: 920, margin: "0 auto",
        padding: isMobile ? "0 16px 40px" : "0 32px 40px",
      }}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isPro = plan.popular;
          const isMax = plan.id === "max";
          return (
            <div key={plan.id} style={{
              position: "relative",
              background: "rgba(255,255,255,0.015)",
              border: isPro ? `1.5px solid ${plan.color}` : isMax ? `1px solid rgba(168,85,247,0.25)` : `1px solid ${Z800}`,
              borderRadius: 14, padding: 24,
              display: "flex", flexDirection: "column",
            }}>
              {isPro && (
                <div style={{
                  position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                  padding: "3px 14px", borderRadius: 50,
                  background: plan.color, color: "#000",
                  fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  fontFamily: "var(--font-mono)", textTransform: "uppercase",
                }}>
                  Most popular
                </div>
              )}

              {isMax && (
                <div style={{
                  position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                  padding: "3px 14px", borderRadius: 50,
                  background: plan.color, color: "#fff",
                  fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  fontFamily: "var(--font-mono)", textTransform: "uppercase",
                }}>
                  No limits
                </div>
              )}

              {/* Plan header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {Icon && <Icon size={16} style={{ color: plan.color }} />}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  letterSpacing: 1.2, color: plan.color, textTransform: "uppercase",
                }}>
                  {plan.name}
                </span>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: Z200 }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: Z600 }}>{plan.period}</span>
              </div>

              <p style={{ fontSize: 12.5, color: Z500, marginBottom: 20, lineHeight: 1.5, margin: "0 0 20px" }}>
                {plan.description}
              </p>

              {/* Features */}
              <div style={{ flex: 1, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <Check size={13} style={{ color: plan.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: Z200 }}>{f}</span>
                  </div>
                ))}
                {plan.excluded.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ width: 8, height: 1, background: Z700, display: "block" }} />
                    </span>
                    <span style={{ fontSize: 12.5, color: Z600 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "11px 24px", borderRadius: 8,
                  background: isPro ? plan.color : isMax ? plan.color : "transparent",
                  color: isPro ? "#000" : isMax ? "#fff" : Z200,
                  border: (isPro || isMax) ? "none" : `1px solid ${Z800}`,
                  fontSize: 13, fontWeight: 600, cursor: loading === plan.id ? "wait" : "pointer",
                  fontFamily: "var(--font-mono)", letterSpacing: 0.5,
                  opacity: loading === plan.id ? 0.7 : 1,
                  transition: "opacity 180ms ease-out, background 180ms ease-out",
                }}
                onMouseEnter={e => {
                  if (isPro || isMax) return;
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = Z700;
                }}
                onMouseLeave={e => {
                  if (isPro || isMax) return;
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = Z800;
                }}
              >
                {loading === plan.id ? (
                  <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: isMobile ? "0 16px 64px" : "0 32px 80px" }}>
        <div style={{
          fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
          letterSpacing: 1.6, color: Z600, textTransform: "uppercase",
          marginBottom: 12, textAlign: "center",
        }}>
          Compare plans
        </div>
        <div style={{
          background: "rgba(255,255,255,0.015)", borderRadius: 12,
          border: `1px solid ${Z800}`, overflow: "hidden",
        }}>
          {[
            { feature: "Chat messages", free: "5/day", pro: "Unlimited", max: "Unlimited" },
            { feature: "Simulations", free: "1/month", pro: "20/month", max: "Unlimited" },
            { feature: "Deep Research", free: "—", pro: "10/month", max: "Unlimited" },
            { feature: "Global Ops", free: "—", pro: "5/month", max: "Unlimited" },
            { feature: "Invest Mode", free: "—", pro: "5/month", max: "Unlimited" },
            { feature: "Launchpad", free: "—", pro: "Full access", max: "Full access" },
            { feature: "Intel Suite", free: "—", pro: "Full access", max: "Full access" },
            { feature: "Second Opinion", free: "—", pro: "—", max: "Included" },
            { feature: "Challenge This", free: "—", pro: "—", max: "Included" },
            { feature: "AI Model", free: "Sonnet", pro: "Sonnet", max: "Opus" },
          ].map((row, i) => (
            <div key={row.feature} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
              padding: "10px 16px", fontSize: 12.5,
              borderBottom: i < 9 ? `1px solid ${Z800}` : "none",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            }}>
              <span style={{ color: Z400, fontWeight: 500 }}>{row.feature}</span>
              <span style={{ color: Z600, textAlign: "center" }}>{row.free}</span>
              <span style={{ color: "#C8A84E", textAlign: "center", fontWeight: 500 }}>{row.pro}</span>
              <span style={{ color: "#A855F7", textAlign: "center", fontWeight: 500 }}>{row.max}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
