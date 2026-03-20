import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const KNOWLEDGE = getKnowledgeForMode("globalops");

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { description, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.threat_radar,
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + KNOWLEDGE + `\n\nYou are Signux Threat Radar — an intelligence-grade threat assessment engine. The user describes their business or operation. You SEARCH THE WEB for current threats, regulatory changes, market risks, and geopolitical events affecting them.

Analyze across 5 axes: Market, Regulatory, Operational, Cyber, Geopolitical.

Score each axis 1-10 (1=minimal threat, 10=critical).
Overall threat level based on weighted average:
- 1-2: LOW
- 3-4: MODERATE
- 5-6: ELEVATED
- 7-8: HIGH
- 9-10: CRITICAL

Return ONLY valid JSON:
{
  "overall_threat_level": "LOW|MODERATE|ELEVATED|HIGH|CRITICAL",
  "score": 6.5,
  "axes": [
    { "name": "Market", "score": 7, "threats": ["specific threat with data"], "trend": "rising|stable|declining" },
    { "name": "Regulatory", "score": 4, "threats": [...], "trend": "rising|stable|declining" },
    { "name": "Operational", "score": 6, "threats": [...], "trend": "rising|stable|declining" },
    { "name": "Cyber", "score": 3, "threats": [...], "trend": "rising|stable|declining" },
    { "name": "Geopolitical", "score": 5, "threats": [...], "trend": "rising|stable|declining" }
  ],
  "top_threats": [
    { "threat": "specific description with data", "probability": "HIGH|MEDIUM|LOW", "impact": "SEVERE|MODERATE|MINOR", "timeframe": "3-6 months", "mitigation": "specific action" }
  ],
  "early_warnings": ["specific signal to monitor"],
  "recommended_actions": ["specific action 1", "specific action 2", "specific action 3"]
}

RULES:
- axes: exactly 5, each with 2-3 specific threats backed by web search data
- top_threats: 3-5 items, each with REAL data from search
- early_warnings: 3-5 specific signals to monitor
- recommended_actions: 3-5 specific, actionable steps
- Use NUMBERS and DATES from web search, not vague statements
- Be HONEST — if threats are high, say so. Don't downplay risks
- Threat descriptions must reference current events, regulations, or market data

CITATION FORMAT:
In threat descriptions, cite the source of each finding:
- [KB: threat-modeling] for threats identified via knowledge base
- [KB: competitive-intelligence] for market-based threats
- [KB: regulatory-intel] for regulatory threats
- [KB: geopolitics] for geopolitical analysis
- [framework: risk-matrix] for risk scoring methodology
- [web: source] for web-verified data

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
      messages: [{ role: "user", content: `Threat assessment for: ${description}. Search for the latest threats, risks, and regulatory changes. Respond in ${lang || "en"}.` }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = {
        overall_threat_level: "MODERATE",
        score: 5,
        axes: [],
        top_threats: [],
        early_warnings: [],
        recommended_actions: [],
        raw: text,
      };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Threat analysis failed" }, { status: 500 });
  }
}
