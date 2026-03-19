import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { text, mode } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 20, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  const modeInstructions: Record<string, string> = {
    chat: "Improve this message for a business AI assistant. Make it clearer, more specific, and likely to get a useful response. Add relevant details the user might have forgotten to mention (budget, timeline, market, constraints). Keep their intent.",
    simulate: "Improve this scenario description for a multi-agent business simulation. Make it specific with numbers (budget, timeline, team size, revenue targets). Add context about market, geography, and constraints. The simulation needs concrete details to give useful results.",
    research: "Improve this research query. Make it specific about what data points are needed, what time frame, which markets/regions, and what format the answer should take. A good research query defines scope clearly.",
    launchpad: "Improve this description of skills and business context. Add specificity about experience level, available hours, target market, and what success looks like.",
    globalops: "Improve this cross-border operations query. Add specific jurisdictions, entity types, transaction flows, compliance requirements, and regulatory frameworks that are relevant.",
    invest: "Improve this investment analysis query. Add specific numbers (deal size, valuation, revenue, growth rate, timeline). Mention what metrics matter most (IRR, EV, payback period). Specify risk tolerance and comparison benchmarks.",
  };

  try {
    const response = await client.messages.create({
      model: models.enhance,
      max_tokens: 500,
      system: SECURITY_PREFIX + `You are a prompt enhancement engine. ${modeInstructions[mode] || modeInstructions.chat}

RULES:
- Return ONLY the improved text, nothing else
- No preamble like "Here's the improved version:"
- Keep the same language the user wrote in (if they wrote in Portuguese, respond in Portuguese)
- Don't change the core intent — enhance, don't replace
- Make it 1.5-3x longer than the original by adding useful specificity
- Don't add questions — make it a statement/request
- Don't be flowery or formal — keep it natural and direct`,
      messages: [{ role: "user", content: text }],
    });

    const enhanced = (response.content[0] as any).text || text;
    return NextResponse.json({ enhanced });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Enhance failed" }, { status: 500 });
  }
}
