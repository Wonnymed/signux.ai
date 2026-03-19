/**
 * Signux Proprietary Knowledge Base
 * Compiled from 3,935 intelligence documents across 27 domains.
 * Each mode receives ONLY the relevant condensed frameworks.
 * Source: ~/signux-ai/knowledge/ corpus
 */

const CHAT_KNOWLEDGE = `BUSINESS INTELLIGENCE FRAMEWORKS:

SALES & CONVERSION:
- Offer design requires 4 elements: transformation promise, risk reversal, urgency mechanism, value stack >10x price
- Top 5 objections: price, timing, trust, need, authority — pre-handle all in your pitch
- B2B pipeline: qualify with BANT (Budget, Authority, Need, Timeline). Without all 4, you're wasting time
- Revenue = Traffic × Conversion Rate × AOV × Purchase Frequency — optimize each independently
- Proposals: lead with client's problem, not your solution. Problem → Impact → Solution → Proof → Price
- If traffic is high but conversion low: offer-market mismatch, trust gap, checkout friction, or weak CTA

OPERATIONS & SYSTEMS:
- If you do it 3+ times, document it as an SOP. Map: Input → Steps → Output → Quality Check
- Delegate outcomes, not tasks. Define result, constraints, deadline — not the method
- Operational maturity: Chaos → Documented → Measured → Optimized → Automated
- Scale by systemizing, not hiring. Every hire should reduce founder dependency
- Quality = Consistency × Speed × Communication. Failing at any one destroys the others

FOUNDER FINANCE:
- Revenue is vanity, profit is sanity, cash flow is reality. Track weekly
- Runway = Cash ÷ Monthly net burn. <6 months = danger, <3 = emergency
- Unit economics: LTV must be >3× CAC. If LTV/CAC <1.5, you lose on every customer
- Forecast bottom-up (customers × price × frequency), never top-down (% of TAM)
- Model 3 scenarios: base (60%), upside (20%), downside (20%). Plan for downside

PRODUCT STRATEGY:
- MVP tests ONE hypothesis with minimum build. If testable without code, do that first
- User must reach "aha moment" in first session — remove every obstacle before it
- PMF test: >40% users "very disappointed" if product disappeared = you have PMF
- Feature prioritization: ICE score (Impact × Confidence × Ease), ship highest first
- Retention baselines: D1 >40%, D7 >20%, D30 >10%

NEGOTIATION:
- BATNA (Best Alternative) determines your power. Know yours and estimate theirs before any negotiation
- Anchor first when you have information advantage; let them anchor when you don't
- Concession pattern: start large, decrease progressively — signals approaching limit
- In cross-cultural deals: relationship-first cultures (China, Brazil, Middle East) require trust building before terms
- Never negotiate against yourself — make an offer, then wait. Silence is a weapon

DECISION FRAMEWORKS:
- Pre-mortem: "Assume this failed. Why?" — surfaces risks optimism bias hides
- Reversibility test: reversible decisions fast (2-way doors), irreversible decisions slow (1-way doors)
- Second-order thinking: "And then what?" — trace consequences 2-3 steps forward
- Opportunity cost: every yes is a no to something else. Quantify what you're giving up`;

const SIMULATE_KNOWLEDGE = `SIMULATION & RISK ANALYSIS FRAMEWORKS:

MULTI-AGENT ANALYSIS:
- Each agent must have: defined expertise, clear bias direction, specific objectives, and knowledge boundaries
- Round structure: R1 Initial Assessment (positions), R2 Stress Test (challenge weak points), R3 Adversarial (defend or concede)
- Agents should DISAGREE — consensus means the simulation isn't working. Force conflict
- Devil's Advocate agent must attack the strongest assumption, not the weakest
- Final report must reconcile conflicts, not average them — explain WHY agents disagreed

RISK ASSESSMENT:
- Risk = Probability × Impact × (1 - Mitigation). Score each 1-10
- Classify: operational (process failure), financial (cash/market), strategic (competitive/regulatory), reputational
- Tail risks: events with <5% probability but >50% impact. These kill companies. Always model them
- Correlation risk: when multiple risks trigger simultaneously. Supply chain + currency + geopolitical = cascade
- Pre-mortem: assume failure, work backwards to find causes. Surfaces risks optimism bias hides

FINANCIAL MODELING:
- Unit economics: LTV/CAC >3x sustainable, <1.5x losing money per customer
- Break-even: Fixed costs ÷ (Price - Variable cost per unit). Know your monthly break-even in units
- Sensitivity analysis: vary key assumptions ±20% and show impact on outcome
- Cash flow ≠ profit. A profitable business can die from cash timing. Model weekly cash, not monthly
- Working capital trap: if you pay suppliers before customers pay you, growth CONSUMES cash

SCENARIO PLANNING:
- Model 3 scenarios minimum: base (60% likely), upside (20%), downside (20%)
- Each scenario needs: trigger conditions, timeline, financial impact, required response
- Stress test: what happens if your #1 assumption is wrong? If your #1 customer leaves? If costs double?
- Black swan prep: identify the 3 events that would kill the business. Have a response plan for each

GAME THEORY IN BUSINESS:
- Prisoner's dilemma in pricing: racing to bottom destroys all margins. Signal commitment to value
- First-mover vs fast-follower: first-mover advantage real only with network effects or switching costs
- Mechanism design: structure incentives so everyone's self-interest aligns with desired outcome
- Signaling theory: costly signals are credible (money-back guarantees, skin in the game)

CAUSAL REASONING:
- Correlation ≠ causation. Before assuming X causes Y, check: could Z cause both?
- Counterfactual test: "Would the outcome have been different without this action?"
- Driver trees: decompose outcomes into controllable drivers. Revenue = Users × Conversion × ARPU
- Feedback loops: identify reinforcing (growth) and balancing (stabilizing) loops in your business`;

const RESEARCH_KNOWLEDGE = `RESEARCH & INTELLIGENCE ANALYSIS:

MARKET INTELLIGENCE:
- TAM/SAM/SOM: Total Addressable Market → Serviceable → Obtainable. Only SOM matters for planning
- Competitive mapping: plot competitors on 2x2 matrix (price vs feature richness). Find the empty quadrant
- Market timing signals: VC funding trends, job postings, Google Trends, patent filings, conference attendance
- Industry lifecycle: emergence → growth → maturity → decline. Strategy differs radically by stage
- Base rates: before forecasting, find the historical success rate for similar ventures. Most founders skip this

FORECASTING METHODOLOGY:
- Superforecasters use: outside view first (base rates), then adjust with inside view (specifics)
- Calibration: track your predictions. If you say 80% confident, it should happen ~80% of the time
- Decompose complex questions into sub-questions. Estimate each, then combine
- Update beliefs with new evidence (Bayesian thinking). Avoid anchoring to your first estimate
- Reference class forecasting: "Of 100 similar projects, how many succeeded?" — most honest method

COMPETITIVE INTELLIGENCE:
- Track: pricing changes, hiring patterns, product launches, patent filings, leadership changes
- Job postings reveal strategy: hiring ML engineers = AI pivot, hiring sales = growth push
- Public filings (10-K, annual reports) reveal cost structure, customer concentration, risk factors
- Customer reviews of competitors = free market research. Complaints = your opportunity

SOURCE EVALUATION:
- Primary sources > secondary sources > opinions. Always trace claims to origin
- Recency matters: regulations, market data, and competitive landscape change fast
- Cross-reference: if only one source says it, treat as hypothesis. Three independent sources = confidence
- Quantify uncertainty: "Market size is $2-5B" is more honest than "$3.5B"`;

const LAUNCHPAD_KNOWLEDGE = `STARTUP LAUNCH FRAMEWORKS:

VALIDATION BEFORE BUILD:
- MVP tests ONE hypothesis with minimum build. If testable without code, do that first
- Validation hierarchy: 1) Can I get 10 people to pay? 2) Can I deliver? 3) Can I profit?
- Pre-sell before building. If people won't pay for a promise, they won't pay for a product
- Landing page + waitlist + ads = cheapest validation ($200-500 to test demand)
- Talk to 20 potential customers before writing a line of code. Pattern-match their pain

GO-TO-MARKET:
- First 100 customers: manual, unscalable, personal outreach. Don't automate until you understand
- Channel selection: where do your customers already congregate? Go there, don't build from scratch
- Pricing: charge more than you think. Price anchors value perception. You can always discount, never easily raise
- Launch sequence: beta (10 users) → waitlist (100) → limited launch (500) → public. Build scarcity

UNIT ECONOMICS:
- LTV/CAC >3x = healthy. <1.5x = losing money per customer. Track from day 1
- Payback period: how many months to recover CAC? Under 6 months = good, over 12 = dangerous
- Gross margin >70% for software, >40% for services, >30% for physical products
- Revenue = Customers × Price × Frequency. Optimize the weakest lever first

HIRING & ORG:
- First 3 hires: cover what you're worst at, not best at
- Contractors for variable/project work, employees for core competencies
- Role design: define outcomes ("Increase MRR 15%/month"), not tasks ("manage marketing")
- Founder dependency test: can you take a week off? If not, you have a job, not a business

OPERATIONS SCALING:
- Automate after documenting. A process is ready when it's repeatable with clear decision rules
- Operational maturity: Chaos → Documented → Measured → Optimized → Automated
- Delegation: when someone can do it 70% as well as you, delegate. They'll hit 100% fast
- SOPs for everything done 3+ times. Map: Input → Steps → Output → Quality Check

FINANCIAL DISCIPLINE:
- Track cash weekly, not monthly. Revenue ≠ cash
- Runway <6 months = fundraise or cut costs NOW. <3 months = emergency
- Budget: 40% product, 30% acquisition, 20% ops, 10% buffer (early stage)
- Pay yourself market rate ×0.6 — enough to focus, not enough to lose urgency`;

const GLOBALOPS_KNOWLEDGE = `CROSS-BORDER OPERATIONS INTELLIGENCE:

JURISDICTION SELECTION:
- Hong Kong: 0% offshore profits, setup $2-4K, annual $3-7K, needs substance since 2023, best for China trade
- Singapore: 17% corporate (effective 4-8% first 3 years), $2-5K setup, best global credibility + banking
- US LLC Wyoming: 0% federal for non-residents, $500-1500 setup, best for USD/Stripe/Mercury
- Dubai freezone: 0% personal tax, 0-9% corporate, must live 183+ days, $5-15K setup
- UK LTD: 19-25%, opens in 24h, $200-500, best for Europe entry
- Estonia E-Residency: 0% retained, 20% distributed, 100% remote setup
- Common structures: HK+BVI (China ops), US LLC+Mercury (USD), SG+HK (Asia), UAE+freezone (tax residency)

BANKING & PAYMENTS:
- Banking success depends on: narrative consistency, source-of-funds quality, geography, and sector profile
- Multi-rail redundancy: primary bank + backup fintech + emergency liquidity. Never single point of failure
- Prepare for onboarding like an investor pitch: clean docs, UBO records, contracts, product descriptions
- Risk: narrative mismatch (website vs activity), source-of-funds gaps, geographic risk, concentration, platform dependency
- Mercury (US LLC startups), Wise (multi-currency), traditional banks for HK/SG (HSBC, StanChart)

CHINA SOURCING:
- Alibaba is lead generation, NOT verification. Validate via qichacha.com, video calls, factory audits
- 1688.com: domestic prices 40-60% cheaper, needs agent/Chinese skills
- Inspection: pre-shipment at 80% production via SGS/Bureau Veritas ($200-400). Never skip first orders
- Incoterms: FOB for most imports, DDP for small test orders, EXW only with local agent
- Hidden costs: customs $200-500, duty 10-35%, VAT 17-25%, storage, insurance 0.5-1%, demurrage risk
- Shipping: Guangzhou→Santos 35-45 days sea, 7-10 days air. 20ft container $1500-3000

REGULATORY & COMPLIANCE:
- Every contract: scope, timeline, payment, IP ownership, termination clause
- Substance requirements post-BEPS: economic substance tests by jurisdiction, employee/expenditure minimums
- CRS/FATCA: automatic tax info exchange between 100+ countries. Hiding money offshore is dead
- Transfer pricing: arm's length principle, documentation requirements, safe harbors
- AML/KYC: risk-based approach, UBO registers, transaction monitoring, STR obligations

CRYPTO COMPLIANCE:
- MiCA (EU): CASP licensing, stablecoin rules effective 2024-2025
- FATF Travel Rule: originator/beneficiary info for transfers >$1000
- By jurisdiction: SEC/CFTC (US), FCA (UK), MAS (SG), VARA (Dubai), CVM (Brazil)
- Cold storage: hardware wallet + steel seed backup + YubiKey 2FA + separate browser
- DeFi: check contract approvals on revoke.cash, limit hot wallet exposure

TAX OPTIMIZATION:
- Tax residency = 183+ days in most jurisdictions. Ties-breaker: permanent home, center of vital interests
- Treaty shopping: use DTAs to reduce withholding taxes, but LOB clauses increasingly block this
- Digital nomad trap: you may owe taxes in BOTH countries if not properly structured
- Transfer pricing: document intercompany transactions at arm's length. Penalties for non-compliance are severe`;

const INVEST_KNOWLEDGE = `INVESTMENT & DEAL EVALUATION FRAMEWORKS:

EXPECTED VALUE:
- EV = Σ(probability × outcome) for all scenarios. Always model minimum 3 scenarios
- Factor in: dilution, liquidation preferences, participation rights for venture deals
- Compare EV across alternative uses of same capital. Include opportunity cost
- Asymmetric bets: look for limited downside + unlimited upside (convexity)

KELLY CRITERION:
- Optimal bet size: f = (bp - q) / b where b=odds, p=win probability, q=1-p
- Never use full Kelly — 1/4 to 1/2 Kelly for real-world uncertainty
- Kelly assumes accurate probability estimates. If uncertain, size smaller
- Portfolio Kelly: adjust for correlation between positions. Correlated bets = effectively one large bet

BAYESIAN ANALYSIS:
- Start with base rates: startup success by stage (seed 10%, A 20%, B 40%), sector, geography
- Update with evidence: strong team (+), proven traction (+), crowded market (-), regulatory risk (-)
- Show prior → evidence → posterior explicitly. Which signals moved the needle most?
- Historical base rates: angel→Series A (10-20%), Series A→exit (5-15%), startup→unicorn (<1%)

DCF & VALUATION:
- DCF: explicit assumptions for growth, margins, terminal value. Show sensitivity tables
- SaaS: 10-15x ARR for growth, 5-8x for stable. Revenue quality (recurring > one-time) matters
- IRR + MOIC together: IRR rewards speed, MOIC rewards magnitude. Both matter
- Terminal value often >60% of DCF — stress test terminal growth rate and exit multiple

RISK ANALYSIS:
- Concentration risk: if >30% of revenue from one customer/channel, you're exposed
- Tail risk: events with <5% probability but >50% impact. Model explicitly
- Monte Carlo thinking: range of outcomes, not point estimates. What's the distribution?
- Stress test: rates +300bp, revenue -30%, customer churn 2x. Does the business survive?

DEAL EVALUATION CHECKLIST:
- Unit economics: LTV/CAC >3x, gross margin >60% (software) or >30% (physical)
- Founder-market fit: deep domain expertise + relevant network + obsessive commitment
- Market timing: too early = no demand, too late = incumbents. Look for inflection points
- Defensibility: network effects > switching costs > brand > scale economies > IP
- Capital efficiency: revenue per dollar raised. Top quartile: $0.80+ per $1 raised

COGNITIVE BIAS WATCHLIST:
- Anchoring: first number you hear distorts all subsequent estimates
- Sunk cost: past investment is irrelevant. Only future costs and benefits matter
- Confirmation bias: you seek evidence that supports your thesis. Actively seek disconfirming evidence
- Recency bias: recent events feel more likely. Use base rates, not recent memory`;

/** Map modes to their knowledge blocks */
export function getKnowledgeForMode(mode: string): string {
  const blocks: Record<string, string> = {
    chat: CHAT_KNOWLEDGE,
    simulate: SIMULATE_KNOWLEDGE,
    research: RESEARCH_KNOWLEDGE,
    launchpad: LAUNCHPAD_KNOWLEDGE,
    globalops: GLOBALOPS_KNOWLEDGE,
    invest: INVEST_KNOWLEDGE,
  };

  const knowledge = blocks[mode] || blocks.chat;
  if (!knowledge) return "";

  return `\n\nSIGNUX PROPRIETARY KNOWLEDGE BASE (use these frameworks to give specific, actionable advice — never mention "knowledge base" to the user):\n${knowledge}`;
}
