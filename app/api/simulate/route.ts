import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BATCH_SIZE = 4;

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function getWorldContext(scenario: string): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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

async function buildGraph(scenario: string, worldContext: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
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

async function setupAgents(graph: any, scenario: string, userLang: string, worldContext: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SECURITY_PREFIX + `You are a simulation architect. Generate 12-20 specialized business agent personas for this ecosystem simulation. Each agent represents a REAL person that would be involved in this business scenario.

Include agents from ALL relevant categories (adapt based on scenario):
- SUPPLY: factory owners, raw material suppliers, quality managers, production supervisors
- LOGISTICS: freight forwarders, shipping line reps, customs brokers, warehouse managers, last-mile delivery
- FINANCE: bank compliance officers, payment processors, insurance brokers, tax advisors, accountants
- REGULATORY: customs officers, trade compliance specialists, industry regulators, standards inspectors
- MARKET: market analysts, competitors, potential customers, distributors, retail buyers
- LEGAL: international trade lawyers, contract specialists, IP protection advisors
- CULTURAL: local agents, interpreters, cultural advisors, government liaisons
- OPERATIONS: project managers, operations coordinators, logistics planners

Each agent MUST have:
- A realistic human name appropriate to their country/culture
- A category from: supply, logistics, finance, regulatory, market, legal, cultural, operations
- Specific personality traits that affect their decisions
- Concrete knowledge with REAL numbers (prices, timelines, regulations)
- Clear objectives and motivations (some conflicting with others)
- Natural biases that create realistic tension

NOT all agents should agree. Create natural conflicts:
- The supplier wants higher prices, the buyer wants lower
- The customs broker is cautious, the freight forwarder is aggressive on timelines
- The lawyer sees risks everywhere, the market analyst sees opportunity
- The tax advisor and the accountant disagree on optimal structure

Return ONLY valid JSON:
{
  "agents": [
    {
      "id": "string (snake_case)",
      "name": "string (human name)",
      "role": "string (e.g. 'Chinese Factory Owner in Guangzhou')",
      "category": "string (supply|logistics|finance|regulatory|market|legal|cultural|operations)",
      "personality": "string (2-3 sentences: negotiation style, risk tolerance, priorities)",
      "knowledge": "string (what this agent knows: pricing, regulations, routes, market data)",
      "objectives": "string (what this agent wants from the deal)",
      "bias": "string (natural bias: e.g. 'tends to overstate quality', 'conservative on timelines')"
    }
  ],
  "simulation_parameters": {
    "rounds": 3,
    "scenario_type": "import|offshore|investment|market_entry|deal",
    "time_horizon": "string (e.g. '45 days', '6 months')",
    "key_metrics": ["total_cost", "timeline", "risk_level", "roi_estimate"]
  }
}

Respond in ${userLang}. Generate at least 12 agents with good diversity across categories.`,
    messages: [{ role: "user", content: `SCENARIO: ${scenario}\n\nENTITY GRAPH:\n${JSON.stringify(graph)}${worldContext ? `\n\nCURRENT WORLD CONTEXT (use real numbers from this):\n${worldContext}` : ""}` }],
  });
  const text = (response.content[0] as any).text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return { agents: [], simulation_parameters: { rounds: 3, scenario_type: "deal", time_horizon: "30 days", key_metrics: [] } }; }
}

async function processAgent(
  agent: any, round: number, rounds: number, scenario: string,
  graph: any, context: any, previousDiscussion: string, userLang: string, worldContext: string
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: SECURITY_PREFIX + `You are ${agent.name}, ${agent.role}. Category: ${agent.category}.

PERSONALITY: ${agent.personality}
KNOWLEDGE: ${agent.knowledge}
OBJECTIVES: ${agent.objectives}
BIAS: ${agent.bias}

You are in round ${round} of ${rounds} of a business ecosystem simulation.

RULES:
- Stay in character at ALL times. You ARE this person.
- Reference specific numbers, prices, timelines, regulations when possible.
- React to what other agents said — agree, disagree, challenge, build upon.
- In round 1: Give your initial analysis and position (2-3 paragraphs max).
- In round 2+: Respond to others, refine your position, negotiate, challenge assumptions (2-3 paragraphs max).
- Be specific. Real numbers. Real timelines. Real risks.
- If you disagree with another agent, say so directly and explain why.
- Keep your response focused and concise — you're one voice among many.
- Respond in ${userLang}.`,
      messages: [{
        role: "user",
        content: `SCENARIO: ${scenario}\n\nENTITY GRAPH: ${JSON.stringify(graph)}\n\nUSER CONTEXT: ${JSON.stringify(context || {})}${worldContext ? `\n\nCURRENT WORLD CONTEXT:\n${worldContext}` : ""}\n\nPREVIOUS DISCUSSION:\n${previousDiscussion || "This is the opening round. Present your initial analysis."}\n\nYour analysis for round ${round}:`
      }],
    });
    return (response.content[0] as any).text || "";
  } catch {
    return `[${agent.name} was unable to respond in this round]`;
  }
}

async function generateReport(scenario: string, graph: any, agents: any[], simulation: any[], params: any, userLang: string, worldContext: string) {
  const simText = simulation.map(m =>
    `[${m.agentName} (${m.role}, ${m.category}) — Round ${m.round}]:\n${m.content}`
  ).join("\n\n---\n\n");

  const totalInteractions = simulation.length;
  const agentCount = agents.length;
  const roundCount = params.rounds || 3;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: SECURITY_PREFIX + `You are Signux ReportAgent. Generate a comprehensive ecosystem simulation report.

You have data from ${agentCount} specialist agents across ${roundCount} rounds (${totalInteractions} total interactions). This is a MASSIVE simulation with diverse stakeholders.

RULES:
- Be specific with ALL numbers — never say "varies" without giving a range
- Use the ENTITY GRAPH for accurate relationships
- Reference what specific agents said to support conclusions
- Calculate all costs in USD AND BRL (use approximate rate 1 USD = 5.5 BRL)
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

## EXECUTIVE SUMMARY
3-4 lines. What was simulated, key finding, recommendation.

## COST BREAKDOWN
Table format with ALL costs itemized. Include: product, freight, insurance, customs duty, VAT/taxes, clearance fees, inland transport, agent fees, bank fees, contingency. Show total in USD and BRL.

## TIMELINE
Week by week or phase by phase. From day 1 to completion. Include milestones and dependencies.

## RISK MAP
Each risk with:
- Description
- Probability: Low / Medium / High
- Impact: Low / Medium / High
- Mitigation strategy

## STAKEHOLDER MAP
Which agents support GO vs NO-GO and why. Group by category. Identify the swing votes.

## CONSENSUS & DISSENT
- Points where most agents agree (with specific references)
- Key disagreements and why they matter
- Hidden risks revealed by specific agents
- Unexpected opportunities identified

## THREE SCENARIOS
### Optimistic
Numbers, timeline, profit margin

### Realistic
Numbers, timeline, profit margin

### Pessimistic
Numbers, timeline, what goes wrong

## KEY INSIGHTS
What the agents revealed that wasn't obvious. The 3 most critical decision points.

## FINAL VERDICT
### GO or NO-GO
Clear recommendation with 3 reasons why.
If GO: exact next steps (numbered, actionable)
If NO-GO: what would need to change for it to become viable`
    }],
  });

  return (response.content[0] as any).text || "";
}

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 5, 60000);
  if (rateLimitError) return rateLimitError;

  const { scenario, context } = await req.json();
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
        // Stage -1: Gather real-time intelligence
        sendSSE(controller, encoder, { type: "stage", stage: -1 });
        const worldContext = await getWorldContext(scenario);
        sendSSE(controller, encoder, { type: "stage_done", stage: -1 });

        // Stage 0: Graph
        sendSSE(controller, encoder, { type: "stage", stage: 0 });
        const graph = await buildGraph(scenario, worldContext);
        sendSSE(controller, encoder, { type: "stage_done", stage: 0, data: { graph } });

        // Stage 1: Agents
        sendSSE(controller, encoder, { type: "stage", stage: 1 });
        const { agents, simulation_parameters } = await setupAgents(graph, scenario, userLang, worldContext);
        sendSSE(controller, encoder, { type: "stage_done", stage: 1, data: { agents, simulation_parameters }, totalAgents: agents.length });

        // Stage 2+3: Simulation rounds with parallel batching
        sendSSE(controller, encoder, { type: "stage", stage: 2 });
        const allMessages: any[] = [];
        const rounds = Math.min(simulation_parameters.rounds || 3, 4);

        for (let round = 1; round <= rounds; round++) {
          if (round > 1) {
            sendSSE(controller, encoder, { type: "stage", stage: 3 });
          }

          for (let batchStart = 0; batchStart < agents.length; batchStart += BATCH_SIZE) {
            const batch = agents.slice(batchStart, batchStart + BATCH_SIZE);

            for (const agent of batch) {
              sendSSE(controller, encoder, { type: "agent_start", agentName: agent.name, role: agent.role, category: agent.category, round });
            }

            const previousDiscussion = allMessages
              .map(m => `[${m.agentName} (${m.role}) — Round ${m.round}]: ${m.content}`)
              .join("\n\n");

            const batchResults = await Promise.all(
              batch.map(agent => processAgent(agent, round, rounds, scenario, graph, context, previousDiscussion, userLang, worldContext))
            );

            for (let i = 0; i < batch.length; i++) {
              const agent = batch[i];
              const content = batchResults[i];
              const msg = { agentId: agent.id, agentName: agent.name, role: agent.role, category: agent.category, content, round };
              allMessages.push(msg);
              sendSSE(controller, encoder, { type: "agent_done", ...msg });
            }
          }
        }

        // Stage 4: Report
        sendSSE(controller, encoder, { type: "stage", stage: 4 });
        const report = await generateReport(scenario, graph, agents, allMessages, simulation_parameters, userLang, worldContext);
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
              rounds: simulation_parameters.rounds,
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
