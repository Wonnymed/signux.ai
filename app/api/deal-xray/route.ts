import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHAT_KB = getKnowledgeForMode("chat");
const INVEST_KB = getKnowledgeForMode("invest");

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { description, document_text, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  const dealContent = document_text
    ? `DEAL DESCRIPTION:\n${description}\n\nATTACHED DOCUMENT:\n${document_text}`
    : `DEAL DESCRIPTION:\n${description}`;

  try {
    const response = await client.messages.create({
      model: models.deal_xray,
      max_tokens: 3000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + CHAT_KB + INVEST_KB + `\n\nYou are Signux Deal X-Ray — a forensic deal analysis engine that combines deception detection, game theory, causal reasoning, and negotiation intelligence.

The user describes a deal, partnership, investment, or business opportunity. You SEARCH THE WEB to verify claims, check counterparty reputation, and find relevant market data.

Apply these frameworks:
1. DECEPTION DETECTION: Decompose claims into actor/audience/incentive/evidence. Weight costly signals over cheap talk. Check for manufactured urgency, selective disclosure, narrative inconsistencies
2. GAME THEORY: Model the counterparty's optimal strategy, BATNA, and likely next moves. Identify information asymmetries
3. CAUSAL REASONING: Separate correlation from causation in claimed metrics. Check base rates
4. NEGOTIATION: Identify leverage points, ZOPA, and counter-strategies

Trust Score 1-10:
- 1-3: HIGH RISK — Multiple red flags, likely deceptive
- 4-5: SUSPICIOUS — Significant concerns, proceed with extreme caution
- 6-7: PROCEED WITH CAUTION — Some concerns but manageable
- 8-9: RELATIVELY SAFE — Minor concerns only
- 10: VERIFIED — All claims check out (rare)

Verdict: WALK_AWAY | PROCEED_WITH_CAUTION | NEGOTIATE_HARDER | PROCEED

Return ONLY valid JSON:
{
  "trust_score": 7,
  "verdict": "PROCEED_WITH_CAUTION",
  "verdict_summary": "One sentence summary",
  "verified_claims": [
    { "claim": "what they said", "status": "VERIFIED|UNVERIFIABLE|SUSPICIOUS|FALSE", "note": "evidence or lack thereof" }
  ],
  "red_flags": [
    { "flag": "description", "severity": "HIGH|MEDIUM|LOW", "explanation": "why this matters" }
  ],
  "hidden_incentives": ["insight about counterparty motivation"],
  "missing_information": ["what they didn't tell you that you need"],
  "game_theory_analysis": "Their optimal strategy and your leverage",
  "counter_strategy": "Specific negotiation tactics to use",
  "recommendation": "Detailed recommendation with specific next steps"
}

RULES:
- verified_claims: check EVERY factual claim in the description via web search
- red_flags: be BRUTALLY honest. If it smells bad, say so
- hidden_incentives: apply game theory — what does the counterparty really want?
- missing_information: what would a smart investor/partner ask that isn't answered?
- NEVER inflate trust_score. A 6 is generous. Most deals are 5-7
- If the deal is bad, say WALK_AWAY. Don't hedge

CITATION FORMAT:
In red flags, verified claims, and analysis, cite the source of each finding:
- [KB: deception-detection] for deception analysis
- [KB: game-theory] for game theory insights
- [KB: negotiation-warfare] for negotiation leverage
- [KB: risk-detection] for risk identification
- [KB: causal-reasoning] for causal analysis
- [framework: BATNA analysis] for negotiation frameworks
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
      messages: [{ role: "user", content: `X-Ray this deal:\n\n${dealContent}\n\nVerify all claims via web search. Respond in ${lang || "en"}.` }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = {
        trust_score: 5,
        verdict: "PROCEED_WITH_CAUTION",
        verdict_summary: "Could not fully analyze",
        verified_claims: [],
        red_flags: [],
        hidden_incentives: [],
        missing_information: [],
        game_theory_analysis: text,
        counter_strategy: "",
        recommendation: "Review manually",
      };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Deal analysis failed" }, { status: 500 });
  }
}
