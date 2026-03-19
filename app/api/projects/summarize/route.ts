import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { verifyClientToken } from "../../../lib/security";
import { getUserFromRequest } from "../../../lib/usage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* POST — auto-summarize project from recent conversations */
export async function POST(req: NextRequest) {
  try {
    const tokenError = verifyClientToken(req);
    if (tokenError) return tokenError;

    const userId = await getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // Verify project belongs to user
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, summary")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Fetch recent conversations linked to this project
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!conversations?.length) {
      return NextResponse.json({ summary: project.summary || "" });
    }

    // Fetch last 3 messages from each conversation
    const convIds = conversations.map(c => c.id);
    const { data: messages } = await supabase
      .from("messages")
      .select("conversation_id, role, content")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(30);

    // Build context from conversations
    const convContext = conversations.map(c => {
      const msgs = (messages || [])
        .filter(m => m.conversation_id === c.id)
        .slice(0, 3)
        .map(m => `${m.role}: ${m.content.slice(0, 300)}`)
        .join("\n");
      return `### ${c.title || "Untitled"}\n${msgs}`;
    }).join("\n\n");

    // Generate summary via Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Summarize this project's current state in 2-3 paragraphs. Focus on: key decisions made, open questions, and next steps. Project name: "${project.name}"\n\nRecent conversations:\n${convContext}`,
        },
      ],
    });

    const summary = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    // Save summary to project
    await supabase
      .from("projects")
      .update({ summary, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("Projects summarize error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
