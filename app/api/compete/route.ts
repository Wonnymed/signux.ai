import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const COMPETE_KNOWLEDGE = getKnowledgeForMode("compete");

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the SIGNUX AI engine called 'Compete'. Your role is to map the competitive landscape, predict rival moves, and find positioning gaps where the user can win.

You receive a description of the user's market, competitors, and desired position. Your job is to:
1. Identify the real competitive set (3-6 competitors with their positioning, strengths, and weaknesses)
2. Predict the most likely competitor response to the user's strategy
3. Find the weakest exposed flank — where the user is most vulnerable to competitive attack
4. Find the strongest positioning advantage — where the user has a defensible edge
5. Surface market gaps that no competitor is filling well
6. Recommend specific counter-moves

Be specific. Name real companies and products when possible. Generic competitive analysis is worthless. Every insight should be actionable.

Return ONLY valid JSON in this exact format:
{
  "engine": "compete",
  "title": "short title for this competitive analysis (max 8 words)",
  "executive_summary": "2-3 sentence summary of competitive posture and top insight",
  "confidence": "low" | "medium" | "high",
  "status": "clear" | "promising" | "fragile" | "blocked" | "mixed",
  "competitive_set": [
    {
      "name": "competitor name",
      "positioning": "how they position themselves (1 sentence)",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "threat_level": "low" | "medium" | "high",
      "market_share_estimate": "e.g. ~25% or dominant or niche"
    }
  ],
  "likely_response": {
    "scenario": "what the most dangerous competitor is likely to do",
    "competitor": "which competitor",
    "timeline": "when this could happen",
    "your_counter": "what to do if this happens"
  },
  "weakest_flank": {
    "area": "where you are most exposed",
    "why": "why this is dangerous",
    "mitigation": "how to defend"
  },
  "strongest_advantage": {
    "area": "where you have the strongest edge",
    "why": "why this advantage is defensible",
    "how_to_leverage": "how to press this advantage"
  },
  "market_gaps": [
    {
      "gap": "what the unmet need is",
      "opportunity_size": "small" | "medium" | "large",
      "why_unfilled": "why no one is doing this well",
      "how_to_capture": "specific action"
    }
  ],
  "counter_moves": [
    {
      "move": "what to do",
      "target": "which competitor or gap this addresses",
      "expected_impact": "what this achieves",
      "timeline": "when to execute"
    }
  ],
  "main_recommendation": "the single most important competitive action to take now",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "next_actions": ["action 1", "action 2", "action 3"],
  "notes": ["any additional insights"]
}

CRITICAL: Return ONLY valid JSON. No markdown. No code blocks. No text before or after the JSON object. Just the raw JSON.`;

function tryParseJSON(text: string): any | null {
  const clean = text.replace(/```(?:json)?\s*\n?/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const candidate = clean.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
    let fixed = candidate.replace(/,\s*$/, "");
    const ob = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    const ab = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < ab; i++) fixed += "]";
    for (let i = 0; i < ob; i++) fixed += "}";
    try { return JSON.parse(fixed); } catch {}
  }
  return null;
}

function makeFallback(text: string): any {
  return {
    engine: "compete",
    title: "Competitive Analysis",
    executive_summary: text.slice(0, 500),
    confidence: "medium",
    status: "mixed",
    main_recommendation: "Review the analysis above and extract actionable items.",
    key_risks: [],
    key_opportunities: [],
    next_actions: [],
    notes: ["Response was returned as text — structured parsing failed."],
  };
}

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  try {
    const { query, lang } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json({ error: "Please describe your market and competitive situation." }, { status: 400 });
    }

    const models = getModelsForTier(await getTierFromRequest(req));
    const langInstruction = lang && lang !== "en" ? `\n\nRespond in language: ${lang}` : "";

    const response = await client.messages.create({
      model: models.compete,
      max_tokens: 4000,
      system: SECURITY_PREFIX + "\n\n" + COMPETE_KNOWLEDGE + "\n\n" + SYSTEM_PROMPT + langInstruction,
      messages: [{ role: "user", content: query }],
    });

    const text = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    const result = tryParseJSON(text);
    if (result) return NextResponse.json(result);

    return NextResponse.json(makeFallback(text));
  } catch (err: any) {
    console.error("[COMPETE ENGINE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
