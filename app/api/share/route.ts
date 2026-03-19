import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, content, metadata } = body;

    if (!type || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["simulation", "research", "reality_check"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("shared_results")
      .insert({
        type,
        title,
        content,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Share insert error:", error);
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Share route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("shared_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Increment views
  await supabase
    .from("shared_results")
    .update({ views: (data.views || 0) + 1 })
    .eq("id", id);

  return NextResponse.json(data);
}
