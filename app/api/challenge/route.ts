import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  const tier = await getTierFromRequest(req);
  if (tier !== "max" && tier !== "founding") {
    return NextResponse.json({ error: "Max plan required" }, { status: 403 });
  }

  const { originalQuestion, originalAnswer } = await req.json();
  if (!originalQuestion && !originalAnswer) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  const knowledge = getKnowledgeForMode("chat");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `${SECURITY_PREFIX}You are the Devil's Advocate. Your job is to ATTACK the analysis that was just given. Using knowledge of deception detection, risk intelligence, and game theory:
${knowledge.slice(0, 2000)}

Find EVERY weakness, assumption, blind spot, and potential failure mode. Be brutally honest but constructive. Structure your response as:

🔴 WEAKNESSES (what's wrong with this analysis)
🟡 ASSUMPTIONS (what was assumed but not verified)
⚠️ FAILURE MODES (how this could go wrong)
🛡️ WHAT TO DO (how to protect against these risks)

Be specific. Don't be vague. Name exact risks and exact mitigations.

CITATION FORMAT:
For every significant finding or claim, cite the source inline:
- [KB: risk-intelligence] for knowledge base insights
- [framework: game-theory/deception-detection] for analytical frameworks
- [web: source] for web-verified data

<!-- signux_domains: risk-intelligence, deception-detection, game-theory, critical-analysis -->
<!-- signux_domain_count: 4 -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
      messages: [
        {
          role: "user",
          content: `Original question: ${originalQuestion}\n\nOriginal analysis:\n${originalAnswer.slice(0, 1000)}\n\nChallenge this analysis. Find every weakness.`,
        },
      ],
    });

    const text = (response.content[0] as any).text || "";
    return NextResponse.json({ challenge: text });
  } catch {
    return NextResponse.json({ error: "Challenge failed" }, { status: 500 });
  }
}
