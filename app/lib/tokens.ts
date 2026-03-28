/**
 * Signux Token (ST) system.
 * 1 ST ≈ cost of 1 chat message (~$0.01).
 */

export const PLAN_TOKENS: Record<string, number> = {
  guest: 50,
  free: 200,
  pro: 2000,
  max: 10000,
  founding: 10000,
};

export const ACTION_COSTS: Record<string, number> = {
  chat: 1,
  intel_basic: 3,
  intel_deep: 5,
  research: 15,
  launchpad: 5,
  globalops: 5,
  invest: 8,
  simulate_light: 10,
  simulate_full: 100,
  export_pdf: 2,
  compare: 0,
};

export const ACTION_LABELS: Record<string, string> = {
  chat: "Chat message",
  intel_basic: "Intel tool",
  intel_deep: "Intel (deep)",
  research: "Deep Research",
  launchpad: "Launchpad validation",
  globalops: "Global Ops analysis",
  invest: "Invest report",
  simulate_light: "Simulate Light (3u)",
  simulate_full: "Simulate Full (10×10)",
  export_pdf: "Export PDF",
  compare: "Compare A vs B",
};

/** Feature restrictions per plan */
export const PLAN_FEATURES: Record<string, {
  exportPdf: boolean;
  saveSimulation: boolean;
  agentMemory: boolean;
  compareAB: boolean;
  customAgents: boolean;
  apiAccess: boolean;
  maxSavedSims: number;
  memoryDepth: number;
  maxSimFullPerDay: number;
}> = {
  guest: { exportPdf: false, saveSimulation: false, agentMemory: false, compareAB: false, customAgents: false, apiAccess: false, maxSavedSims: 0, memoryDepth: 0, maxSimFullPerDay: 0 },
  free: { exportPdf: false, saveSimulation: false, agentMemory: false, compareAB: false, customAgents: false, apiAccess: false, maxSavedSims: 0, memoryDepth: 0, maxSimFullPerDay: 1 },
  pro: { exportPdf: true, saveSimulation: true, agentMemory: true, compareAB: true, customAgents: false, apiAccess: false, maxSavedSims: 50, memoryDepth: 10, maxSimFullPerDay: Infinity },
  max: { exportPdf: true, saveSimulation: true, agentMemory: true, compareAB: true, customAgents: true, apiAccess: true, maxSavedSims: Infinity, memoryDepth: Infinity, maxSimFullPerDay: Infinity },
  founding: { exportPdf: true, saveSimulation: true, agentMemory: true, compareAB: true, customAgents: true, apiAccess: true, maxSavedSims: Infinity, memoryDepth: Infinity, maxSimFullPerDay: Infinity },
};

export interface TokenStatus {
  available: number;
  monthlyTotal: number;
  monthlyUsed: number;
  bonusTokens: number;
  plan: string;
  daysUntilReset: number;
  features: typeof PLAN_FEATURES["free"];
}

// ── Server-side functions (API routes only) ──

export async function getTokenStatus(userId: string): Promise<TokenStatus> {
  const { createServerClient } = await import("./supabase");
  const supabase = createServerClient();

  let { data: balance } = await supabase
    .from("token_balance")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Auto-create balance if doesn't exist
  if (!balance) {
    // Get plan from subscriptions
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("tier")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    const plan = sub?.tier || "free";
    const { data: newBalance } = await supabase
      .from("token_balance")
      .insert({
        user_id: userId,
        monthly_tokens: PLAN_TOKENS[plan] || 200,
        plan,
      })
      .select()
      .single();
    balance = newBalance;
  }

  // Check if monthly reset is needed
  if (balance && new Date(balance.reset_date) <= new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabase
      .from("token_balance")
      .update({
        monthly_used: 0,
        reset_date: nextReset.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    balance.monthly_used = 0;
    balance.reset_date = nextReset.toISOString();
  }

  const monthlyRemaining = Math.max(0, (balance?.monthly_tokens || 200) - (balance?.monthly_used || 0));
  const total = monthlyRemaining + (balance?.bonus_tokens || 0);
  const resetDate = new Date(balance?.reset_date || new Date());
  const daysUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const plan = balance?.plan || "free";

  return {
    available: total,
    monthlyTotal: balance?.monthly_tokens || 200,
    monthlyUsed: balance?.monthly_used || 0,
    bonusTokens: balance?.bonus_tokens || 0,
    plan,
    daysUntilReset,
    features: PLAN_FEATURES[plan] || PLAN_FEATURES.free,
  };
}

export async function consumeTokens(
  userId: string,
  action: string,
  metadata?: Record<string, any>,
): Promise<{ success: boolean; remaining: number }> {
  const cost = ACTION_COSTS[action] ?? 1;
  if (cost === 0) return { success: true, remaining: -1 }; // free actions

  const status = await getTokenStatus(userId);
  if (status.available < cost) {
    return { success: false, remaining: status.available };
  }

  const { createServerClient } = await import("./supabase");
  const supabase = createServerClient();

  // Deduct from monthly first, then bonus
  const monthlyRemaining = status.monthlyTotal - status.monthlyUsed;
  const fromMonthly = Math.min(cost, monthlyRemaining);
  const fromBonus = cost - fromMonthly;

  await supabase
    .from("token_balance")
    .update({
      monthly_used: status.monthlyUsed + fromMonthly,
      bonus_tokens: Math.max(0, status.bonusTokens - fromBonus),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Log usage
  await supabase
    .from("token_log")
    .insert({
      user_id: userId,
      action,
      tokens_used: cost,
      channel: action.split("_")[0],
      metadata: metadata || null,
    });

  return { success: true, remaining: status.available - cost };
}

/** Sync plan tokens when subscription changes (called from webhook) */
export async function syncPlanTokens(userId: string, plan: string): Promise<void> {
  const { createServerClient } = await import("./supabase");
  const supabase = createServerClient();
  const monthlyTokens = PLAN_TOKENS[plan] || 200;

  await supabase
    .from("token_balance")
    .upsert({
      user_id: userId,
      monthly_tokens: monthlyTokens,
      plan,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
}

// ── Guest token functions (localStorage, client-side only) ──

const GUEST_KEY = "signux-guest-tokens";
const GUEST_ALLOWANCE = 50;

export function getGuestTokens(): number {
  if (typeof window === "undefined") return GUEST_ALLOWANCE;
  const stored = localStorage.getItem(GUEST_KEY);
  if (stored === null) {
    localStorage.setItem(GUEST_KEY, String(GUEST_ALLOWANCE));
    return GUEST_ALLOWANCE;
  }
  return parseInt(stored) || 0;
}

export function consumeGuestTokens(action: string): boolean {
  const cost = ACTION_COSTS[action] ?? 1;
  if (cost === 0) return true;
  const current = getGuestTokens();
  if (current < cost) return false;
  localStorage.setItem(GUEST_KEY, String(current - cost));
  return true;
}

export function getGuestTokenStatus(): TokenStatus {
  const available = typeof window !== "undefined" ? getGuestTokens() : GUEST_ALLOWANCE;
  return {
    available,
    monthlyTotal: GUEST_ALLOWANCE,
    monthlyUsed: GUEST_ALLOWANCE - available,
    bonusTokens: 0,
    plan: "guest",
    daysUntilReset: 30,
    features: PLAN_FEATURES.guest,
  };
}
