import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS, type Tier } from "../../../lib/stripe";
import { getUserFromRequest } from "../../../lib/usage";
import { createServerClient } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { tier } = await req.json() as { tier: Tier };
  const plan = PLANS[tier];
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Get or create Stripe customer
  const supabase = createServerClient();
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    // Get user email
    const { data: { user } } = await (await import("@supabase/ssr")).createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
    ).auth.getUser();

    const customer = await getStripe().customers.create({
      email: user?.email || undefined,
      metadata: { user_id: userId },
    });
    customerId = customer.id;

    // Save customer ID
    await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        tier: "free",
        status: "active",
      }, { onConflict: "user_id" });
  }

  const isOneTime = tier === "founding";
  const origin = req.nextUrl.origin;

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: isOneTime ? "payment" : "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/chat?upgraded=${tier}`,
    cancel_url: `${origin}/pricing`,
    metadata: { user_id: userId, tier },
  });

  return NextResponse.json({ url: session.url });
}
