import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GROW_KNOWLEDGE = getKnowledgeForMode("grow");

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the SIGNUX AI engine called 'Grow'. Your role is to find the fastest, most capital-efficient path to better revenue for any business.

You receive a description of the business, its current traction, and the growth challenge. Your job is to:
1. Identify the single highest-leverage growth move
2. Map 4-6 growth levers ranked by expected impact and difficulty
3. Prioritize channels by fit and ROI potential
4. Surface pricing opportunities (undercharging, packaging, tiers)
5. Recommend 3-5 experiments the business should run in the next 30 days
6. Surface key risks and key opportunities

Be specific to the business described. Generic advice is worthless. Every lever should be actionable within 30 days. Quantify expected impact when possible (e.g. "likely +15-25% MRR").

Return ONLY valid JSON in this exact format:
{
  "engine": "grow",
  "title": "short title for this growth analysis (max 8 words)",
  "executive_summary": "2-3 sentence summary of growth posture and top opportunity",
  "confidence": "low" | "medium" | "high",
  "status": "clear" | "promising" | "fragile" | "blocked" | "mixed",
  "main_bottleneck": {
    "description": "the single biggest thing limiting growth right now",
    "severity": "low" | "medium" | "high" | "critical",
    "suggested_fix": "specific action to unblock"
  },
  "highest_leverage_move": {
    "title": "name of the move",
    "description": "what to do and why it matters most",
    "expected_impact": "e.g. +20-30% revenue in 60 days",
    "effort": "low" | "medium" | "high"
  },
  "growth_levers": [
    {
      "name": "lever name",
      "description": "what this lever does",
      "expected_impact": "high" | "medium" | "low",
      "difficulty": "easy" | "moderate" | "hard",
      "why_it_matters": "1 sentence on why this lever fits this business"
    }
  ],
  "channel_priorities": [
    {
      "channel": "channel name",
      "fit": "high" | "medium" | "low",
      "rationale": "why this channel for this business",
      "first_action": "concrete first step"
    }
  ],
  "pricing_opportunities": [
    {
      "opportunity": "what to change",
      "rationale": "why it would work",
      "expected_lift": "e.g. +10-15% ARPU"
    }
  ],
  "experiments": [
    {
      "name": "experiment name",
      "hypothesis": "if we do X, we expect Y",
      "timeline": "e.g. 2 weeks",
      "success_metric": "how to measure if it worked"
    }
  ],
  "main_recommendation": "the single most important growth action to take now",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
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
    engine: "grow",
    title: "Growth Analysis",
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
      return NextResponse.json({ error: "Please describe your business and growth challenge." }, { status: 400 });
    }

    const models = getModelsForTier(await getTierFromRequest(req));
    const langInstruction = lang && lang !== "en" ? `\n\nRespond in language: ${lang}` : "";

    const response = await client.messages.create({
      model: models.grow,
      max_tokens: 4000,
      system: SECURITY_PREFIX + "\n\n" + GROW_KNOWLEDGE + "\n\n" + SYSTEM_PROMPT + langInstruction,
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
    console.error("[GROW ENGINE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
