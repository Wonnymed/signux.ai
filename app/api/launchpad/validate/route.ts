import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";
import { getTierFromRequest } from "../../../lib/usage";
import { getModelsForTier } from "../../../lib/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { business, profile, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function sendSSE(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        sendSSE({ type: "stage", stage: "market", label: "Analyzing market..." });

        const agents = [
          { name: "Market Analyst", prompt: `Analyze market demand for: ${business.name}. Is the market growing? How competitive is it? Be specific with numbers.` },
          { name: "Financial Advisor", prompt: `Given ${profile.capital} capital and ${profile.time} time commitment, are the revenue projections realistic for ${business.name}? Calculate break-even timeline.` },
          { name: "Risk Assessor", prompt: `What are the top 5 risks of starting ${business.name} with ${profile.skills} skills and ${profile.capital} capital? Be brutally honest.` },
          { name: "Customer Expert", prompt: `Who is the ideal customer for ${business.name}? How hard is it to reach them? What's the realistic CAC?` },
          { name: "Competition Analyst", prompt: `Who are the existing competitors for ${business.name}? What would this person need to do differently to compete?` },
          { name: "Devil's Advocate", prompt: `Give me the STRONGEST argument for why ${business.name} will FAIL for someone with ${profile.skills} skills, ${profile.capital} capital, and ${profile.time} time. Don't hold back.` },
        ];

        const results: any[] = [];

        const promises = agents.map(async (agent) => {
          try {
            const response = await client.messages.create({
              model: models.launchpad,
              max_tokens: 500,
              tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
              system: SECURITY_PREFIX + `You are ${agent.name} in a Signux validation simulation. Be SPECIFIC, HONEST, and use NUMBERS. No motivational talk. Respond in ${lang || "en"}.`,
              messages: [{ role: "user", content: agent.prompt }],
            });
            const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
            results.push({ agent: agent.name, analysis: text });
            sendSSE({ type: "agent_done", agent: agent.name, analysis: text.slice(0, 300) });
          } catch {
            results.push({ agent: agent.name, analysis: "[Analysis failed]" });
          }
        });

        await Promise.all(promises);
        sendSSE({ type: "stage", stage: "verdict", label: "Computing verdict..." });

        const verdictResponse = await client.messages.create({
          model: models.launchpad,
          max_tokens: 2000,
          system: SECURITY_PREFIX + `You are the Signux Validation Engine. Based on 6 specialist analyses, deliver an HONEST verdict.

You MUST give a viability_score from 1-10. Here's the scale:
- 1-3: This will almost certainly fail. Recommend pivoting.
- 4-5: High risk. Could work but major obstacles.
- 6-7: Viable with effort. Most issues are solvable.
- 8-9: Strong opportunity. Clear path to revenue.
- 10: Exceptional. Rarely given.

DO NOT inflate the score. A 6 is good. A 4 is honest.

Return ONLY valid JSON:
{
  "viability_score": 7,
  "verdict": "GO" or "CAUTION" or "PIVOT",
  "one_line": "one sentence summary",
  "top_risks": [{"risk": "text", "severity": "high|medium|low", "mitigation": "what to do"}],
  "top_opportunities": [{"opportunity": "text", "impact": "high|medium|low"}],
  "honest_assessment": "2-3 paragraph BRUTALLY HONEST assessment",
  "if_you_proceed": "What they must do in the first 2 weeks",
  "kill_conditions": ["If X happens, stop immediately", "If Y by week 4, pivot"]
}`,
          messages: [{
            role: "user",
            content: `BUSINESS: ${business.name} - ${business.description}\nPROFILE: Skills: ${profile.skills}, Capital: ${profile.capital}, Time: ${profile.time}\n\nAGENT ANALYSES:\n${results.map(r => `[${r.agent}]:\n${r.analysis}`).join("\n\n")}\n\nDeliver honest verdict. Respond in ${lang || "en"}.`,
          }],
        });

        const verdictText = verdictResponse.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
        let verdict;
        try {
          verdict = JSON.parse(verdictText.replace(/```json|```/g, "").trim());
        } catch {
          verdict = { viability_score: 5, verdict: "CAUTION", one_line: "Could not fully analyze", honest_assessment: verdictText, top_risks: [], top_opportunities: [] };
        }

        sendSSE({ type: "verdict", ...verdict });
        sendSSE({ type: "complete" });
      } catch (e: any) {
        sendSSE({ type: "error", message: e.message || "Validation failed" });
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
