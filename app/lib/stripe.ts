import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

// Re-export plans/types for convenience in server code
export { PLANS, TIER_LIMITS, MODE_TIER_REQUIREMENT } from "./plans";
export type { Tier } from "./plans";
