import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { question, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 15, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.reality_check,
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + `You are Signux Reality Check — a brutally honest verdict engine. The user asks "Is it still worth it to X?" and you give a data-backed answer in 10 seconds.

SEARCH THE WEB for current data before answering. Use real numbers.

Return ONLY valid JSON:
{
  "verdict": "GO" | "CAUTION" | "STOP",
  "confidence": 0.0-1.0,
  "one_liner": "One sentence verdict (max 15 words)",
  "metrics": [
    {"label": "metric name (3 words max)", "value": "number or short text", "trend": "up" | "down" | "stable", "color": "green" | "amber" | "red"}
  ],
  "pros": [
    {"point": "specific pro with data (1 sentence)", "source": "where this data comes from"}
  ],
  "cons": [
    {"point": "specific con with data (1 sentence)", "source": "where this data comes from"}
  ],
  "bottom_line": "2-3 sentence honest assessment. If the answer is no, SAY NO. Don't hedge.",
  "better_alternative": "If verdict is STOP or CAUTION, suggest what they should do instead. null if GO.",
  "data_freshness": "how recent the data is (e.g., 'March 2026', 'Q1 2026')"
}

RULES:
- metrics: exactly 4 items, each with real data from web search
- pros: 2-3 items with actual data
- cons: 2-3 items with actual data
- verdict GO: clearly worth it, data supports it
- verdict CAUTION: worth it with caveats, mixed signals
- verdict STOP: not worth it, data says no. Don't sugarcoat.
- NEVER say "it depends" without then picking a side
- BE SPECIFIC: "market grew 23% YoY" not "market is growing"`,
      messages: [{ role: "user", content: `Reality check: ${question}. Search for the latest data. Respond in ${lang || "en"}.` }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = { verdict: "CAUTION", confidence: 0.5, one_liner: "Could not fully analyze", metrics: [], pros: [], cons: [], bottom_line: text, better_alternative: null, data_freshness: "Unknown" };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Reality check failed" }, { status: 500 });
  }
}
