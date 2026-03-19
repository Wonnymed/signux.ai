export const maxDuration = 120;

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";
import { getTierFromRequest } from "../../../lib/usage";
import { getModelsForTier } from "../../../lib/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  const { variable, originalScenario, agents, previousReport, lang } = await req.json();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ type: "status", message: `Injecting variable: "${variable}"` });
        send({ type: "injection_start", variable });

        // Pick the 6 most relevant agents (not all 15 — speed matters)
        const relevantAgents = agents.slice(0, Math.min(agents.length, 6));
        const recalcResults: any[] = [];

        for (let i = 0; i < relevantAgents.length; i++) {
          const agent = relevantAgents[i];
          send({ type: "agent_recalc_start", agent: agent.name, index: i });

          try {
            const agentPromise = client.messages.create({
              model: models.gods_eye,
              max_tokens: 600,
              system: SECURITY_PREFIX + `You are ${agent.name}, ${agent.role}. Category: ${agent.category || "analyst"}.

EXPERTISE: ${agent.expertise || agent.knowledge || "General business analysis"}
PERSONALITY: ${agent.personality || "Analytical and thorough"}

You already analyzed a business scenario and gave your assessment.
Now a NEW VARIABLE has been injected: "${variable}"

Recalculate your analysis considering this change. Be specific about:
1. What changes in your previous assessment
2. New risk level (1-10)
3. What they should do differently now

Use specific numbers. Be concise (2-3 paragraphs max). Respond in ${lang || "English"}.`,
              messages: [{
                role: "user",
                content: `ORIGINAL SCENARIO: ${originalScenario}\n\nYOUR PREVIOUS ANALYSIS: ${agent.lastAnalysis || "N/A"}\n\nNEW VARIABLE: ${variable}\n\nHow does this change your assessment?`,
              }],
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Agent timeout")), 30000)
            );

            const response = await Promise.race([agentPromise, timeoutPromise]);
            const text = (response.content[0] as any).text || "";
            recalcResults.push({ agent: agent.name, role: agent.role, analysis: text });
            send({ type: "agent_recalc_done", agent: agent.name, role: agent.role, analysis: text });
          } catch {
            recalcResults.push({ agent: agent.name, role: agent.role, analysis: "[Recalculation failed]" });
            send({ type: "agent_recalc_done", agent: agent.name, role: agent.role, analysis: "[Failed]" });
          }
        }

        // Generate impact summary
        send({ type: "status", message: "Calculating impact..." });

        const impactResponse = await client.messages.create({
          model: models.gods_eye,
          max_tokens: 1500,
          system: SECURITY_PREFIX + `You are the Signux Impact Analyzer. Based on agent recalculations after a variable injection, produce a concise impact report. Respond in ${lang || "English"}.`,
          messages: [{
            role: "user",
            content: `ORIGINAL SCENARIO: ${originalScenario}
INJECTED VARIABLE: "${variable}"

PREVIOUS REPORT SUMMARY: ${typeof previousReport === "string" ? previousReport.slice(0, 500) : JSON.stringify(previousReport).slice(0, 500)}

AGENT RECALCULATIONS:
${recalcResults.map(r => `[${r.agent} — ${r.role}]: ${r.analysis}`).join("\n\n")}

Provide a markdown report with:

## Impact Summary
2-3 sentences on what changed.

## New Viability Score: X/10
(Compare to previous if known)

## What Changed
- Top 3-5 things that changed, each with a brief explanation

## Recommended Actions
Numbered list of what they should do NOW differently.

## Severity
Rate this injection as: LOW IMPACT / MODERATE IMPACT / HIGH IMPACT / CRITICAL`,
          }],
        });

        const impact = (impactResponse.content[0] as any).text || "";
        send({ type: "impact_report", content: impact, variable });
        send({ type: "complete" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Injection failed" });
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
