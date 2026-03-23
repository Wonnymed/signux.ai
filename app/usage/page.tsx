"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Star, Crown, Loader2, Activity, Clock, Zap, FileText, GitCompareArrows, Hammer, TrendingUp, UserCheck, Shield, Swords } from "lucide-react";
import { SignuxIcon } from "../components/SignuxIcon";
import { useIsMobile } from "../lib/useIsMobile";
import { useAuth } from "../lib/auth";
import { useUserTier } from "../lib/useUserTier";
import { useTokens } from "../lib/useTokens";
import { PLAN_TOKENS, ACTION_COSTS, ACTION_LABELS } from "../lib/tokens";

const GOLD = "#C8A84E";

/* ═══ Action cost display config ═══ */
const USAGE_ACTIONS = [
  { key: "chat", label: "Chat message", icon: Zap, cost: ACTION_COSTS.chat },
  { key: "simulate_light", label: "Quick simulation", icon: Activity, cost: ACTION_COSTS.simulate_light },
  { key: "simulate_full", label: "Full simulation (10×10)", icon: Activity, cost: ACTION_COSTS.simulate_full },
  { key: "research", label: "Deep research", icon: TrendingUp, cost: ACTION_COSTS.research },
  { key: "export_pdf", label: "PDF export", icon: FileText, cost: ACTION_COSTS.export_pdf },
  { key: "compare", label: "Compare A vs B", icon: GitCompareArrows, cost: 0 },
] as const;

/* ═══ Plan upgrade context ═══ */
const PLAN_CONTEXT: Record<string, {
  includes: string[];
  upgradeLabel?: string;
  upgradeTier?: string;
  upgradeNote?: string;
}> = {
  free: {
    includes: [
      "5 chat messages per day",
      "3 simulations per month",
      "200 tokens per month",
      "Access to all 6 engines",
    ],
    upgradeLabel: "Upgrade to Pro",
    upgradeTier: "pro",
    upgradeNote: "Pro unlocks unlimited chat, 20 simulations, 2,000 tokens, PDF export, and saved simulations.",
  },
  pro: {
    includes: [
      "Unlimited chat",
      "20 simulations per month",
      "2,000 tokens per month",
      "All 6 engines — full access",
      "PDF export and saved simulations",
    ],
    upgradeLabel: "Upgrade to Max",
    upgradeTier: "max",
    upgradeNote: "Max unlocks unlimited simulations, 10,000 tokens, Opus model, and advanced features.",
  },
  max: {
    includes: [
      "Unlimited everything",
      "10,000 tokens per month",
      "Opus model",
      "Second Opinion & Challenge features",
      "Custom agent configurations",
    ],
  },
  founding: {
    includes: [
      "Lifetime access — all Max features",
      "10,000 tokens per month",
      "Opus model",
      "Priority access to new features",
    ],
  },
};

export default function UsagePage() {
  const isMobile = useIsMobile();
  const { authUser } = useAuth();
  const { tier, usage, limits } = useUserTier();
  const tokens = useTokens(authUser?.id || null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const currentTier = tier || "free";
  const context = PLAN_CONTEXT[currentTier] || PLAN_CONTEXT.free;

  // Token calculations
  const monthlyTokens = PLAN_TOKENS[currentTier] || 200;
  const tokensUsed = tokens.monthlyUsed ?? (monthlyTokens - (tokens.available ?? 0));
  const tokensAvailable = tokens.available ?? 0;
  const tokenPct = monthlyTokens > 0 ? Math.min(100, Math.max(0, (tokensUsed / monthlyTokens) * 100)) : 0;
  const daysUntilReset = tokens.daysUntilReset ?? 0;

  const handleUpgrade = async (targetTier: string) => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (res.status === 401) window.location.href = "/login?redirect=/usage";
    } catch { /* silent */ } finally {
      setUpgradeLoading(false);
    }
  };

  const planLabel = currentTier === "founding" ? "Founding" : currentTier.charAt(0).toUpperCase() + currentTier.slice(1);

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
              fontSize: isMobile ? 22 : 26, fontWeight: 500,
              color: "var(--text-primary)", margin: 0, letterSpacing: 0.2,
            }}>
              Usage
            </h1>
            <p style={{
              fontSize: 13.5, color: "var(--text-secondary)", margin: "6px 0 0",
            }}>
              View current usage, limits, and activity across the product.
            </p>
          </div>
          {context.upgradeLabel && context.upgradeTier && (
            <button
              onClick={() => handleUpgrade(context.upgradeTier!)}
              disabled={upgradeLoading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 20px", borderRadius: 8,
                background: GOLD, border: "none",
                color: "#FFFFFF", fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "background 180ms ease-out",
                opacity: upgradeLoading ? 0.7 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#D4AF37"}
              onMouseLeave={e => e.currentTarget.style.background = GOLD}
            >
              {upgradeLoading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Star size={14} strokeWidth={1.5} />}
              {context.upgradeLabel}
            </button>
          )}
        </div>

        {/* ═══ A. CURRENT USAGE SUMMARY ═══ */}
        <div style={{
          padding: isMobile ? 20 : 24,
          borderRadius: 14,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
          marginBottom: 20,
        }}>
          {/* Plan + tokens header */}
          <div style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 12 : 0,
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                padding: "3px 9px", borderRadius: 4, letterSpacing: 1,
                background: currentTier === "max" || currentTier === "founding" ? "rgba(168,85,247,0.08)" :
                            currentTier === "pro" ? "rgba(200,168,78,0.08)" : "var(--bg-hover, rgba(0,0,0,0.03))",
                color: currentTier === "max" || currentTier === "founding" ? "#A855F7" :
                       currentTier === "pro" ? GOLD : "var(--text-secondary)",
                textTransform: "uppercase",
              }}>
                {planLabel} plan
              </span>
              {daysUntilReset > 0 && (
                <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                  Resets in {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
            }}>
              {tokensAvailable.toLocaleString()} of {monthlyTokens.toLocaleString()} tokens remaining
            </div>
          </div>

          {/* Token progress bar */}
          <div style={{ marginBottom: 22 }}>
            <div style={{
              height: 6, borderRadius: 3,
              background: "var(--bg-hover, rgba(0,0,0,0.04))",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: tokenPct > 85 ? "#EF4444" : tokenPct > 60 ? "#F59E0B" : GOLD,
                width: `${tokenPct}%`,
                transition: "width 400ms ease-out",
              }} />
            </div>
          </div>

          {/* Feature usage grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}>
            <UsageMeter
              label="Chat messages"
              used={usage?.chat_today ?? 0}
              limit={limits?.chat_daily}
              period="today"
            />
            <UsageMeter
              label="Simulations"
              used={usage?.simulations_month ?? 0}
              limit={limits?.simulate_monthly}
              period="this month"
            />
            {(currentTier === "pro" || currentTier === "max" || currentTier === "founding") && (
              <>
                <UsageMeter
                  label="Protect analyses"
                  used={usage?.protect_month ?? 0}
                  limit={limits?.protect_monthly}
                  period="this month"
                />
                <UsageMeter
                  label="Hire evaluations"
                  used={usage?.hire_month ?? 0}
                  limit={limits?.hire_monthly}
                  period="this month"
                />
              </>
            )}
          </div>
        </div>

        {/* ═══ B. LIMITS / HOW USAGE WORKS ═══ */}
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
            textTransform: "uppercase", marginBottom: 6,
          }}>
            How usage works
          </div>
          <p style={{
            fontSize: 13, color: "var(--text-secondary)", margin: "0 0 18px", lineHeight: 1.6,
          }}>
            Usage is consumed by actions such as simulations, chat messages, exports, and engine workflows. Your current plan determines limits and access depth.
          </p>

          {/* Action costs table */}
          <div style={{
            borderRadius: 10,
            border: "1px solid var(--border-primary)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "8px 14px",
              background: "var(--bg-hover, rgba(0,0,0,0.02))",
              fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 500,
              letterSpacing: 1, color: "var(--text-tertiary)", textTransform: "uppercase",
            }}>
              <span>Action</span>
              <span>Cost</span>
            </div>
            {USAGE_ACTIONS.map(({ key, label, cost }, i) => (
              <div key={key} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                padding: "10px 14px",
                borderTop: "1px solid var(--border-primary)",
                fontSize: 13, color: "var(--text-primary)",
              }}>
                <span>{label}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  color: cost === 0 ? "var(--success, #3ECF8E)" : "var(--text-secondary)",
                }}>
                  {cost === 0 ? "Free" : `${cost} token${cost !== 1 ? "s" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ C. RECENT ACTIVITY ═══ */}
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
            textTransform: "uppercase", marginBottom: 16,
          }}>
            Recent activity
          </div>

          {/* Premium empty state */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "32px 16px",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--bg-hover, rgba(0,0,0,0.03))",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Clock size={20} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <span style={{
              fontSize: 13.5, fontWeight: 500, color: "var(--text-secondary)",
              marginBottom: 4,
            }}>
              No recent activity yet.
            </span>
            <span style={{
              fontSize: 12.5, color: "var(--text-tertiary)",
              textAlign: "center", maxWidth: 340, lineHeight: 1.5,
            }}>
              Your product activity will appear here as you use Signux.
            </span>
          </div>
        </div>

        {/* ═══ D. UPGRADE / PLAN CONTEXT ═══ */}
        <div style={{
          padding: isMobile ? 20 : 24,
          borderRadius: 14,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
        }}>
          <div style={{
            fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
            letterSpacing: 1.4, color: "var(--text-tertiary)",
            textTransform: "uppercase", marginBottom: 16,
          }}>
            Your plan
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: currentTier === "max" || currentTier === "founding" ? "rgba(168,85,247,0.08)" :
                          currentTier === "pro" ? "rgba(200,168,78,0.08)" : "var(--bg-hover, rgba(0,0,0,0.03))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {currentTier === "max" || currentTier === "founding" ? (
                <Crown size={18} strokeWidth={1.5} style={{ color: "#A855F7" }} />
              ) : currentTier === "pro" ? (
                <Star size={18} strokeWidth={1.5} style={{ color: GOLD }} />
              ) : (
                <SignuxIcon size={18} variant="gold" />
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                {planLabel}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                {monthlyTokens.toLocaleString()} tokens per month
              </div>
            </div>
          </div>

          {/* Current plan includes */}
          <div style={{ marginBottom: context.upgradeNote ? 18 : 0 }}>
            {context.includes.map(item => (
              <div key={item} style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 5,
              }}>
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: "var(--text-tertiary)", flexShrink: 0,
                }} />
                <span style={{ fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.4 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Upgrade CTA */}
          {context.upgradeNote && context.upgradeLabel && context.upgradeTier && (
            <div style={{
              padding: 16, borderRadius: 10,
              background: "var(--bg-hover, rgba(0,0,0,0.02))",
              border: "1px solid var(--border-primary)",
            }}>
              <p style={{
                fontSize: 12.5, color: "var(--text-secondary)",
                margin: "0 0 12px", lineHeight: 1.5,
              }}>
                {context.upgradeNote}
              </p>
              <button
                onClick={() => handleUpgrade(context.upgradeTier!)}
                disabled={upgradeLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 8,
                  background: GOLD, border: "none",
                  color: "#FFFFFF", fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer", transition: "background 180ms ease-out",
                  opacity: upgradeLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#D4AF37"}
                onMouseLeave={e => e.currentTarget.style.background = GOLD}
              >
                {upgradeLoading ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : null}
                {context.upgradeLabel} <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Bottom link */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/billing" style={{
            fontSize: 12, color: "var(--text-secondary)", textDecoration: "none",
            transition: "color 180ms ease-out",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
          >
            View billing and invoices →
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══ Usage meter component ═══ */
function UsageMeter({
  label, used, limit, period,
}: {
  label: string;
  used: number;
  limit?: number;
  period: string;
}) {
  const isUnlimited = limit === Infinity || limit === undefined;
  const limitLabel = isUnlimited ? "Unlimited" : `${limit}/${period.includes("today") ? "day" : "month"}`;
  const pct = !isUnlimited && limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      background: "var(--bg-hover, rgba(0,0,0,0.02))",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          {limitLabel}
        </span>
      </div>
      {!isUnlimited && limit && limit > 0 ? (
        <div style={{
          height: 4, borderRadius: 2,
          background: "var(--border-primary, rgba(0,0,0,0.06))",
          overflow: "hidden",
          marginBottom: 4,
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : GOLD,
            width: `${pct}%`,
            transition: "width 400ms ease-out",
          }} />
        </div>
      ) : null}
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        {used} used {period}
      </div>
    </div>
  );
}
