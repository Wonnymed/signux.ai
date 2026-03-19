import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import { createServerClient } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;

      if (!userId || !tier) break;

      if (session.mode === "payment") {
        // One-time payment (founding)
        await supabase
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            tier,
            status: "active",
            current_period_end: null, // lifetime
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      } else if (session.mode === "subscription") {
        // Subscription — details come in invoice.paid
        const subscription = await getStripe().subscriptions.retrieve(session.subscription);
        await supabase
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            tier,
            status: "active",
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) break;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const customerId = invoice.customer;

      // Find user by stripe_customer_id
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (sub) {
        await supabase
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", sub.user_id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("user_id, tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (sub && sub.tier !== "founding") {
        await supabase
          .from("user_subscriptions")
          .update({
            tier: "free",
            status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", sub.user_id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (sub) {
        const status = subscription.status === "active" ? "active" : subscription.status;
        await supabase
          .from("user_subscriptions")
          .update({
            status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", sub.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
