import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { focus_areas, language } = await req.json();

  const langMap: Record<string, string> = {
    en: "English", "pt-BR": "Portuguese", es: "Spanish", fr: "French", de: "German",
    it: "Italian", nl: "Dutch", ru: "Russian", "zh-Hans": "Chinese (Simplified)",
    "zh-Hant": "Chinese (Traditional)", ja: "Japanese", ko: "Korean", ar: "Arabic",
    hi: "Hindi", tr: "Turkish", pl: "Polish", sv: "Swedish", da: "Danish",
    no: "Norwegian", fi: "Finnish", cs: "Czech", ro: "Romanian", hu: "Hungarian",
    uk: "Ukrainian", el: "Greek", id: "Indonesian", vi: "Vietnamese", th: "Thai",
    he: "Hebrew",
  };
  const userLang = langMap[language] || "English";

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const sendSSE = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendSSE({ type: "status", message: "Scanning global sources..." });

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          stream: true,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 10,
            } as any,
          ],
          messages: [{
            role: "user",
            content: `You are Signux Intel — a global intelligence briefing system. Generate today's operational intelligence briefing.

Search for and analyze the MOST IMPORTANT developments TODAY that affect international business operations. Cover ALL of these areas:

## GEOPOLITICAL SHIFTS
- Any government changes, elections, coups, political instability
- New sanctions, trade restrictions, diplomatic developments
- Military conflicts affecting trade routes

## REGULATORY CHANGES
- New tax laws, corporate regulations in major jurisdictions (HK, SG, US, UK, UAE, EU, Brazil, China)
- Crypto regulation updates worldwide
- Trade policy changes, tariff updates

## MARKET MOVEMENTS
- Major currency movements and what's driving them
- Commodity price shifts (oil, gold, key imports/exports)
- Stock market signals relevant to global trade

## SUPPLY CHAIN & LOGISTICS
- Port congestion, shipping rate changes
- Trade route disruptions (Suez, Panama Canal, Red Sea, South China Sea)
- Air freight vs sea freight dynamics

## TECHNOLOGY & CRYPTO
- Major crypto market movements
- New DeFi regulations or exchange actions
- Relevant tech policy (AI regulations, data sovereignty)

## OPPORTUNITIES
- New free trade agreements or corridors opening
- Emerging markets showing growth
- Arbitrage opportunities between markets

For each item:
- What happened (1-2 sentences)
- Why it matters for operators (1-2 sentences)
- Actionable insight (what to do about it)
- Risk level: LOW / MEDIUM / HIGH / CRITICAL

Respond in ${userLang}.
Format in clean markdown. Be specific with numbers, names, dates.
Focus on what happened in the last 24-48 hours.
${focus_areas?.length > 0 ? `The user is particularly interested in: ${focus_areas.join(", ")}` : ""}`
          }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            sendSSE({ type: "text", text: event.delta.text });
          }
        }

        sendSSE({ type: "done", timestamp: new Date().toISOString() });
        controller.close();
      } catch (error: any) {
        sendSSE({ type: "error", message: error.message });
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
