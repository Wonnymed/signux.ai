import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, expectedTopics, domain } = await req.json();

  try {
    const signuxResponse = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      system: "You are Signux AI, a decision intelligence platform for global operators. Provide specific, actionable business intelligence with real numbers and frameworks.",
      messages: [{ role: "user", content: question }],
    });

    const answer = signuxResponse.content[0].type === "text"
      ? signuxResponse.content[0].text
      : "";

    const evalResponse = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Evaluate this AI response for a business intelligence platform.

Question: ${question}
Domain: ${domain}
Expected topics: ${expectedTopics.join(", ")}

Response to evaluate:
${answer.slice(0, 2000)}

Rate on these criteria (1-10 each):
1. Accuracy — are the facts and frameworks correct?
2. Relevance — does it address the actual question?
3. Depth — does it go beyond surface-level?
4. Actionability — can the user act on this advice?
5. Domain usage — does it use specialized knowledge (not just generic AI)?

Respond ONLY with JSON:
{"accuracy": X, "relevance": X, "depth": X, "actionability": X, "domain_usage": X, "overall": X, "issues": ["issue1"], "strengths": ["strength1"]}`,
      }],
    });

    const evalText = evalResponse.content[0].type === "text"
      ? evalResponse.content[0].text
      : "{}";

    const evalResult = JSON.parse(evalText.replace(/```json|```/g, "").trim());

    return NextResponse.json({
      domain,
      question,
      scores: evalResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
