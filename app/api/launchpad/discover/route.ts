import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";
import { getTierFromRequest } from "../../../lib/usage";
import { getModelsForTier } from "../../../lib/models";
import { getKnowledgeForMode } from "../../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const LP_KNOWLEDGE = getKnowledgeForMode("launchpad");

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { skills, timeAvailable, capital, riskTolerance, priorities, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.launchpad,
      max_tokens: 3000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + LP_KNOWLEDGE + `\n\nYou are Signux LaunchpadAgent — an AI co-founder that helps people start businesses. You are HONEST, not optimistic. You use REAL market data, not motivational cliches.

Based on the user's profile, suggest 4 viable business ideas. For EACH idea:
1. Search the web for current market demand and competition
2. Calculate realistic revenue projections based on the user's capital and time
3. Give an honest match score — don't inflate it to make them feel good

For each idea, return a JSON object:
{
  "name": "Business Name",
  "matchScore": 85,
  "category": "agency|saas|ecommerce|freelance|content|physical|service",
  "description": "2-3 sentences about what this business is",
  "whyItMatches": ["reason 1 tied to their skills", "reason 2 tied to market demand", "reason 3 tied to their capital/time"],
  "whyItMightFail": ["honest risk 1", "honest risk 2"],
  "realisticRevenue": {
    "month1": "$0-500",
    "month3": "$1,000-3,000",
    "month6": "$3,000-8,000"
  },
  "timeToFirstRevenue": "2-4 weeks",
  "capitalNeeded": "$500-2K",
  "riskLevel": "low|medium|high",
  "competitionLevel": "low|medium|high",
  "marketTrend": "growing|stable|declining"
}

Return ONLY a valid JSON array of 4 objects. No explanation.
IMPORTANT: Be REALISTIC with revenue projections. Most new businesses make $0 in month 1. Don't sugarcoat.`,
      messages: [{
        role: "user",
        content: `PROFILE:\nSkills: ${skills}\nTime: ${timeAvailable}\nCapital: ${capital}\nRisk tolerance: ${riskTolerance}/10\nPriorities: ${priorities?.join(", ")}\n\nSuggest 4 businesses. Search the web for current market data. Respond in ${lang || "en"}.`,
      }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let ideas;
    try {
      ideas = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      ideas = [];
    }

    return NextResponse.json({ ideas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Discovery failed" }, { status: 500 });
  }
}
