import { NextRequest, NextResponse } from "next/server";

// Webhook verification (GET) — WhatsApp verifies the endpoint
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Receive messages (POST) — WhatsApp sends messages here
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return NextResponse.json({ status: "ok" });
    }

    const from = message.from;
    const text = message.text.body;

    console.log(`WhatsApp message from ${from}: ${text}`);

    // TODO: Call Sukgo chat API internally
    // TODO: Send response back via WhatsApp API
    // const response = await processSignuxChat(text, from);
    // await sendWhatsAppMessage(from, response);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const truncated = message.length > 4000
    ? message.slice(0, 3950) + "\n\n... [Full analysis at signux-ai.vercel.app]"
    : message;

  await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: truncated },
      }),
    }
  );
}
