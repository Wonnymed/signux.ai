import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find decisions that need follow-up (follow_up_date passed, no outcome yet, not already emailed)
  const { data: decisions, error } = await supabase
    .from("decision_journal")
    .select("id, decision_summary, decision_category, created_at, follow_up_date, user_id")
    .is("outcome", null)
    .is("email_sent_at", null)
    .lte("follow_up_date", new Date().toISOString())
    .limit(50);

  if (error || !decisions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signux-ai.vercel.app";

  for (const decision of decisions) {
    try {
      // Check unsubscribe preference
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("email_notifications")
        .eq("user_id", decision.user_id)
        .single();

      if (sub?.email_notifications === false) {
        // Mark as sent so we don't re-check
        await supabase
          .from("decision_journal")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", decision.id);
        continue;
      }

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(decision.user_id);
      if (!userData?.user?.email) continue;

      const daysAgo = Math.round(
        (Date.now() - new Date(decision.created_at).getTime()) / 86400000
      );

      await getResend().emails.send({
        from: "Sukgo AI <notifications@signux-ai.vercel.app>",
        to: userData.user.email,
        subject: `How did it go? Your decision from ${daysAgo} days ago`,
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 0;">
  <div style="font-size: 20px; font-weight: 700; letter-spacing: 3px; margin-bottom: 24px; color: #D4AF37;">
    SIGNUX <span style="font-weight: 300; opacity: 0.4;">AI</span>
  </div>
  <p style="font-size: 16px; color: #333; margin-bottom: 8px;">
    ${daysAgo} days ago, you decided:
  </p>
  <div style="padding: 16px; border-radius: 10px; background: #f5f5f5; border-left: 3px solid #D4AF37; margin-bottom: 24px;">
    <p style="font-size: 15px; color: #111; margin: 0; line-height: 1.5;">
      &ldquo;${decision.decision_summary}&rdquo;
    </p>
    ${decision.decision_category ? `<p style="font-size: 12px; color: #666; margin: 8px 0 0; text-transform: capitalize;">${decision.decision_category}</p>` : ""}
  </div>
  <p style="font-size: 14px; color: #666; margin-bottom: 24px; line-height: 1.6;">
    How did it turn out? Your feedback helps Sukgo learn and give better recommendations.
  </p>
  <a href="${appUrl}/decisions" style="display: inline-block; padding: 12px 28px; border-radius: 50px; background: #D4AF37; color: #000; font-weight: 600; font-size: 14px; text-decoration: none;">
    Share the outcome
  </a>
  <p style="font-size: 11px; color: #999; margin-top: 32px; line-height: 1.5;">
    You received this because Sukgo AI tracked a decision for you.<br/>
    <a href="${appUrl}/settings" style="color: #999;">Manage notifications</a>
  </p>
</div>`,
      });

      // Mark email as sent
      await supabase
        .from("decision_journal")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", decision.id);

      sent++;
    } catch {}
  }

  return NextResponse.json({ sent, checked: decisions.length });
}
