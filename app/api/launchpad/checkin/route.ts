import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { project, checkin, previousCheckins, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const category = project.business_category || project.category || "general";

  // Fetch existing benchmarks for this category + week
  let benchmarks: any[] = [];
  try {
    const { data } = await supabase
      .from("launchpad_benchmarks")
      .select("*")
      .eq("business_category", category)
      .eq("week_number", checkin.week_number);
    if (data) benchmarks = data;
  } catch {}

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

CATEGORY: ${category}

BENCHMARKS FOR THIS CATEGORY (Week ${checkin.week_number}):
${benchmarks.length > 0
  ? benchmarks.filter((b: any) => b.sample_size >= 3).map((b: any) =>
      `${b.metric_name}: avg=${b.metric_value.toFixed(1)} (sample size: ${b.sample_size})`
    ).join("\n") || "Not enough data yet (need 3+ businesses)"
  : "No benchmarks yet for this category"}

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

    // Aggregate anonymous benchmarks (non-blocking)
    const revenueStr = String(checkin.revenue || "0").replace(/[^0-9.]/g, "");
    const revenueVal = parseFloat(revenueStr) || 0;
    const clientsVal = parseInt(String(checkin.new_clients || "0")) || 0;
    const leadsContactedVal = parseInt(String(checkin.leads_contacted || "0")) || 0;
    const leadsRespondedVal = parseInt(String(checkin.leads_responded || "0")) || 0;
    const conversionRate = leadsContactedVal > 0 ? (leadsRespondedVal / leadsContactedVal * 100) : 0;

    const metrics = [
      { name: "revenue", value: revenueVal },
      { name: "clients", value: clientsVal },
      { name: "leads_contacted", value: leadsContactedVal },
      { name: "conversion_rate", value: conversionRate },
    ];

    // Upsert benchmarks in background
    (async () => {
      for (const metric of metrics) {
        try {
          const existing = benchmarks.find(b => b.metric_name === metric.name);
          if (existing) {
            const newSampleSize = existing.sample_size + 1;
            const newAvg = ((existing.metric_value * existing.sample_size) + metric.value) / newSampleSize;
            await supabase
              .from("launchpad_benchmarks")
              .update({ metric_value: newAvg, sample_size: newSampleSize, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("launchpad_benchmarks").insert({
              business_category: category,
              week_number: checkin.week_number,
              metric_name: metric.name,
              metric_value: metric.value,
              sample_size: 1,
            });
          }
        } catch {}
      }
    })();

    // Build benchmark comparison for the response
    let benchmarkComparison: Record<string, any> | null = null;
    const validBenchmarks = benchmarks.filter((b: any) => b.sample_size >= 3);
    if (validBenchmarks.length > 0) {
      benchmarkComparison = {};
      const userMetrics: Record<string, number> = {
        revenue: revenueVal,
        clients: clientsVal,
        leads_contacted: leadsContactedVal,
        conversion_rate: conversionRate,
      };
      for (const bm of validBenchmarks) {
        const yours = userMetrics[bm.metric_name] ?? 0;
        const avg = bm.metric_value;
        const ratio = avg > 0 ? yours / avg : 1;
        let percentile = "";
        if (ratio >= 1.5) percentile = "top 10%";
        else if (ratio >= 1.2) percentile = "top 30%";
        else if (ratio >= 0.8) percentile = "average";
        else if (ratio >= 0.5) percentile = "bottom 30%";
        else percentile = "bottom 10%";

        const label = bm.metric_name === "revenue" ? "Revenue"
          : bm.metric_name === "clients" ? "Clients"
          : bm.metric_name === "leads_contacted" ? "Leads"
          : bm.metric_name === "conversion_rate" ? "Conversion"
          : bm.metric_name;

        benchmarkComparison[label] = {
          yours: bm.metric_name === "revenue" ? `$${yours}` : bm.metric_name === "conversion_rate" ? `${yours.toFixed(0)}%` : String(yours),
          average: bm.metric_name === "revenue" ? `$${avg.toFixed(0)}` : bm.metric_name === "conversion_rate" ? `${avg.toFixed(0)}%` : avg.toFixed(0),
          percentile,
          sampleSize: bm.sample_size,
        };
      }
    }

    return NextResponse.json({ analysis, benchmarkComparison });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Check-in analysis failed" }, { status: 500 });
  }
}
