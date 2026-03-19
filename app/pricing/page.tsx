"use client";
import { useState } from "react";
import { Check, ArrowRight, Zap, Crown, Star, Loader2 } from "lucide-react";
import { SignuxIcon } from "../components/SignuxIcon";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    description: "Try Signux with basic chat",
    features: [
      "10 chat messages/day",
      "AI business advisor",
      "Multilingual support",
    ],
    excluded: [
      "Simulate mode",
      "Research mode",
      "Launchpad",
      "Global Ops",
      "Invest mode",
    ],
    cta: "Start free",
    color: "var(--text-secondary)",
    popular: false,
    icon: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Full power for entrepreneurs",
    features: [
      "Unlimited chat",
      "20 simulations/month",
      "Unlimited research reports",
      "Launchpad project tracker",
      "Decision journal",
      "Priority support",
    ],
    excluded: [
      "Global Ops",
      "Invest mode",
    ],
    cta: "Upgrade to Pro",
    color: "#D4AF37",
    popular: true,
    icon: Zap,
  },
  {
    id: "max",
    name: "Max",
    price: "$99",
    period: "/month",
    description: "Everything, unlimited",
    features: [
      "Everything in Pro",
      "Unlimited simulations",
      "Global Ops intelligence",
      "Invest mode",
      "Founding member badge",
      "Early access to new features",
    ],
    excluded: [],
    cta: "Upgrade to Max",
    color: "#A855F7",
    popular: false,
    icon: Crown,
  },
  {
    id: "founding",
    name: "Founding",
    price: "$500",
    period: " one-time",
    description: "Lifetime access, forever",
    features: [
      "Everything in Max",
      "Lifetime access — no recurring fees",
      "Founding member badge",
      "Direct access to founding team",
      "Shape the product roadmap",
      "Limited to first 100 founders",
    ],
    excluded: [],
    cta: "Become a Founder",
    color: "#D4AF37",
    popular: false,
    icon: Star,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid var(--border-primary)",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <SignuxIcon variant="gold" size={24} />
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 14, fontWeight: 600,
            letterSpacing: 2, color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
        </a>
        <a href="/chat" style={{
          fontSize: 13, color: "var(--text-secondary)", textDecoration: "none",
          fontFamily: "var(--font-brand)", letterSpacing: 1,
        }}>
          Back to app
        </a>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "60px 24px 40px" }}>
        <h1 style={{
          fontSize: 36, fontWeight: 700, marginBottom: 12,
          fontFamily: "var(--font-brand)", letterSpacing: 2,
        }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
          Think through any business decision before you make it.
        </p>
      </div>

      {/* Plans grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20, maxWidth: 1100, margin: "0 auto",
        padding: "0 24px 80px",
      }}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <div key={plan.id} style={{
              position: "relative",
              background: "var(--bg-secondary)",
              border: plan.popular ? `2px solid ${plan.color}` : "1px solid var(--border-primary)",
              borderRadius: 16, padding: 28,
              display: "flex", flexDirection: "column",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  padding: "4px 16px", borderRadius: 50,
                  background: plan.color, color: "#000",
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  fontFamily: "var(--font-brand)",
                }}>
                  MOST POPULAR
                </div>
              )}

              {/* Plan header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {Icon && <Icon size={18} style={{ color: plan.color }} />}
                <span style={{
                  fontFamily: "var(--font-brand)", fontSize: 16, fontWeight: 600,
                  letterSpacing: 1, color: plan.color,
                }}>
                  {plan.name.toUpperCase()}
                </span>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{plan.period}</span>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.4 }}>
                {plan.description}
              </p>

              {/* Features */}
              <div style={{ flex: 1, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Check size={14} style={{ color: plan.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{f}</span>
                  </div>
                ))}
                {plan.excluded.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ width: 8, height: 1, background: "var(--text-tertiary)", display: "block" }} />
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "12px 24px", borderRadius: 10,
                  background: plan.popular ? plan.color : "transparent",
                  color: plan.popular ? "#000" : "var(--text-primary)",
                  border: plan.popular ? "none" : "1px solid var(--border-primary)",
                  fontSize: 14, fontWeight: 600, cursor: loading === plan.id ? "wait" : "pointer",
                  fontFamily: "var(--font-brand)", letterSpacing: 1,
                  opacity: loading === plan.id ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading === plan.id ? (
                  <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
