import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import { getUserFromRequest } from "../../../lib/usage";
import { createServerClient } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${req.nextUrl.origin}/chat`,
  });

  return NextResponse.json({ url: session.url });
}
