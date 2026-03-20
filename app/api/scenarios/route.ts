import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SIM_KB = getKnowledgeForMode("simulate");
const RESEARCH_KB = getKnowledgeForMode("research");

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { context, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.simulate_report,
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + SIM_KB + RESEARCH_KB + `\n\nYou are Signux Scenario Planner — an expert in scenario planning, forecasting, and strategic foresight.

Generate 4 scenarios on a 2x2 matrix:
- X-axis: Continuity (things stay similar) ← → Disruption (major changes)
- Y-axis: Pessimistic (things get worse) ← → Optimistic (things get better)

Quadrants:
1. "Blue Sky" — optimistic + continuity (steady growth, favorable conditions)
2. "Wild Card" — optimistic + disruption (breakthrough innovation, new opportunity)
3. "Slow Burn" — pessimistic + continuity (gradual decline, erosion)
4. "Black Swan" — pessimistic + disruption (sudden crisis, market collapse)

SEARCH THE WEB for current data, trends, and signals relevant to the user's context.

Return ONLY valid JSON:
{
  "scenarios": [
    {
      "name": "Blue Sky",
      "quadrant": "optimistic + continuity",
      "probability": "30%",
      "narrative": "3-paragraph story of what happens over 12 months",
      "timeline": [
        { "month": 1, "event": "specific event" },
        { "month": 3, "event": "specific event" },
        { "month": 6, "event": "specific event" },
        { "month": 12, "event": "specific event" }
      ],
      "early_warnings": ["Signal 1 to watch", "Signal 2"],
      "recommended_actions": ["What to do if this happens"],
      "impact_on_you": "How this specifically affects your business"
    }
  ],
  "hedging_strategy": "Actions that work well across ALL 4 scenarios",
  "monitoring_plan": "What specific signals to watch weekly/monthly",
  "biggest_uncertainty": "The one variable that changes everything"
}

RULES:
- scenarios: EXACTLY 4, one per quadrant
- Probabilities must sum to ~100%
- Each narrative must be SPECIFIC with numbers, dates, and real market data
- Timeline events must be concrete and dateable
- early_warnings: 2-3 per scenario, specific and measurable
- hedging_strategy: actions robust across ALL scenarios, not just one
- Use current data from web search to ground scenarios in reality
- Pessimistic scenarios should be HONEST, not softened
- "Black Swan" should be genuinely scary but plausible

CITATION FORMAT:
In scenario narratives and strategies, cite the analytical source:
- [KB: scenario-planning] for scenario methodology
- [KB: geopolitics] for geopolitical factors
- [KB: competitive-intelligence] for competitive dynamics
- [KB: market-microstructure] for market structure analysis
- [framework: 2x2 scenario matrix] for the scenario framework
- [web: source] for web-verified data and trends

At the end of your response, include these hidden metadata blocks:

<!-- signux_verification: {"confidence": 0.82, "checked": ["list what you verified"], "caveats": ["list limitations"]} -->
Confidence must be honest: 0.9+ very high, 0.7-0.9 good, 0.5-0.7 moderate, below 0.5 low. Never inflate.

<!-- signux_worklog: {"steps": [{"action": "step type", "detail": "specific detail"}], "sources_count": N, "domains_used": N, "reasoning_steps": N} -->
List actual reasoning steps taken, not generic descriptions.

<!-- signux_domains: domain1, domain2, domain3 -->
<!-- signux_domain_count: X -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
      messages: [{ role: "user", content: `Context: ${context}\n\nSearch for current market data and trends. Generate 4 scenarios for the next 12 months. Respond in ${lang || "en"}.` }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = { scenarios: [], hedging_strategy: "", monitoring_plan: "", biggest_uncertainty: text };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scenario planning failed" }, { status: 500 });
  }
}
