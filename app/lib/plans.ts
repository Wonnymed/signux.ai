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
  globalops: "pro",
  invest: "pro",
};

export const TIER_LIMITS = {
  free: {
    chat_daily: 5,
    simulate_monthly: 3,
    research_monthly: 0,
    globalops_monthly: 0,
    invest_monthly: 0,
    second_opinion: false,
    challenge: false,
    model: "sonnet" as const,
  },
  pro: {
    chat_daily: Infinity,
    simulate_monthly: 20,
    research_monthly: 10,
    globalops_monthly: 5,
    invest_monthly: 5,
    second_opinion: false,
    challenge: false,
    model: "sonnet" as const,
  },
  max: {
    chat_daily: Infinity,
    simulate_monthly: Infinity,
    research_monthly: Infinity,
    globalops_monthly: Infinity,
    invest_monthly: Infinity,
    second_opinion: true,
    challenge: true,
    model: "opus" as const,
  },
  founding: {
    chat_daily: Infinity,
    simulate_monthly: Infinity,
    research_monthly: Infinity,
    globalops_monthly: Infinity,
    invest_monthly: Infinity,
    second_opinion: true,
    challenge: true,
    model: "opus" as const,
  },
} as const;
