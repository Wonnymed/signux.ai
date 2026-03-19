export const KNOWLEDGE: Record<string, string> = {

  sales: `SALES & CONVERSION INTELLIGENCE:
- Offer design: A compelling offer has 4 elements — transformation promise, risk reversal, urgency mechanism, and value stack exceeding 10x the price
- Objection handling: The top 5 objections are always price, timing, trust, need, and authority. Pre-handle them in your pitch
- B2B pipeline: Qualified leads need BANT (Budget, Authority, Need, Timeline). Without all 4, you're wasting time
- Lead qualification: Score leads on engagement level, budget fit, and decision timeline. Focus on the top 20%
- Conversion bottlenecks: If traffic is high but conversion is low, the problem is always one of: offer-market mismatch, trust gap, friction in checkout, or weak CTA
- Sales trust signals: Testimonials, case studies, guarantees, and social proof reduce perceived risk. Use all 4
- Proposal systems: Proposals should lead with the client's problem, not your solution. Problem → Impact → Solution → Proof → Price
- Closing logic: The best close is not a technique — it's removing the last objection. Ask "What would need to be true for you to move forward?"
- Revenue architecture: Revenue = Traffic × Conversion Rate × Average Order Value × Purchase Frequency. Optimize each independently`,

  operations: `OPERATIONS & SYSTEMS INTELLIGENCE:
- SOPs: Every repeatable process needs a Standard Operating Procedure. If you do it more than 3 times, document it
- Workflow design: Map every process as Input → Steps → Output → Quality Check. Identify bottlenecks at each step
- Delegation: Delegate outcomes, not tasks. Define the result, the constraints, and the deadline — not the method
- Exception handling: 80% of operational problems come from 20% of edge cases. Document the top 10 exceptions and their resolutions
- Automation readiness: A process is ready for automation when it's documented, repeatable, and has clear decision rules
- Scaling without chaos: Scale by systemizing, not by hiring. Every new hire should reduce founder dependency, not increase it
- Service delivery: Quality = Consistency × Speed × Communication. Failing at any one destroys the other two
- Operational maturity stages: Chaos → Documented → Measured → Optimized → Automated. Know which stage you're at`,

  finance: `FOUNDER FINANCE INTELLIGENCE:
- Cash flow: Revenue is vanity, profit is sanity, cash flow is reality. Track weekly, not monthly
- Burn rate: Monthly burn = fixed costs + variable costs. Know your gross and net burn separately
- Runway: Runway = Cash in bank ÷ Monthly net burn. Below 6 months is danger zone, below 3 is emergency
- Budget allocation: Early stage: 40% product, 30% acquisition, 20% operations, 10% buffer. Adjust as you find what works
- Capital efficiency: Revenue per dollar spent. Top quartile startups generate $0.80+ revenue per $1 of capital raised
- Unit economics: LTV must be >3× CAC for sustainability. If LTV/CAC <1.5, you're losing money on every customer
- Revenue forecasting: Use bottom-up (customers × price × frequency), not top-down (% of TAM). Top-down is fantasy
- Working capital: Money needed to operate between paying suppliers and collecting from customers. Negative = you're financing clients
- Founder compensation: Pay yourself enough to not be stressed, but not so much that you lose urgency. Market rate ×0.6 is common
- Downside planning: Model 3 scenarios — base (60% likely), upside (20%), downside (20%). Plan for downside, aim for base`,

  product: `PRODUCT STRATEGY INTELLIGENCE:
- MVP logic: An MVP tests ONE hypothesis with the minimum build. If you can test it without code, do that first
- Activation: The user must reach the "aha moment" in the first session. Identify what that moment is and remove every obstacle before it
- Retention: Day 1 retention >40%, Day 7 >20%, Day 30 >10% are healthy baselines for most products
- Churn analysis: Exit surveys are unreliable. Look at what churned users did NOT do — the missing action is your retention lever
- Feature prioritization: Use ICE (Impact × Confidence × Ease). Score 1-10 each. Ship highest ICE first
- Experimentation: Run max 2-3 experiments per week. Each needs a hypothesis, metric, and sample size BEFORE starting
- Product-market fit: Sean Ellis test — if >40% of users say they'd be "very disappointed" if your product disappeared, you have PMF
- Feedback loops: Instrument everything. If you can't measure it, you can't improve it. Track activation, engagement, retention, referral
- Roadmap discipline: Say no to 90% of feature requests. A focused product beats a bloated one every time`,

  hiring: `HIRING & ORG DESIGN INTELLIGENCE:
- First hires: Your first 3 hires should cover what you're worst at, not what you're best at
- Role design: Define the outcome the role achieves, not the tasks it performs. "Increase MRR 15%/month" not "manage marketing"
- Contractor vs employee: Contractors for variable/project work, employees for core competencies you need to own
- Founder dependency: If the business stops when you take a week off, you don't have a business — you have a job
- Delegation thresholds: Delegate when someone can do it 70% as well as you. They'll reach 100% faster than you think
- Incentive alignment: People optimize for what they're measured on. Make sure metrics align with company goals
- Culture failure modes: Culture breaks when you hire for skills over values, when you tolerate toxicity, or when you stop being transparent
- Scorecards: Every role needs a scorecard — 3-5 outcomes that define success. Review monthly, not annually`,

  suppliers: `PROCUREMENT & VENDOR INTELLIGENCE:
- Vendor selection: Evaluate on 5 axes — quality, price, reliability, scalability, and communication. Never optimize for price alone
- SLAs: Every vendor relationship needs a Service Level Agreement. Define deliverables, timelines, quality standards, and penalties
- Procurement risk: Never have a single supplier for critical inputs. Rule of 3 — always have backup options
- Supplier leverage: Your leverage increases with volume, payment speed, and relationship length. Use all three in negotiations
- Payment terms: Net 30 is standard. Net 60 gives you cash flow advantage. Prepayment should come with 5-10% discount
- Concentration risk: If >30% of your supply comes from one vendor, you're exposed. Diversify before it becomes urgent
- QC systems: Inspect on receipt, not on delivery to customer. Quality problems caught late cost 10x more to fix`,

  partnerships: `PARTNERSHIP & ECOSYSTEM INTELLIGENCE:
- Strategic partnerships: A good partnership creates value neither party could create alone. If it's just distribution, it's a deal, not a partnership
- Affiliates: Standard affiliate commission is 20-30% for digital products, 5-15% for physical. Pay on confirmed revenue, not leads
- Referral systems: The best referral incentive benefits both sides. One-sided referrals have 3x lower conversion
- Channel alliances: Choose channel partners who serve your ideal customer but don't compete with your product
- Co-marketing: Split costs, share audiences. Each party should bring roughly equal value or the partnership dies
- Integration partnerships: Technical integrations create switching costs. Prioritize integrations that make your product stickier
- Alliance failure modes: Partnerships fail when expectations are unwritten, when value exchange is unequal, or when there's no regular review cadence`,

  regulatory: `REGULATORY & CONTRACTS INTELLIGENCE:
- Commercial contracts: Every contract needs 5 essentials — scope, timeline, payment, IP ownership, and termination clause
- NDAs: Use mutual NDAs, not one-sided. Define what's confidential specifically — "everything" NDAs are unenforceable
- Term sheets: Key terms to negotiate — valuation, liquidation preference, board seats, anti-dilution, and vesting schedule
- Document risk: Red flags in contracts — unlimited liability, non-compete broader than your industry, auto-renewal without notice, and assignment without consent
- Compliance: Know your industry's regulations BEFORE you launch. Retroactive compliance costs 10-50x more than proactive
- Evidence hygiene: Keep records of everything — emails, agreements, payments, deliverables. If it's not documented, it didn't happen`,

};

/** Map knowledge domains to modes */
const MODE_KNOWLEDGE: Record<string, string[]> = {
  chat: ["sales", "operations", "finance", "product"],
  simulate: ["finance", "operations", "sales", "product", "hiring", "suppliers"],
  research: [],
  launchpad: ["product", "sales", "finance", "hiring", "operations"],
  globalops: ["regulatory", "suppliers", "partnerships"],
  invest: ["finance", "product", "sales"],
};

export function getKnowledgeForMode(mode: string): string {
  const domains = MODE_KNOWLEDGE[mode] || MODE_KNOWLEDGE.chat;
  if (domains.length === 0) return "";

  const knowledge = domains
    .map(d => KNOWLEDGE[d])
    .filter(Boolean)
    .join("\n\n");

  if (!knowledge) return "";

  return `\n\nSIGNUX PROPRIETARY KNOWLEDGE BASE (use this to give more specific, actionable advice):\n${knowledge}`;
}
