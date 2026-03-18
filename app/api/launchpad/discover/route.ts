import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { skills, timeAvailable, capital, riskTolerance, priorities, lang } = await req.json();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are Signux LaunchpadAgent. Based on the user's profile, suggest 3-5 viable business ideas.
For each idea, provide:
- name (string)
- matchScore (number 0-100)
- description (1-2 sentences)
- whyItMatches (array of 2-3 short reasons)
- estimatedTimeToRevenue (string like "2-4 weeks")
- capitalNeeded (string like "$500-2K")
- riskLevel ("low" | "medium" | "high")

Consider: current market demand, the user's skills, available capital, and time commitment.
Be specific and actionable — not generic. Each idea should be different enough to give real choice.
Return ONLY a valid JSON array. No explanation, no markdown. Respond considering the user's language: ${lang || "en"}.`,
      messages: [{
        role: "user",
        content: `USER PROFILE:
- Skills/Profession: ${skills}
- Time available: ${timeAvailable}
- Starting capital: ${capital}
- Risk tolerance: ${riskTolerance}/10
- Priorities: ${priorities.join(", ")}

Suggest 3-5 business ideas that match this profile.`,
      }],
    });

    const text = (response.content[0] as any).text || "[]";
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
