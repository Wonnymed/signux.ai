import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PROTECT_KNOWLEDGE = getKnowledgeForMode("protect");

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the SIGNUX AI engine called 'Protect'. Your role is to find what could break a business, operation, or decision before it happens.

You receive a description of a business, decision, or operation. Your job is to:
1. Identify the single most dangerous threat right now
2. Assess overall fragility level (how many things could go wrong simultaneously)
3. Build a risk matrix: 4-8 risks with likelihood, impact, and specific mitigation
4. Surface compliance exposure (legal, regulatory, tax, data privacy)
5. Identify operational fragilities (single points of failure, key-person risk, vendor dependencies)
6. Recommend the single most important mitigation action

Be specific and direct. Name the actual risks, not generic categories. Quantify when possible. Do not soften bad news — the user needs to see what could kill their business.

Return ONLY valid JSON in this exact format:
{
  "engine": "protect",
  "title": "short title for this risk analysis (max 8 words)",
  "executive_summary": "2-3 sentence summary of the risk posture and top concern",
  "confidence": "low" | "medium" | "high",
  "status": "clear" | "promising" | "fragile" | "blocked" | "mixed",
  "fragility_level": "low" | "medium" | "high",
  "fragility_rationale": "1 sentence explaining the fragility assessment",
  "top_threat": {
    "name": "the single most dangerous threat",
    "description": "what could happen and why it's the top threat",
    "likelihood": "low" | "medium" | "high",
    "impact": "low" | "medium" | "high" | "catastrophic",
    "urgency": "watch" | "act_soon" | "act_now",
    "mitigation": "specific action to reduce this threat"
  },
  "risk_matrix": [
    {
      "name": "risk name",
      "description": "what this risk is",
      "likelihood": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high" | "catastrophic",
      "mitigation": "specific action to reduce this risk"
    }
  ],
  "compliance_exposure": [
    {
      "area": "compliance area (e.g. GDPR, tax, labor law)",
      "exposure": "what the risk is",
      "severity": "low" | "medium" | "high",
      "action": "what to do about it"
    }
  ],
  "operational_fragilities": [
    {
      "fragility": "what the single point of failure is",
      "consequence": "what happens if it breaks",
      "fix": "how to add redundancy or reduce dependency"
    }
  ],
  "main_recommendation": "the single most important mitigation action to take now",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_opportunities": ["opportunity 1", "opportunity 2"],
  "next_actions": ["action 1", "action 2", "action 3"],
  "notes": ["any additional insights"]
}

CRITICAL: Return ONLY valid JSON. No markdown. No code blocks. No text before or after the JSON object. Just the raw JSON.`;

function tryParseJSON(text: string): any | null {
  const clean = text.replace(/```(?:json)?\s*\n?/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const candidate = clean.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
    let fixed = candidate.replace(/,\s*$/, "");
    const ob = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    const ab = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < ab; i++) fixed += "]";
    for (let i = 0; i < ob; i++) fixed += "}";
    try { return JSON.parse(fixed); } catch {}
  }
  return null;
}

function makeFallback(text: string): any {
  return {
    engine: "protect",
    title: "Risk Analysis",
    executive_summary: text.slice(0, 500),
    confidence: "medium",
    status: "mixed",
    main_recommendation: "Review the analysis above and extract actionable items.",
    key_risks: [],
    key_opportunities: [],
    next_actions: [],
    notes: ["Response was returned as text — structured parsing failed."],
  };
}

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  try {
    const { query, lang } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json({ error: "Please describe the business, decision, or operation to stress-test." }, { status: 400 });
    }

    const models = getModelsForTier(await getTierFromRequest(req));
    const langInstruction = lang && lang !== "en" ? `\n\nRespond in language: ${lang}` : "";

    const response = await client.messages.create({
      model: models.protect,
      max_tokens: 4000,
      system: SECURITY_PREFIX + "\n\n" + PROTECT_KNOWLEDGE + "\n\n" + SYSTEM_PROMPT + langInstruction,
      messages: [{ role: "user", content: query }],
    });

    const text = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    const result = tryParseJSON(text);
    if (result) return NextResponse.json(result);

    return NextResponse.json(makeFallback(text));
  } catch (err: any) {
    console.error("[PROTECT ENGINE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
