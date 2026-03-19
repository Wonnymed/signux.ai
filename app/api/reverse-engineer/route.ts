import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { input, targetMarket, lang } = await req.json();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Step 1: Research the business
        send({ type: "stage", label: "Researching the business model..." });

        const researchResponse = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
          system: `You are a business model analyst. Research this business thoroughly using web search. Find: revenue model, pricing, target customer, team size, funding, tech stack, marketing channels, growth metrics. Return a comprehensive analysis.`,
          messages: [{ role: "user", content: `Analyze this business: ${input}` }],
        });
        const research = researchResponse.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
        send({ type: "research_done", summary: research.slice(0, 500) });

        // Step 2: Generate adaptation playbook
        send({ type: "stage", label: "Generating adaptation playbook..." });

        const playbookResponse = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: `You are a business strategist. Based on the research of an existing business, create a detailed adaptation playbook for replicating it in a different market. Be SPECIFIC with numbers, timelines, and costs. Respond in ${lang || "en"}.`,
          messages: [{
            role: "user",
            content: `ORIGINAL BUSINESS RESEARCH:
${research}

TARGET MARKET: ${targetMarket || "not specified — give general advice"}

Generate a complete playbook with these sections in markdown:

## Business Model Breakdown
- How they make money (specific pricing)
- Who is their customer (demographics, psychographics)
- Main acquisition channel
- Estimated unit economics (CAC, LTV, margins)
- Tech stack (if identifiable)
- Team structure estimate

## Adaptation Playbook for ${targetMarket || "Your Market"}
- Cultural/regulatory differences that change execution
- Where you have advantages vs disadvantages
- Pricing adjustments for the target market
- Which channels work differently in this market
- Estimated capital to replicate: $X
- Realistic timeline: X months

## What They Do Wrong (Your Opportunity)
- Weaknesses identified (from reviews, pricing gaps, UX)
- Underserved segments they ignore
- How you can be BETTER than the original

## 90-Day Quick-Launch Plan
Week 1-2: [specific tasks]
Week 3-4: [specific tasks]
Month 2: [specific tasks]
Month 3: [specific tasks]

## Estimated Financials
- Month 1: $X revenue (realistic)
- Month 3: $X revenue
- Month 6: $X revenue
- Break-even: Month X`,
          }],
        });
        const playbook = playbookResponse.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
        send({ type: "playbook", content: playbook });
        send({ type: "complete" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Analysis failed" });
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
