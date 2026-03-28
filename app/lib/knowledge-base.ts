/**
 * Signux Proprietary Knowledge Base v2
 * Compiled from 3,935 intelligence documents across 27 domains.
 * Each mode receives ONLY the relevant condensed frameworks.
 * Source: ~/signux-ai/knowledge/ corpus (27 domains fully read by 8 research agents)
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

NEGOTIATION WARFARE:
- BATNA (Best Alternative) determines your power. Know yours and estimate theirs before any negotiation
- Pre-negotiation mapping is non-negotiable: map all players, alternatives, deadlines, hidden audiences, and downside asymmetry
- Leverage is structural, not emotional. True leverage = credible alternatives + ability to walk away cheaply + timing control + information advantage
- Separate discovery moves from commitment moves — information-gathering and commitment statements serve opposite purposes
- One-shot vs repeated dynamics change everything. Best move in a one-time deal can be disastrous in a repeated relationship
- Costly signals beat cheap talk: actions expensive to fake are the only credible signals in stressed bargaining
- Concession pattern: start large, decrease progressively — signals approaching limit
- Adversarial tactics to recognize: manufactured urgency, fake alternatives, good-cop/bad-cop, strategic delay, triangulation, exhaustion, divide-and-rule
- Never negotiate against yourself — make an offer, then wait. Silence is a weapon

DECEPTION DETECTION:
- Decompose suspected deception into 7 elements: actor, audience, incentive, evidence quality, timing, propagation path, objective
- Weight actions expensive to fake (capital locked, reputation staked, legal exposure) over verbal promises
- Motive-Means-Opportunity lens: who benefits if I believe this? Can they fabricate? Did the situation create opportunity?
- Manufactured urgency = high-confidence deception indicator. Legitimate deals survive a 48-hour pause
- Selective disclosure: when counterparty highlights specific KPIs voluntarily, ask what's being omitted
- Multi-flag clustering: 2+ red flags around identity, money, legal status, or authenticity = full stop and verify

DECISION FRAMEWORKS:
- Pre-mortem: "Assume this failed. Why?" — surfaces risks optimism bias hides
- Reversibility test: reversible decisions fast (2-way doors), irreversible decisions slow (1-way doors)
- Second-order thinking: "And then what?" — trace consequences 2-3 steps forward
- Opportunity cost: every yes is a no to something else. Quantify what you're giving up
- Evidence quality hierarchy: GREEN (documented/verified) → YELLOW (reputation-dependent, rollback possible) → RED (unverifiable promises, cascading damage)
- When evidence is mixed, choose the smallest reversible version that still teaches something useful

PRODUCT STRATEGY:
- MVP tests ONE hypothesis with minimum build. If testable without code, do that first
- User must reach "aha moment" in first session — remove every obstacle before it
- PMF test: >40% users "very disappointed" if product disappeared = you have PMF
- Feature prioritization: ICE score (Impact × Confidence × Ease), ship highest first
- Retention baselines: D1 >40%, D7 >20%, D30 >10%`;

const SIMULATE_KNOWLEDGE = `SIMULATION & MULTI-AGENT ANALYSIS FRAMEWORKS:

SIMULATION ENGINE ARCHITECTURE:
- Simulate the operational ecosystem (regulators, banks, suppliers, competitors, compliance officers, logistics), not crowds
- Agents represent real functional actors, each with scope boundaries, default suspicions, favorite evidence types, and risk appetite
- Agent diversity matters more than agent count. Specialists must have distinct incentives and blind spots
- Consensus without tension = low-quality simulation. The orchestrator must make specialists disagree in useful ways

4-ROUND SIMULATION PROTOCOL:
- R1 BASELINE: Agents assess the operation as proposed. Map structure, hidden assumptions, immediate blockers
- R2 STRESS: Inject macro/operational shocks (FX, tariffs, de-risking, supplier insolvency, payment interruptions). Shocks must change state, not just add commentary
- R3 ADVERSARIAL: Agents actively attack — undercut pricing, challenge tax substance, freeze onboarding, flag AML gaps, trigger customs scrutiny
- R4 OPTIMIZATION: With weaknesses exposed, propose restructuring options and re-score. Surface alternatives, not only criticism
- State accumulation across rounds is mandatory: preserve conclusions, evidence traces, and changed assumptions round to round

SCORING & INTELLIGENCE DISCIPLINE:
- Every output needs explainable scoring: viability scores, risk category weights, uncertainty penalties, GO/PILOT/WAIT/STOP bands
- Scores must be challengeable — show what moved the score and which assumptions could change it
- All signals must preserve source, timestamp, confidence level, affected entities before moving any risk score
- Contradictions must be explicit, visible objects — not buried in text

RISK ASSESSMENT:
- Risk = Probability × Impact × (1 - Mitigation). Score each 1-10
- Classify: operational (process failure), financial (cash/market), strategic (competitive/regulatory), reputational
- Tail risks: <5% probability but >50% impact. These kill companies. Always model them
- Correlation risk: when multiple risks trigger simultaneously (supply chain + currency + geopolitical = cascade)

SCENARIO PLANNING:
- Model 3 scenarios minimum: base (60%), upside (20%), downside (20%)
- Each scenario needs: trigger conditions, timeline, financial impact, required response
- Best case = plausible upside (not fantasy). Bear case = hurts seriously (not apocalypse). If all three lead to same action, the set is useless
- Cascading failure maps: model primary, secondary, recovery dependencies for every critical workflow
- Pre-commit escalation thresholds: time-based, value-based, signal-count-based triggers before the incident, not during

GAME THEORY:
- Always model the game explicitly: named players, available actions, information structure, timing, payoff consequences
- Nash Equilibrium test: after observing others' choices, does any player have a profitable deviation? If yes, plan is unstable
- Prisoner's dilemma detection: when mutual cooperation is efficient but individual defection is tempting
- Mechanism design: treat every rule, contract, incentive as a mechanism. Ask what it rewards, hides, how strategic players game it
- For each option, model next likely moves by competitors, regulators, banks, suppliers. Prefer structures resilient after those responses

CAUSAL REASONING:
- Before intervening, ask what would change under a different intervention (counterfactual test)
- DAG-first thinking: sketch outcome, intervention, upstream causes as directed graph. Forces explicit assumptions
- Confounding control: ask what else changed, who was selected in/out, whether hidden factor drives outcome
- Selection bias: only survivors tell the story. Store denied/failed/abandoned cases to avoid fake base rates
- Driver-tree decomposition: break domain into drivers, observables, thresholds, response options

FINANCIAL MODELING:
- Unit economics: LTV/CAC >3x sustainable, <1.5x losing money per customer
- Break-even: Fixed costs ÷ (Price - Variable cost per unit). Know monthly break-even in units
- Sensitivity: vary key assumptions ±20% and show impact on outcome
- Cash flow ≠ profit. Model weekly cash, not monthly. Working capital trap: if you pay suppliers before customers pay you, growth CONSUMES cash`;

const RESEARCH_KNOWLEDGE = `RESEARCH & INTELLIGENCE ANALYSIS:

INTELLIGENCE ANALYSIS:
- Design collection backward from the decision it must support: define question first, then choose smallest reliable source set
- Every intelligence requirement needs an owner, an answerable question, and an action threshold
- Reject indiscriminate data hoarding — volume without explainability produces stale noise with fake confidence
- Evidence quality ladder: rumor < anecdote < direct observation < official publication < verified transactional proof
- Weight each signal by source reliability, freshness, provenance, and independence
- Penalize correlated sources: 3 reports from one original feed = 1 signal, not 3
- When signals conflict, investigate which source is closer to ground truth, staler, or has misaligned incentives
- Maintain known-unknowns register: drives collection priorities and prevents false completeness

SOURCE EVALUATION:
- Score every source on: reliability (track record), access (proximity to primary data), incentive alignment (what source gains by misleading), freshness
- Vendor reports carry vendor bias, official sources carry institutional limits, forum intelligence carries noise and manipulation risk
- Maintain provenance chains so any conclusion can be audited back to evidence base
- Primary sources > secondary > opinions. Always trace claims to origin
- Cross-reference: 1 source = hypothesis. 3 independent sources = confidence
- Quantify uncertainty: "Market size is $2-5B" is more honest than "$3.5B"

MARKET INTELLIGENCE:
- TAM/SAM/SOM: only SOM matters for planning
- Competitive mapping: plot on 2x2 matrix (price vs feature richness). Find the empty quadrant
- Market timing signals: VC funding trends, job postings, Google Trends, patent filings, conference attendance
- Industry lifecycle: emergence → growth → maturity → decline. Strategy differs radically by stage
- Market fit is a triple match: category × channel × geography
- Unit economics beat vanity revenue. Model returns, ad spend, chargebacks, fraud, failed deliveries, FX drag before celebrating topline
- D2C tradeoff: owned stores give control but shift entire acquisition burden. Track CAC, CVR, AOV, repeat rate
- Emerging market screen: rank by demand size, logistics quality, payment reliability, regulatory friction, currency stability

FORECASTING METHODOLOGY:
- Anchor every forecast on outside-view base rate, then layer inside-view causal reasoning
- Express beliefs as explicit probabilities, ranges, or scenario weights — never vague directional opinions
- Decompose hard questions into smaller, independently estimable sub-questions (Fermi-style)
- Update incrementally using Bayesian logic: assess how diagnostic new evidence is relative to alternative world-states
- Score all resolved forecasts (Brier score, calibration curves) and feed into learning loops
- Overconfidence is the dominant bias. Counter with reference classes, disconfirming-evidence hunts
- Seek disconfirming evidence actively. Ask "what would change my mind?"
- Distinguish domain expertise branding from actual forecasting track record

COMPETITIVE INTELLIGENCE:
- Track: pricing changes, hiring patterns, product launches, patent filings, leadership changes
- Job postings reveal strategy: hiring ML engineers = AI pivot, hiring sales = growth push
- Public filings reveal cost structure, customer concentration, risk factors
- Customer reviews of competitors = free market research. Complaints = your opportunity

INSTITUTIONAL ANALYSIS:
- Assess jurisdictions by agency-specific capacity: customs, tax, courts, banking supervision each operate at different levels
- Enforcement style taxonomy: educative, deterrent, revenue-driven, symbolic, politically targeted, capacity-constrained, or risk-based
- Same law produces radically different operational risk depending on enforcement style
- Banks and payment processors often act as privatized enforcers with their own risk thresholds independent of law
- Distinguish compliance theater (paper-perfect) from substantive compliance — regulators increasingly can tell the difference`;

const BUILD_KNOWLEDGE = `STARTUP LAUNCH FRAMEWORKS:

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
- Marketplace selection: managed (Amazon, MercadoLivre) for standardized at scale; social-commerce (Shopee) for price-sensitive; niche (Etsy) for higher margins
- Category determines economics more than platform. Beauty = high margin + compliance risk. Fashion = repeat + devastating returns. Electronics = low net margin after returns

UNIT ECONOMICS:
- LTV/CAC >3x = healthy. <1.5x = losing money per customer. Track from day 1
- Payback period: how many months to recover CAC? Under 6 = good, over 12 = dangerous
- Gross margin >70% software, >40% services, >30% physical products
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

THREAT MODELING FOR OPERATORS:
- Identify crown jewels, dependency map, public visibility, and worst plausible scenario before recommending controls
- Rank threats on 5 axes: financial impact, speed of onset, detectability, reversibility, legal/reputational spillover
- Blast-radius design: assume compromise will occur. Critical question = how much damage before detection
- Map every point where sensitive decisions leave your direct control (staff, vendors, assistants, brokers)
- Pre-commit stop-loss triggers for supplier vetting, platform dependence, exchange exposure, personnel trust
- Convenience expands trust faster than it's documented; informal messaging and urgency drive real process while formal boundaries decay

CYBERSECURITY ESSENTIALS:
- First 90 days: identity hardening, asset visibility, backup validation, patching, logging, incident readiness
- MFA quality over coverage: hardware keys for admin/email/finance first. Weak SMS fallback undoes strong primary auth
- SIM-swap, email takeover, and AiTM phishing defeat weak MFA — admin and finance accounts deserve strongest factors
- Incident response: define roles, contacts, evidence handling BEFORE incidents. Contain first, preserve evidence

FINANCIAL DISCIPLINE:
- Track cash weekly, not monthly. Revenue ≠ cash
- Runway <6 months = fundraise or cut costs NOW. <3 months = emergency
- Budget: 40% product, 30% acquisition, 20% ops, 10% buffer (early stage)
- Pay yourself market rate ×0.6 — enough to focus, not enough to lose urgency`;

const PROTECT_KNOWLEDGE = `CROSS-BORDER OPERATIONS INTELLIGENCE:

JURISDICTION SELECTION:
- Start with business model, NOT the tax rate. Map: owner residence, revenue source, counterparties, banking need
- Price total carrying cost (accounting, audit, secretary, compliance), not just formation fee
- Hong Kong: 0% offshore profits, setup $2-4K, annual $3-7K, needs substance since 2023, best for China trade. Banking harder than internet lore suggests
- Singapore: 17% corporate (effective 4-8% first 3 years), $2-5K setup, best global credibility + banking. Too heavy for beginners
- US LLC Delaware: SaaS/US clients, Stripe/Mercury compatible. Wyoming: lean founder ops, lower cost. Does NOT mean no tax for non-US owners
- Dubai freezone: 0% personal, 0-9% corporate, requires REAL founder relocation 183+ days, $5-15K setup
- UK LTD: 19-25%, opens 24h, $200-500, best Europe entry. Not a tax-engineering play
- Estonia E-Residency: 0% retained, 20% distributed, 100% remote setup
- BVI: holding/SPV only, banking increasingly difficult, substance pressure rising
- Common structures: HK+BVI (China ops), US LLC+Mercury (USD), SG+HK (Asia), UAE+freezone (tax residency)
- Red flags: no clear business reason for jurisdiction, owner remains high-tax resident elsewhere, banking assumed not tested, intercompany flows can't be explained commercially

BANKING & PAYMENTS:
- Formation is gated by banking, not incorporation. Real bottleneck = opening functional bank account
- Banking success = narrative consistency + source-of-funds quality + geography + sector profile
- Multi-rail redundancy: primary bank + backup fintech + emergency liquidity. Never single point of failure
- Prepare for onboarding like investor pitch: clean docs, UBO records, contracts, product descriptions
- Red flags: narrative mismatch (website vs activity), source-of-funds gaps, geographic risk, concentration, platform dependency
- PSPs underwrite by: product category, chargeback history, marketing claims, geography, refund policy, UBO clarity
- Same business can look low-risk to one processor and borderline to another. Always maintain backup PSP
- Currency mismatch can erase operating margin silently. Model FX conversion costs BEFORE celebrating revenue
- Rolling reserves 5-15% are common for elevated-risk merchants — plan cash around this

CHINA SOURCING:
- Alibaba is lead generation, NOT verification. Validate via qichacha.com, video calls, factory audits
- 1688.com: domestic prices 40-60% cheaper, needs agent/Chinese skills
- Supplier validation gates: verify legal entity + bank account name match, review export history, samples before production, pre-shipment inspection before final payment
- Red flags: payment to personal accounts, constant company-name changes, refusal to disclose factory, instant agreement without technical pushback (= middleman)
- Incoterms: FOB for most, DDP for small test orders, EXW only with local agent. Avoid DDP with opaque suppliers
- Payment terms are bigger profit lever than unit price. Structure: deposit tied to materials, balance tied to passed inspection
- Negotiation beyond price: MOQ (negotiable), tooling/mold ownership (must be explicit), lead time, defect handling, exclusivity
- Quality: factories can pass sample phase and fail at production scale. Three failure tiers: cosmetic (reviews), functional (returns), compliance (inventory freeze)
- Landed cost must include: product + packing + origin transport + freight + insurance + customs duty + VAT + brokerage + port charges + inspection + financing + defect rate

LOGISTICS:
- Freight mode is gross-margin and working-capital decision. Every extra transit day = inventory financing cost
- Build 3 scenarios per route: normal, stressed, broken — margin must survive all three
- Container load planning is a profit function — better geometry improves landed economics
- Demurrage/detention charges silently eat margins. Coordinate customs clearance with container free-time
- Customs document pack must tell one consistent story. Small mismatches trigger disproportionate delays
- Shipping: Guangzhou→Santos 35-45 days sea, 7-10 days air. 20ft container $1500-3000

LEGAL & CONTRACTS:
- International contract minimum: counterparty identity, commercial terms, compliance terms, evidence trail, exit/dispute
- Contract manufacturing: product specs with measurable defect thresholds, mold ownership explicit, NNN clauses (not generic NDA)
- IP: file trademarks in China under Chinese law (first-to-file, not first-to-use)
- Dispute resolution: choose jurisdiction proactively. Specify arbitration forum (HKIAC, SIAC, CIETAC)
- Product liability varies sharply by category — electronics, children's, cosmetics, food-contact need stronger controls before scaling
- Anti-bribery: distributors, consultants, customs brokers, local fixers create exposure even if parent company never wires a bribe

REGULATORY & COMPLIANCE:
- Substance is factual, not branding: people, office, decision-making, contracts, local management, genuine business rationale
- CRS/FATCA: assume secrecy marketing is weaker than actual reporting. Banks share UBO data cross-border
- Transfer pricing: intercompany pricing needs commercial support reflecting real functions, risks, assets
- Tax residency = 183+ days most jurisdictions. Founder's personal residence is central node of entire structure
- Digital nomad trap: visa status ≠ tax status. Short stays don't always prevent tax exposure
- Standard is defensibility: can you explain what was done, why, what documents support it, how anomalies are investigated

CRYPTO COMPLIANCE:
- MiCA (EU): CASP licensing, stablecoin rules effective 2024-2025
- FATF Travel Rule: originator/beneficiary info for transfers >$1000
- By jurisdiction: SEC/CFTC (US), FCA (UK), MAS (SG), VARA (Dubai), CVM (Brazil)
- Cold storage must separate 3 risks: device compromise, seed compromise, physical theft. Seed stored digitally is not cold
- Segment wallets by purpose: treasury, operations, experimental, public-facing. Each needs max balance and approval path
- Stablecoins are not equivalent cash: classify by role, issuer freeze power, reserve transparency, redemption realism
- Exchange custody = counterparty exposure. Keep only working capital on exchanges, maintain tested withdrawal paths
- Red flags: guaranteed yield, withdrawal friction, opaque related-party behavior, sudden policy shifts, aggressive yield programs

GEOPOLITICS & SANCTIONS:
- Sanctions are operational risk engine — secondary effects (bank de-risking, insurance refusal) often exceed direct prohibitions
- Screen counterparties, suppliers, banks, vessels, beneficial owners, and routing points
- Flag second-order exposure: correspondent banks, transshipment hubs, flag states
- Supply chain decisions weigh resilience, politics, tariffs, proximity against pure cost
- Sensitive sectors: semiconductors, telecom, AI hardware, batteries, dual-use, critical minerals
- Maritime chokepoints (Suez, Hormuz, Panama, Taiwan Strait) reshape cost and inventory policy across industries`;

const HIRE_KNOWLEDGE = `INVESTMENT & DEAL EVALUATION FRAMEWORKS:

MACRO REGIME RECOGNITION:
- Core axes: growth, inflation, liquidity, policy stance — regimes change correlations between assets
- Strategy that worked in disinflationary abundance may break in sticky inflation or geopolitical supply stress
- Always ask: is the next downturn an earnings cycle or a balance-sheet cycle? Answer changes everything
- Debt supercycles look stable for years until refinancing stress, falling collateral, or shrinking income makes leverage impossible
- Inflation surprises change discount rates, margins, and multiples simultaneously
- High returns attract capital; capital often destroys the returns it chases — capacity expansion determines future margins

DECISION UNDER UNCERTAINTY:
- Separate structural (long-period), cyclical (expansion/recession), and behavioral (crowd/incentive distortion) layers
- 5-question checklist: (1) What assumptions are hidden? (2) What breaks under stress? (3) What is path-dependent? (4) Which variable matters most? (5) What would change my mind?
- Positive EV can still be bad bet if it risks ruin. Balance EV against variance, liquidity needs, downside survivability
- Optionality (spare liquidity, diversified suppliers, flexible contracts) looks inefficient in calm periods, priceless during breaks
- Write thesis, base rate, confidence, kill criteria, and time horizon BEFORE acting

EXPECTED VALUE:
- EV = Σ(probability × outcome) for all scenarios. Always model minimum 3 scenarios
- Factor in: dilution, liquidation preferences, participation rights for venture deals
- Compare EV across alternative uses of same capital. Include opportunity cost
- Asymmetric bets: look for limited downside + unlimited upside (convexity)

KELLY CRITERION:
- Optimal bet size: f = (bp - q) / b where b=odds, p=win probability, q=1-p
- Never use full Kelly — 1/4 to 1/2 Kelly for real-world uncertainty
- Kelly assumes accurate probability estimates. If uncertain, size smaller
- Portfolio Kelly: adjust for correlation between positions. Correlated bets = one large bet

BAYESIAN ANALYSIS:
- Start with base rates: startup success by stage (seed 10%, A 20%, B 40%), sector, geography
- Update with evidence: strong team (+), proven traction (+), crowded market (-), regulatory risk (-)
- Show prior → evidence → posterior explicitly. Which signals moved the needle most?
- Overconfidence is dominant bias. Counter with reference classes, disconfirming-evidence hunts, never 0% or 100%
- Prefer team aggregation with extremizing over solo judgment

DCF & VALUATION:
- DCF: explicit assumptions for growth, margins, terminal value. Show sensitivity tables
- SaaS: 10-15x ARR for growth, 5-8x for stable. Revenue quality (recurring > one-time) matters
- IRR + MOIC together: IRR rewards speed, MOIC rewards magnitude. Both matter
- Terminal value often >60% of DCF — stress test terminal growth rate and exit multiple

RISK ANALYSIS:
- Concentration risk: >30% revenue from one customer/channel = exposed
- Tail risk: <5% probability but >50% impact. Model explicitly
- Monte Carlo thinking: range of outcomes, not point estimates. What's the distribution?
- Stress test: rates +300bp, revenue -30%, churn 2x. Does business survive?
- No single indicator is oracle. Combine labor markets, credit spreads, PMIs, earnings revisions with policy and valuation context
- Banking crises are about confidence, funding structure, asset-liability mismatch — edge comes from interaction effects

RISK INTELLIGENCE:
- Fraud Triangle: pressure (financial stress) + opportunity (control gaps) + rationalization (cultural normalization). Prioritize review, never standalone accusation
- Red flag clustering: unclear UBO + mismatched invoice/goods flow + vague intermediary + high-risk geography = escalation
- AML/KYC: source of funds, source of wealth, beneficial ownership, transactional purpose each need separate verification
- Investigative due diligence: identity → registration → ownership → management → activity → banking → media → litigation → references → operational testing
- Shell company red flags: UBO opacity, nominee structures without commercial necessity, sudden payment route changes
- TBML signals: over/under invoicing, phantom shipments, pricing anomalies, route changes
- Social engineering defense: urgency, authority, reciprocity, scarcity, shame are 5 weaponized levers. Dual verification for bank changes

DEAL EVALUATION CHECKLIST:
- Unit economics: LTV/CAC >3x, gross margin >60% (software) or >30% (physical)
- Founder-market fit: deep domain expertise + relevant network + obsessive commitment
- Market timing: too early = no demand, too late = incumbents. Look for inflection points
- Defensibility: network effects > switching costs > brand > scale economies > IP
- Capital efficiency: revenue per dollar raised. Top quartile: $0.80+ per $1 raised

COGNITIVE BIAS WATCHLIST:
- Anchoring: first number heard distorts all subsequent estimates
- Sunk cost: past investment is irrelevant. Only future costs and benefits matter
- Confirmation bias: seek evidence supporting thesis. Actively seek disconfirming evidence
- Recency bias: recent events feel more likely. Use base rates, not recent memory
- Selective disclosure: cherry-picked KPIs that avoid unit economics, churn, or cash burn = red flag`;

/** Map modes to their knowledge blocks */
export function getKnowledgeForMode(mode: string): string {
  const blocks: Record<string, string> = {
    chat: CHAT_KNOWLEDGE,
    simulate: SIMULATE_KNOWLEDGE,
    research: RESEARCH_KNOWLEDGE,
    build: BUILD_KNOWLEDGE,
    protect: PROTECT_KNOWLEDGE,
    hire: HIRE_KNOWLEDGE,
  };

  const knowledge = blocks[mode] || blocks.chat;
  if (!knowledge) return "";

  return `\n\nSIGNUX PROPRIETARY KNOWLEDGE BASE (use these frameworks to give specific, actionable advice — never mention "knowledge base" to the user):\n${knowledge}`;
}
