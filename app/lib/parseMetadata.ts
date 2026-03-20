export interface SignuxVerification {
  confidence: number;
  checked: string[];
  caveats: string[];
}

export interface SignuxWorklogStep {
  action: string;
  detail: string;
}

export interface SignuxWorklog {
  steps: SignuxWorklogStep[];
  sources_count: number;
  domains_used: number;
  reasoning_steps: number;
}

export type BlindSpot = { domain: string; question: string; why: string };

export interface SignuxVoteDisenter {
  role: string;
  vote: string;
  reason: string;
}

export interface SignuxVote {
  go: number;
  caution: number;
  stop: number;
  total: number;
  result: string;
  confidence_avg: number;
  dissenters: SignuxVoteDisenter[];
}

export type SignuxSentiment = {
  signal: "bullish" | "bearish" | "neutral" | "mixed";
  confidence: number;
  reason: string;
};

export type SignuxSource = {
  title: string;
  url?: string;
  type: "web" | "kb" | "framework" | "data";
  relevance: string;
};

export type SignuxFollowup = {
  question: string;
  why: string;
};

export type SignuxTimelineEvent = {
  period: string;
  event: string;
  impact: string;
  probability?: number;
};

export type SignuxCompetitive = {
  competitor: string;
  threat_level: string;
  signals: string[];
  recommended_actions: string[];
};

export type SignuxKnowledgeGraph = {
  nodes: Array<{ id: string; label: string; weight: number }>;
  edges: Array<{ from: string; to: string; label: string }>;
};

export type SignuxFinancials = {
  data_points: Array<{ metric: string; value: string; source: string; confidence: string }>;
  recommended_sources: string[];
};

export type SignuxParallel = {
  universes: Array<{ id: string; name: string; probability: number; revenue: string; outcome: string }>;
};

export type SignuxMarket = {
  country: string;
  risk_level: string;
  ease_of_entry: number;
  market_size: string;
};

export type SignuxInvestment = {
  verdict: string;
  confidence: number;
  roi_expected: string;
  risk_score: number;
  payback_months: number;
};

export interface SignuxMetadata {
  domains: string[];
  domainCount: number;
  blindspots: BlindSpot[];
  depth: number;
  verification: SignuxVerification | null;
  worklog: SignuxWorklog | null;
  vote: SignuxVote | null;
  sentiment: SignuxSentiment | null;
  sources: SignuxSource[];
  followups: SignuxFollowup[];
  timeline: SignuxTimelineEvent[];
  competitive: SignuxCompetitive | null;
  workflow: string[];
  knowledgeGraph: SignuxKnowledgeGraph | null;
  financials: SignuxFinancials | null;
  parallel: SignuxParallel | null;
  market: SignuxMarket | null;
  investment: SignuxInvestment | null;
}

export function parseSignuxMetadata(content: string): { cleanContent: string; metadata: SignuxMetadata } {
  let clean = content;

  // Parse domains
  const domainMatch = clean.match(/<!--\s*signux_domains:\s*(.+?)\s*-->/);
  const domains = domainMatch ? domainMatch[1].split(",").map(d => d.trim()).filter(Boolean) : [];
  clean = clean.replace(/<!--\s*signux_domains:\s*.+?\s*-->/g, "");

  // Parse domain count
  const countMatch = clean.match(/<!--\s*signux_domain_count:\s*(\d+)\s*-->/);
  const domainCount = countMatch ? parseInt(countMatch[1], 10) : domains.length;
  clean = clean.replace(/<!--\s*signux_domain_count:\s*\d+\s*-->/g, "");

  // Parse blindspots
  const blindspotMatch = clean.match(/<!--\s*signux_blindspots:\s*(\[[\s\S]*?\])\s*-->/);
  let blindspots: BlindSpot[] = [];
  try { if (blindspotMatch) blindspots = JSON.parse(blindspotMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_blindspots:\s*\[[\s\S]*?\]\s*-->/g, "");

  // Parse depth
  const depthMatch = clean.match(/<!--\s*signux_depth:\s*(\d+)\s*-->/);
  const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
  clean = clean.replace(/<!--\s*signux_depth:\s*\d+\s*-->/g, "");

  // Parse verification
  const verifyMatch = clean.match(/<!--\s*signux_verification:\s*(\{[\s\S]*?\})\s*-->/);
  let verification: SignuxVerification | null = null;
  try { if (verifyMatch) verification = JSON.parse(verifyMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_verification:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse worklog
  const worklogMatch = clean.match(/<!--\s*signux_worklog:\s*(\{[\s\S]*?\})\s*-->/);
  let worklog: SignuxWorklog | null = null;
  try { if (worklogMatch) worklog = JSON.parse(worklogMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_worklog:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse vote
  const voteMatch = clean.match(/<!--\s*signux_vote:\s*(\{[\s\S]*?\})\s*-->/);
  let vote: SignuxVote | null = null;
  try { if (voteMatch) vote = JSON.parse(voteMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_vote:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse sentiment
  const sentimentMatch = clean.match(/<!--\s*signux_sentiment:\s*(\{[\s\S]*?\})\s*-->/);
  let sentiment: SignuxSentiment | null = null;
  try { if (sentimentMatch) sentiment = JSON.parse(sentimentMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_sentiment:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse sources
  const sourcesMatch = clean.match(/<!--\s*signux_sources:\s*(\[[\s\S]*?\])\s*-->/);
  let sources: SignuxSource[] = [];
  try { if (sourcesMatch) sources = JSON.parse(sourcesMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_sources:\s*\[[\s\S]*?\]\s*-->/g, "");

  // Parse followups
  const followupsMatch = clean.match(/<!--\s*signux_followups:\s*(\[[\s\S]*?\])\s*-->/);
  let followups: SignuxFollowup[] = [];
  try { if (followupsMatch) followups = JSON.parse(followupsMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_followups:\s*\[[\s\S]*?\]\s*-->/g, "");

  // Parse timeline
  const timelineMatch = clean.match(/<!--\s*signux_timeline:\s*(\[[\s\S]*?\])\s*-->/);
  let timeline: SignuxTimelineEvent[] = [];
  try { if (timelineMatch) timeline = JSON.parse(timelineMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_timeline:\s*\[[\s\S]*?\]\s*-->/g, "");

  // Parse competitive intel
  const competitiveMatch = clean.match(/<!--\s*signux_competitive:\s*(\{[\s\S]*?\})\s*-->/);
  let competitive: SignuxCompetitive | null = null;
  try { if (competitiveMatch) competitive = JSON.parse(competitiveMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_competitive:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse workflow
  const workflowMatch = clean.match(/<!--\s*signux_workflow:\s*(\[[\s\S]*?\])\s*-->/);
  let workflow: string[] = [];
  try { if (workflowMatch) workflow = JSON.parse(workflowMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_workflow:\s*\[[\s\S]*?\]\s*-->/g, "");

  // Parse knowledge graph
  const kgMatch = clean.match(/<!--\s*signux_knowledge_graph:\s*(\{[\s\S]*?\})\s*-->/);
  let knowledgeGraph: SignuxKnowledgeGraph | null = null;
  try { if (kgMatch) knowledgeGraph = JSON.parse(kgMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_knowledge_graph:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse financials
  const financialsMatch = clean.match(/<!--\s*signux_financials:\s*(\{[\s\S]*?\})\s*-->/);
  let financials: SignuxFinancials | null = null;
  try { if (financialsMatch) financials = JSON.parse(financialsMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_financials:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse parallel futures
  const parallelMatch = clean.match(/<!--\s*signux_parallel:\s*(\{[\s\S]*?\})\s*-->/);
  let parallel: SignuxParallel | null = null;
  try { if (parallelMatch) parallel = JSON.parse(parallelMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_parallel:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse market (Global Ops)
  const marketMatch = clean.match(/<!--\s*signux_market:\s*(\{[\s\S]*?\})\s*-->/);
  let market: SignuxMarket | null = null;
  try { if (marketMatch) market = JSON.parse(marketMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_market:\s*\{[\s\S]*?\}\s*-->/g, "");

  // Parse investment (Invest)
  const investmentMatch = clean.match(/<!--\s*signux_investment:\s*(\{[\s\S]*?\})\s*-->/);
  let investment: SignuxInvestment | null = null;
  try { if (investmentMatch) investment = JSON.parse(investmentMatch[1]); } catch {}
  clean = clean.replace(/<!--\s*signux_investment:\s*\{[\s\S]*?\}\s*-->/g, "");

  return {
    cleanContent: clean.trim(),
    metadata: { domains, domainCount, blindspots, depth, verification, worklog, vote, sentiment, sources, followups, timeline, competitive, workflow, knowledgeGraph, financials, parallel, market, investment },
  };
}
