import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIMULATION_AGENTS: Record<string, string> = {
  chinese_supplier: `You are a Chinese factory owner/supplier in Guangzhou. You speak from the perspective of a real Chinese manufacturer. You negotiate firmly but fairly. You try to maximize your margin while keeping the client. You know MOQ, production capacity, payment terms. You respond in a mix of business English with Chinese business culture (guanxi, face, patience). You sometimes push back, sometimes offer alternatives. Be realistic — not every deal is good for you.`,

  customs_agent: `You are a customs/import specialist. You know HS codes, tariff rates, import regulations for Brazil, US, EU, and other markets. You calculate real duty rates, flag potential issues (anti-dumping, certifications needed, restricted items). You warn about common mistakes importers make. Be specific with numbers.`,

  freight_forwarder: `You are an international freight forwarder. You know current shipping rates (sea, air, express), transit times, routes, incoterms. You calculate total logistics cost including all hidden fees (THC, customs clearance, inland transport, insurance, demurrage). You recommend the best option based on volume, weight, urgency and budget.`,

  market_analyst: `You are a market analyst. You analyze competitive landscape, pricing, demand, and market viability for products in target markets. You use realistic data and estimates. You identify whether a product will sell, at what price point, and what the competition looks like. Be brutally honest — if the market is saturated, say so.`,

  risk_assessor: `You are a risk analyst specializing in international trade. You identify everything that can go wrong: supplier fraud, quality issues, shipping delays, currency fluctuation, regulatory changes, political risk. You assign probability (low/medium/high) to each risk and suggest mitigation. You don't sugarcoat.`,

  tax_advisor: `You are an international tax specialist. You understand tax implications across jurisdictions — CFC rules, transfer pricing, withholding taxes, VAT/GST, customs duties. You calculate the effective tax burden of different structures and flag compliance requirements. Always note you're providing educational analysis, not legal advice.`,
};

type SimMessage = { agent: string; content: string; round: number };

export async function POST(req: NextRequest) {
  try {
    const { scenario, context } = await req.json();

    // Step 1: Analyze scenario and determine which agents are needed
    const planResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are a simulation planner. Given a business scenario, determine which agents should participate in the simulation. Available agents: chinese_supplier, customs_agent, freight_forwarder, market_analyst, risk_assessor, tax_advisor. Respond in JSON format: { "agents": ["agent1", "agent2"], "rounds": 3, "summary": "brief description of what will be simulated" }`,
      messages: [{ role: "user", content: scenario }],
    });

    const planText = (planResponse.content[0] as any).text || "";
    let plan;
    try {
      plan = JSON.parse(planText.replace(/```json|```/g, "").trim());
    } catch {
      plan = { agents: ["market_analyst", "risk_assessor"], rounds: 2, summary: "General analysis" };
    }

    // Step 2: Run simulation rounds
    const simMessages: SimMessage[] = [];
    let conversationContext = `SCENARIO: ${scenario}\n\nUSER CONTEXT: ${JSON.stringify(context || {})}\n\n`;

    for (let round = 1; round <= Math.min(plan.rounds || 3, 4); round++) {
      for (const agentId of plan.agents) {
        const agentPrompt = SIMULATION_AGENTS[agentId];
        if (!agentPrompt) continue;

        const previousDiscussion = simMessages.map(m => `[${m.agent} - Round ${m.round}]: ${m.content}`).join("\n\n");

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: agentPrompt + `\n\nYou are in round ${round} of a simulation. Consider what other agents have said and build on it. Be specific with numbers, timelines, and recommendations. Respond in the user's language (Portuguese if scenario is in Portuguese).`,
          messages: [{
            role: "user",
            content: `${conversationContext}\n\nPREVIOUS DISCUSSION:\n${previousDiscussion || "This is the first round."}\n\nProvide your analysis for round ${round}. Be specific, use real numbers and timelines.`,
          }],
        });

        const content = (response.content[0] as any).text || "";
        simMessages.push({ agent: agentId, content, round });
      }
    }

    // Step 3: Generate final synthesis
    const synthesisPrompt = `You are Signux AI synthesizer. Based on the multi-agent simulation below, create a comprehensive final report.

SCENARIO: ${scenario}

SIMULATION RESULTS:
${simMessages.map(m => `[${m.agent} - Round ${m.round}]:\n${m.content}`).join("\n\n---\n\n")}

Create a report with these sections:
1. EXECUTIVE SUMMARY (3-4 lines)
2. TOTAL COST BREAKDOWN (table format if applicable)
3. TIMELINE (day by day or week by week)
4. RISK MAP (each risk with probability: low/medium/high and mitigation)
5. THREE SCENARIOS: Optimistic / Realistic / Pessimistic (with numbers)
6. FINAL RECOMMENDATION: GO or NO-GO with clear justification

Be specific. Use numbers. No fluff. Respond in the user's language.`;

    const synthesis = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: synthesisPrompt,
      messages: [{ role: "user", content: "Generate the final simulation report." }],
    });

    const report = (synthesis.content[0] as any).text || "";

    return NextResponse.json({
      plan,
      simulation: simMessages,
      report,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
