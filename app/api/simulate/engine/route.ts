export const maxDuration = 300;

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";
import { DEFAULT_MODEL } from "@/lib/simulation/claude";
import { getUserFromRequest, checkUsageLimit, incrementUsage, getTierFromRequest } from "../../../lib/usage";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ═══════════════════════════════════════════════════════════
   RESILIENCE UTILITIES
   ═══════════════════════════════════════════════════════════ */

async function withTimeout<T>(fn: () => Promise<T>, ms = 60000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

const RETRY_DELAYS = [2000, 5000, 10000]; // 3 retries with backoff

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delays: number[] = RETRY_DELAYS
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      const delay = delays[Math.min(i, delays.length - 1)];
      console.log(`[ENGINE] Retry ${i + 1}/${retries} after ${delay}ms — ${err?.message || "unknown error"}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

/** Run promises in batches with delay between batches to avoid rate limits */
async function runInBatches<T>(
  fns: (() => Promise<T>)[],
  batchSize = 3,
  delayMs = 800
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < fns.length; i += batchSize) {
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    const batch = fns.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

/* ═══════════════════════════════════════════════════════════
   10 INDEPENDENT AGENTS — each is a SEPARATE Claude call
   ═══════════════════════════════════════════════════════════ */

const AGENTS = [
  {
    id: "base-rate-archivist",
    name: "Base Rate Archivist",
    color: "#94A3B8",
    system: SECURITY_PREFIX + `You are the Base Rate Archivist inside SIGNUX AI.
Your job is to bring the outside view. You convert the user's decision into comparable case classes and reason from historical patterns, reference classes, common failure rates, and what typically happens in similar business situations.
Your priorities:
1. Identify the closest real class of comparable situations.
2. Estimate what usually happens before discussing what could happen.
3. Challenge exceptionalist assumptions.
4. Surface the most relevant base-rate drivers: market timing, stage, capital intensity, execution burden, channel risk, regulation, customer adoption friction.
Behavior rules:
- Be concise, sharp, and useful.
- Use plain business English.
- Prefer probability ranges and comparative logic over storytelling.
- Do not say "it depends" without naming what it depends on.`,
  },
  {
    id: "unit-economics-auditor",
    name: "Unit Economics Auditor",
    color: "#7DD3FC",
    system: SECURITY_PREFIX + `You are the Unit Economics Auditor inside SIGNUX AI.
Your role is to judge whether a plan is economically survivable and attractive. You focus on pricing, gross margin, CAC, LTV, payback, working capital, burn, runway, and capital efficiency.
Your priorities:
1. Test whether the business works before scale.
2. Identify the financial variable most likely to break the plan.
3. Distinguish attractive revenue from durable economics.
4. Force realism around cost, timing, and cash conversion.
Behavior rules:
- Be concise and numerically disciplined.
- Challenge vague assumptions around margin, CAC, demand, and fixed costs.
- Do not reward growth if it destroys unit economics.
- When possible, identify one metric that matters most.`,
  },
  {
    id: "demand-signal-analyst",
    name: "Demand Signal Analyst",
    color: "#6EE7B7",
    system: SECURITY_PREFIX + `You are the Demand Signal Analyst inside SIGNUX AI.
Your job is to determine whether there is real, monetizable demand and how credible the current evidence is. You care about ICP clarity, willingness to pay, urgency, buyer behavior, adoption friction, and signal quality.
Your priorities:
1. Identify the first credible customer segment.
2. Separate attention from demand.
3. Challenge assumptions about willingness to pay.
4. Name the cleanest demand validation step.
Behavior rules:
- Be skeptical of vague markets and broad "everyone" claims.
- Emphasize timing, urgency, and segment fit.`,
  },
  {
    id: "regulatory-gatekeeper",
    name: "Regulatory Gatekeeper",
    color: "#FCA5A5",
    system: SECURITY_PREFIX + `You are the Regulatory Gatekeeper inside SIGNUX AI.
Your role is to identify the regulatory, compliance, trust, approval, licensing, and market-entry constraints that could block or materially delay success.
Your priorities:
1. Surface the most likely legal or compliance bottleneck.
2. Estimate where timing risk comes from.
3. Identify trust-sensitive parts of the plan.
4. Distinguish manageable compliance work from deal-killing friction.
Behavior rules:
- Be practical and concise.
- Do not flood the user with legal detail unless it affects the decision.
- Name the highest-impact regulatory issue first.`,
  },
  {
    id: "execution-operator",
    name: "Execution Operator",
    color: "#FCD34D",
    system: SECURITY_PREFIX + `You are the Execution Operator inside SIGNUX AI.
Your role is to evaluate whether the proposed plan can actually be executed with the stated constraints. You care about sequencing, complexity, dependencies, team bandwidth, operational bottlenecks, and rollout discipline.
Your priorities:
1. Identify the first operational bottleneck.
2. Reduce unnecessary complexity.
3. Force sequencing clarity.
4. Recommend the simplest viable path to proof.
Behavior rules:
- Be practical, not theoretical.
- Prefer concrete rollout logic over generic advice.
- Name what breaks first if the plan is too ambitious.`,
  },
  {
    id: "competitive-adversary",
    name: "Competitive Adversary",
    color: "#FDBA74",
    system: SECURITY_PREFIX + `You are the Competitive Adversary inside SIGNUX AI.
Your role is to attack the plan like a smart competitor, incumbent, fast follower, or market adversary. You exist to stress-test defensibility, reaction risk, pricing pressure, channel vulnerability, and moat quality.
Your priorities:
1. Identify the easiest attack path.
2. Challenge weak or borrowed differentiation.
3. Predict how a rational competitor would respond.
4. Force the user to confront survivability under competition.
Behavior rules:
- Be sharp and adversarial, but not theatrical.
- Do not attack randomly; attack where the plan is truly weak.
- Name the most dangerous competitive reaction first.`,
  },
  {
    id: "strategic-architect",
    name: "Strategic Architect",
    color: "#C4B5FD",
    system: SECURITY_PREFIX + `You are the Strategic Architect inside SIGNUX AI.
Your role is to evaluate whether the proposed plan is strategically coherent. You care about wedge selection, sequencing, positioning, focus, compounding advantage, and what not to do yet.
Your priorities:
1. Identify the strategic wedge.
2. Separate attractive distractions from the core path.
3. Improve long-term compounding logic.
4. Recommend the best sequence of moves.
Behavior rules:
- Be high-level but concrete.
- Avoid generic strategy jargon.
- Name what creates strategic compounding.`,
  },
  {
    id: "regime-sentinel",
    name: "Regime Sentinel",
    color: "#5EEAD4",
    system: SECURITY_PREFIX + `You are the Regime Sentinel inside SIGNUX AI.
Your role is to identify macro, timing, platform, capital-market, and external-environment risks that can materially shift the probability of success.
Your priorities:
1. Identify the hidden regime assumption.
2. Name the most relevant external shock.
3. Evaluate timing sensitivity.
4. Assess whether the plan is robust across more than one environment.
Behavior rules:
- Be concise and relevant.
- Do not become a generic macro commentator.
- Focus only on external shifts that materially affect the decision.`,
  },
  {
    id: "intervention-optimizer",
    name: "Intervention Optimizer",
    color: "#F9A8D4",
    system: SECURITY_PREFIX + `You are the Intervention Optimizer inside SIGNUX AI.
Your role is to convert the analysis into action. You identify the single move, experiment, sequence, or information-gathering step most likely to improve the probability of success.
Your priorities:
1. Find the highest-leverage intervention.
2. Prefer actions that materially change odds relative to cost and complexity.
3. Reduce uncertainty quickly.
4. Convert analysis into concrete next steps.
Behavior rules:
- Be specific and actionable.
- Avoid generic advice.
- Name the one move that matters most.`,
  },
  {
    id: "decision-chair",
    name: "Decision Chair",
    color: "#A5B4FC",
    system: SECURITY_PREFIX + `You are the Decision Chair inside SIGNUX AI.
Your role is to synthesize the debate into a decision-ready output. You do not add noise. You compress signal, preserve critical disagreement, estimate probability, and produce the clearest executive summary possible.
Your priorities:
1. Identify the strongest signals.
2. Preserve the most decision-relevant disagreement.
3. Produce a probability judgment with appropriate confidence.
4. State the biggest risk, biggest leverage point, and best next action.
Behavior rules:
- Be concise, clear, and executive-friendly.
- Do not flatten important disagreement into fake consensus.
- Do not overstate confidence.`,
  },
];

/* ═══════════════════════════════════════════════════════════
   10 ROUNDS — structured decision flow
   ═══════════════════════════════════════════════════════════ */

const ROUNDS = [
  { round: 1, name: "Frame the Decision", lead: ["decision-chair", "base-rate-archivist", "demand-signal-analyst"] },
  { round: 2, name: "Outside View", lead: ["base-rate-archivist", "demand-signal-analyst"] },
  { round: 3, name: "Economic Viability", lead: ["unit-economics-auditor"] },
  { round: 4, name: "Regulation & Entry", lead: ["regulatory-gatekeeper", "execution-operator"] },
  { round: 5, name: "Execution Sequence", lead: ["execution-operator", "strategic-architect"] },
  { round: 6, name: "Competitive Attack", lead: ["competitive-adversary"] },
  { round: 7, name: "Strategic Coherence", lead: ["strategic-architect", "base-rate-archivist"] },
  { round: 8, name: "Regime & Timing", lead: ["regime-sentinel", "unit-economics-auditor"] },
  { round: 9, name: "Best Intervention", lead: ["intervention-optimizer", "execution-operator"] },
  { round: 10, name: "Final Synthesis", lead: ["decision-chair"] },
];

const ROUND_INSTRUCTIONS = [
  `ROUND 1 — FRAME THE DECISION: Frame the core decision at stake. What exactly is being decided? What are the key variables? What is the decision's time horizon? Be specific and structured. If you are a lead agent this round, set the frame. If not, add the dimension your expertise uniquely sees.`,

  `ROUND 2 — OUTSIDE VIEW: Bring the outside view. What happens in comparable situations historically? What is the base rate of success for this type of venture/decision? Name specific reference classes, failure rates, and comparable outcomes. Challenge any exceptionalist thinking from Round 1.`,

  `ROUND 3 — ECONOMIC VIABILITY: Stress-test the unit economics. Does this work financially before scale? What are the margins, CAC, LTV, payback period, burn rate? Identify the single financial variable most likely to break the plan. Cite specific numbers and benchmarks.`,

  `ROUND 4 — REGULATION & ENTRY: Identify the regulatory, compliance, licensing, and market-entry constraints. What could block or materially delay success? Distinguish manageable compliance work from deal-killing friction. Also assess operational feasibility of market entry.`,

  `ROUND 5 — EXECUTION SEQUENCE: Evaluate whether this can actually be executed. What is the right sequence of moves? What breaks first if the plan is too ambitious? Recommend the simplest viable path to proof. Be concrete about timelines, dependencies, and bottlenecks.`,

  `ROUND 6 — COMPETITIVE ATTACK: Attack the plan as a smart competitor would. Where is the plan most vulnerable? What is the easiest attack path? How would a rational incumbent or fast follower respond? Challenge weak differentiation and test defensibility.`,

  `ROUND 7 — STRATEGIC COHERENCE: Evaluate whether the overall strategy is coherent. Is the wedge selection correct? Is the sequencing optimal? What creates compounding advantage? Separate attractive distractions from the core strategic path. Challenge with base-rate evidence where relevant.`,

  `ROUND 8 — REGIME & TIMING: Identify macro, timing, and external-environment risks. What hidden regime assumptions does the plan make? What external shock could shift success probability? Is the timing right? Also revisit economic assumptions in light of macro conditions.`,

  `ROUND 9 — BEST INTERVENTION: Based on ALL previous rounds, identify the single highest-leverage action. What one move, experiment, or information-gathering step would most improve the probability of success? Be specific and actionable. Prefer actions that materially change odds.`,

  `ROUND 10 — FINAL SYNTHESIS: Synthesize the entire debate into a decision-ready output. State: PROCEED or STOP. Then provide: (1) probability of success estimate with confidence level, (2) the single biggest risk, (3) the single biggest leverage point, (4) the best next action. If you voted STOP or have reservations, write a dissent note starting with "DISSENT:". Preserve critical disagreements — do not flatten into fake consensus.`,
];

const ROUND_LABELS = [
  "Frame the Decision",
  "Outside View",
  "Economic Viability",
  "Regulation & Entry",
  "Execution Sequence",
  "Competitive Attack",
  "Strategic Coherence",
  "Regime & Timing",
  "Best Intervention",
  "Final Synthesis",
];

/* ═══════════════════════════════════════════════════════════
   ROUTE HANDLER
   ═══════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  // 8. API Key check
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ENGINE] ANTHROPIC_API_KEY not configured");
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  console.log("[ENGINE] Request received", {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasClientToken: !!process.env.NEXT_PUBLIC_CLIENT_TOKEN,
  });

  const tokenError = verifyClientToken(req);
  if (tokenError) {
    console.log("ENGINE AUTH FAILED: verifyClientToken returned 401");
    return tokenError;
  }
  const rateLimitError = applyRateLimit(req, 3, 60000);
  if (rateLimitError) return rateLimitError;

  const userId = await getUserFromRequest(req);
  console.log("ENGINE USER:", { userId, hasUser: !!userId });
  const usageError = await checkUsageLimit(userId, "simulate");
  if (usageError) {
    console.log("ENGINE USAGE BLOCKED:", { userId, status: 403 });
    return usageError;
  }
  if (userId) {
    incrementUsage(userId, "simulations").catch(() => {});
  }

  const tier = await getTierFromRequest(req);

  const { scenario, lang } = await req.json();

  if (!scenario || scenario.trim().length < 10) {
    return NextResponse.json({ error: "Scenario too short" }, { status: 400 });
  }

  const langMap: Record<string, string> = {
    en: "English", "pt-BR": "Portuguese", es: "Spanish", fr: "French", de: "German",
    it: "Italian", nl: "Dutch", ja: "Japanese", ko: "Korean", "zh-Hans": "Chinese",
  };
  const userLang = langMap[lang] || "English";

  // Fetch previous simulations for agent memory
  let memoryContext = "";
  if (userId) {
    try {
      const { data: prevSims } = await supabaseAdmin
        .from("simulations")
        .select("scenario, verdict")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (prevSims && prevSims.length > 0) {
        const lines = prevSims.map(s =>
          `- "${s.scenario}" → Verdict: ${s.verdict?.verdict || "N/A"}, Viability: ${s.verdict?.viability || "N/A"}/10`
        );
        memoryContext = `\n\nUSER'S PREVIOUS SIMULATIONS (you remember these — reference if relevant):\n${lines.join("\n")}`;
      }
    } catch {}
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed if client disconnected
        }
      };

      type TranscriptEntry = {
        round: number;
        agentId: string;
        name: string;
        color: string;
        text: string;
        sentiment: string;
        confidence: number;
        changedMind: boolean;
        failed?: boolean;
      };

      const transcript: TranscriptEntry[] = [];
      const roundSummaries: string[] = [];
      let skippedRounds: number[] = [];

      try {
        // Send agent roster
        send({
          type: "agents",
          agents: AGENTS.map(a => ({
            id: a.id, name: a.name, color: a.color,
          })),
        });

        // ═══ ROUNDS 1-9: Individual agent calls ═══
        for (let round = 0; round < 9; round++) {
          const roundNum = round + 1;
          // TEST PHASE: All Haiku. PROD: Rounds 1-5 Haiku, 6-9 Sonnet (except free).
          const model = DEFAULT_MODEL;
          const maxTokens = 450;
          const agentTimeoutMs = 60000;

          console.log(`[ENGINE] Round ${roundNum}/10 starting — ${ROUND_LABELS[round]} (${DEFAULT_MODEL})`);
          send({
            type: "round_start",
            round: roundNum,
            total: 10,
            label: ROUND_LABELS[round],
            model: "haiku",
          });

          // Build context — last 4 round summaries
          const recentSummaries = roundSummaries.slice(-4);
          const prevContext = recentSummaries.length > 0
            ? `\n\nPREVIOUS ROUNDS SUMMARY:\n${recentSummaries.join("\n\n")}`
            : "";

          // Last round's lead agent responses
          const lastRoundLeads = round > 0
            ? transcript
                .filter(t => t.round === round && !t.failed)
                .filter(t => ROUNDS[round - 1]?.lead?.includes(t.agentId) || false)
            : [];
          const lastRoundFull = lastRoundLeads.length > 0
            ? `\n\nLAST ROUND KEY VOICES:\n${lastRoundLeads.map(t => `[${t.name}]: "${t.text}"`).join("\n")}`
            : "";

          // Run agents in batches of 3
          const agentFactories = AGENTS.map((agent, agentIdx) => async (): Promise<TranscriptEntry> => {
            const agentPrevious = transcript
              .filter(t => t.agentId === agent.id && !t.failed)
              .slice(-3)
              .map(t => `[Round ${t.round}] You said: "${t.text}" (sentiment: ${t.sentiment})`)
              .join("\n");

            const userMsg = `SCENARIO: "${scenario}"${memoryContext}
${prevContext}
${lastRoundFull}

YOUR PREVIOUS STATEMENTS:
${agentPrevious || "(This is your first round)"}

${ROUND_INSTRUCTIONS[round]}
${ROUNDS[round].lead.includes(agent.id) ? "\nYou are a LEAD AGENT this round — your perspective is primary. Set the frame and go deep." : "\nYou are a SUPPORTING AGENT this round — add the dimension your expertise uniquely sees. Be concise."}

Respond in ${userLang}.
IMPORTANT: Your "text" value must be rich natural language — cite specific numbers, name real companies/examples, express your confidence as a natural phrase within the text. Respond ONLY with natural text inside the JSON. Do NOT wrap in code blocks or markdown.
Respond ONLY in this JSON format (no markdown, no backticks):
{"text": "<your expert analysis — 2-4 sentences with specific numbers and natural confidence expression>", "sentiment": "<one of: confident, optimistic, cautious, worried, skeptical, convinced, contrarian, neutral, excited, concerned>", "confidence": <number 1-10>, "changed_mind": <true or false>}`;

            try {
              const res = await withRetry(
                () =>
                  withTimeout(
                    () =>
                      anthropic.messages.create({
                        model,
                        max_tokens: maxTokens,
                        system: agent.system,
                        messages: [{ role: "user", content: userMsg }],
                      }),
                    agentTimeoutMs
                  ),
                3,
                RETRY_DELAYS
              );

              const raw = (res.content[0] as any)?.text || "";
              const clean = raw.replace(/```json\n?|```\n?/g, "").trim();

              const match = clean.match(/\{[\s\S]*\}/);
              let parsed: any = null;
              try {
                parsed = match ? JSON.parse(match[0]) : null;
              } catch {
                const textMatch = clean.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
                if (textMatch) {
                  const sentMatch = clean.match(/"sentiment"\s*:\s*"([^"]+)"/);
                  const confMatch = clean.match(/"confidence"\s*:\s*(\d+)/);
                  const cmMatch = clean.match(/"changed_mind"\s*:\s*(true|false)/);
                  parsed = {
                    text: textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
                    sentiment: sentMatch ? sentMatch[1] : "neutral",
                    confidence: confMatch ? parseInt(confMatch[1]) : 5,
                    changed_mind: cmMatch ? cmMatch[1] === "true" : false,
                  };
                }
              }

              if (parsed && parsed.text) {
                console.log(`[ENGINE] Round ${roundNum}/10 - Agent ${agent.name} complete (${agentIdx + 1}/10)`);
                return {
                  agentId: agent.id, name: agent.name, color: agent.color, round: roundNum,
                  text: typeof parsed.text === "string" ? parsed.text : String(parsed.text ?? ""),
                  sentiment: typeof parsed.sentiment === "string" ? parsed.sentiment : "neutral",
                  confidence: typeof parsed.confidence === "number" ? parsed.confidence : 5,
                  changedMind: !!parsed.changed_mind,
                };
              }

              const fallbackText = clean
                .replace(/^\s*\{\s*"text"\s*:\s*"?/, "")
                .replace(/"?\s*,?\s*"sentiment"[\s\S]*$/, "")
                .replace(/```/g, "")
                .trim();
              return {
                agentId: agent.id, name: agent.name, color: agent.color, round: roundNum,
                text: fallbackText.slice(0, 600), sentiment: "neutral", confidence: 5, changedMind: false,
              };
            } catch (err: any) {
              console.warn(`[ENGINE] Round ${roundNum} - Agent ${agent.name} FAILED: ${err?.message}`);
              send({ type: "agent_failed", round: roundNum, agentId: agent.id, agentName: agent.name, reason: err?.message || "unavailable" });
              return {
                agentId: agent.id, name: agent.name, color: agent.color, round: roundNum,
                text: "I defer to my colleagues on this round.", sentiment: "neutral", confidence: 5, changedMind: false, failed: true,
              };
            }
          });

          const roundResults = await runInBatches(agentFactories, 3, 800);
          const failedCount = roundResults.filter(r => r.failed).length;

          if (failedCount > 3) {
            console.warn(`[ENGINE] Round ${roundNum}/10 SKIPPED — ${failedCount}/10 agents failed`);
            send({ type: "round_skipped", round: roundNum, label: ROUND_LABELS[round], failedCount, reason: `${failedCount}/10 agents failed — round skipped` });
            send({ type: "error", message: `Round ${roundNum} skipped: ${failedCount}/10 agents failed, continuing...`, recoverable: true });
            skippedRounds.push(roundNum);
            roundResults.filter(r => !r.failed).forEach(r => transcript.push(r));
          } else {
            roundResults.forEach(r => transcript.push(r));
            send({ type: "round_complete", round: roundNum, label: ROUND_LABELS[round], agents: roundResults, failedCount });
            console.log(`[ENGINE] Round ${roundNum}/10 complete (${failedCount} failures)`);
          }

          // Summarize this round for context compression
          const successfulResults = roundResults.filter(r => !r.failed);
          if (successfulResults.length >= 3) {
            try {
              const summaryRes = await withRetry(
                () =>
                  withTimeout(
                    () =>
                      anthropic.messages.create({
                        model: DEFAULT_MODEL,
                        max_tokens: 200,
                        system: "Summarize a debate round in 3-4 bullet points. Focus on: key disagreements, strongest arguments, any agents who changed position. Be extremely concise.",
                        messages: [{ role: "user", content: `Round ${roundNum} debate on "${scenario.slice(0, 200)}":\n${successfulResults.map(r => `[${r.name}]: "${r.text}" [sentiment: ${r.sentiment}]`).join("\n")}` }],
                      }),
                    30000
                  ),
                3, RETRY_DELAYS
              );
              roundSummaries.push(`Round ${roundNum}: ${(summaryRes.content[0] as any)?.text || ""}`);
            } catch {
              roundSummaries.push(`Round ${roundNum}: (summary unavailable)`);
            }
          } else {
            roundSummaries.push(`Round ${roundNum}: (insufficient data — ${failedCount} agents failed)`);
          }
        }

        // ═══ ROUND 10: FINAL SYNTHESIS — single consolidated call ═══
        // Instead of 10 individual agent calls (which timeout), use ONE Sonnet call
        // that generates all 10 agent final votes at once.
        {
          console.log("[ENGINE] Round 10/10 starting — Final Synthesis (consolidated)");
          send({ type: "round_start", round: 10, total: 10, label: "Final Synthesis", model: "haiku" });

          const synthModel = DEFAULT_MODEL;
          const lastSummaries = roundSummaries.slice(-4);
          const agentNames = AGENTS.map(a => `${a.name} (${a.id})`).join(", ");

          const synthPrompt = `You are synthesizing a 9-round adversarial debate among 10 expert agents.

SCENARIO: "${scenario}"

DEBATE SUMMARIES:
${lastSummaries.join("\n\n")}

AGENTS: ${agentNames}

${ROUND_INSTRUCTIONS[9]}

Generate each agent's final synthesis vote. Each agent should stay in character based on their role.
Respond ONLY in JSON (no markdown, no backticks). Use this exact format:
{"agents": [{"agentId": "<agent-id>", "text": "<1-2 sentence final verdict from this agent's perspective>", "sentiment": "<one of: confident, optimistic, cautious, worried, skeptical, convinced, contrarian, neutral>", "confidence": <1-10>, "changed_mind": <true or false>}]}

Include all 10 agents. Each text should mention PROCEED or STOP and include a dissent note starting with "DISSENT:" if the agent disagrees with the majority.`;

          try {
            const synthRes = await withRetry(
              () => withTimeout(
                () => anthropic.messages.create({
                  model: synthModel,
                  max_tokens: 2000,
                  system: SECURITY_PREFIX + "You are the simulation synthesis engine for SIGNUX AI. Generate authentic final votes for each expert agent based on the debate history. Each agent should stay in character.",
                  messages: [{ role: "user", content: synthPrompt }],
                }),
                60000
              ),
              2, RETRY_DELAYS
            );

            const raw = (synthRes.content[0] as any)?.text || "";
            const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
            const match = clean.match(/\{[\s\S]*\}/);
            let synthData: any = null;
            try { synthData = match ? JSON.parse(match[0]) : null; } catch {}

            const round10Results: TranscriptEntry[] = [];
            if (synthData?.agents && Array.isArray(synthData.agents)) {
              for (const vote of synthData.agents) {
                const agent = AGENTS.find(a => a.id === vote.agentId);
                if (!agent) continue;
                round10Results.push({
                  agentId: agent.id, name: agent.name, color: agent.color, round: 10,
                  text: typeof vote.text === "string" ? vote.text : String(vote.text ?? ""),
                  sentiment: typeof vote.sentiment === "string" ? vote.sentiment : "neutral",
                  confidence: typeof vote.confidence === "number" ? vote.confidence : 5,
                  changedMind: !!vote.changed_mind,
                });
              }
            }

            // Fill in any missing agents with fallback
            for (const agent of AGENTS) {
              if (!round10Results.find(r => r.agentId === agent.id)) {
                round10Results.push({
                  agentId: agent.id, name: agent.name, color: agent.color, round: 10,
                  text: "I defer to the majority verdict.", sentiment: "neutral", confidence: 5, changedMind: false, failed: true,
                });
              }
            }

            round10Results.forEach(r => transcript.push(r));
            const failedCount = round10Results.filter(r => r.failed).length;
            send({ type: "round_complete", round: 10, label: "Final Synthesis", agents: round10Results, failedCount });
            console.log(`[ENGINE] Round 10/10 complete (${failedCount} failures)`);

          } catch (err: any) {
            console.warn(`[ENGINE] Round 10 consolidated synthesis FAILED: ${err?.message}`);
            // Generate fallback votes from last round's sentiments
            const round10Fallback: TranscriptEntry[] = AGENTS.map(agent => {
              const lastEntry = transcript.filter(t => t.agentId === agent.id && !t.failed).pop();
              const vote = lastEntry && (lastEntry.sentiment === "skeptical" || lastEntry.sentiment === "worried" || lastEntry.sentiment === "concerned") ? "STOP" : "PROCEED";
              return {
                agentId: agent.id, name: agent.name, color: agent.color, round: 10,
                text: `${vote} — based on my analysis across all rounds.`,
                sentiment: lastEntry?.sentiment || "neutral",
                confidence: lastEntry?.confidence || 5,
                changedMind: false, failed: true,
              };
            });
            round10Fallback.forEach(r => transcript.push(r));
            send({ type: "round_complete", round: 10, label: "Final Synthesis", agents: round10Fallback, failedCount: 10 });
            send({ type: "error", message: "Final synthesis used sentiment-based fallback votes", recoverable: true });
          }
        }

        // ═══ FINAL VERDICT — from Round 10 votes ═══
        const round10 = transcript.filter(t => t.round === 10 && !t.failed);
        const votes = round10.map(r => {
          const textLower = r.text.toLowerCase();
          return {
            agentId: r.agentId,
            agent: r.name,
            color: r.color,
            vote: textLower.includes("proceed") ? "PROCEED" as const : "STOP" as const,
            dissent: r.text.includes("DISSENT:") ? r.text.split("DISSENT:")[1]?.trim() || null : null,
            confidence: r.confidence,
            sentiment: r.sentiment,
          };
        });

        const proceedCount = votes.filter(v => v.vote === "PROCEED").length;
        const stopCount = votes.filter(v => v.vote === "STOP").length;
        const avgConfidence = votes.length > 0
          ? Math.round(votes.reduce((a, b) => a + b.confidence, 0) / votes.length * 10) / 10
          : 5;
        const dissents = votes
          .filter(v => v.dissent)
          .map(v => ({ agent: String(v.agent), note: typeof v.dissent === "string" ? v.dissent : String(v.dissent ?? "") }));

        // ═══ EMERGENT PATTERNS — synthesize from all round summaries ═══
        console.log("[ENGINE] All 10 rounds complete. Generating verdict...");
        let patternData: any = null;
        try {
          const patternsRes = await withRetry(
            () =>
              withTimeout(
                () =>
                  anthropic.messages.create({
                    model: DEFAULT_MODEL,
                    max_tokens: 600,
                    system: `You analyze multi-agent debate transcripts and identify EMERGENT PATTERNS — insights that no single agent would have produced alone. Respond in ${userLang}. Respond ONLY in JSON.`,
                    messages: [{
                      role: "user",
                      content: `10-round adversarial debate on: "${scenario.slice(0, 300)}"

${roundSummaries.join("\n\n")}

FINAL VOTES: ${proceedCount} PROCEED, ${stopCount} STOP (avg confidence: ${avgConfidence}/10)
DISSENTS: ${dissents.map(d => `${d.agent}: "${d.note}"`).join("; ") || "None"}
${skippedRounds.length > 0 ? `\nSKIPPED ROUNDS: ${skippedRounds.join(", ")} (too many agent failures)` : ""}

Identify emergent patterns. Respond ONLY in JSON (no markdown):
{"patterns": [{"type": "consensus|emerging_risk|blind_spot|opportunity|tension", "title": "<3-5 word title>", "description": "<1-2 sentence pattern>", "agents_involved": ["<agent names>"]}], "verdict": "<2-sentence recommended action>", "viability": <1-10>, "estimatedROI": "<e.g. +45% or -15%>", "keyRisk": "<single biggest risk>", "keyOpportunity": "<single biggest opportunity>"}`,
                    }],
                  }),
                60000
              ),
            3,
            RETRY_DELAYS
          );
          const raw = (patternsRes.content[0] as any)?.text || "";
          const m = raw.replace(/```json\n?|```\n?/g, "").match(/\{[\s\S]*\}/);
          if (m) patternData = JSON.parse(m[0]);
        } catch (verdictErr: any) {
          console.warn("[ENGINE] Verdict generation failed:", verdictErr?.message);
          send({ type: "error", message: "Verdict analysis failed, using vote-based fallback", recoverable: true });
        }

        // 7. VERDICT FALLBACK — if verdict call failed, build from votes
        if (!patternData) {
          const majority = proceedCount >= stopCount ? "PROCEED" : "STOP";
          patternData = {
            patterns: [],
            verdict: `${majority} recommended based on ${proceedCount}-${stopCount} vote. ${dissents.length > 0 ? `Key concern: ${dissents[0]?.note?.slice(0, 100) || "See dissent notes."}` : "No major dissent."}`,
            viability: Math.round(avgConfidence),
            estimatedROI: "N/A",
            keyRisk: dissents.length > 0 ? (dissents[0]?.note?.slice(0, 120) || "See dissent notes") : "No major risks identified",
            keyOpportunity: "See agent analysis above",
          };
          console.log("[ENGINE] Using vote-based fallback verdict");
        }

        // Sanitize pattern data — ensure all rendered fields are strings
        const safePatterns = Array.isArray(patternData.patterns)
          ? patternData.patterns.map((p: any) => ({
              type: typeof p.type === "string" ? p.type : "consensus",
              title: typeof p.title === "string" ? p.title : String(p.title ?? ""),
              description: typeof p.description === "string" ? p.description : String(p.description ?? ""),
              agents_involved: Array.isArray(p.agents_involved) ? p.agents_involved.map((a: any) => String(a)) : [],
            }))
          : [];

        send({
          type: "verdict",
          votes,
          proceedCount,
          stopCount,
          avgConfidence,
          dissents,
          patterns: safePatterns,
          verdict: typeof patternData.verdict === "string" ? patternData.verdict : String(patternData.verdict ?? "Analysis complete"),
          viability: typeof patternData.viability === "number" ? patternData.viability : 5,
          estimatedROI: typeof patternData.estimatedROI === "string" ? patternData.estimatedROI : "N/A",
          keyRisk: typeof patternData.keyRisk === "string" ? patternData.keyRisk : String(patternData.keyRisk ?? ""),
          keyOpportunity: typeof patternData.keyOpportunity === "string" ? patternData.keyOpportunity : String(patternData.keyOpportunity ?? ""),
          skippedRounds,
        });

        // ═══ EVOLUTION DATA — track sentiment arcs ═══
        const evolution = AGENTS.map(agent => ({
          agentId: agent.id,
          name: agent.name,
          color: agent.color,
          arc: transcript
            .filter(t => t.agentId === agent.id)
            .map(t => ({
              round: t.round,
              sentiment: t.sentiment,
              confidence: t.confidence,
              changedMind: t.changedMind,
              failed: t.failed || false,
            })),
        }));

        send({ type: "evolution", agents: evolution });

        // Save to user context
        if (userId) {
          try {
            await supabaseAdmin.from("user_context").insert({
              user_id: userId,
              context_type: "simulation",
              summary: `10x10 Engine: "${scenario.slice(0, 200)}". ${proceedCount} PROCEED, ${stopCount} STOP. Viability: ${patternData.viability}/10. ${transcript.length} interactions.${skippedRounds.length > 0 ? ` Skipped rounds: ${skippedRounds.join(",")}` : ""}`,
              key_insights: [
                `Verdict: ${proceedCount > stopCount ? "PROCEED" : "STOP"} (${proceedCount}/${stopCount})`,
                `Viability: ${patternData.viability}/10`,
                `Confidence: ${avgConfidence}/10`,
                `ROI: ${patternData.estimatedROI}`,
                ...(dissents.slice(0, 3).map(d => `Dissent (${d.agent}): ${d.note?.slice(0, 80)}`)),
              ],
              metadata: { scenario: scenario.slice(0, 100), engine: "10x10", skippedRounds },
            });
          } catch {}
        }

        const totalFailed = transcript.filter(t => t.failed).length;
        send({
          type: "done",
          totalCalls: transcript.length + roundSummaries.length + 1,
          totalAgents: AGENTS.length,
          totalRounds: 10,
          skippedRounds,
          totalFailed,
        });

      } catch (err: any) {
        send({
          type: "error",
          error: err.message || "Engine error",
          recoverable: false,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
