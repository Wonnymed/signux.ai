export const maxDuration = 300;

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getUserFromRequest, checkUsageLimit, incrementUsage, getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
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
1. Base Rate Archivist — outside view, historical comparables, reference classes
2. Unit Economics Auditor — financial viability, margin discipline, CAC/LTV
3. Demand Signal Analyst — customer demand validation, market pull, ICP clarity
4. Regulatory Gatekeeper — legal, compliance, market-entry constraints
5. Execution Operator — operational feasibility, execution sequencing
6. Competitive Adversary — stress-testing defensibility, competitive attack

CONTEXTUAL agents (include 6-9 based on the scenario):
- Strategic Architect (positioning, wedge selection, strategic coherence)
- Regime Sentinel (timing, macro conditions, external shocks)
- Intervention Optimizer (highest-leverage action, next best move)
- Decision Chair (final synthesis, executive summary)
- Industry Specialist (specific to the industry mentioned)
- Supply Chain Analyst (if physical goods)
- Legal Counsel (if contracts/IP involved)
- Tax Strategist (if cross-border or tax-relevant)
- Technology Advisor (if tech/SaaS)

Each agent MUST have:
- A realistic human name appropriate to their country/culture
- Specific personality traits that affect their decisions
- Concrete knowledge with REAL numbers (prices, timelines, regulations)
- Clear objectives and motivations (some conflicting with others)
- Natural biases that create realistic tension

NOT all agents should agree. Create natural conflicts:
- The Competitive Adversary should attack where the plan is weakest
- The Base Rate Archivist and Demand Signal Analyst should disagree on historical precedent vs current demand
- The Unit Economics Auditor and Execution Operator should have different cost and feasibility assumptions

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
- ALWAYS cite SPECIFIC NUMBERS: revenue figures, cost estimates, percentages, market sizes, timelines, probabilities. Vague claims are worthless — quantify everything.
- Reference REAL-WORLD EXAMPLES: name actual companies, products, regulations, or market events that parallel this scenario.
- Express your confidence naturally within your text ("I'm highly confident because...", "I have serious doubts given...", "The data makes me cautiously optimistic...").
- When you change your mind, say EXPLICITLY what changed: "I was wrong about X because Y" or "After seeing the data on X, I'm revising my position."
- NEVER output raw JSON, code blocks, or markdown formatting. Write as a human expert speaks in a high-stakes boardroom.
- Keep your response focused and concise (2-3 paragraphs max) but packed with substance — every sentence must add value.
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
The Competitive Adversary has attacked the plan. Defend your position OR agree with the attack and explain why. Be brutally honest — if the plan is flawed, say so. If you still support it, explain what MUST change.`;
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

type UniverseData = {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  probability: number;
  riskLabel: string;
  revenue: string;
  roi: string;
  timeline: string;
  outcome: string;
  trigger: string;
  events: { period: string; text: string; sentiment: string }[];
  keyInsights: string[];
  agentQuotes: { agent: string; role: string; quote: string }[];
};

type VerdictData = {
  result: "GO" | "CAUTION" | "STOP";
  viabilityScore: number;
  estimatedROI: string;
  confidence: number;
  goVotes: number;
  cautionVotes: number;
  stopVotes: number;
  reasoning: string;
  steerTowardA: string[];
  avoidC: string[];
};


async function generateVerdict(
  scenario: string, universes: UniverseData[], agents: any[],
  simulation: any[], userLang: string, model: string
): Promise<VerdictData> {
  const simVotes = simulation.map(m => {
    const content = (m.content || "").toLowerCase();
    const hasGo = /\bgo\b|✅|approve|viable|recommend|proceed/i.test(content);
    const hasStop = /\bstop\b|🛑|reject|abandon|no-go|fatal/i.test(content);
    const hasCaution = /\bcaution\b|⚠|careful|risk|concern|warning/i.test(content);
    return { agent: m.agentName, role: m.role, go: hasGo, caution: hasCaution, stop: hasStop };
  });

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: SECURITY_PREFIX + `You are the cross-universe verdict synthesizer. You have 3 parallel universe analyses and agent simulation data.

Return ONLY valid JSON:
{
  "result": "<GO|CAUTION|STOP>",
  "viabilityScore": <number 1-10>,
  "estimatedROI": "<e.g. +45% or -10%>",
  "confidence": <number 0-100>,
  "goVotes": <number of agents leaning GO>,
  "cautionVotes": <number of agents leaning CAUTION>,
  "stopVotes": <number of agents leaning STOP>,
  "reasoning": "<2-3 sentence synthesis of why this verdict>",
  "steerTowardA": ["<action 1>", "<action 2>", "<action 3>"],
  "avoidC": ["<safeguard 1>", "<safeguard 2>", "<safeguard 3>"]
}

Respond in ${userLang}.`,
    messages: [{
      role: "user",
      content: `SCENARIO: ${scenario}

UNIVERSE A (Best Case): ${universes[0]?.outcome || "N/A"} — Probability: ${universes[0]?.probability}%, ROI: ${universes[0]?.roi}
UNIVERSE B (Most Likely): ${universes[1]?.outcome || "N/A"} — Probability: ${universes[1]?.probability}%, ROI: ${universes[1]?.roi}
UNIVERSE C (Worst Case): ${universes[2]?.outcome || "N/A"} — Probability: ${universes[2]?.probability}%, ROI: ${universes[2]?.roi}

AGENT VOTE SIGNALS (${agents.length} agents):
${simVotes.map(v => `${v.agent} (${v.role}): ${v.go ? "GO" : v.stop ? "STOP" : v.caution ? "CAUTION" : "NEUTRAL"}`).join("\n")}

Synthesize a final verdict considering all universes and agent opinions.`
    }],
  });

  const text = (response.content[0] as any).text || "{}";
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      result: parsed.result || "CAUTION",
      viabilityScore: parsed.viabilityScore || 5,
      estimatedROI: parsed.estimatedROI || "N/A",
      confidence: parsed.confidence || 50,
      goVotes: parsed.goVotes || 0,
      cautionVotes: parsed.cautionVotes || 0,
      stopVotes: parsed.stopVotes || 0,
      reasoning: parsed.reasoning || "",
      steerTowardA: parsed.steerTowardA || [],
      avoidC: parsed.avoidC || [],
    };
  } catch {
    return {
      result: "CAUTION", viabilityScore: 5, estimatedROI: "N/A", confidence: 50,
      goVotes: 0, cautionVotes: 0, stopVotes: 0, reasoning: "", steerTowardA: [], avoidC: [],
    };
  }
}

async function generateUniversesStreaming(
  scenario: string, graph: any, agents: any[], simulation: any[],
  userLang: string, worldContext: string, model: string,
  onUniverseReady: (index: number, universe: UniverseData) => void
): Promise<UniverseData[]> {
  const simSummary = simulation.slice(0, 20).map(m =>
    `[${m.agentName} (${m.role})] Round ${m.round}: ${(m.content || "").slice(0, 200)}`
  ).join("\n");
  const agentSummary = agents.map(a => `${a.name} — ${a.role} [${a.category}]`).join("\n");

  const universeConfigs = [
    {
      id: "A", label: "Best Case", subtitle: "OPTIMISTIC", color: "#10B981",
      prompt: `You are the OPTIMISTIC universe analyst. Analyze this scenario assuming EVERYTHING GOES WELL.
Focus on: best-case revenue, fastest timeline, highest ROI, lowest risk.
Assume favorable market conditions, efficient execution, and positive external factors.
Be specific with numbers — real projections, not vague optimism.`
    },
    {
      id: "B", label: "Most Likely", subtitle: "REALISTIC", color: "#3B82F6",
      prompt: `You are the REALISTIC universe analyst. Analyze this scenario with BALANCED expectations.
Focus on: most probable revenue, realistic timeline, moderate ROI, medium risk.
Account for typical delays, average market conditions, and normal challenges.
Be specific with numbers — grounded projections based on industry averages.`
    },
    {
      id: "C", label: "Worst Case", subtitle: "PESSIMISTIC", color: "#F59E0B",
      prompt: `You are the PESSIMISTIC universe analyst. Analyze this scenario assuming THINGS GO WRONG.
Focus on: worst-case revenue, longest timeline, lowest/negative ROI, highest risk.
Account for market downturns, execution failures, regulatory problems, and competition.
Be specific with numbers — realistic worst-case projections, not apocalyptic fantasy.`
    },
  ];

  const systemSuffix = `

You have data from a multi-agent simulation with ${agents.length} specialists.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "probability": <number 1-100, how likely this universe is>,
  "riskLabel": "<Low|Medium|High>",
  "revenue": "<projected revenue, e.g. '$180K/yr' or '$2.4M'>",
  "roi": "<ROI percentage, e.g. '+120%' or '-25%'>",
  "timeline": "<time to key milestone, e.g. '6 months' or '18 months'>",
  "outcome": "<1-2 sentence summary of this universe's outcome>",
  "trigger": "<what conditions trigger this universe>",
  "events": [
    {"period": "<e.g. Month 1-2>", "text": "<what happens>", "sentiment": "<positive|neutral|negative|warning>"}
  ],
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "agentQuotes": [
    {"agent": "<agent name from simulation>", "role": "<their role>", "quote": "<a representative 1-sentence quote from their perspective in this universe>"}
  ]
}

Include 4-6 timeline events and 2-3 agent quotes.
Respond in ${userLang}.`;

  const userContent = `SCENARIO: ${scenario}

ENTITY GRAPH: ${JSON.stringify(graph)}
${worldContext ? `\nWORLD CONTEXT:\n${worldContext}\n` : ""}
AGENTS IN SIMULATION:
${agentSummary}

SIMULATION HIGHLIGHTS:
${simSummary}`;

  const universes: UniverseData[] = [];

  // Generate SEQUENTIALLY so each streams to the frontend as it completes
  for (let i = 0; i < universeConfigs.length; i++) {
    const config = universeConfigs[i];
    let universe: UniverseData;
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 2000,
        system: SECURITY_PREFIX + config.prompt + systemSuffix,
        messages: [{ role: "user", content: userContent }],
      });
      const text = (res.content[0] as any).text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      universe = {
        id: config.id, label: config.label, subtitle: config.subtitle, color: config.color,
        probability: parsed.probability || (config.id === "A" ? 25 : config.id === "B" ? 50 : 25),
        riskLabel: parsed.riskLabel || "Medium",
        revenue: parsed.revenue || "N/A",
        roi: parsed.roi || "N/A",
        timeline: parsed.timeline || "N/A",
        outcome: parsed.outcome || "",
        trigger: parsed.trigger || "",
        events: (parsed.events || []).slice(0, 6),
        keyInsights: (parsed.keyInsights || []).slice(0, 4),
        agentQuotes: (parsed.agentQuotes || []).slice(0, 3),
      };
    } catch {
      universe = {
        id: config.id, label: config.label, subtitle: config.subtitle, color: config.color,
        probability: config.id === "A" ? 25 : config.id === "B" ? 50 : 25,
        riskLabel: config.id === "A" ? "Low" : config.id === "C" ? "High" : "Medium",
        revenue: "N/A", roi: "N/A", timeline: "N/A", outcome: "", trigger: "",
        events: [], keyInsights: [], agentQuotes: [],
      };
    }
    universes.push(universe);
    onUniverseReady(i, universe);
  }

  // Normalize probabilities
  const totalProb = universes.reduce((s, u) => s + u.probability, 0);
  if (totalProb > 0) {
    universes.forEach(u => { u.probability = Math.round((u.probability / totalProb) * 100); });
  }

  return universes;
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
    system: SECURITY_PREFIX + SIMULATE_KNOWLEDGE + `\n\nYou are Signux ReportAgent. Generate a comprehensive simulation report structured as a DEBATE between specialists.

You have data from ${agentCount} specialist agents across ${roundCount} rounds (${totalInteractions} total interactions).

DEBATE FORMAT:
Structure the report as a professional debate. When presenting agent analyses, use this format:

For the FIRST time each agent speaks, introduce them with a backstory:
**Agent Name** (emoji) — *Brief 1-line backstory relevant to this scenario*: [their analysis]

Example backstories (ADAPT to scenario):
- **Unit Economics Auditor** — *Ex-Goldman VP, 12 years in unit economics*: [analysis]
- **Base Rate Archivist** — *Actuarial analyst turned reference-class forecaster*: [analysis]
- **Demand Signal Analyst** — *Built and sold 3 companies in this sector*: [analysis]
- **Competitive Adversary** — *Professional stress-tester, finds attack paths*: [analysis]

After first introduction, use just: **Agent Name** (emoji): [analysis]

The backstories should INFORM their perspective and create natural tension between agents.

INLINE CITATIONS:
When referencing specific knowledge, cite inline:
- [KB:domain-name] for Signux knowledge base
- [WEB:source] for web-sourced data
- [DATA:type] for data-driven claims

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

Include a workflow metadata block showing the analysis process:
<!-- signux_workflow: ["Scenario parsed", "Entity graph mapped", "N agents assembled", "3-round debate", "Consensus vote", "Report synthesis"] -->
Adapt N to the actual number of agents.

Generate the report with EXACTLY these sections:

## Executive Summary
3-4 sentences. What was simulated, key finding, recommendation.

## 🔵 ROUND 1 — Initial Analysis
Present each specialist's initial assessment with their backstory intro. Include 4-6 key agents. Each gives 2-3 sentences with specific numbers.

## 🟡 ROUND 2 — Challenges & Rebuttals
Show specialists challenging each other's assumptions. Format as:
**Base Rate Archivist** challenges **Demand Signal Analyst**: [specific challenge]
**Unit Economics Auditor** responds: [defense or concession]
Include 3-5 exchanges that reveal blind spots.

## 🟢 ROUND 3 — Consensus & Verdict

### 📊 VOTE

| Specialist | Vote | Confidence |
|---|---|---|
| [Agent] emoji | ✅ GO or ⚠️ CAUTION or 🛑 STOP | XX% |

Include ALL key agents (5-7 rows). Then:
**Result: X GO / Y CAUTION / Z STOP → [Majority verdict]**

### ⚠️ DISSENT ANALYSIS
For each non-GO vote, explain WHY they dissented. These represent real risks.

## Viability Score: X/10
(8-10 strong GO, 5-7 proceed with caution, 1-4 NO-GO)

## ✅ Positive Factors
1. **[Factor]** — [1 sentence with specific data]
2. **[Factor]** — [1 sentence]
3. **[Factor]** — [1 sentence]
(2-4 items, specific to this scenario, ordered by importance)

## ⚠️ Key Concerns
1. **[Concern]** — [1 sentence with specific risk]
2. **[Concern]** — [1 sentence]
3. **[Concern]** — [1 sentence]
(2-4 items, actionable things the user can address)

## Risk Matrix
| Risk | Probability | Impact | Severity | Mitigation |
Top 8-10 risks identified across all rounds.

## Financial Projections
Revenue, costs, break-even, ROI — with specific numbers. Include optimistic, realistic, and pessimistic scenarios.

## Recommended Path Forward
Numbered action items, specific and time-bound. What to do in the next 7 days, 30 days, 90 days.

## Kill Conditions
3-5 conditions that should make them STOP and abandon the plan.

## 🔄 What If You Change a Variable?
Suggest 3-5 specific what-if scenarios the user should explore:
- "What if the budget is cut by 50%?"
- "What if a competitor launches first?"
- "What if [specific variable from this scenario] changes?"
Make them SPECIFIC to this simulation, not generic.

At the end of your report, include these hidden metadata blocks:

<!-- signux_vote: {"go": N, "caution": N, "stop": N, "total": N, "result": "GO|CAUTION|STOP", "confidence_avg": NN, "dissenters": [{"role": "Agent Name", "vote": "CAUTION|STOP", "reason": "specific reason"}]} -->
The vote metadata must match the vote table in the report. result = majority verdict.

<!-- signux_verification: {"confidence": 0.XX, "checked": ["list what you verified"], "caveats": ["list limitations"]} -->
Confidence must be honest: 0.9+ very high, 0.7-0.9 good, 0.5-0.7 moderate, below 0.5 low. Never inflate.

<!-- signux_worklog: {"steps": [{"action": "step type", "detail": "specific detail"}], "sources_count": N, "domains_used": N, "reasoning_steps": N} -->
List actual reasoning steps taken. Include how many agents contributed and key frameworks applied.

<!-- signux_domains: domain1, domain2, domain3 -->
<!-- signux_domain_count: X -->

<!-- signux_timeline: [{"period": "Month 1-2", "event": "Setup phase", "impact": "Initial investment required", "probability": 0.95}, {"period": "Month 3-4", "event": "Market entry", "impact": "First revenue expected", "probability": 0.7}] -->
Include 4-8 timeline events covering the full time horizon. Each must have period, event description, impact, and probability (0-1).

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence based on simulation consensus"} -->
Signal must reflect the overall simulation verdict. bullish = strong GO, bearish = STOP, mixed = split votes, neutral = CAUTION majority.

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "Why this source matters"}] -->
Include 3-6 key sources that informed the simulation analysis.

<!-- signux_followups: [{"question": "What-if follow-up", "why": "Why explore this angle"}] -->
Include 3-5 strategic what-if scenarios the user should simulate next.`
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

        // Fetch user history for agent personality evolution
        let personalityAdaptation = "";
        if (userId) {
          try {
            const { data: contexts } = await supabaseAdmin
              .from("user_context")
              .select("context_type, summary, key_insights")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(15);
            if (contexts && contexts.length >= 3) {
              const contextSummary = contexts.map(c => c.summary).join(". ");
              const allInsights = contexts.flatMap(c => c.key_insights || []);
              const industries = contextSummary.match(/food|restaurant|cafe|saas|tech|software|ecommerce|retail|finance|crypto|real estate|health/gi) || [];
              const topIndustry = industries.length > 0
                ? [...new Set(industries.map(i => i.toLowerCase()))].sort((a: string, b: string) =>
                    industries.filter((v: string) => v.toLowerCase() === b).length - industries.filter((v: string) => v.toLowerCase() === a).length
                  )[0]
                : null;
              const riskPatterns = allInsights.filter(i => /risk|caution|stop|concern|threat/i.test(i));
              const riskTolerance = riskPatterns.length > contexts.length * 0.6 ? "low" : "moderate";
              personalityAdaptation = `\n\nAGENT PERSONALITY ADAPTATIONS (based on user's ${contexts.length} previous analyses):
- ${topIndustry ? `They primarily work in ${topIndustry} — agents should have ${topIndustry} expertise.` : "Diverse industry focus."}
- Risk tolerance appears ${riskTolerance} (${riskPatterns.length} cautions in ${contexts.length} analyses).
- The Risk Assessor should be ${riskTolerance === "low" ? "EXTRA cautious — this user has seen many risks materialize" : "balanced — flag risks but don't overweight them"}.
- ${allInsights.length > 0 ? `Recurring themes: ${[...new Set(allInsights)].slice(0, 5).join(", ")}` : ""}`;
            }
          } catch {}
        }

        // Stage 1: Agents
        sendSSE(controller, encoder, { type: "status", message: "Setting up agents..." });
        sendSSE(controller, encoder, { type: "stage", stage: 1 });
        const { agents, simulation_parameters } = await setupAgents(graph, scenario + personalityAdaptation, userLang, worldContext, models.simulate_agents);
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

        // Stage 5: Parallel Universe Engine — stream each universe as it completes
        sendSSE(controller, encoder, { type: "status", message: "Spawning optimistic agents..." });
        sendSSE(controller, encoder, { type: "stage", stage: 5 });
        sendSSE(controller, encoder, { type: "universes_start", total: 3 });

        const universes = await generateUniversesStreaming(
          scenario, graph, agents, allMessages, userLang, worldContext, models.simulate_agents,
          (index, universe) => {
            sendSSE(controller, encoder, { type: "universe_ready", index, data: universe });
            const statusMessages = [
              "Analyzing realistic scenario...",
              "Stress-testing worst case...",
              "Generating cross-universe verdict...",
            ];
            if (index < 2) {
              sendSSE(controller, encoder, { type: "status", message: statusMessages[index] });
            }
          }
        );
        sendSSE(controller, encoder, { type: "universes", data: universes });

        // Stage 6: Cross-Universe Verdict
        sendSSE(controller, encoder, { type: "status", message: "Synthesizing cross-universe verdict..." });
        sendSSE(controller, encoder, { type: "stage", stage: 6 });

        const verdict = await generateVerdict(scenario, universes, agents, allMessages, userLang, models.simulate_report);
        sendSSE(controller, encoder, { type: "verdict_ready", data: verdict });
        sendSSE(controller, encoder, { type: "verdict", data: verdict });
        sendSSE(controller, encoder, { type: "stage_done", stage: 6 });

        // Save context for agent memory
        if (userId) {
          try {
            await supabaseAdmin.from("user_context").insert({
              user_id: userId,
              context_type: "simulation",
              summary: `Simulated: ${scenario.slice(0, 200)}. ${agents.length} agents, ${allMessages.length} interactions. Verdict: ${verdict.result}. Viability: ${verdict.viabilityScore}/10.`,
              key_insights: [
                `Agents: ${agents.length}`,
                `Rounds: ${rounds}`,
                `Verdict: ${verdict.result}`,
                `Viability: ${verdict.viabilityScore}/10`,
                `Best case ROI: ${universes[0]?.roi}`,
              ],
              metadata: { scenario: scenario.slice(0, 100) },
            });
          } catch {}
        }

        // Final result
        sendSSE(controller, encoder, {
          type: "complete",
          result: {
            stages: { graph, agents, simulation_parameters },
            simulation: allMessages,
            report,
            universes,
            verdict,
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
