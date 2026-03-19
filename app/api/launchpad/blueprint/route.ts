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
  const { business, profile, validationReport, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  try {
    const response = await client.messages.create({
      model: models.launchpad,
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      system: SECURITY_PREFIX + LP_KNOWLEDGE + `\n\nYou are the Signux Blueprint Generator. Create a SPECIFIC, ACTIONABLE 90-day plan.

RULES:
- Every task must have a SPECIFIC deliverable ("Write 5 LinkedIn posts" not "Create content")
- Include NUMBERS ("Contact 20 potential clients" not "Reach out to people")
- Include COSTS ("Budget $200 for Canva Pro + domain" not "Invest in tools")
- Include TIME ("This should take 3 hours" not "Set aside time")
- Be REALISTIC about what one person can do

Return JSON:
{
  "business_model_canvas": {
    "value_proposition": "specific text",
    "customer_segments": ["segment 1", "segment 2"],
    "channels": ["channel 1", "channel 2"],
    "revenue_streams": ["stream 1 with pricing"],
    "key_resources": ["resource 1"],
    "cost_structure": {"monthly_fixed": "$X", "variable": "$Y per unit", "tools": [{"name": "tool", "cost": "$X/mo", "why": "reason"}]}
  },
  "pricing": {
    "strategy": "description",
    "tiers": [{"name": "tier", "price": "$X", "includes": "what", "target": "who"}]
  },
  "icp": {
    "description": "detailed ideal customer profile",
    "pain_points": ["pain 1"],
    "where_they_hang_out": ["place 1"],
    "budget_range": "$X-Y"
  },
  "week_by_week": [
    {
      "week": 1,
      "theme": "Foundation",
      "tasks": [{"task": "specific task", "deliverable": "what", "time": "2 hours", "cost": "$0"}],
      "milestone": "what success looks like",
      "revenue_target": "$0"
    }
  ],
  "tools_stack": [{"name": "tool", "cost": "$X/mo", "purpose": "why"}],
  "first_week_checklist": ["action 1", "action 2"],
  "kill_metrics": {
    "week4": "If X, pivot",
    "week8": "If Y, reconsider",
    "week12": "If Z, major changes"
  },
  "templates": {
    "cold_email": "Full template",
    "linkedin_post": "Full template",
    "elevator_pitch": "30-second pitch",
    "pricing_page_copy": "Headline + bullets + CTA"
  }
}

Search the web for current tool pricing and market data.`,
      messages: [{
        role: "user",
        content: `BUSINESS: ${business.name} - ${business.description}\nCategory: ${business.category}\nPROFILE: Skills: ${profile.skills}, Capital: ${profile.capital}, Time: ${profile.time}\nVALIDATION SCORE: ${validationReport?.viability_score || "N/A"}\n\nGenerate the 90-day blueprint. Respond in ${lang || "en"}.`,
      }],
    });

    const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    let blueprint;
    try {
      blueprint = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      blueprint = { error: "Could not generate blueprint", raw: text };
    }

    return NextResponse.json({ blueprint });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Blueprint generation failed" }, { status: 500 });
  }
}
