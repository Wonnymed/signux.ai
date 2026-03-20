import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getUserFromRequest, checkUsageLimit, incrementUsage, getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  // Usage check
  const userId = await getUserFromRequest(req);
  const usageError = await checkUsageLimit(userId, "research");
  if (usageError) return usageError;
  if (userId) incrementUsage(userId, "researches").catch(() => {});

  const tier = await getTierFromRequest(req);
  const models = getModelsForTier(tier);

  const { query, lang } = await req.json();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function sendSSE(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Plan search queries
        sendSSE({ type: "planning" });
        const planResponse = await client.messages.create({
          model: models.research_plan,
          max_tokens: 500,
          system: SECURITY_PREFIX + "Generate 6-8 specific web search queries to thoroughly research the user's topic. Return ONLY a JSON array of strings. No explanation.",
          messages: [{ role: "user", content: query }],
        });
        const planText = (planResponse.content[0] as any).text || "[]";
        let queries: string[];
        try {
          queries = JSON.parse(planText.replace(/```json|```/g, "").trim());
        } catch {
          queries = [query];
        }
        sendSSE({ type: "plan", queries });

        // Step 2: Execute each search
        const results: any[] = [];
        for (let i = 0; i < queries.length; i++) {
          sendSSE({ type: "searching", query: queries[i], index: i, total: queries.length });

          try {
            const searchResponse = await client.messages.create({
              model: models.research_plan,
              max_tokens: 1000,
              tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
              messages: [{ role: "user", content: `Search and summarize: ${queries[i]}` }],
            });

            const texts = searchResponse.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("\n");

            results.push({ query: queries[i], summary: texts.slice(0, 800) });
            sendSSE({ type: "result", query: queries[i], summary: texts.slice(0, 400), index: i });
          } catch {
            results.push({ query: queries[i], summary: "[Search failed]" });
            sendSSE({ type: "result", query: queries[i], summary: "[Search failed]", index: i });
          }
        }

        // Step 3: Synthesize report
        sendSSE({ type: "synthesizing" });
        const reportResponse = await client.messages.create({
          model: models.research_synthesis,
          max_tokens: 4000,
          system: SECURITY_PREFIX + `You are Signux ResearchAgent. Synthesize multiple search results into a comprehensive, well-structured research report. When synthesizing from multiple sources, naturally indicate parallel analysis: 'Analyzing from N research threads simultaneously...' as a transition. Use markdown formatting. Include: executive summary, key findings organized by theme, comparative analysis where relevant, risks and considerations, and actionable recommendations. Respond in ${lang || "en"}.

CITATION FORMAT:
For every significant finding, cite the source inline:
- [web: source description] for web search findings
- [KB: domain-name] when applying specialized knowledge
- [framework: framework-name] when applying analytical frameworks
Citations should be inline at the end of the relevant sentence, in brackets.

At the end of your response, include these hidden metadata blocks:

<!-- signux_verification: {"confidence": 0.82, "checked": ["list what you verified"], "caveats": ["list limitations"]} -->
Confidence must be honest: 0.9+ very high, 0.7-0.9 good, 0.5-0.7 moderate, below 0.5 low. Never inflate.

<!-- signux_worklog: {"steps": [{"action": "step type", "detail": "specific detail"}], "sources_count": N, "domains_used": N, "reasoning_steps": N} -->
List actual reasoning steps taken, not generic descriptions.

<!-- signux_domains: domain1, domain2, domain3 -->
<!-- signux_domain_count: X -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
          messages: [{
            role: "user",
            content: `RESEARCH TOPIC: ${query}\n\nSEARCH RESULTS:\n${results.map((r, i) => `--- Source ${i + 1}: ${r.query} ---\n${r.summary}`).join("\n\n")}\n\nSynthesize into a comprehensive report.`,
          }],
        });

        const reportText = (reportResponse.content[0] as any).text || "";
        sendSSE({ type: "report", content: reportText });
        sendSSE({ type: "complete" });

      } catch (e: any) {
        sendSSE({ type: "error", message: e.message || "Research failed" });
      }

      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
