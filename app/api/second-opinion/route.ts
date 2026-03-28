import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getKnowledgeForMode } from "../../lib/knowledge-base";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

const DOMAIN_SETS = [
  {
    key: "game_theory",
    label: "Game Theory",
    color: "#E8784A",
    prompt: "Analyze this situation purely through game theory. Who are the players? What are their incentives? What's the Nash equilibrium? What move maximizes your advantage?",
  },
  {
    key: "risk_intel",
    label: "Risk Intelligence",
    color: "#EF4444",
    prompt: "Analyze this situation through risk intelligence. What are the top threats? What could go wrong? What's the worst realistic case? What early warning signals should they watch?",
  },
  {
    key: "behavioral",
    label: "Behavioral Economics",
    color: "#06B6D4",
    prompt: "Analyze this situation through behavioral economics. What cognitive biases might be at play? What heuristics is the decision-maker relying on? Where might System 1 thinking lead them astray?",
  },
];

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

  const opinions = await Promise.all(
    DOMAIN_SETS.map(async (ds) => {
      try {
        const response = await client.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 400,
          system: `${SECURITY_PREFIX}You are an expert in ${ds.label}. Using this knowledge:${knowledge.slice(0, 1500)}\n\n${ds.prompt}\n\nBe specific, concise, and give a different perspective than a generic AI would. Max 3 paragraphs. End with a confidence level (HIGH/MEDIUM/LOW) and one key insight.\n\n<!-- signux_domains: game-theory, risk-intelligence, behavioral-economics -->\n<!-- signux_domain_count: 3 -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
          messages: [
            {
              role: "user",
              content: `Original question: ${originalQuestion}\n\nOriginal AI answer (summarized): ${originalAnswer.slice(0, 500)}\n\nGive your ${ds.label} perspective on this.`,
            },
          ],
        });
        const text = (response.content[0] as any).text || "";
        const confMatch = text.match(/(HIGH|MEDIUM|LOW)/i);
        const confidence = confMatch ? confMatch[1].toUpperCase() : "MEDIUM";
        return {
          domain: ds.label,
          color: ds.color,
          analysis: text,
          confidence,
        };
      } catch {
        return { domain: ds.label, color: ds.color, analysis: "Analysis unavailable.", confidence: "LOW" };
      }
    })
  );

  return NextResponse.json({ opinions });
}
