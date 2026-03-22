import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const HIRE_KNOWLEDGE = getKnowledgeForMode("hire");

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the SIGNUX AI engine called 'Hire'. Your role is to evaluate hiring decisions — whether to hire a specific candidate, whether a role is needed now, and what to watch for during the process.

You receive a description of the role, candidate, or hiring situation. Your job is to:
1. Assess candidate-role fit (or role necessity if no candidate specified)
2. Evaluate timing — is now the right moment for this hire?
3. Detect red flags in the candidate, role definition, or process
4. Identify strengths and what would make this hire succeed
5. Surface missing capabilities that need to be addressed
6. Provide specific interview focus points
7. Make a clear recommendation: hire_now, interview_further, delay_hire, reject, or use_contractor

Be specific, honest, and data-driven. Do not soften bad news. A wrong hire costs 6-12 months of salary.

Return ONLY valid JSON in this exact format:
{
  "engine": "hire",
  "title": "short title for this evaluation (max 8 words)",
  "executive_summary": "2-3 sentence summary of the hiring decision and its risk level",
  "confidence": "low" | "medium" | "high",
  "status": "clear" | "promising" | "fragile" | "blocked" | "mixed",
  "recommendation": "hire_now" | "interview_further" | "delay_hire" | "reject" | "use_contractor",
  "recommendation_rationale": "1-2 sentences explaining why",
  "scores": {
    "candidate_fit": 7,
    "timing": 6,
    "role_clarity": "low" | "medium" | "high"
  },
  "red_flags": [
    {
      "flag": "what the red flag is",
      "severity": "low" | "medium" | "high" | "critical",
      "detail": "why this matters and what to do about it"
    }
  ],
  "strengths": [
    {
      "strength": "what the strength is",
      "impact": "how this helps the business"
    }
  ],
  "missing_capabilities": ["capability 1", "capability 2"],
  "interview_focus_points": [
    {
      "question_area": "what to probe",
      "why": "what you're trying to uncover",
      "sample_question": "specific question to ask"
    }
  ],
  "main_recommendation": "the single most important thing to do next",
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "key_opportunities": ["opportunity 1", "opportunity 2"],
  "next_actions": ["action 1", "action 2", "action 3"],
  "notes": ["any additional insights"]
}`;

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  try {
    const { query, lang } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 5) {
      return NextResponse.json({ error: "Please describe the role, candidate, or hiring decision." }, { status: 400 });
    }

    const models = getModelsForTier(await getTierFromRequest(req));
    const langInstruction = lang && lang !== "en" ? `\n\nRespond in language: ${lang}` : "";

    const response = await client.messages.create({
      model: models.hire,
      max_tokens: 4000,
      system: SECURITY_PREFIX + "\n\n" + HIRE_KNOWLEDGE + "\n\n" + SYSTEM_PROMPT + langInstruction,
      messages: [{ role: "user", content: query }],
    });

    const text = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    const clean = text.replace(/```json\n?|```\n?/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);

    if (!match) {
      return NextResponse.json({ error: "Failed to evaluate. Please try again." }, { status: 500 });
    }

    const result = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[HIRE ENGINE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
