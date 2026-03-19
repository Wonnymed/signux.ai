import { NextRequest, NextResponse } from "next/server";

let cachedRates: Record<string, unknown> | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const clientToken = req.headers.get("x-signux-client");
  if (clientToken !== process.env.NEXT_PUBLIC_CLIENT_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedRates);
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    cachedRates = {
      USDBRL: data.rates?.BRL || 5.2,
      USDCNY: data.rates?.CNY || 7.2,
      USDHKD: data.rates?.HKD || 7.8,
      USDEUR: data.rates?.EUR || 0.92,
      USDGBP: data.rates?.GBP || 0.79,
      USDKRW: data.rates?.KRW || 1350,
      USDSGD: data.rates?.SGD || 1.35,
      USDAED: data.rates?.AED || 3.67,
      USDCHF: data.rates?.CHF || 0.88,
      USDJPY: data.rates?.JPY || 150,
      USDINR: data.rates?.INR || 83,
      USDTHB: data.rates?.THB || 35,
      USDMXN: data.rates?.MXN || 17,
      USDCOP: data.rates?.COP || 4000,
      USDARS: data.rates?.ARS || 850,
      USDNGN: data.rates?.NGN || 1500,
      USDZAR: data.rates?.ZAR || 18.5,
      USDTRY: data.rates?.TRY || 32,
      updated: new Date().toISOString(),
    };
    cachedAt = now;
    return NextResponse.json(cachedRates);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
