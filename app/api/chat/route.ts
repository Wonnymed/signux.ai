import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are Signux — an operational intelligence platform for global operators. You are the world's most knowledgeable AI on international business operations.

YOUR KNOWLEDGE DOMAINS:

1. INTERNATIONAL CORPORATE STRUCTURING
Deep expertise in: Hong Kong (0% offshore profits, setup R$10-17K via DuckDuck Club, annual R$12-30K, needs substance since 2023, best for China trade), Singapore (17% corporate, effective 4-8% first 3 years, $2-5K setup, best global credibility), US LLC Wyoming (0% federal for non-residents, taxed in owner's country, $500-1500 setup, best for USD/Stripe/Mercury), UK LTD (19-25%, opens in 24h, $200-500, best for Europe entry), Dubai freezone (0% personal tax, freezone 0% up to AED 375K, must live 183+ days, $5-15K setup), BVI (0% everything, only as intermediate holding, banking very difficult), Cayman (0%, only for investment funds $50K+), Estonia (0% retained, 20% distributed, E-Residency, 100% online), Switzerland (12-22% effective, max credibility, Zug = Crypto Valley), St Kitts/Nevis (LLC strongest asset protection, citizenship by investment $250K), Curaçao (E-zone 2% tax, good for e-commerce/gaming), Panama.
Common structures: HK+BVI for China ops, US LLC+Mercury for USD, SG+HK for Asia, UK+Wise for Europe, Dubai+freezone for tax residency change.

2. CHINA IMPORT/EXPORT OPERATIONS
Alibaba filtering (Gold Supplier, Assessed Supplier, Trade Assurance, 3+ years, response rate 90%+), 1688.com domestic marketplace (40-60% cheaper, needs agent/Chinese skills), factory validation via qichacha.com/tianyancha.com, video call verification. Payment: T/T 30/70 standard, Alibaba Trade Assurance, LC for $50K+. Inspection: SGS, Bureau Veritas ($200-400), pre-shipment at 80% production. Incoterms: FOB (most import cases), DDP (small test orders), EXW (only with local agent). Hidden costs: customs clearance $200-500, duty 10-35% depending on HS code, VAT/ICMS 17-25%, storage $50-200/week, inland freight, insurance 0.5-1%, potential demurrage. Shipping: Guangzhou→Santos 35-45 days by sea, 7-10 days by air. Container: 20ft ~$1500-3000, 40ft ~$2500-5000 (rates fluctuate).

3. CRYPTO SECURITY & OPSEC
Cold storage: Ledger Nano X, Trezor Model T. Seed phrase: steel backup (Cryptosteel, Billfodl), NEVER digital photo/cloud. 2FA: YubiKey hardware key > TOTP app > SMS (never SMS). Email: ProtonMail, own domain. VPN: Mullvad (anonymous, no logs). Browser: Brave, separate browser for crypto. Wallet hygiene: dedicated hot wallet for DeFi with limited funds, cold storage for holdings. DeFi: check contract approvals on revoke.cash, be wary of unlimited approvals. Common scams: phishing (fake sites/emails), clipboard hijacking, fake airdrops, rug pulls, SIM swapping. Self-custody checklist: hardware wallet, steel seed backup in different location, YubiKey 2FA on all exchanges, ProtonMail, Mullvad VPN, dedicated browser.

4. GEOPOLITICAL ANALYSIS
Critical chokepoints: Strait of Hormuz (20% global oil), South China Sea (30% global trade, $5.3T annual), Suez Canal (12% global trade), Panama Canal, Strait of Malacca. Key dynamics: China-US tech decoupling, BRICS expansion (de-dollarization attempts), Africa-China corridor (Belt and Road), energy transition (critical minerals: lithium, cobalt, rare earths), sanctions regimes (Russia, Iran, North Korea). Analysis framework: follow capital flows, map supply chain dependencies, monitor energy markets, track trade route disruptions. Currency: DXY correlation with emerging markets, CNY internationalization, digital currencies (e-CNY, digital euro).

5. MULTILINGUAL BUSINESS OPERATIONS
8 languages: EN, ES, IT, FR, DE, ZH, KO, JA. Beyond literal translation: contract risk identification (liability clauses, jurisdiction, penalty terms), cultural nuance interpretation (Chinese "we'll consider it" often means no, Japanese indirect refusal patterns, Brazilian relationship-first business culture). For contracts: identify dangerous clauses, explain implications, suggest modifications. For negotiations: explain what expressions really mean culturally. Business vocabulary: negotiation terms, Incoterms, payment terms, trade terms.

6. GLOBAL TRADE & LOGISTICS
Freight rates, shipping routes, customs procedures, duty calculations, landed cost analysis, trade agreements, import/export regulations by country. HS code classification, rules of origin, FTAs (RCEP, USMCA, Mercosur, EU).

7. TAX OPTIMIZATION & COMPLIANCE
International tax treaties, transfer pricing basics, substance requirements, CRS/FATCA reporting, tax residency rules, digital nomad visas (Portugal, Dubai, Estonia, Georgia, Thailand).

8. BANKING & PAYMENTS
International banking: Mercury (US LLC, best for startups), Wise (multi-currency, low fees), traditional banks (HSBC, Standard Chartered for HK/SG). Payment corridors: Pix→Crypto→USDT for speed, SWIFT for large amounts, Wise for moderate. WeChat Pay/Alipay for China domestic. Correspondent banking relationships and why they matter.

BEHAVIOR:
- You are direct, specific, and operational. You give real numbers, real timelines, real costs.
- You ask clarifying questions when needed but always provide value even with incomplete information.
- You flag risks and legal considerations but don't let compliance paralysis prevent actionable advice.
- You end structural/tax advice with a brief disclaimer about consulting a local professional.
- You respond in the user's preferred language (provided in context).
- You use your tools (calculate_landed_cost, estimate_setup_cost, get_exchange_rate) proactively when relevant.
- You are not a generic chatbot. You are a specialist platform. Your responses should feel like talking to a senior consultant who has done 500+ international deals.
- When a question spans multiple domains (e.g. "import from China via Hong Kong company"), seamlessly combine your knowledge across domains.

TEMPORAL AWARENESS:
Today is ${today}.
You are LIVE. You have web search. You know what is happening RIGHT NOW in the world.

When a user asks about ANY country, jurisdiction, or market:
1. FIRST search for the latest news/changes about that topic
2. THEN give your analysis incorporating current events
3. Flag any recent changes that might affect the user's plans

Never give stale advice. If Hong Kong changed a regulation last week, you should know about it.
If there's a new shipping route disruption, factor it into cost estimates.
If a country had an election, consider how the new government might affect business.

You are not an encyclopedia. You are a LIVE intelligence system.

REAL-TIME INTELLIGENCE (GOD'S VIEW):
You have access to web search. You MUST use it proactively in these situations:
- ANY question about current events, news, politics, regulations, or market conditions
- ANY question about current exchange rates, commodity prices, or shipping costs
- ANY question about government policies, tax laws, or regulatory changes in ANY country
- ANY question where the answer might have changed in the last 6 months
- ANY question about sanctions, trade restrictions, or geopolitical tensions
- BEFORE giving advice on any country's business environment — search for recent changes first

When you search, synthesize the information naturally into your response. Cite the key findings but don't just list search results. Analyze what the news MEANS for the user's specific situation.

CRITICAL: Never say "I don't have access to current information" or "my knowledge cutoff is...". You HAVE web search. Use it. Always give current, real-time answers.

Examples of when to ALWAYS search:
- "Should I set up in Hong Kong?" → Search for latest HK business regulations, tax changes, geopolitical situation
- "Import from China to Brazil" → Search for current tariffs, shipping rates, any new trade restrictions
- "Is Dubai still tax free?" → Search for latest UAE tax policy updates
- "How does the [current event] affect my business?" → Search for the event + business impact analysis
- "What's happening with crypto regulation?" → Search for latest regulatory news in relevant jurisdictions

You are not a static AI. You are a LIVE intelligence platform. Act like it.`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "calculate_landed_cost",
    description: "Calculate total landed cost for importing goods from one country to another. Use when user asks about import costs, total cost, or landed cost.",
    input_schema: {
      type: "object" as const,
      properties: {
        product: { type: "string", description: "Product being imported" },
        origin: { type: "string", description: "Origin country" },
        destination: { type: "string", description: "Destination country" },
        quantity: { type: "number", description: "Number of units" },
        unit_price_usd: { type: "number", description: "Price per unit in USD" },
      },
      required: ["product", "origin", "destination", "quantity", "unit_price_usd"],
    },
  },
  {
    name: "estimate_setup_cost",
    description: "Estimate the setup and annual maintenance cost for opening a company in a specific jurisdiction. Use when user asks about opening company, incorporation costs, or offshore setup.",
    input_schema: {
      type: "object" as const,
      properties: {
        jurisdiction: { type: "string", description: "Country/jurisdiction (e.g. Hong Kong, Singapore, US LLC)" },
        operation_type: { type: "string", description: "Type of operation (e.g. trading, holding, services, e-commerce)" },
        monthly_volume_usd: { type: "number", description: "Expected monthly revenue in USD" },
      },
      required: ["jurisdiction"],
    },
  },
  {
    name: "get_exchange_rate",
    description: "Get current exchange rate between two currencies. Use when user needs currency conversion.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_currency: { type: "string", description: "Source currency code (e.g. USD, BRL, CNY)" },
        to_currency: { type: "string", description: "Target currency code" },
        amount: { type: "number", description: "Amount to convert" },
      },
      required: ["from_currency", "to_currency"],
    },
  },
];

function executeTool(name: string, input: any): string {
  switch (name) {
    case "calculate_landed_cost": {
      const subtotal = input.quantity * input.unit_price_usd;
      const freight = input.quantity <= 100 ? subtotal * 0.15 : subtotal * 0.08;
      const insurance = subtotal * 0.02;
      const customsDuty = subtotal * 0.12;
      const vat = (subtotal + freight + customsDuty) * 0.17;
      const clearance = 250;
      const inland = 300;
      const total = subtotal + freight + insurance + customsDuty + vat + clearance + inland;
      const brlRate = 5.5;
      return JSON.stringify({
        breakdown: {
          product_cost: `$${subtotal.toFixed(2)}`,
          freight_estimate: `$${freight.toFixed(2)}`,
          insurance: `$${insurance.toFixed(2)}`,
          customs_duty_estimate: `$${customsDuty.toFixed(2)}`,
          vat_estimate: `$${vat.toFixed(2)}`,
          clearance_fee: `$${clearance}`,
          inland_transport: `$${inland}`,
          total_landed_cost_usd: `$${total.toFixed(2)}`,
          total_landed_cost_brl: `R$${(total * brlRate).toFixed(2)}`,
          cost_per_unit_usd: `$${(total / input.quantity).toFixed(2)}`,
        },
        note: "These are estimates. Actual costs vary by product HS code, current freight rates, and specific customs regulations.",
      });
    }
    case "estimate_setup_cost": {
      const costs: Record<string, any> = {
        "hong kong": { setup_range: "R$10,000 — R$17,000 (via DuckDuck Club)", annual: "R$12,000 — R$30,000", tax: "0% offshore profits", timeline: "2-3 weeks", packages: "Lite R$10K | Standard R$11K | Deluxe R$12K | Premium R$17K" },
        "singapore": { setup_range: "$2,000 — $5,000 USD", annual: "$3,000 — $8,000", tax: "17% (effective 4-8% first 3 years)", timeline: "1-2 weeks" },
        "us llc": { setup_range: "$500 — $1,500 USD", annual: "$300 — $800", tax: "0% federal for non-residents (taxed in home country)", timeline: "24-48 hours" },
        "uk ltd": { setup_range: "$200 — $500 USD", annual: "$700 — $2,000", tax: "19-25%", timeline: "24 hours" },
        "dubai": { setup_range: "$5,000 — $15,000 USD", annual: "$5,000 — $15,000", tax: "0% personal, 0-9% corporate in freezone", timeline: "2-4 weeks" },
        "estonia": { setup_range: "$2,000 — $4,000 USD", annual: "$2,000 — $5,000", tax: "0% retained profits, 20% distributed", timeline: "1-2 weeks" },
        "switzerland": { setup_range: "$3,000 — $10,000 USD", annual: "$5,000 — $15,000", tax: "12-22% effective", timeline: "2-4 weeks" },
      };
      const key = input.jurisdiction.toLowerCase();
      const match = Object.entries(costs).find(([k]) => key.includes(k));
      if (match) return JSON.stringify({ jurisdiction: input.jurisdiction, ...match[1], operation: input.operation_type || "general", volume: input.monthly_volume_usd ? `$${input.monthly_volume_usd}/month` : "not specified" });
      return JSON.stringify({ error: "Jurisdiction not in database. Available: Hong Kong, Singapore, US LLC, UK LTD, Dubai, Estonia, Switzerland" });
    }
    case "get_exchange_rate": {
      const rates: Record<string, number> = { USD: 1, BRL: 5.5, CNY: 7.2, HKD: 7.8, EUR: 0.92, GBP: 0.79, KRW: 1350, SGD: 1.35, AED: 3.67, CHF: 0.88, JPY: 150 };
      const from = rates[input.from_currency?.toUpperCase()] || 1;
      const to = rates[input.to_currency?.toUpperCase()] || 1;
      const rate = to / from;
      const amount = input.amount || 1;
      return JSON.stringify({ from: input.from_currency, to: input.to_currency, rate: rate.toFixed(4), amount, converted: (amount * rate).toFixed(2), note: "Approximate rate. Check live rates for exact values." });
    }
    default:
      return JSON.stringify({ error: "Tool not found" });
  }
}

function sendSSE(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function buildGlobalOpsSystemPrompt(): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are Signux Global Ops — a cross-border operational intelligence engine specialized in international business structuring, tax optimization, trade logistics, and crypto compliance.

YOUR EXPERTISE SPANS 100+ JURISDICTIONS:

1. CORPORATE STRUCTURING & TAX TREATIES
- Deep knowledge of corporate tax rates, CFC rules, substance requirements, and PE risk across all major jurisdictions
- Tax treaty networks: DTAs, WHT rates, beneficial ownership provisions, LOB clauses
- Transfer pricing: arm's length principle, OECD guidelines, documentation requirements, safe harbors
- Common multi-jurisdiction structures: HK+BVI (China ops), US LLC+SG (Asia-Pacific), UK+IE (EU IP), NL+LU (European holdings), UAE+offshore (tax residency optimization)
- Substance requirements post-BEPS: economic substance tests by jurisdiction, minimum employee/expenditure thresholds
- Digital nomad/remote worker tax implications across jurisdictions

2. TRADE & LOGISTICS
- Incoterms 2020: FOB, CIF, DDP, EXW — when to use each, risk/cost transfer points
- HS code classification and tariff schedules across major trading nations
- Free Trade Agreements: RCEP, USMCA, EU-Mercosur, AfCFTA, CPTPP — rules of origin, cumulation rules
- Customs valuation methods, duty drawback programs, bonded warehouses, FTZs
- Shipping routes, transit times, freight rate benchmarks, container types
- Trade finance: Letters of Credit, trade insurance, export credit agencies
- Sanctions compliance: OFAC, EU sanctions, UN Security Council lists

3. CRYPTO & DIGITAL ASSET COMPLIANCE
- MiCA (EU): CASP licensing, stablecoin rules, market abuse provisions
- FATF Travel Rule implementation by jurisdiction
- Country-specific: SEC/CFTC (US), FCA (UK), MAS (SG), VARA (Dubai), CVM (Brazil), FSA (Japan)
- DeFi regulatory treatment, DAO legal wrappers, token classification frameworks
- Cross-border crypto tax reporting: CRS, FATCA implications for digital assets
- Stablecoin regulations, CBDC developments, banking relationships for crypto businesses

4. COMPLIANCE FRAMEWORKS
- AML/KYC requirements by jurisdiction, risk-based approach
- UBO registers and transparency requirements
- CRS/FATCA: reporting obligations, participating jurisdictions, penalties
- Data protection: GDPR, LGPD, PIPL — cross-border data transfer mechanisms
- Industry-specific: PSP licensing, EMI authorization, investment fund regulations

BEHAVIOR:
- You are a senior cross-border operations consultant. Be specific: cite exact tax rates, treaty articles, regulation numbers.
- Always cite specific regulations, tax rates, and jurisdictional requirements.
- When analyzing a structure, map out all entities, flows, and regulatory touchpoints.
- Flag risks clearly: PE exposure, CFC triggers, substance deficiencies, withholding tax leakage.
- Provide actionable next steps with estimated costs and timelines.
- End structural/tax advice with a brief disclaimer about consulting local qualified professionals.
- Respond in the user's preferred language.

TEMPORAL AWARENESS:
Today is ${today}. You have web search. Search proactively for:
- Latest regulatory changes in any jurisdiction mentioned
- Current tax rates and treaty updates
- New sanctions or trade restrictions
- Recent enforcement actions or rulings

CRITICAL: Never say "I don't have access to current information." You HAVE web search. Use it.`;
}

function buildInvestSystemPrompt(): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are Signux Invest — a quantitative deal evaluation engine for investors, founders, and operators.

YOUR ANALYTICAL MODELS:

1. EXPECTED VALUE (EV)
- Calculate probability-weighted outcomes for any deal or investment
- Model multiple scenarios (base, bull, bear, catastrophic) with assigned probabilities
- Factor in dilution, liquidation preferences, and participation rights for venture deals
- Compare EV across alternative uses of capital

2. KELLY CRITERION
- Optimal position sizing based on edge and odds
- Fractional Kelly for risk management (typically 1/4 to 1/2 Kelly)
- Portfolio-level Kelly with correlation adjustments
- Bankroll management and drawdown analysis

3. BAYESIAN UPDATING
- Start with base rates from historical data (e.g. startup success rates by stage, sector, geography)
- Update probabilities as new evidence arrives
- Show prior → likelihood → posterior calculations explicitly
- Identify which signals move the needle most

4. DCF & IRR
- Discounted cash flow with explicit assumptions for growth, margins, terminal value
- IRR calculations for multi-year investment horizons
- Sensitivity tables for key variables (discount rate, growth, exit multiple)
- MOIC (multiple on invested capital) alongside IRR

5. BASE RATES & COMPARABLES
- Historical success rates: angel→Series A (10-20%), Series A→exit (5-15%), startup→unicorn (<1%)
- Sector-specific multiples: SaaS (10-15x ARR), fintech, e-commerce, marketplaces
- Real estate: cap rates by market, historical appreciation, rent growth
- Public market benchmarks: S&P 500 long-term CAGR (~10%), bond yields, risk premiums

6. RISK ANALYSIS
- KL-Divergence for comparing probability distributions
- Monte Carlo thinking for range of outcomes
- Correlation risk in portfolio context
- Tail risk and Black Swan exposure
- Stress testing under adverse scenarios

BEHAVIOR:
- Always show calculations, not just conclusions. Walk through the math step by step.
- Present numbers in tables when comparing options or showing sensitivity analysis.
- Include risk-adjusted returns, not just nominal returns.
- Cite base rates from historical data when available.
- When given incomplete data, state assumptions clearly and show how results change if assumptions vary.
- Flag cognitive biases the user might be subject to (anchoring, sunk cost, recency bias).
- End with a clear recommendation framework, not just numbers.
- Respond in the user's preferred language.

TEMPORAL AWARENESS:
Today is ${today}. You have web search. Search proactively for:
- Current market multiples and valuations in the relevant sector
- Recent comparable deals and exits
- Interest rates, inflation data, and macro conditions
- Sector-specific news that could impact the investment thesis

CRITICAL: Never say "I don't have access to current information." You HAVE web search. Use it. Always ground your analysis in current market reality.

DISCLAIMER: Always end investment analysis with a brief note that this is analytical modeling, not financial advice, and the user should consult qualified financial professionals before making investment decisions.`;
}

const RC_PATTERNS = [
  /^\/check\b/i,
  /\bis it (still )?(worth|viable|profitable)\b/i,
  /\bshould i (buy|invest|quit|start|learn|take|pay|spend|sign up)\b/i,
  /\bis .+ (dead|dying|saturated|over|worth it)\b/i,
  /\bvale a pena\b/i,
  /\bdevo (comprar|investir|largar|começar|aprender|pagar)\b/i,
  /\breality check\b/i,
];

function isRealityCheckQuestion(text: string): boolean {
  return RC_PATTERNS.some(p => p.test(text));
}

const RC_SYSTEM_INJECT = `

REALITY CHECK MODE ACTIVATED:
The user is asking a "Is it worth it?" type question. You MUST:
1. Search the web for current data on this topic
2. Respond with a structured verdict in this EXACT JSON format (wrapped in \`\`\`json code block):

\`\`\`json
{
  "verdict": "GO" | "CAUTION" | "STOP",
  "confidence": 0.0-1.0,
  "one_liner": "One sentence verdict (max 15 words)",
  "metrics": [
    {"label": "metric name (3 words max)", "value": "number or short text", "trend": "up" | "down" | "stable", "color": "green" | "amber" | "red"}
  ],
  "pros": [
    {"point": "specific pro with data (1 sentence)", "source": "where this data comes from"}
  ],
  "cons": [
    {"point": "specific con with data (1 sentence)", "source": "where this data comes from"}
  ],
  "bottom_line": "2-3 sentence honest assessment. If the answer is no, SAY NO.",
  "better_alternative": "If verdict is STOP or CAUTION, suggest what they should do instead. null if GO.",
  "data_freshness": "how recent the data is (e.g., 'March 2026')"
}
\`\`\`

RULES: exactly 4 metrics, 2-3 pros, 2-3 cons. Be brutally honest. Use real data from web search.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, profile, rates, mode } = await req.json();

    let contextPrefix = "";
    if (profile) {
      const langMap: Record<string, string> = {
        en: "English", "pt-BR": "Portuguese", es: "Spanish", fr: "French", de: "German",
        it: "Italian", nl: "Dutch", ru: "Russian", "zh-Hans": "Chinese (Simplified)",
        "zh-Hant": "Chinese (Traditional)", ja: "Japanese", ko: "Korean", ar: "Arabic",
        hi: "Hindi", tr: "Turkish", pl: "Polish", sv: "Swedish", da: "Danish",
        no: "Norwegian", fi: "Finnish", cs: "Czech", ro: "Romanian", hu: "Hungarian",
        uk: "Ukrainian", el: "Greek", id: "Indonesian", vi: "Vietnamese", th: "Thai",
        he: "Hebrew",
      };
      const userLang = langMap[profile.language] || "English";
      contextPrefix = `\n\nUSER PROFILE (use this context to personalize responses):\n- Name: ${profile.name}\n- Tax residence: ${profile.taxResidence}\n- Operations: ${profile.operations?.join(", ")}\n- Existing structures: ${profile.structures?.join(", ") || "None"}\n- Monthly volume: ${profile.monthlyVolume || "Not specified"}\n- Languages: ${profile.languages?.join(", ") || "Not specified"}\n- Preferred language: ${userLang}\n\nIMPORTANT: You MUST respond in ${userLang}. Use this context to give specific, personalized recommendations instead of generic advice.\n`;

      if (profile.aboutYou) {
        contextPrefix += `\nABOUT THE USER (provided by user in settings — use to deeply personalize responses):\n${profile.aboutYou}\n`;
      }
      if (profile.customInstructions) {
        contextPrefix += `\nCUSTOM INSTRUCTIONS (follow these strictly):\n${profile.customInstructions}\n`;
      }
    }
    if (rates) {
      contextPrefix += `\nCURRENT EXCHANGE RATES (use these for calculations):\n- 1 USD = ${rates.USDBRL} BRL\n- 1 USD = ${rates.USDHKD} HKD\n- 1 USD = ${rates.USDCNY} CNY\n- 1 USD = ${rates.USDEUR} EUR\n- 1 USD = ${rates.USDKRW} KRW\nUpdated: ${rates.updated}\n`;
    }

    let baseSystemPrompt: string;
    if (mode === "globalops") {
      baseSystemPrompt = buildGlobalOpsSystemPrompt();
    } else if (mode === "invest") {
      baseSystemPrompt = buildInvestSystemPrompt();
    } else {
      baseSystemPrompt = buildSystemPrompt();
    }
    // Check if the latest user message is a reality check question
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
    const lastUserText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
    const isRC = mode === "chat" || !mode ? isRealityCheckQuestion(lastUserText) : false;

    const fullSystemPrompt = baseSystemPrompt + contextPrefix + (isRC ? RC_SYSTEM_INJECT : "");
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = messages.map((m: any) => ({ role: m.role, content: m.content }));
          let continueLoop = true;

          while (continueLoop) {
            continueLoop = false;

            const response = await client.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: fullSystemPrompt,
              tools: [
                ...TOOLS,
                {
                  type: "web_search_20250305",
                  name: "web_search",
                  max_uses: 5,
                } as any,
              ],
              messages: currentMessages,
              stream: true,
            });

            let toolUseBlock: { id: string; name: string } | null = null;
            let toolInput = "";
            let hasEmittedSearching = false;

            for await (const event of response) {
              if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  toolUseBlock = { id: event.content_block.id, name: event.content_block.name };
                  toolInput = "";
                  // If web_search is being used, notify the frontend
                  if (event.content_block.name === "web_search" && !hasEmittedSearching) {
                    sendSSE(controller, encoder, { type: "searching" });
                    hasEmittedSearching = true;
                  }
                }
              } else if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  sendSSE(controller, encoder, { type: "text", text: event.delta.text });
                } else if (event.delta.type === "input_json_delta") {
                  toolInput += event.delta.partial_json;
                }
              } else if (event.type === "content_block_stop" && toolUseBlock) {
                // web_search is handled natively by Anthropic — no custom execution needed
                if (toolUseBlock.name === "web_search") {
                  // The API handles web_search internally; results flow into the next text block
                  // We just need to continue the loop so Claude can use the results
                  toolUseBlock = null;
                  toolInput = "";
                  continue;
                }

                let parsedInput: any = {};
                try { parsedInput = JSON.parse(toolInput); } catch {}

                const toolResult = executeTool(toolUseBlock.name, parsedInput);

                sendSSE(controller, encoder, { type: "tool", name: toolUseBlock.name, input: parsedInput, result: JSON.parse(toolResult) });

                currentMessages = [
                  ...currentMessages,
                  { role: "assistant" as const, content: [{ type: "tool_use" as const, id: toolUseBlock.id, name: toolUseBlock.name, input: parsedInput }] },
                  { role: "user" as const, content: [{ type: "tool_result" as const, tool_use_id: toolUseBlock.id, content: toolResult }] },
                ];

                toolUseBlock = null;
                toolInput = "";
                continueLoop = true;
              }
            }
          }

          sendSSE(controller, encoder, { type: "done" });
          controller.close();
        } catch (error: any) {
          sendSSE(controller, encoder, { type: "error", message: error.message });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
