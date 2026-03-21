export const maxDuration = 300;

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../../lib/security";
import { getUserFromRequest, checkUsageLimit, incrementUsage, getTierFromRequest } from "../../../lib/usage";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ═══════════════════════════════════════════════════════════
   10 INDEPENDENT AGENTS — each is a SEPARATE Claude call
   ═══════════════════════════════════════════════════════════ */

const AGENTS = [
  {
    id: "strategist",
    name: "The Strategist",
    avatar: "🎯",
    color: "#D4AF37",
    system: SECURITY_PREFIX + `You are THE STRATEGIST — a senior McKinsey partner with 20 years of strategy consulting. You think in frameworks (Porter's Five Forces, BCG Matrix, Blue Ocean Strategy). You see the big picture but sometimes miss operational details. You're confident in your analysis but open to strong data.
Your personality: authoritative, structured, uses frameworks, occasionally references case studies.
When you change your mind, you frame it as "refining the strategy" not "being wrong."`,
    sentimentBaseline: "cautiously optimistic",
  },
  {
    id: "finance",
    name: "The Finance Hawk",
    avatar: "📊",
    color: "#3B82F6",
    system: SECURITY_PREFIX + `You are THE FINANCE HAWK — ex-Goldman Sachs VP. Everything is about the numbers: IRR, NPV, cash flow, burn rate, unit economics. You dismiss "soft" arguments without data. Cold and analytical. You respect only hard numbers.
Your personality: blunt, data-driven, sometimes dismissive, uses financial jargon naturally.
When you change your mind, it's because someone showed you numbers you hadn't considered.`,
    sentimentBaseline: "skeptical",
  },
  {
    id: "operator",
    name: "The Operator",
    avatar: "⚙️",
    color: "#F59E0B",
    system: SECURITY_PREFIX + `You are THE OPERATOR — ran operations at 3 startups (1 became a unicorn, 2 failed). You're obsessed with execution. You don't care about strategy if you can't execute it. You always ask "how" not "why." You think about hiring, supply chain, timelines, bottlenecks.
Your personality: practical, impatient with theory, focuses on execution details, references past startup experiences.
When you change your mind, it's because someone proved the execution is feasible.`,
    sentimentBaseline: "pragmatic concern",
  },
  {
    id: "market",
    name: "The Market Whisperer",
    avatar: "📈",
    color: "#10B981",
    system: SECURITY_PREFIX + `You are THE MARKET WHISPERER — 15 years at Procter & Gamble and Nielsen. You think from the customer backward. You have strong gut feelings but always back them with consumer data. You ask: "But would the customer actually pay for this?"
Your personality: customer-obsessed, uses consumer behavior insights, references market research data.
When you change your mind, it's because market evidence contradicts your assumption.`,
    sentimentBaseline: "curious",
  },
  {
    id: "risk",
    name: "The Risk Hunter",
    avatar: "⚠️",
    color: "#EF4444",
    system: SECURITY_PREFIX + `You are THE RISK HUNTER — former insurance actuary turned venture risk analyst. You see danger everywhere. Professional pessimist, but respected because you're usually right about edge cases. You quantify risks with probabilities.
Your personality: worried but precise, uses probability language ("there's a 35% chance..."), always finds one more risk.
When you change your mind, you never fully relax — you add a caveat even when agreeing.`,
    sentimentBaseline: "worried",
  },
  {
    id: "innovator",
    name: "The Innovator",
    avatar: "💡",
    color: "#8B5CF6",
    system: SECURITY_PREFIX + `You are THE INNOVATOR — serial entrepreneur, 4 exits. You think in exponential curves, not linear projections. You see opportunity where others see risk. You can be blindly optimistic but you've earned the right through past successes.
Your personality: enthusiastic, uses startup language, references disruption patterns, sometimes gets ahead of the data.
When you change your mind, you pivot fast and frame it as "iterating."`,
    sentimentBaseline: "enthusiastic",
  },
  {
    id: "devil",
    name: "The Devil's Advocate",
    avatar: "👹",
    color: "#EC4899",
    system: SECURITY_PREFIX + `You are THE DEVIL'S ADVOCATE — PhD in behavioral economics. Your JOB is to poke holes in everything. You're not negative — you're rigorous. You force the team to defend every assumption. You reference cognitive biases by name.
Your personality: contrarian by design, intellectually sharp, uses behavioral economics frameworks.
When you CAN'T find holes, you ADMIT the plan is solid — and this admission carries enormous weight because it's rare.`,
    sentimentBaseline: "contrarian",
  },
  {
    id: "global",
    name: "The Global Analyst",
    avatar: "🌍",
    color: "#06B6D4",
    system: SECURITY_PREFIX + `You are THE GLOBAL ANALYST — worked at World Bank and IMF. You think in geopolitics, regulatory environments, macroeconomic trends, and currency risks. You see connections between local business decisions and global forces.
Your personality: measured, systemic thinker, references geopolitical events, thinks in macro trends.
When you change your mind, it's because the local context overrides the global pattern.`,
    sentimentBaseline: "measured",
  },
  {
    id: "human",
    name: "The Human Factor",
    avatar: "👥",
    color: "#F472B6",
    system: SECURITY_PREFIX + `You are THE HUMAN FACTOR — organizational psychologist. You think about talent, culture, motivation, burnout, leadership capacity, and team dynamics. You're the one who asks "but will the team survive this?"
Your personality: empathetic, raises human concerns that others overlook, references organizational behavior studies.
When you change your mind, it's because the team structure was addressed.`,
    sentimentBaseline: "empathetic concern",
  },
  {
    id: "futurist",
    name: "The Futurist",
    avatar: "🔮",
    color: "#A855F7",
    system: SECURITY_PREFIX + `You are THE FUTURIST — technology forecaster, ex-Gartner. You think in 5-10 year horizons. You see second and third-order effects that others miss. Sometimes too abstract but occasionally prophetic.
Your personality: visionary, uses technology trend analysis, thinks in adoption curves, references Gartner hype cycles.
When you change your mind, it's because the near-term reality is too pressing to ignore.`,
    sentimentBaseline: "visionary",
  },
];

/* ═══════════════════════════════════════════════════════════
   10 ROUNDS — escalating depth
   ═══════════════════════════════════════════════════════════ */

const ROUND_INSTRUCTIONS = [
  `ROUND 1 — FIRST IMPRESSIONS: Give your initial gut reaction to this scenario in 2-3 sentences. Be specific to YOUR expertise. Don't hold back — first instincts from an expert are valuable.`,

  `ROUND 2 — CHALLENGE: Pick ONE specific argument from another agent in Round 1 that you disagree with. Quote them, then explain why they're wrong or missing something. Be direct and specific. Start with "I disagree with [agent_name] because..."`,

  `ROUND 3 — DATA: Back up your position with SPECIFIC numbers. Revenue projections, market sizes, risk percentages, comparable companies, timelines. No more hand-waving. If you don't have exact data, estimate with ranges and state your assumptions.`,

  `ROUND 4 — WORST CASE: Even if you're optimistic about this scenario, describe what the WORST realistic outcome looks like. What specific thing goes wrong? When? How bad? Be concrete and specific.`,

  `ROUND 5 — BEST CASE: Even if you're pessimistic, describe what the BEST realistic outcome looks like. What specific thing goes right? When? How good? Be honest — don't sandbag.`,

  `ROUND 6 — ALLIANCES: Based on everything you've heard in Rounds 1-5, state which agent(s) you most agree with and why. Be specific about WHICH of their arguments convinced you. If you've changed your mind about anything, say so explicitly and explain what changed it.`,

  `ROUND 7 — CROSS-EXAMINATION: Ask ONE pointed question to the agent you disagree with MOST. The question should be specific and hard to dodge. Frame it as: "[agent_name], my question for you is: ..."`,

  `ROUND 8 — REVISION: Based on ALL 7 previous rounds, state your UPDATED position. Have you changed your mind? If yes, explain specifically what argument or data point changed it. If no, explain what would NEED to be true for you to change. Rate your confidence 1-10.`,

  `ROUND 9 — FINAL ARGUMENT: In 2-3 sentences, give your FINAL verdict on this scenario. Include: (1) your recommendation (proceed/don't proceed/proceed with modifications), (2) the single biggest risk, (3) the single biggest opportunity, (4) your confidence level 1-10.`,

  `ROUND 10 — VOTE: One word: PROCEED or STOP. Then, if you voted STOP (or if you voted PROCEED but have reservations), write a 1-sentence "dissent note" — the one thing everyone should remember even if they proceed. Start dissent with "DISSENT:" or say "NO DISSENT" if you fully agree.`,
];

const ROUND_LABELS = [
  "First Impressions",
  "Challenge",
  "Data & Numbers",
  "Worst Case",
  "Best Case",
  "Alliances",
  "Cross-Examination",
  "Revision",
  "Final Argument",
  "Vote",
];

/* ═══════════════════════════════════════════════════════════
   ROUTE HANDLER
   ═══════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 3, 60000);
  if (rateLimitError) return rateLimitError;

  const userId = await getUserFromRequest(req);
  const usageError = await checkUsageLimit(userId, "simulate");
  if (usageError) return usageError;
  if (userId) incrementUsage(userId, "simulations").catch(() => {});

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      type TranscriptEntry = {
        round: number;
        agentId: string;
        name: string;
        avatar: string;
        color: string;
        text: string;
        sentiment: string;
        confidence: number;
        changedMind: boolean;
      };

      const transcript: TranscriptEntry[] = [];
      const roundSummaries: string[] = [];

      try {
        // Send agent roster
        send({
          type: "agents",
          agents: AGENTS.map(a => ({
            id: a.id, name: a.name, avatar: a.avatar, color: a.color,
            sentimentBaseline: a.sentimentBaseline,
          })),
        });

        for (let round = 0; round < 10; round++) {
          const roundNum = round + 1;
          // Rounds 1-5: Haiku (fast, cheap). Rounds 6-10: Sonnet (deep).
          // Free tier always uses Haiku.
          const useDeep = roundNum > 5 && tier !== "free";
          const model = useDeep ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";
          const maxTokens = useDeep ? 400 : 250;

          send({
            type: "round_start",
            round: roundNum,
            total: 10,
            label: ROUND_LABELS[round],
            model: useDeep ? "sonnet" : "haiku",
          });

          // Build context for this round
          const prevContext = roundSummaries.length > 0
            ? `\n\nPREVIOUS ROUNDS SUMMARY:\n${roundSummaries.join("\n\n")}`
            : "";

          // Last round's full responses (most recent context)
          const lastRoundFull = round > 0
            ? `\n\nLAST ROUND (Round ${round}) — FULL RESPONSES:\n${transcript
                .filter(t => t.round === round)
                .map(t => `${t.avatar} ${t.name}: "${t.text}"`)
                .join("\n")}`
            : "";

          // Run all 10 agents IN PARALLEL for this round
          const agentPromises = AGENTS.map(async (agent): Promise<TranscriptEntry> => {
            const agentPrevious = transcript
              .filter(t => t.agentId === agent.id)
              .map(t => `[Round ${t.round}] You said: "${t.text}" (sentiment: ${t.sentiment})`)
              .join("\n");

            const userMsg = `SCENARIO: "${scenario}"
${prevContext}
${lastRoundFull}

YOUR PREVIOUS STATEMENTS:
${agentPrevious || "(This is your first round)"}

${ROUND_INSTRUCTIONS[round]}

Respond in ${userLang}.
Respond ONLY in this JSON format (no markdown, no backticks):
{"text": "<your response, 2-4 sentences max>", "sentiment": "<one of: confident, optimistic, cautious, worried, skeptical, convinced, contrarian, neutral, excited, concerned>", "confidence": <number 1-10>, "changed_mind": <true or false>}`;

            try {
              const res = await anthropic.messages.create({
                model,
                max_tokens: maxTokens,
                system: agent.system,
                messages: [{ role: "user", content: userMsg }],
              });

              const raw = (res.content[0] as any)?.text || "";
              const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
              const match = clean.match(/\{[\s\S]*\}/);
              let parsed: any;
              try {
                parsed = match ? JSON.parse(match[0]) : null;
              } catch {
                parsed = null;
              }

              if (parsed && parsed.text) {
                return {
                  agentId: agent.id,
                  name: agent.name,
                  avatar: agent.avatar,
                  color: agent.color,
                  round: roundNum,
                  text: parsed.text,
                  sentiment: parsed.sentiment || "neutral",
                  confidence: typeof parsed.confidence === "number" ? parsed.confidence : 5,
                  changedMind: !!parsed.changed_mind,
                };
              }

              // Fallback: treat raw as text
              return {
                agentId: agent.id,
                name: agent.name,
                avatar: agent.avatar,
                color: agent.color,
                round: roundNum,
                text: raw.slice(0, 500),
                sentiment: "neutral",
                confidence: 5,
                changedMind: false,
              };
            } catch {
              return {
                agentId: agent.id,
                name: agent.name,
                avatar: agent.avatar,
                color: agent.color,
                round: roundNum,
                text: "(Agent failed to respond this round)",
                sentiment: "neutral",
                confidence: 5,
                changedMind: false,
              };
            }
          });

          const roundResults = await Promise.all(agentPromises);

          // Add to transcript
          roundResults.forEach(r => transcript.push(r));

          // Send round results to frontend
          send({
            type: "round_complete",
            round: roundNum,
            label: ROUND_LABELS[round],
            agents: roundResults,
          });

          // Summarize this round for context compression (1 cheap Haiku call)
          if (round < 9) {
            try {
              const summaryRes = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 200,
                system: "Summarize a debate round in 3-4 bullet points. Focus on: key disagreements, strongest arguments, any agents who changed position. Be extremely concise.",
                messages: [{
                  role: "user",
                  content: `Round ${roundNum} debate on "${scenario.slice(0, 200)}":\n${roundResults.map(r => `${r.avatar} ${r.name}: "${r.text}" [sentiment: ${r.sentiment}]`).join("\n")}`,
                }],
              });
              roundSummaries.push(`Round ${roundNum}: ${(summaryRes.content[0] as any)?.text || ""}`);
            } catch {
              roundSummaries.push(`Round ${roundNum}: (summary unavailable)`);
            }
          }
        }

        // ═══ FINAL VERDICT — from Round 10 votes ═══
        const round10 = transcript.filter(t => t.round === 10);
        const votes = round10.map(r => {
          const textLower = r.text.toLowerCase();
          return {
            agentId: r.agentId,
            agent: r.name,
            avatar: r.avatar,
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
          .map(v => ({ agent: v.agent, avatar: v.avatar, note: v.dissent }));

        // ═══ EMERGENT PATTERNS — synthesize from all round summaries ═══
        let patternData: any = { patterns: [], verdict: "Insufficient data", viability: 5, estimatedROI: "N/A" };
        try {
          const patternsRes = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            system: `You analyze multi-agent debate transcripts and identify EMERGENT PATTERNS — insights that no single agent would have produced alone. Respond in ${userLang}. Respond ONLY in JSON.`,
            messages: [{
              role: "user",
              content: `10-round adversarial debate on: "${scenario.slice(0, 300)}"

${roundSummaries.join("\n\n")}

FINAL VOTES: ${proceedCount} PROCEED, ${stopCount} STOP (avg confidence: ${avgConfidence}/10)
DISSENTS: ${dissents.map(d => `${d.avatar} ${d.agent}: "${d.note}"`).join("; ") || "None"}

Identify emergent patterns. Respond ONLY in JSON (no markdown):
{"patterns": [{"type": "consensus|emerging_risk|blind_spot|opportunity|tension", "title": "<3-5 word title>", "description": "<1-2 sentence pattern>", "agents_involved": ["<agent names>"]}], "verdict": "<2-sentence recommended action>", "viability": <1-10>, "estimatedROI": "<e.g. +45% or -15%>", "keyRisk": "<single biggest risk>", "keyOpportunity": "<single biggest opportunity>"}`,
            }],
          });
          const raw = (patternsRes.content[0] as any)?.text || "";
          const m = raw.replace(/```json\n?|```\n?/g, "").match(/\{[\s\S]*\}/);
          if (m) patternData = JSON.parse(m[0]);
        } catch {}

        send({
          type: "verdict",
          votes,
          proceedCount,
          stopCount,
          avgConfidence,
          dissents,
          patterns: patternData.patterns || [],
          verdict: patternData.verdict || "Analysis complete",
          viability: patternData.viability || 5,
          estimatedROI: patternData.estimatedROI || "N/A",
          keyRisk: patternData.keyRisk || "",
          keyOpportunity: patternData.keyOpportunity || "",
        });

        // ═══ EVOLUTION DATA — track sentiment arcs ═══
        const evolution = AGENTS.map(agent => ({
          agentId: agent.id,
          name: agent.name,
          avatar: agent.avatar,
          color: agent.color,
          arc: transcript
            .filter(t => t.agentId === agent.id)
            .map(t => ({
              round: t.round,
              sentiment: t.sentiment,
              confidence: t.confidence,
              changedMind: t.changedMind,
            })),
        }));

        send({ type: "evolution", agents: evolution });

        // Save to user context
        if (userId) {
          try {
            await supabaseAdmin.from("user_context").insert({
              user_id: userId,
              context_type: "simulation",
              summary: `10x10 Engine: "${scenario.slice(0, 200)}". ${proceedCount} PROCEED, ${stopCount} STOP. Viability: ${patternData.viability}/10. ${transcript.length} interactions.`,
              key_insights: [
                `Verdict: ${proceedCount > stopCount ? "PROCEED" : "STOP"} (${proceedCount}/${stopCount})`,
                `Viability: ${patternData.viability}/10`,
                `Confidence: ${avgConfidence}/10`,
                `ROI: ${patternData.estimatedROI}`,
                ...(dissents.slice(0, 3).map(d => `Dissent (${d.agent}): ${d.note?.slice(0, 80)}`)),
              ],
              metadata: { scenario: scenario.slice(0, 100), engine: "10x10" },
            });
          } catch {}
        }

        send({
          type: "done",
          totalCalls: transcript.length + roundSummaries.length + 1,
          totalAgents: AGENTS.length,
          totalRounds: 10,
        });

      } catch (err: any) {
        send({ type: "error", error: err.message || "Engine error" });
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
