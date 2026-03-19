import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SECURITY_PREFIX, verifyClientToken, applyRateLimit } from "../../lib/security";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { context, persona, messages, action, lang } = await req.json();

  const tokenError = verifyClientToken(req);
  if (tokenError) return tokenError;
  const rateLimitError = applyRateLimit(req, 10, 60000);
  if (rateLimitError) return rateLimitError;

  if (action === "setup") {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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

  if (action === "respond") {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
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

  if (action === "feedback") {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
