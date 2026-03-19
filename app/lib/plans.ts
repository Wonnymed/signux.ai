export type Tier = "free" | "pro" | "max" | "founding";

export const PLANS = {
  free: { name: "Free", price: 0, priceId: null },
  pro: { name: "Pro", price: 29, priceId: process.env.STRIPE_PRICE_PRO || "price_pro" },
  max: { name: "Max", price: 99, priceId: process.env.STRIPE_PRICE_MAX || "price_max" },
  founding: { name: "Founding", price: 500, priceId: process.env.STRIPE_PRICE_FOUNDING || "price_founding" },
} as const;

export const MODE_TIER_REQUIREMENT: Record<string, Tier> = {
  chat: "free",
  simulate: "pro",
  research: "pro",
  launchpad: "pro",
  globalops: "max",
  invest: "max",
};

export const TIER_LIMITS = {
  free: { chat_daily: 10, simulate_monthly: 0, research_monthly: 0 },
  pro: { chat_daily: Infinity, simulate_monthly: 20, research_monthly: Infinity },
  max: { chat_daily: Infinity, simulate_monthly: Infinity, research_monthly: Infinity },
  founding: { chat_daily: Infinity, simulate_monthly: Infinity, research_monthly: Infinity },
} as const;
