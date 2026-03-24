import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ patterns: null });

  const { data: contexts } = await supabase
    .from("user_context")
    .select("context_type, summary, key_insights, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!contexts || contexts.length < 5) {
    return NextResponse.json({ patterns: null, reason: "Need 5+ analyses to detect patterns" });
  }

  const { data: decisions } = await supabase
    .from("decision_journal")
    .select("decision, outcome, score, created_at")
    .eq("user_id", userId)
    .not("outcome", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Analyze this user's analysis history and find PATTERNS. Be specific and insightful.

ANALYSIS HISTORY (${contexts.length} analyses):
${contexts.map((c, i) => `${i + 1}. [${c.context_type}] ${c.summary} — Insights: ${c.key_insights?.join(", ") || "none"}`).join("\n")}

${decisions && decisions.length > 0 ? `
DECISION OUTCOMES (${decisions.length} tracked):
${decisions.map((d, i) => `${i + 1}. "${d.decision}" → ${d.outcome} (Score: ${d.score}/10)`).join("\n")}
` : ""}

Respond ONLY with JSON:
{
  "patterns": [
    {"type": "strength", "insight": "specific pattern found", "evidence": "based on X analyses"},
    {"type": "weakness", "insight": "specific pattern found", "evidence": "based on X analyses"},
    {"type": "blind_spot", "insight": "something they keep missing", "evidence": "based on X analyses"}
  ],
  "accuracy_score": 0.0,
  "top_domains": ["domain1", "domain2"],
  "recommendation": "one actionable recommendation"
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const patterns = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ patterns });
  } catch {
    return NextResponse.json({ patterns: null });
  }
}
