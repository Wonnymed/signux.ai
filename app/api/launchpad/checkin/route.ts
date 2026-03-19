import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { project, checkin, previousCheckins, benchmarks, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SECURITY_PREFIX + `You are the Signux Weekly Advisor — an AI co-founder doing a weekly check-in. You have PERFECT MEMORY of everything this user has told you.

YOUR JOB:
1. Analyze their numbers HONESTLY — compare to benchmarks if available
2. Tell them what's working and what's NOT (be specific)
3. If their numbers are bad, SAY SO. Don't sugarcoat.
4. Adjust the plan based on REAL data, not hopes
5. Give exactly 3 specific action items for next week

HONESTY SCALE (ai_score 1-10):
1-3: "We need to talk. Your numbers suggest this isn't working."
4-5: "Below expectations. Here's what needs to change."
6-7: "On track but room for improvement."
8-9: "Strong week. Keep this momentum."
10: "Exceptional. You're ahead of 90% of similar businesses."

Return JSON:
{
  "ai_score": 7,
  "ai_analysis": "Honest 2-paragraph analysis",
  "ai_recommendation": "The ONE most important thing to focus on",
  "wins": ["win 1"],
  "concerns": ["concern 1"],
  "action_items": [
    {"task": "specific task", "why": "reason", "expected_impact": "impact"}
  ],
  "should_pivot": false,
  "pivot_reason": null,
  "adjusted_forecast": {
    "month3_revenue": "$X based on current trajectory",
    "confidence": "low|medium|high"
  }
}`,
      messages: [{
        role: "user",
        content: `PROJECT: ${project.business_name} (Week ${checkin.week_number})
Skills: ${project.skills}, Time: ${project.time_available}

THIS WEEK'S NUMBERS:
Revenue: ${checkin.revenue}
New clients: ${checkin.new_clients}
Leads contacted: ${checkin.leads_contacted}
Leads responded: ${checkin.leads_responded}
Biggest win: ${checkin.biggest_win}
Biggest challenge: ${checkin.biggest_challenge}
What I learned: ${checkin.what_learned}

PREVIOUS WEEKS:
${previousCheckins?.map((c: any) => `Week ${c.week_number}: Revenue ${c.revenue}, Clients: ${c.new_clients}, Score: ${c.ai_score}/10`).join("\n") || "First check-in"}

BENCHMARKS:
${JSON.stringify(benchmarks || "No benchmarks yet")}

Respond in ${lang || "en"}.`,
      }],
    });

    const text = (response.content[0] as any).text || "{}";
    let analysis;
    try {
      analysis = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      analysis = { ai_score: 5, ai_analysis: text, ai_recommendation: "Review your approach", action_items: [], should_pivot: false };
    }

    return NextResponse.json({ analysis });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Check-in analysis failed" }, { status: 500 });
  }
}
