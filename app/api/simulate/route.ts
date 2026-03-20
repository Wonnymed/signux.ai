export const maxDuration = 300;

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getUserFromRequest, checkUsageLimit, incrementUsage, getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SIMULATE_KNOWLEDGE = getKnowledgeForMode("simulate");
const BATCH_SIZE = 4;

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function getWorldContext(scenario: string, model: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        } as any,
      ],
      messages: [{
        role: "user",
        content: `You are a research analyst. Search for and summarize the CURRENT real-world context relevant to this business scenario. Focus on:
1. Current regulations and recent policy changes in the countries involved
2. Current market conditions (prices, demand, competition)
3. Current geopolitical situation affecting the trade route
4. Current logistics conditions (shipping rates, port delays, route disruptions)
5. Any recent news that would affect this specific operation

Scenario: ${scenario}

Provide a concise briefing (max 500 words) with specific numbers and dates. This will be used to ground a business simulation in reality.`
      }],
    });

    return response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");
  } catch {
    return "";
  }
}

async function buildGraph(scenario: string, worldContext: string, model: string) {
  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    system: SECURITY_PREFIX + `You are a business scenario analyst. Extract ALL entities and relationships from the scenario. Return ONLY valid JSON:
{
  "entities": [
    { "name": "string", "type": "product|company|country|market|person|regulation|currency", "details": "string" }
  ],
  "relationships": [
    { "from": "string", "to": "string", "type": "trades_with|imports_from|regulated_by|competes_with|ships_to|pays_tax_to", "details": "string" }
  ],
  "key_variables": ["string"],
  "critical_questions": ["string"]
}`,
    messages: [{ role: "user", content: `${scenario}${worldContext ? `\n\nCURRENT WORLD CONTEXT:\n${worldContext}` : ""}` }],
  });
  const text = (response.content[0] as any).text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return { entities: [], relationships: [], key_variables: [], critical_questions: [] }; }
}

async function setupAgents(graph: any, scenario: string, userLang: string, worldContext: string, model: string) {
  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system: SECURITY_PREFIX + `You are a simulation architect. Generate 12 to 15 specialist agents to analyze this operation.

MANDATORY agents (ALWAYS include all 6):
1. Financial Analyst — P&L, cash flow, unit economics, break-even
2. Regulatory Expert — compliance, licensing, legal requirements
3. Market Analyst — TAM/SAM/SOM, competition, trends
4. Operations Specialist — logistics, processes, supply chain
5. Risk Assessor — risk matrix, probability × impact
6. Devil's Advocate — ATTACKS the plan, finds fatal flaws, worst-case scenarios

CONTEXTUAL agents (include 6-9 based on the scenario):
- Tax Strategist (if cross-border or tax-relevant)
- Technology Advisor (if tech/SaaS)
- HR Consultant (if hiring/team involved)
- Marketing Strategist (if customer acquisition relevant)
- Customer Experience Expert (if B2C or service)
- Supply Chain Analyst (if physical goods)
- Legal Counsel (if contracts/IP involved)
- Industry Specialist (specific to the industry mentioned)
- Geopolitical Analyst (if international operations)

Each agent MUST have:
- A realistic human name appropriate to their country/culture
- Specific personality traits that affect their decisions
- Concrete knowledge with REAL numbers (prices, timelines, regulations)
- Clear objectives and motivations (some conflicting with others)
- Natural biases that create realistic tension

NOT all agents should agree. Create natural conflicts:
- The Devil's Advocate should find fatal flaws in the plan
- The Risk Assessor and Market Analyst should disagree on opportunity vs risk
- The Financial Analyst and Operations Specialist should have different cost assumptions

Return ONLY valid JSON:
{
  "agents": [
    {
      "id": "string (snake_case)",
      "name": "string (human name)",
      "role": "string (e.g. 'Financial Analyst')",
      "category": "string (finance|regulatory|market|operations|risk|adversarial|tax|tech|hr|marketing|cx|supply_chain|legal|industry|geopolitical)",
      "expertise": "string (specific domain expertise)",
      "personality": "string (2-3 sentences: negotiation style, risk tolerance, priorities)",
      "knowledge": "string (what this agent knows: pricing, regulations, routes, market data)",
      "objectives": "string (what this agent wants from the analysis)",
      "bias": "string (natural bias: e.g. 'conservative on projections', 'skeptical of new markets')"
    }
  ],
  "simulation_parameters": {
    "rounds": 3,
    "scenario_type": "import|offshore|investment|market_entry|deal|startup|expansion",
    "time_horizon": "string (e.g. '45 days', '6 months')",
    "key_metrics": ["total_cost", "timeline", "risk_level", "roi_estimate"]
  }
}

Respond in ${userLang}. Generate at least 12 and up to 15 agents.`,
    messages: [{ role: "user", content: `SCENARIO: ${scenario}\n\nENTITY GRAPH:\n${JSON.stringify(graph)}${worldContext ? `\n\nCURRENT WORLD CONTEXT (use real numbers from this):\n${worldContext}` : ""}` }],
  });
  const text = (response.content[0] as any).text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return { agents: [], simulation_parameters: { rounds: 3, scenario_type: "deal", time_horizon: "30 days", key_metrics: [] } }; }
}

function getRoundPrompt(agent: any, round: number, rounds: number, userLang: string): string {
  const base = `You are ${agent.name}, ${agent.role}. Category: ${agent.category}.

EXPERTISE: ${agent.expertise || agent.knowledge}
PERSONALITY: ${agent.personality}
KNOWLEDGE: ${agent.knowledge}
OBJECTIVES: ${agent.objectives}
BIAS: ${agent.bias}

RULES:
- Stay in character at ALL times. You ARE this person.
- Reference specific numbers, prices, timelines, regulations when possible.
- Be specific. Real numbers. Real timelines. Real risks.
- Keep your response focused and concise (2-3 paragraphs max).
- Respond in ${userLang}.`;

  if (round === 1) {
    return SECURITY_PREFIX + base + SIMULATE_KNOWLEDGE + `\n\nThis is Round 1: INITIAL ASSESSMENT.
Analyze the scenario from your expertise. Be specific with numbers. Present your initial position on viability, costs, risks, and timeline.`;
  }
  if (round === 2) {
    return SECURITY_PREFIX + base + SIMULATE_KNOWLEDGE + `\n\nThis is Round 2: STRESS TEST.
Review other agents' analyses and CHALLENGE weak points. Identify conflicts between assessments. Point out what other agents got wrong or overlooked. Push back on optimistic assumptions.`;
  }
  return SECURITY_PREFIX + base + SIMULATE_KNOWLEDGE + `\n\nThis is Round 3: ADVERSARIAL.
The Devil's Advocate has attacked the plan. Defend your position OR agree with the attack and explain why. Be brutally honest — if the plan is flawed, say so. If you still support it, explain what MUST change.`;
}

async function processAgent(
  agent: any, round: number, rounds: number, scenario: string,
  graph: any, context: any, previousDiscussion: string, userLang: string, worldContext: string, model: string
): Promise<string> {
  try {
    const agentPromise = client.messages.create({
      model,
      max_tokens: 800,
      system: getRoundPrompt(agent, round, rounds, userLang),
      messages: [{
        role: "user",
        content: `SCENARIO: ${scenario}\n\nENTITY GRAPH: ${JSON.stringify(graph)}\n\nUSER CONTEXT: ${JSON.stringify(context || {})}${worldContext ? `\n\nCURRENT WORLD CONTEXT:\n${worldContext}` : ""}\n\nPREVIOUS DISCUSSION:\n${previousDiscussion || "This is the opening round. Present your initial analysis."}\n\nYour analysis for round ${round}:`
      }],
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Agent timeout")), 45000)
    );
    const response = await Promise.race([agentPromise, timeoutPromise]);
    return (response.content[0] as any).text || "";
  } catch {
    return `[${agent.name} timed out or was unable to respond in this round]`;
  }
}

async function generateReport(scenario: string, graph: any, agents: any[], simulation: any[], params: any, userLang: string, worldContext: string, model: string) {
  const simText = simulation.map(m =>
    `[${m.agentName} (${m.role}, ${m.category}) — Round ${m.round}]:\n${m.content}`
  ).join("\n\n---\n\n");

  const totalInteractions = simulation.length;
  const agentCount = agents.length;
  const roundCount = params.rounds || 3;

  const response = await client.messages.create({
    model,
    max_tokens: 6000,
    system: SECURITY_PREFIX + SIMULATE_KNOWLEDGE + `\n\nYou are Signux ReportAgent. Generate a comprehensive simulation report.

You have data from ${agentCount} specialist agents across ${roundCount} rounds (${totalInteractions} total interactions).

RULES:
- Be specific with ALL numbers — never say "varies" without giving a range
- Use the ENTITY GRAPH for accurate relationships
- Reference what specific agents said to support conclusions
- The report must be actionable — reader should know exactly what to do next
- Synthesize ALL perspectives across all agent categories
- Use the CURRENT WORLD CONTEXT to ground all numbers in reality
- Respond in ${userLang}`,
    messages: [{
      role: "user",
      content: `SCENARIO: ${scenario}

ENTITY GRAPH:
${JSON.stringify(graph)}
${worldContext ? `\nCURRENT WORLD CONTEXT (use these real-world numbers):\n${worldContext}\n` : ""}
AGENTS IN SIMULATION (${agentCount} agents):
${agents.map((a: any) => `${a.name} — ${a.role} [${a.category}]`).join("\n")}

FULL SIMULATION (${totalInteractions} interactions across ${roundCount} rounds):
${simText}

Generate the report with EXACTLY these sections:

## Executive Summary
3-4 sentences. What was simulated, key finding, recommendation.

## Viability Score: X/10
(With assessment: 8-10 strong GO, 5-7 proceed with caution, 1-4 NO-GO)

## Key Findings
Top 5 findings from all agents, ranked by impact.

## Risk Matrix
| Risk | Probability | Impact | Severity | Mitigation |
Top 8-10 risks identified across all rounds.

## Agent Consensus & Disagreements
Where agents agreed and where they conflicted. Reference specific agents.

## Financial Projections
Revenue, costs, break-even, ROI — with specific numbers. Include optimistic, realistic, and pessimistic scenarios.

## Recommended Path Forward
Numbered action items, specific and time-bound. What to do in the next 7 days, 30 days, 90 days.

## Kill Conditions
3-5 conditions that should make them STOP and abandon the plan.

## What the Devil's Advocate Said
Summary of the strongest attacks on the plan from Round 3. Which attacks were valid and which were defended successfully.`
    }],
  });

  return (response.content[0] as any).text || "";
}

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  // Usage check
  const userId = await getUserFromRequest(req);
  const usageError = await checkUsageLimit(userId, "simulate");
  if (usageError) return usageError;
  if (userId) incrementUsage(userId, "simulations").catch(() => {});

  const tier = await getTierFromRequest(req);
  const models = getModelsForTier(tier);

  const { scenario: rawScenario, context } = await req.json();

  // Detect what-if re-simulation and context material
  const isPreviousSim = rawScenario.includes("PREVIOUS SIMULATION:");
  const hasContextMaterial = rawScenario.includes("CONTEXT MATERIAL");
  const scenario = rawScenario;
  const encoder = new TextEncoder();
  const langMap: Record<string, string> = {
    en: "English", "pt-BR": "Portuguese", es: "Spanish", fr: "French", de: "German",
    it: "Italian", nl: "Dutch", ru: "Russian", "zh-Hans": "Chinese (Simplified)",
    "zh-Hant": "Chinese (Traditional)", ja: "Japanese", ko: "Korean", ar: "Arabic",
    hi: "Hindi", tr: "Turkish", pl: "Polish", sv: "Swedish", da: "Danish",
    no: "Norwegian", fi: "Finnish", cs: "Czech", ro: "Romanian", hu: "Hungarian",
    uk: "Ukrainian", el: "Greek", id: "Indonesian", vi: "Vietnamese", th: "Thai",
    he: "Hebrew",
  };
  const userLang = langMap[context?.language] || "English";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const ROUND_LABELS = ["", "Initial Assessment", "Stress Test", "Adversarial"];

        // Stage -1: Gather real-time intelligence
        sendSSE(controller, encoder, { type: "status", message: "Gathering real-world intelligence..." });
        sendSSE(controller, encoder, { type: "stage", stage: -1 });
        const worldContext = await getWorldContext(isPreviousSim ? scenario.split("NOW RE-SIMULATE")[0] : scenario, models.simulate_agents);
        sendSSE(controller, encoder, { type: "stage_done", stage: -1 });

        // Stage 0: Graph
        sendSSE(controller, encoder, { type: "status", message: "Building entity graph..." });
        sendSSE(controller, encoder, { type: "stage", stage: 0 });
        const graph = await buildGraph(scenario, worldContext, models.simulate_agents);
        sendSSE(controller, encoder, { type: "stage_done", stage: 0, data: { graph } });
        sendSSE(controller, encoder, { type: "graph", data: graph });

        // Stage 1: Agents
        sendSSE(controller, encoder, { type: "status", message: "Setting up agents..." });
        sendSSE(controller, encoder, { type: "stage", stage: 1 });
        const { agents, simulation_parameters } = await setupAgents(graph, scenario, userLang, worldContext, models.simulate_agents);
        sendSSE(controller, encoder, { type: "agents", agents });
        sendSSE(controller, encoder, { type: "stage_done", stage: 1, data: { agents, simulation_parameters }, totalAgents: agents.length });

        // Stage 2+3: Simulation rounds with parallel batching
        sendSSE(controller, encoder, { type: "stage", stage: 2 });
        const allMessages: any[] = [];
        const rounds = Math.min(simulation_parameters?.rounds || 3, 3);

        for (let round = 1; round <= rounds; round++) {
          sendSSE(controller, encoder, { type: "round", round, label: ROUND_LABELS[round] });

          if (round > 1) {
            sendSSE(controller, encoder, { type: "stage", stage: 3 });
          }

          for (let batchStart = 0; batchStart < agents.length; batchStart += BATCH_SIZE) {
            const batch = agents.slice(batchStart, batchStart + BATCH_SIZE);

            for (const agent of batch) {
              sendSSE(controller, encoder, { type: "agent_start", agent: agent.name, agentName: agent.name, role: agent.role, category: agent.category, round });
            }

            const previousDiscussion = allMessages
              .map(m => `[${m.agentName} (${m.role}) — Round ${m.round}]: ${m.content}`)
              .join("\n\n");

            const batchResults = await Promise.all(
              batch.map(agent => processAgent(agent, round, rounds, scenario, graph, context, previousDiscussion, userLang, worldContext, models.simulate_agents))
            );

            for (let i = 0; i < batch.length; i++) {
              const agent = batch[i];
              const content = batchResults[i];
              const msg = { agentId: agent.id, agentName: agent.name, agent: agent.name, role: agent.role, category: agent.category, content, round };
              allMessages.push(msg);
              sendSSE(controller, encoder, { type: "agent_complete", ...msg });
              // Keep backward-compat event
              sendSSE(controller, encoder, { type: "agent_done", ...msg });
            }
          }
        }

        // Stage 4: Report
        sendSSE(controller, encoder, { type: "status", message: "Generating final report..." });
        sendSSE(controller, encoder, { type: "stage", stage: 4 });
        const report = await generateReport(scenario, graph, agents, allMessages, simulation_parameters, userLang, worldContext, models.simulate_report);
        sendSSE(controller, encoder, { type: "report", content: report });
        sendSSE(controller, encoder, { type: "stage_done", stage: 4 });

        // Final result
        sendSSE(controller, encoder, {
          type: "complete",
          result: {
            stages: { graph, agents, simulation_parameters },
            simulation: allMessages,
            report,
            metadata: {
              total_interactions: allMessages.length,
              rounds,
              agents_count: agents.length,
              timestamp: new Date().toISOString(),
            },
          },
        });

        controller.close();
      } catch (err: any) {
        sendSSE(controller, encoder, { type: "error", error: err.message });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
