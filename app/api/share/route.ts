import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, type, title, content, metadata } = await req.json();

    if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

    const { data, error } = await supabase
      .from("shared_results")
      .insert({
        user_id: userId || null,
        type: type || "simulate",
        title: title?.slice(0, 200) || "Signux AI Report",
        content,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signux-ai.vercel.app";
    return NextResponse.json({ id: data.id, url: `${baseUrl}/share/${data.id}` });
  } catch (e) {
    console.error("Share route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
