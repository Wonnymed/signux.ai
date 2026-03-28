import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeUsers } = await supabase
      .from("user_context")
      .select("user_id")
      .gte("created_at", oneWeekAgo)
      .order("user_id");

    const userIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];

    let sent = 0;
    for (const userId of userIds) {
      const { data: weekContext } = await supabase
        .from("user_context")
        .select("context_type, summary, key_insights, created_at")
        .eq("user_id", userId)
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: false });

      const { data: watches } = await supabase
        .from("intelligence_watches")
        .select("query, type")
        .eq("user_id", userId)
        .eq("status", "active");

      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;

      if (!email || !weekContext?.length) continue;

      const emailBody = generateDigestEmail(weekContext, watches || []);

      if (process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Sukgo AI <intel@signux.ai>",
            to: email,
            subject: `Your weekly intelligence brief — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            html: emailBody,
          }),
        });
        sent++;
      }
    }

    return NextResponse.json({ sent, total: userIds.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateDigestEmail(contexts: any[], watches: any[]): string {
  const analyses = contexts.map(c =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #222">
      <strong style="color:#D4AF37">${c.context_type}</strong><br>
      <span style="color:#999;font-size:13px">${(c.summary || "").slice(0, 100)}</span>
    </td></tr>`
  ).join("");

  const watchList = watches.map(w =>
    `<li style="color:#999;font-size:13px;margin-bottom:4px">${(w.query || "").slice(0, 80)}</li>`
  ).join("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signux-ai.vercel.app";

  return `
    <div style="max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;font-family:Arial,sans-serif">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:16px;font-weight:700;letter-spacing:6px;color:#D4AF37">SIGNUX AI</div>
        <div style="font-size:11px;color:#666;margin-top:4px">WEEKLY INTELLIGENCE BRIEF</div>
      </div>

      <h2 style="font-size:18px;color:#fff;margin-bottom:16px">Your Week in Review</h2>
      <table style="width:100%">${analyses}</table>

      ${watches.length > 0 ? `
        <h2 style="font-size:18px;color:#fff;margin:24px 0 12px">Active Watches (${watches.length})</h2>
        <ul style="padding-left:20px">${watchList}</ul>
      ` : ""}

      <div style="text-align:center;margin-top:32px">
        <a href="${appUrl}/chat" style="display:inline-block;padding:12px 28px;border-radius:50px;background:#D4AF37;color:#000;font-weight:600;font-size:14px;text-decoration:none">
          Continue analyzing →
        </a>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:11px;color:#444">
        Sukgo AI — See what happens before it happens
      </div>
    </div>
  `;
}
