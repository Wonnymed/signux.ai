import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* GET — list knowledge files for a project */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json([]);

  const { data } = await supabase
    .from("knowledge_chunks")
    .select("source_name, created_at, metadata")
    .eq("project_id", projectId)
    .eq("chunk_index", 0)
    .order("created_at", { ascending: false });

  return NextResponse.json(data || []);
}

/* DELETE — remove all chunks for a file */
export async function DELETE(req: NextRequest) {
  try {
    const { projectId, sourceName } = await req.json();
    if (!projectId || !sourceName) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("project_id", projectId)
      .eq("source_name", sourceName);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
