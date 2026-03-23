"use client";
import { useState, useEffect } from "react";
import { Check, ArrowRight, ArrowLeft, Star, Crown, Loader2, CreditCard, Receipt, ExternalLink } from "lucide-react";
import { SignuxIcon } from "../components/SignuxIcon";
import { useIsMobile } from "../lib/useIsMobile";
import { useAuth } from "../lib/auth";
import { useUserTier } from "../lib/useUserTier";
import { useTokens } from "../lib/useTokens";
import { PLAN_TOKENS } from "../lib/tokens";

const GOLD = "#C8A84E";

/* ═══ Plan definitions (in-product, not landing page) ═══ */
const PLAN_DATA = {
  free: {
    name: "Free",
    price: "$0",
    period: "",
    descriptor: "Core access for first-time use.",
    features: [
      "5 chat messages per day",
      "3 simulations per month",
      "200 tokens per month",
      "All 6 engines accessible",
    ],
    color: "var(--text-secondary)",
  },
  pro: {
    name: "Pro",
    price: "$29",
    period: "/month",
    descriptor: "For focused individual use.",
    features: [
      "Unlimited chat",
      "20 simulations per month",
      "2,000 tokens per month",
      "All 6 engines — full access",
      "PDF export",
      "Save and reload simulations",
      "Priority email support",
    ],
    color: GOLD,
  },
  max: {
    name: "Max",
    price: "$99",
    period: "/month",
    descriptor: "For advanced operators. No limits.",
    features: [
      "Everything in Pro — unlimited",
      "10,000 tokens per month",
      "Unlimited simulations",
      "Advanced agent configurations",
      "Second Opinion & Challenge features",
      "Opus model",
      "Priority support",
    ],
    color: "#A855F7",
  },
} as const;

type PlanId = keyof typeof PLAN_DATA;

export default function BillingPage() {
  const isMobile = useIsMobile();
  const { authUser } = useAuth();
  const { tier, usage, limits } = useUserTier();
  const tokens = useTokens(authUser?.id || null);
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentTier: PlanId = (tier === "founding" ? "max" : tier || "free") as PlanId;
  const currentPlan = PLAN_DATA[currentTier] || PLAN_DATA.free;

  const handleUpgrade = async (planId: string) => {
    if (planId === "free" || planId === currentTier) return;
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
          window.location.href = "/login?redirect=/billing";
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // silent
    } finally {
      setPortalLoading(false);
    }
  };

  // Token usage
  const monthlyTokens = PLAN_TOKENS[tier || "free"] || 200;
  const tokensUsed = monthlyTokens - (tokens.available ?? 0);
  const tokenPct = monthlyTokens > 0 ? Math.min(100, (tokensUsed / monthlyTokens) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid var(--border-primary)",
      }}>
        <a href="/chat" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <SignuxIcon variant="gold" size={22} />
          <span style={{
            fontFamily: "var(--font-brand)", fontSize: 13, fontWeight: 500,
            letterSpacing: 3, color: "var(--text-primary)",
          }}>
            SIGNUX
          </span>
        </a>
        <a href="/chat" style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "var(--text-secondary)", textDecoration: "none",
          transition: "color 180ms ease-out",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
        >
          <ArrowLeft size={13} strokeWidth={1.5} /> Back to app
        </a>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: isMobile ? "32px 16px 64px" : "48px 32px 80px",
      }}>
        {/* ═══ PAGE HEADER ═══ */}
        <div style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 16 : 0,
          marginBottom: 36,
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? 22 : 26,
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: 0.2,
            }}>
              Billing
            </h1>
            <p style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              margin: "6px 0 0",
            }}>
              Manage plan, usage, and billing details.
            </p>
          </div>
          {currentTier !== "max" && tier !== "founding" && (
            <button
              onClick={() => handleUpgrade(currentTier === "free" ? "pro" : "max")}
              disabled={!!loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 8,
                background: GOLD, border: "none",
                color: "#FFFFFF", fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                transition: "background 180ms ease-out",
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#D4AF37"}
              onMouseLeave={e => e.currentTarget.style.background = GOLD}
            >
              {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Star size={14} strokeWidth={1.5} />}
              Upgrade plan
            </button>
          )}
        </div>

        {/* ═══ A. CURRENT PLAN SUMMARY ═══ */}
        <div style={{
          padding: isMobile ? 20 : 24,
          borderRadius: 14,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
          marginBottom: 20,
        }}>
          <div style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 16 : 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${currentPlan.color}10`,
                border: `1px solid ${currentPlan.color}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {currentTier === "max" || tier === "founding" ? (
                  <Crown size={20} strokeWidth={1.5} style={{ color: currentPlan.color }} />
                ) : currentTier === "pro" ? (
                  <Star size={20} strokeWidth={1.5} style={{ color: currentPlan.color }} />
                ) : (
                  <SignuxIcon size={20} variant="gold" />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 18, fontWeight: 600, color: "var(--text-primary)",
                  }}>
                    {tier === "founding" ? "Founding" : currentPlan.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
                    padding: "2px 8px", borderRadius: 4, letterSpacing: 0.8,
                    background: "rgba(60,207,142,0.08)",
                    color: "#3ECF8E",
                  }}>
                    Active
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: "var(--text-secondary)",
                  margin: "3px 0 0",
                }}>
                  {currentPlan.descriptor}
                </p>
              </div>
            </div>

            <div style={{ textAlign: isMobile ? "left" : "right" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)" }}>
                {currentPlan.price}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}>{currentPlan.period}</span>
              </div>
              {(currentTier === "pro" || currentTier === "max") && tier !== "founding" && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    marginTop: 6, padding: 0, border: "none", background: "transparent",
                    color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                    transition: "color 180ms ease-out",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                >
                  {portalLoading ? <Loader2 size={12} style={{ animation: "spin 0.8s linear infinite" }} /> : <ExternalLink size={12} strokeWidth={1.5} />}
                  Manage billing
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ B. USAGE AND LIMITS ═══ */}
        <div style={{
          padding: isMobile ? 20 : 24,
          borderRadius: 14,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
            letterSpacing: 1.4, color: "var(--text-tertiary)",
            textTransform: "uppercase", marginBottom: 18,
          }}>
            Usage this period
          </div>

          {/* Token usage bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                Tokens
              </span>
              <span style={{
                fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
              }}>
                {tokens.available ?? 0} of {monthlyTokens.toLocaleString()} remaining
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: "var(--bg-hover, rgba(0,0,0,0.04))",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: tokenPct > 80 ? "#EF4444" : tokenPct > 50 ? "#F59E0B" : GOLD,
                width: `${tokenPct}%`,
                transition: "width 400ms ease-out",
              }} />
            </div>
          </div>

          {/* Feature usage grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
          }}>
            <UsageStat
              label="Chat messages"
              used={usage?.chat_today ?? 0}
              limit={limits?.chat_daily === Infinity ? "Unlimited" : `${limits?.chat_daily ?? 5}/day`}
              period="today"
            />
            <UsageStat
              label="Simulations"
              used={usage?.simulations_month ?? 0}
              limit={limits?.simulate_monthly === Infinity ? "Unlimited" : `${limits?.simulate_monthly ?? 3}/month`}
              period="this month"
            />
          </div>
        </div>

        {/* ═══ C. PLAN COMPARISON ═══ */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
            letterSpacing: 1.4, color: "var(--text-tertiary)",
            textTransform: "uppercase", marginBottom: 14,
          }}>
            Plans
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 12,
          }}>
            {(["free", "pro", "max"] as PlanId[]).map((planId) => {
              const plan = PLAN_DATA[planId];
              const isCurrent = planId === currentTier || (planId === "max" && tier === "founding");
              const isUpgrade = !isCurrent && (
                (currentTier === "free" && (planId === "pro" || planId === "max")) ||
                (currentTier === "pro" && planId === "max")
              );

              return (
                <div key={planId} style={{
                  padding: isMobile ? 18 : 20,
                  borderRadius: 12,
                  border: isCurrent
                    ? `1.5px solid ${plan.color}`
                    : "1px solid var(--border-primary)",
                  background: "var(--bg-card)",
                  display: "flex", flexDirection: "column",
                  position: "relative",
                }}>
                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: -9, left: 16,
                      padding: "2px 10px", borderRadius: 4,
                      background: "var(--bg-card)",
                      border: `1px solid ${plan.color}`,
                      fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 600,
                      letterSpacing: 1, color: plan.color, textTransform: "uppercase",
                    }}>
                      Current plan
                    </div>
                  )}

                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
                      letterSpacing: 1, color: plan.color, textTransform: "uppercase",
                    }}>
                      {planId === "max" && tier === "founding" ? "Founding" : plan.name}
                    </span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)" }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{plan.period}</span>
                  </div>

                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
                    {plan.descriptor}
                  </p>

                  <div style={{ flex: 1, marginBottom: 16 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <Check size={13} strokeWidth={2} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div style={{
                      padding: "9px 16px", borderRadius: 8,
                      border: "1px solid var(--border-primary)",
                      fontSize: 12.5, fontWeight: 500, textAlign: "center",
                      color: "var(--text-tertiary)",
                    }}>
                      Current plan
                    </div>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={loading === planId}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 16px", borderRadius: 8,
                        background: planId === "pro" ? GOLD : "#A855F7",
                        border: "none",
                        color: "#FFFFFF", fontSize: 12.5, fontWeight: 500,
                        cursor: loading === planId ? "wait" : "pointer",
                        opacity: loading === planId ? 0.7 : 1,
                        transition: "opacity 180ms ease-out",
                      }}
                    >
                      {loading === planId ? (
                        <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
                      ) : (
                        <>Upgrade to {plan.name} <ArrowRight size={13} /></>
                      )}
                    </button>
                  ) : (
                    <div style={{
                      padding: "9px 16px", borderRadius: 8,
                      border: "1px solid var(--border-primary)",
                      fontSize: 12.5, fontWeight: 500, textAlign: "center",
                      color: "var(--text-tertiary)",
                    }}>
                      Included in your plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ D. BILLING HISTORY / INVOICES ═══ */}
        <div style={{
          padding: isMobile ? 20 : 24,
          borderRadius: 14,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
              letterSpacing: 1.4, color: "var(--text-tertiary)",
              textTransform: "uppercase",
            }}>
              Billing history
            </div>
            {(currentTier === "pro" || currentTier === "max") && tier !== "founding" && (
              <button
                onClick={handleManageBilling}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: 0, border: "none", background: "transparent",
                  color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                  transition: "color 180ms ease-out",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                View invoices <ExternalLink size={11} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Premium empty state */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "36px 16px",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--bg-hover, rgba(0,0,0,0.03))",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Receipt size={20} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <span style={{
              fontSize: 13.5, fontWeight: 500, color: "var(--text-secondary)",
              marginBottom: 4,
            }}>
              {currentTier === "free"
                ? "You are currently on the Free plan."
                : "No billing history yet."}
            </span>
            <span style={{
              fontSize: 12.5, color: "var(--text-tertiary)",
              textAlign: "center", maxWidth: 320, lineHeight: 1.5,
            }}>
              {currentTier === "free"
                ? "Upgrade when you need more depth and usage."
                : "Invoices will appear here once billing is active."}
            </span>
          </div>
        </div>

        {/* Bottom support link */}
        <div style={{
          textAlign: "center", marginTop: 32,
        }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Questions about billing?{" "}
            <a href="mailto:support@signux.ai" style={{
              color: "var(--text-secondary)", textDecoration: "none",
              transition: "color 180ms ease-out",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
            >
              Contact support
            </a>
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══ Usage stat row ═══ */
function UsageStat({
  label, used, limit, period,
}: {
  label: string;
  used: number;
  limit: string;
  period: string;
}) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      background: "var(--bg-hover, rgba(0,0,0,0.02))",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 2,
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          {limit}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        {used} used {period}
      </div>
    </div>
  );
}
