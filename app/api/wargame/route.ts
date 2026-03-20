import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SIM_KB = getKnowledgeForMode("simulate");

export const maxDuration = 120;

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

const AGENTS = [
  { id: "your_company", name: "Your Company", role: "Defending your strategy", color: "#3B82F6" },
  { id: "competitor_alpha", name: "Competitor Alpha", role: "Strongest direct competitor", color: "#EF4444" },
  { id: "competitor_beta", name: "Competitor Beta", role: "Different strategy competitor", color: "#F59E0B" },
  { id: "disruptor", name: "Disruptor", role: "Innovative new entrant", color: "#8B5CF6" },
  { id: "regulator", name: "Regulator", role: "Authority that can change rules", color: "#6B7280" },
];

const ROUNDS = [
  { num: 1, label: "Best Moves", instruction: "Make your BEST strategic move given the current market." },
  { num: 2, label: "Reactions", instruction: "REACT to the moves made by other players in Round 1. Adapt your strategy." },
  { num: 3, label: "Final Moves", instruction: "Make your FINAL move considering all previous actions. This is your endgame play." },
];

export async function POST(req: NextRequest) {
  const { market, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        sendSSE(controller, encoder, { type: "status", message: "Setting up war game..." });
        sendSSE(controller, encoder, { type: "agents", agents: AGENTS });

        const allMoves: { agent: string; round: number; content: string }[] = [];

        for (const round of ROUNDS) {
          sendSSE(controller, encoder, { type: "round", round: round.num, label: round.label });

          const previousContext = allMoves.length > 0
            ? `\n\nPREVIOUS MOVES:\n${allMoves.map(m => `[${m.agent} - Round ${m.round}]: ${m.content}`).join("\n\n")}`
            : "";

          const promises = AGENTS.map(async (agent) => {
            sendSSE(controller, encoder, {
              type: "agent_start", agentName: agent.name, role: agent.role, round: round.num,
            });

            const agentPrompt = agent.id === "your_company"
              ? `You are "${agent.name}" — the user's company. DEFEND their strategy, find advantages, and make bold moves to WIN. ${round.instruction}`
              : agent.id === "regulator"
              ? `You are "The Regulator" — a government authority. Consider market fairness, consumer protection, antitrust. You can announce new regulations, investigations, or approvals. ${round.instruction}`
              : agent.id === "disruptor"
              ? `You are "The Disruptor" — a new entrant with an innovative approach. You have fewer resources but more agility. Think 10x differently. ${round.instruction}`
              : `You are "${agent.name}" — a competitor. Your goal is to WIN market share. Be aggressive and strategic. ${round.instruction}`;

            try {
              const response = await client.messages.create({
                model: models.simulate_agents,
                max_tokens: 400,
                system: SECURITY_PREFIX + SIM_KB + `\n\nYou are playing a competitive war game simulation. ${agentPrompt}

RULES:
- Make ONE specific, concrete strategic move (not vague generalities)
- Include numbers: pricing, market share targets, investment amounts, timelines
- Consider game theory: what's your best response given others' likely moves?
- Be aggressive but realistic
- Respond in 2-3 sentences MAX. Be concise and action-oriented.
- Respond in ${lang || "en"}.`,
                messages: [{
                  role: "user",
                  content: `MARKET CONTEXT:\n${market}${previousContext}\n\nRound ${round.num}: ${round.instruction}`,
                }],
              });
              const text = (response.content[0] as any).text || "";
              return { agent: agent.name, round: round.num, content: text };
            } catch {
              return { agent: agent.name, round: round.num, content: "[Move failed]" };
            }
          });

          const results = await Promise.all(promises);
          for (const r of results) {
            allMoves.push(r);
            sendSSE(controller, encoder, {
              type: "agent_done", agentName: r.agent, round: r.round, content: r.content,
            });
          }
        }

        // Generate final report
        sendSSE(controller, encoder, { type: "status", message: "Analyzing game outcomes..." });

        const reportResponse = await client.messages.create({
          model: models.simulate_report,
          max_tokens: 2500,
          system: SECURITY_PREFIX + SIM_KB + `\n\nYou are the Signux War Game Analyst. Analyze a 3-round competitive simulation and deliver a game theory report.

Return ONLY valid JSON:
{
  "nash_equilibrium": "The stable market outcome where no player benefits from unilaterally changing strategy",
  "dominant_strategy": "The user's best strategy regardless of what competitors do",
  "vulnerability_map": [
    { "vulnerability": "specific weakness", "exploited_by": "agent name", "severity": "HIGH|MEDIUM|LOW" }
  ],
  "preemptive_moves": ["specific action 1", "specific action 2", "specific action 3"],
  "scenarios": [
    { "name": "Best case", "probability": "25%", "description": "...", "triggers": ["what must happen"] },
    { "name": "Base case", "probability": "50%", "description": "...", "triggers": ["most likely path"] },
    { "name": "Worst case", "probability": "25%", "description": "...", "triggers": ["what to watch for"] }
  ],
  "key_insight": "One sentence game theory insight that changes how the user should think"
}

RULES:
- nash_equilibrium: explain in plain business language, not academic jargon
- dominant_strategy: be SPECIFIC — "do X by Y date" not "focus on growth"
- vulnerability_map: 3-5 items, each tied to a specific agent's moves
- preemptive_moves: 3-5 actions the user should take NOW before competitors
- scenarios: exactly 3, with specific triggers
- key_insight: the single most important game theory takeaway

CITATION FORMAT:
In all analysis, cite the reasoning framework:
- [KB: game-theory] for game theory analysis
- [KB: competitive-intelligence] for competitor behavior
- [KB: mechanism-design] for market mechanism insights
- [framework: Nash equilibrium] for equilibrium analysis
- [framework: dominant strategy] for strategy identification

At the end, include hidden metadata:
<!-- signux_verification: {"confidence": 0.XX, "checked": ["list verified"], "caveats": ["limitations"]} -->
<!-- signux_worklog: {"steps": [{"action": "type", "detail": "detail"}], "sources_count": N, "domains_used": N, "reasoning_steps": N} -->
<!-- signux_domains: domain1, domain2 -->
<!-- signux_domain_count: X -->

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
          messages: [{
            role: "user",
            content: `MARKET:\n${market}\n\nALL MOVES:\n${allMoves.map(m => `[${m.agent} - Round ${m.round}]: ${m.content}`).join("\n\n")}\n\nAnalyze and deliver the war game report. Respond in ${lang || "en"}.`,
          }],
        });

        const reportText = reportResponse.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
        let report;
        try {
          report = JSON.parse(reportText.replace(/```json|```/g, "").trim());
        } catch {
          report = {
            nash_equilibrium: "Could not determine",
            dominant_strategy: "Review manually",
            vulnerability_map: [],
            preemptive_moves: [],
            scenarios: [],
            key_insight: reportText,
          };
        }

        sendSSE(controller, encoder, { type: "complete", report, moves: allMoves });
      } catch (e: any) {
        sendSSE(controller, encoder, { type: "error", error: e.message || "War game failed" });
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
