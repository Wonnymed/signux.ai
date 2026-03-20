import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";
import { getTierFromRequest } from "../../lib/usage";
import { getModelsForTier } from "../../lib/models";
import { getKnowledgeForMode } from "../../lib/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CHAT_KB = getKnowledgeForMode("chat");

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const { context, persona, messages, action, debrief_notes, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  const models = getModelsForTier(await getTierFromRequest(req));

  /* ═══ INTEL — Research the other party ═══ */
  if (action === "intel") {
    try {
      const response = await client.messages.create({
        model: models.negotiate,
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
        system: SECURITY_PREFIX + CHAT_KB + `\n\nYou are Signux Negotiation Intel — a pre-negotiation intelligence engine. Research the counterparty and prepare a tactical briefing.

Apply these frameworks:
- BATNA analysis: what's the best alternative for each side?
- ZOPA estimation: where do interests overlap?
- Power balance: who needs this deal more?
- Deception detection: what might they misrepresent?
- Information asymmetry: what do they know that you don't?

Return ONLY valid JSON:
{
  "counterparty_profile": "Who they are, their position, known track record",
  "batna_analysis": {
    "your_batna": "Your best alternative if this fails",
    "their_batna": "Their likely best alternative",
    "who_needs_it_more": "you|them|equal"
  },
  "zopa": {
    "your_range": "Your acceptable range",
    "their_likely_range": "Their probable range",
    "overlap": "Where interests overlap"
  },
  "power_balance": {
    "your_leverage": ["point 1", "point 2"],
    "their_leverage": ["point 1", "point 2"],
    "balance": "favorable|neutral|unfavorable"
  },
  "intel_flags": [
    { "flag": "something to watch for", "severity": "HIGH|MEDIUM|LOW", "source": "where you found this" }
  ],
  "recommended_approach": "2-3 sentence tactical recommendation",
  "opening_anchor": "The specific number or term you should open with and why"
}

CITATION FORMAT:
For every significant finding or claim, cite the source inline:
- [KB: negotiation-strategy] for knowledge base insights
- [framework: BATNA/ZOPA/game-theory] for analytical frameworks
- [web: source] for web-verified data

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
        messages: [{ role: "user", content: `Negotiation context: ${context}\n\nResearch the other party and prepare intel. Respond in ${lang || "en"}.` }],
      });
      const text = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      let intel;
      try { intel = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { intel = { counterparty_profile: text, batna_analysis: {}, zopa: {}, power_balance: {}, intel_flags: [], recommended_approach: "", opening_anchor: "" }; }
      return NextResponse.json({ intel });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Intel failed" }, { status: 500 });
    }
  }

  /* ═══ STRATEGY — Build negotiation plan ═══ */
  if (action === "strategy") {
    try {
      const response = await client.messages.create({
        model: models.negotiate,
        max_tokens: 2000,
        system: SECURITY_PREFIX + CHAT_KB + `\n\nYou are Signux Strategy Engine — build a complete negotiation strategy using game theory, mechanism design, and behavioral psychology.

Return ONLY valid JSON:
{
  "anchoring": {
    "your_anchor": "The specific opening position",
    "justification": "Why this anchor works",
    "their_likely_counter": "What they'll probably counter with"
  },
  "concession_plan": [
    { "order": 1, "concession": "First thing to give up", "value_to_you": "LOW", "value_to_them": "HIGH", "condition": "Only if they give X" }
  ],
  "walk_away": {
    "number": "Your absolute floor/ceiling",
    "signal": "How to signal you're near the limit",
    "exit_phrase": "What to say when walking away"
  },
  "framing": {
    "their_frame": "How they'll try to frame the negotiation",
    "your_reframe": "How to reframe it in your favor"
  },
  "escalation_plan": [
    { "stage": 1, "tactic": "Open friendly, establish rapport", "if_blocked": "What to do" },
    { "stage": 2, "tactic": "Present anchor with justification", "if_blocked": "What to do" },
    { "stage": 3, "tactic": "Explore interests behind positions", "if_blocked": "What to do" }
  ],
  "psychological_tactics": ["tactic 1", "tactic 2"],
  "questions_to_ask": ["question that reveals information", "question that creates pressure"],
  "phrases_to_use": ["exact phrase for key moments"],
  "things_to_avoid": ["common mistake in this situation"]
}

CITATION FORMAT:
For every significant finding or claim, cite the source inline:
- [KB: negotiation-strategy] for knowledge base insights
- [framework: game-theory/mechanism-design/behavioral-psychology] for analytical frameworks
- [web: source] for web-verified data

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
        messages: [{ role: "user", content: `Negotiation context: ${context}\n\nBuild complete strategy. Respond in ${lang || "en"}.` }],
      });
      const text = (response.content[0] as any).text || "{}";
      let strategy;
      try { strategy = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { strategy = { error: "Could not parse strategy", raw: text }; }
      return NextResponse.json({ strategy });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Strategy failed" }, { status: 500 });
    }
  }

  /* ═══ SETUP — Create persona (existing) ═══ */
  if (action === "setup") {
    const response = await client.messages.create({
      model: models.negotiate,
      max_tokens: 500,
      system: SECURITY_PREFIX + "Based on the negotiation context, create a realistic persona for the other party. Return ONLY valid JSON: { \"name\": \"...\", \"role\": \"...\", \"personality\": \"...\", \"goals\": [\"...\"], \"pushback_points\": [\"...\"], \"negotiation_style\": \"...\" }",
      messages: [{ role: "user", content: `Context: ${context}. Create the persona. Respond in ${lang || "en"}.` }],
    });
    const text = (response.content[0] as any).text || "{}";
    let personaData;
    try { personaData = JSON.parse(text.replace(/```json|```/g, "").trim()); }
    catch { personaData = { name: "Counterpart", role: "Decision maker", personality: "professional", goals: ["Get the best deal"], pushback_points: ["Price"], negotiation_style: "firm but fair" }; }
    return NextResponse.json({ persona: personaData });
  }

  /* ═══ RESPOND — In-character response (existing) ═══ */
  if (action === "respond") {
    const stream = client.messages.stream({
      model: models.negotiate,
      max_tokens: 500,
      system: SECURITY_PREFIX + `You are ${persona.name}, ${persona.role}. Personality: ${persona.personality}. Your goals: ${persona.goals?.join(", ")}. Your pushback points: ${persona.pushback_points?.join(", ")}. Negotiation style: ${persona.negotiation_style}.

CONTEXT: ${context}

You are IN CHARACTER. Respond as this person would in a real negotiation.
- Be realistic, not easy
- Push back on weak arguments
- Ask tough questions
- Don't agree to everything — make them work for it
- If their offer is genuinely good, acknowledge it but negotiate for more
- Keep responses to 2-4 sentences (this is a conversation, not a monologue)
- Respond in ${lang || "en"}`,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && (event.delta as any).type === "text_delta") {
              controller.enqueue(encoder.encode((event.delta as any).text));
            }
          }
        } catch {}
        controller.close();
      },
    });
    return new NextResponse(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  /* ═══ FEEDBACK — Coaching feedback (existing) ═══ */
  if (action === "feedback") {
    const response = await client.messages.create({
      model: models.negotiate,
      max_tokens: 1500,
      system: SECURITY_PREFIX + `You are an expert negotiation coach. Analyze the practice negotiation and give SPECIFIC, ACTIONABLE feedback. Respond in ${lang || "en"}.`,
      messages: [{
        role: "user",
        content: `CONTEXT: ${context}
PERSONA: ${JSON.stringify(persona)}

CONVERSATION:
${messages.map((m: any) => `${m.role === "user" ? "USER" : persona.name}: ${m.content}`).join("\n\n")}

Give feedback in this format:

## Overall Score: X/10

## What you did well
- (specific moment with quote)
- (specific moment with quote)

## What needs work
- (specific weakness with example of what to say instead)
- (specific weakness with alternative approach)

## 3 Questions they'll likely ask that you didn't practice
1. (specific question)
2. (specific question)
3. (specific question)

## Your optimal opening for the real meeting
(Write the exact words they should say to start strong)`,
      }],
    });
    const feedback = (response.content[0] as any).text || "";
    return NextResponse.json({ feedback });
  }

  /* ═══ DEBRIEF — Post-negotiation analysis ═══ */
  if (action === "debrief") {
    try {
      const response = await client.messages.create({
        model: models.negotiate,
        max_tokens: 2000,
        system: SECURITY_PREFIX + CHAT_KB + `\n\nYou are Signux Debrief Analyst. The user just completed a real negotiation and is reporting back. Analyze their performance honestly.

Return ONLY valid JSON:
{
  "performance_score": 7,
  "wins": ["specific thing they did well"],
  "losses": ["specific thing they could have done better"],
  "missed_opportunities": ["what they should have asked or proposed"],
  "counterparty_tactics": ["tactics the other side used"],
  "lessons": ["lesson 1 for next time", "lesson 2"],
  "next_steps": ["what to do now post-negotiation"],
  "verdict": "2-3 sentence honest assessment of the outcome"
}

RULES:
- performance_score 1-10 (most negotiations are 5-7, don't inflate)
- Be BRUTALLY specific — quote their words when possible
- Identify counterparty tactics even if the user didn't notice them
- Focus on actionable lessons, not generic advice

CITATION FORMAT:
For every significant finding or claim, cite the source inline:
- [KB: negotiation-analysis] for knowledge base insights
- [framework: BATNA/game-theory/behavioral-psychology] for analytical frameworks
- [web: source] for web-verified data

<!-- signux_sentiment: {"signal": "bullish|bearish|neutral|mixed", "confidence": 0.XX, "reason": "1-sentence explanation"} -->

<!-- signux_sources: [{"title": "Source name", "type": "web|kb|framework|data", "relevance": "1-sentence"}] -->

<!-- signux_followups: [{"question": "Follow-up question", "why": "Why this matters"}] -->`,
        messages: [{ role: "user", content: `ORIGINAL CONTEXT: ${context}\n\nWHAT HAPPENED:\n${debrief_notes}\n\nAnalyze my negotiation. Respond in ${lang || "en"}.` }],
      });
      const text = (response.content[0] as any).text || "{}";
      let debrief;
      try { debrief = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { debrief = { performance_score: 5, wins: [], losses: [], missed_opportunities: [], counterparty_tactics: [], lessons: [], next_steps: [], verdict: text }; }
      return NextResponse.json({ debrief });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Debrief failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
