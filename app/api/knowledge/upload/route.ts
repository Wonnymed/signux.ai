import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;
  const userId = formData.get("userId") as string;

  if (!file || !projectId || !userId) {
    return NextResponse.json({ error: "Missing file, projectId, or userId" }, { status: 400 });
  }

  try {
    let text = "";
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
    } else {
      // For PDFs and other formats, use Claude to extract text
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "application/octet-stream";

      const extractResponse = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: mimeType, data: base64 } } as any,
            { type: "text", text: "Extract ALL text content from this document. Return only the raw text, no commentary." },
          ],
        }],
      });

      text = extractResponse.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map(c => c.text)
        .join("\n");
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
    }

    // Delete existing chunks for this file in this project (re-upload replaces)
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("project_id", projectId)
      .eq("source_name", file.name);

    const chunks = chunkText(text);

    const insertData = chunks.map((chunk, index) => ({
      project_id: projectId,
      user_id: userId,
      source_name: file.name,
      content: chunk,
      chunk_index: index,
      metadata: { originalSize: text.length, totalChunks: chunks.length },
    }));

    const { error } = await supabase.from("knowledge_chunks").insert(insertData);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunks: chunks.length,
      characters: text.length,
    });
  } catch (e: any) {
    console.error("Knowledge upload error:", e);
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
