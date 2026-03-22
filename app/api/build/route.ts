import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BUILD_KNOWLEDGE = getKnowledgeForMode("build");

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the SIGNUX AI engine called 'Build'. Your role is to convert an idea, initiative, or business concept into an execution-ready plan.

You receive a description of what the user wants to build, launch, or execute. Your job is to:
1. Understand the core idea and what stage it is in (idea / validation / pilot / launch / scale)
2. Identify the main bottleneck preventing progress right now
3. Create a phased roadmap with concrete actions
4. Separate what should happen in the first 30 days vs first 90 days
5. Surface key risks and key opportunities
6. Recommend the single most important next action

Be specific, actionable, and honest. Do not use filler phrases. Every sentence should add value.

Return ONLY valid JSON in this exact format:
{
  "engine": "build",
  "title": "short title for this plan (max 8 words)",
  "executive_summary": "2-3 sentence summary of the plan and its viability",
  "confidence": "low" | "medium" | "high",
  "status": "clear" | "promising" | "fragile" | "blocked" | "mixed",
  "current_stage": "idea" | "validation" | "pilot" | "launch" | "scale",
  "main_bottleneck": {
    "description": "the single biggest thing blocking progress",
    "severity": "low" | "medium" | "high" | "critical",
    "suggested_fix": "specific action to unblock"
  },
  "roadmap": [
    {
      "phase": "Phase name",
      "duration": "e.g. Weeks 1-2",
      "goal": "what this phase achieves",
      "actions": ["specific action 1", "specific action 2", "specific action 3"]
    }
  ],
  "first_30_days": ["action 1", "action 2", "action 3", "action 4", "action 5"],
  "first_90_days": ["milestone 1", "milestone 2", "milestone 3"],
  "main_recommendation": "the single most important thing to do next",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "next_actions": ["action 1", "action 2", "action 3"],
  "notes": ["any additional insights or caveats"]
}`;

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  try {
    const { query, lang } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json({ error: "Please describe what you want to build." }, { status: 400 });
    }

    const models = getModelsForTier(await getTierFromRequest(req));
    const langInstruction = lang && lang !== "en" ? `\n\nRespond in language: ${lang}` : "";

    const response = await client.messages.create({
      model: models.build,
      max_tokens: 4000,
      system: SECURITY_PREFIX + "\n\n" + BUILD_KNOWLEDGE + "\n\n" + SYSTEM_PROMPT + langInstruction,
      messages: [{ role: "user", content: query }],
    });

    const text = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    const clean = text.replace(/```json\n?|```\n?/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);

    if (!match) {
      return NextResponse.json({ error: "Failed to generate plan. Please try again." }, { status: 500 });
    }

    const result = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[BUILD ENGINE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
