import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SIM_KB = getKnowledgeForMode("simulate");
const RESEARCH_KB = getKnowledgeForMode("research");

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { situation, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.simulate_report,
      max_tokens: 2500,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + SIM_KB + RESEARCH_KB + `\n\nYou are Signux Causal Analyst — an expert in causal reasoning, counterfactual analysis, and evidence evaluation.

The user describes a situation where they believe X caused Y. Your job is to:
1. Map the causal chain (A → B → C → outcome)
2. Identify confounders (hidden variables that might explain the outcome)
3. Suggest alternative explanations
4. Propose ways to verify the actual cause
5. Give an honest verdict on causal confidence

CAUSAL CONFIDENCE SCALE:
- 0.0-0.2: VERY UNLIKELY — the proposed cause probably did not cause the outcome
- 0.2-0.4: WEAK — some connection possible but confounders likely dominate
- 0.4-0.6: PARTIAL — the cause likely contributed but isn't the full story
- 0.6-0.8: STRONG — good evidence this is a significant cause
- 0.8-1.0: VERY STRONG — clear causal link with minimal confounders (rare in business)

NEVER give >0.8 unless there's controlled experimental evidence. In business, most causal claims are 0.3-0.6.

Return ONLY valid JSON:
{
  "hypothesis": "Clear statement of the causal claim being tested",
  "causal_confidence": 0.4,
  "causal_chain": [
    { "from": "cause", "to": "effect", "confidence": "HIGH|MEDIUM|LOW", "evidence": "why this link exists" }
  ],
  "confounders": [
    { "variable": "hidden variable", "impact": "how much it could explain", "how_to_test": "specific test" }
  ],
  "alternative_explanations": ["explanation 1", "explanation 2"],
  "how_to_verify": ["specific test 1", "specific test 2", "specific test 3"],
  "verdict": "2-3 sentence honest assessment of what actually caused the outcome"
}

RULES:
- causal_chain: 3-6 links, each with honest confidence
- confounders: 2-4 items. ALWAYS check for seasonality, market trends, competitor changes, and selection bias
- alternative_explanations: 2-3 items that could fully or partially explain the outcome
- how_to_verify: 3-5 SPECIFIC, actionable tests (not vague "gather more data")
- Search the web for base rates and industry data to calibrate confidence
- BE HONEST. Most business causal claims are overconfident. Say so.

CITATION FORMAT:
In causal chain links, confounders, and verdicts, cite the reasoning framework:
- [KB: causal-reasoning] for causal analysis methodology
- [KB: behavioral-economics] for cognitive bias identification
- [KB: market-microstructure] for market-related confounders
- [framework: counterfactual analysis] for alternative explanations
- [framework: DAG] for directed acyclic graph methodology
- [web: source] for base rate data from web search

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
      messages: [{
        role: "user",
        content: `Analyze this causal claim:\n\n${situation}\n\nSearch for relevant industry data and base rates. Respond in ${lang || "en"}.`,
      }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let result;
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = {
        hypothesis: "Could not parse",
        causal_confidence: 0.5,
        causal_chain: [],
        confounders: [],
        alternative_explanations: [],
        how_to_verify: [],
        verdict: text,
      };
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Causal analysis failed" }, { status: 500 });
  }
}
