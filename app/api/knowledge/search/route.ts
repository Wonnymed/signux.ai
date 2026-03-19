import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { projectId, query, limit } = await req.json();

    if (!projectId || !query) {
      return NextResponse.json({ chunks: [] });
    }

    // Extract meaningful keywords (>3 chars, deduplicated)
    const stopwords = new Set(["this", "that", "with", "from", "what", "when", "where", "which", "about", "have", "been", "they", "their", "would", "could", "should", "there", "here", "como", "para", "mais", "esse", "essa", "este", "esta", "qual", "quais"]);
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !stopwords.has(w))
      .slice(0, 6);

    if (keywords.length === 0) {
      return NextResponse.json({ chunks: [] });
    }

    const { data, error } = await supabase
      .from("knowledge_chunks")
      .select("content, source_name, chunk_index")
      .eq("project_id", projectId)
      .or(keywords.map((k: string) => `content.ilike.%${k}%`).join(","))
      .order("chunk_index", { ascending: true })
      .limit(limit || 5);

    if (error) {
      console.error("Knowledge search error:", error);
      return NextResponse.json({ chunks: [] });
    }

    return NextResponse.json({ chunks: data || [] });
  } catch {
    return NextResponse.json({ chunks: [] });
  }
}
