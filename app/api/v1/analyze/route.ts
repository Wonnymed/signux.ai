import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Get one at signux.ai/settings", docs: "https://signux.ai/docs/api" },
      { status: 401 }
    );
  }

  const { data: keyData } = await supabase
    .from("api_keys")
    .select("user_id, tier, requests_today, daily_limit")
    .eq("key", apiKey)
    .eq("status", "active")
    .single();

  if (!keyData) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (keyData.requests_today >= keyData.daily_limit) {
    return NextResponse.json(
      { error: "Daily limit reached", limit: keyData.daily_limit, reset: "midnight UTC" },
      { status: 429 }
    );
  }

  try {
    const { query, mode, context } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    const validModes = ["chat", "simulate", "compete", "hire", "build", "protect", "grow"];
    const selectedMode = validModes.includes(mode) ? mode : "chat";

    const systemPrompt = `You are Sukgo AI, a decision intelligence platform. Mode: ${selectedMode}.${context ? ` Additional context: ${context}` : ""} Provide structured analysis with actionable insights. Include positive factors and key concerns.`;

    const model = DEFAULT_MODEL;

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    await supabase
      .from("api_keys")
      .update({
        requests_today: keyData.requests_today + 1,
        total_requests: (keyData as any).total_requests ? (keyData as any).total_requests + 1 : 1,
      })
      .eq("key", apiKey);

    return NextResponse.json({
      analysis: text,
      mode: selectedMode,
      tokens_used: response.usage?.output_tokens || 0,
      model: response.model,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
