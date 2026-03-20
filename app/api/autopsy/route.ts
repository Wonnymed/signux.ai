import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  const { decision, outcome, context, lang } = await req.json();
  if (!decision || !outcome) {
    return NextResponse.json({ error: "Decision and outcome are required" }, { status: 400 });
  }

  const knowledge = getKnowledgeForMode("chat");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `${SECURITY_PREFIX}You are a decision analyst with expertise across 100+ business intelligence domains:
${knowledge}

The user will describe a decision they made and its outcome. Analyze it using ALL relevant knowledge domains. Be honest and constructive.${lang && lang !== "en" ? ` Respond in the language: ${lang}.` : ""}

Respond in this exact JSON format:
{
  "decision_score": 7,
  "score_explanation": "Why this score",
  "what_went_right": [
    { "factor": "description", "domain": "which domain explains this", "lesson": "takeaway" }
  ],
  "what_went_wrong": [
    { "factor": "description", "domain": "which domain would have caught this", "lesson": "takeaway" }
  ],
  "domains_not_consulted": [
    { "domain": "domain_name", "would_have_revealed": "what you would have found", "impact": "HIGH/MEDIUM/LOW" }
  ],
  "key_lessons": ["lesson 1", "lesson 2", "lesson 3"],
  "next_time_checklist": ["Check X before deciding", "Run Y analysis", "Consult Z"]
}

Score 1-10 based on PROCESS QUALITY not outcome. A good process with bad outcome gets a high score. A bad process with lucky outcome gets a low score.

CITATION FORMAT:
For every significant finding or claim, cite the source inline:
- [KB: decision-analysis] for knowledge base insights
- [framework: decision-science/risk-assessment] for analytical frameworks
- [web: source] for web-verified data

<!-- signux_domains: decision-analysis, risk-assessment, behavioral-economics, process-evaluation -->
<!-- signux_domain_count: 4 -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
      messages: [
        {
          role: "user",
          content: `Decision: ${decision}\n\nOutcome: ${outcome}\n\n${context ? `Additional context: ${context}` : ""}`,
        },
      ],
    });

    const text = (response.content[0] as any).text || "";
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ raw: text });
    }
  } catch {
    return NextResponse.json({ error: "Autopsy failed" }, { status: 500 });
  }
}
