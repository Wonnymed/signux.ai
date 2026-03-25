/**
 * Domain Detection — Classify any question into a domain.
 * Adapts agent behavior, disclaimers, and share formatting.
 *
 * Domains:
 *   business    — startups, operations, strategy, market entry
 *   investment  — stocks, crypto, ETFs, portfolio, trading
 *   career      — hiring, job change, salary, team building
 *   health      — medical decisions, wellness, mental health
 *   legal       — contracts, IP, compliance, regulations
 *   education   — learning paths, courses, certifications
 *   real_estate — property, rent, location decisions
 *   personal    — life decisions, relationships, relocation
 *   technology  — tech stack, architecture, build vs buy
 *   general     — catch-all for anything else
 */

import { callClaude, parseJSON } from './claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type QuestionDomain =
  | 'business' | 'investment' | 'career' | 'health'
  | 'legal' | 'education' | 'real_estate' | 'personal'
  | 'technology' | 'general';

export type DomainClassification = {
  domain: QuestionDomain;
  confidence: number;
  subdomain: string;
  disclaimer_required: boolean;
  agent_constraints: string[];
};

// ═══════════════════════════════════════════
// DOMAIN DISCLAIMERS — Legal protection
// ═══════════════════════════════════════════

export const DOMAIN_DISCLAIMERS: Record<string, string> = {
  investment: '⚠ Octux provides decision analysis, not financial advice. Past performance does not guarantee future results. Consult a licensed financial advisor before making investment decisions.',
  legal: '⚠ Octux provides decision analysis, not legal advice. This analysis does not constitute legal counsel. Consult a licensed attorney for legal matters.',
  health: '⚠ Octux provides decision analysis, not medical advice. This analysis is informational only. Consult a qualified healthcare professional for medical decisions.',
};

// ═══════════════════════════════════════════
// DOMAIN → AGENT CONSTRAINTS
// ═══════════════════════════════════════════

const DOMAIN_AGENT_CONSTRAINTS: Record<string, string[]> = {
  investment: [
    'You are analyzing an INVESTMENT decision. Focus on risk-reward, historical data, market conditions, and portfolio impact.',
    'NEVER say "you should invest" or "buy/sell X." Instead say "the analysis suggests..." or "historically, this pattern..."',
    'Always present multiple scenarios (bull/base/bear) with probabilities.',
    'Cite specific data points: P/E ratios, historical returns, volatility, market cap when available.',
    'Consider the user\'s risk tolerance, time horizon, and portfolio diversification.',
  ],
  career: [
    'You are analyzing a CAREER decision. Focus on growth trajectory, compensation, culture fit, and opportunity cost.',
    'Consider both financial (salary, equity, benefits) and non-financial (growth, learning, work-life balance) factors.',
    'Reference market data for compensation benchmarks when available.',
  ],
  health: [
    'You are analyzing a HEALTH-RELATED decision. Be empathetic and evidence-based.',
    'NEVER diagnose or prescribe. Present evidence and trade-offs for the user to discuss with their healthcare provider.',
    'Cite success rates, side effects, and alternative approaches when available.',
  ],
  legal: [
    'You are analyzing a LEGAL decision. Focus on risk exposure, compliance requirements, and precedents.',
    'NEVER provide legal advice or interpret specific laws. Present the landscape of considerations.',
    'Flag jurisdiction-specific requirements and recommend professional legal review.',
  ],
  real_estate: [
    'You are analyzing a REAL ESTATE decision. Focus on location data, market trends, ROI, and comparable transactions.',
    'Consider both financial returns and lifestyle/operational factors.',
    'Reference local market conditions, price trends, and regulatory requirements.',
  ],
  technology: [
    'You are analyzing a TECHNOLOGY decision. Focus on scalability, maintenance cost, team capabilities, and ecosystem maturity.',
    'Consider total cost of ownership (TCO), migration effort, and vendor lock-in.',
    'Reference benchmarks, adoption rates, and community health when available.',
  ],
  business: [
    'You are analyzing a BUSINESS decision. Focus on unit economics, market validation, competitive landscape, and execution risk.',
    'Ground analysis in data: market size, growth rates, comparable businesses, regulatory requirements.',
  ],
  education: [
    'You are analyzing an EDUCATION decision. Focus on ROI (time + money vs career impact), program quality, and alternative paths.',
    'Consider opportunity cost, market demand for skills, and networking value.',
  ],
  personal: [
    'You are analyzing a PERSONAL decision. Be empathetic but analytical.',
    'Balance quantitative factors (cost, time, logistics) with qualitative ones (happiness, relationships, values).',
    'Avoid being prescriptive about personal values — present trade-offs neutrally.',
  ],
  general: [
    'Analyze this decision systematically using data and structured reasoning.',
  ],
};

// ═══════════════════════════════════════════
// detectDomain() — Classify question
// ═══════════════════════════════════════════

export async function detectDomain(question: string): Promise<DomainClassification> {
  const q = question.toLowerCase();

  // ── FAST PATH: keyword matching ──
  const investmentKeywords = [
    'invest', 'stock', 'crypto', 'bitcoin', 'ethereum', 'etf', 'portfolio',
    'trade', 'trading', 'buy shares', 'sell shares', 'dividend', 'p/e ratio',
    'market cap', 'ipo', 'bonds', 'forex', 'options', 'hedge', '401k', 'ira',
    'roth', 'index fund', 'mutual fund', 'nasdaq', 'nyse', 'sp500', 's&p',
    'kospi', 'kosdaq', 'nikkei', 'cryptocurrency', 'defi', 'nft',
    'bull market', 'bear market', 'short sell', 'long position',
  ];

  const healthKeywords = [
    'surgery', 'treatment', 'diagnosis', 'medication', 'therapy', 'doctor',
    'hospital', 'medical', 'health', 'symptom', 'disease', 'mental health',
    'depression', 'anxiety', 'supplement', 'diet plan', 'procedure',
  ];

  const legalKeywords = [
    'lawyer', 'lawsuit', 'sue', 'contract', 'patent', 'trademark', 'copyright',
    'liability', 'compliance', 'regulation', 'legal', 'court', 'attorney',
    'intellectual property', 'nda', 'terms of service', 'gdpr', 'incorporation',
  ];

  const careerKeywords = [
    'hire', 'hiring', 'job offer', 'salary', 'resign', 'quit my job',
    'career change', 'promotion', 'co-founder', 'cto', 'vp of', 'team lead',
    'remote work', 'freelance', 'contractor', 'resume', 'interview',
  ];

  const realEstateKeywords = [
    'rent', 'lease', 'buy house', 'sell house', 'apartment', 'property',
    'mortgage', 'real estate', 'commercial space', 'office space', 'location for',
  ];

  const educationKeywords = [
    'degree', 'university', 'bootcamp', 'course', 'certification', 'mba',
    'masters', 'phd', 'study abroad', 'online course', 'learn',
  ];

  const technologyKeywords = [
    'tech stack', 'framework', 'build vs buy', 'migrate', 'architecture',
    'saas', 'cloud provider', 'aws vs', 'react vs', 'database',
    'monolith', 'microservice', 'kubernetes', 'deploy',
  ];

  // Check each domain
  const matches: { domain: QuestionDomain; count: number }[] = [];

  const countMatches = (keywords: string[], domain: QuestionDomain) => {
    const count = keywords.filter(kw => q.includes(kw)).length;
    if (count > 0) matches.push({ domain, count });
  };

  countMatches(investmentKeywords, 'investment');
  countMatches(healthKeywords, 'health');
  countMatches(legalKeywords, 'legal');
  countMatches(careerKeywords, 'career');
  countMatches(realEstateKeywords, 'real_estate');
  countMatches(educationKeywords, 'education');
  countMatches(technologyKeywords, 'technology');

  // If clear keyword match, return immediately (no LLM cost)
  if (matches.length > 0) {
    matches.sort((a, b) => b.count - a.count);
    const topDomain = matches[0].domain;
    const confidence = Math.min(0.95, 0.6 + matches[0].count * 0.1);
    return buildClassification(topDomain, confidence, question);
  }

  // ── SLOW PATH: LLM classification for ambiguous questions ──
  try {
    const response = await callClaude({
      systemPrompt: `Classify this question into exactly ONE domain.
Domains: business, investment, career, health, legal, education, real_estate, personal, technology, general.
Return ONLY JSON: {"domain":"...","subdomain":"specific area","confidence":0.0-1.0}`,
      userMessage: `"${question}"`,
      maxTokens: 60,
    });

    const parsed = parseJSON<{ domain: string; subdomain?: string; confidence?: number }>(response);
    const domain = (parsed?.domain || 'general') as QuestionDomain;
    const validDomains: QuestionDomain[] = ['business', 'investment', 'career', 'health', 'legal', 'education', 'real_estate', 'personal', 'technology', 'general'];
    const safeDomain = validDomains.includes(domain) ? domain : 'general';

    return buildClassification(safeDomain, parsed?.confidence || 0.7, question, parsed?.subdomain);
  } catch {
    // Fallback to business (most common)
    return buildClassification('business', 0.5, question);
  }
}

function buildClassification(
  domain: QuestionDomain,
  confidence: number,
  _question: string,
  subdomain?: string
): DomainClassification {
  const disclaimerDomains = ['investment', 'legal', 'health'];

  return {
    domain,
    confidence,
    subdomain: subdomain || domain,
    disclaimer_required: disclaimerDomains.includes(domain),
    agent_constraints: DOMAIN_AGENT_CONSTRAINTS[domain] || DOMAIN_AGENT_CONSTRAINTS.general,
  };
}

/**
 * Get the disclaimer text for a domain. Returns empty string if none needed.
 */
export function getDisclaimer(domain: QuestionDomain): string {
  return DOMAIN_DISCLAIMERS[domain] || '';
}

/**
 * Format domain constraints for injection into agent system prompts.
 */
export function formatDomainConstraints(classification: DomainClassification): string {
  if (classification.agent_constraints.length === 0) return '';

  return `
── DOMAIN CONTEXT: ${classification.domain.toUpperCase()} (${classification.subdomain}) ──
${classification.agent_constraints.map(c => `• ${c}`).join('\n')}
──────────────────────────────────────────────────────────
`;
}

// ═══════════════════════════════════════════
// SHARE DIGEST — 3-line social-optimized summary
// ═══════════════════════════════════════════

export function generateShareDigest(
  question: string,
  verdict: any,
  domain: QuestionDomain,
  agentCount: number = 10
): string {
  void domain;
  const rec = (verdict?.recommendation || 'unknown').toUpperCase();
  const prob = verdict?.probability || 0;
  const oneLiner = verdict?.one_liner || verdict?.summary || '';
  const mainRisk = verdict?.main_risk || '';
  const nextAction = verdict?.next_action || '';

  const questionShort = question.length > 80 ? question.substring(0, 77) + '...' : question;

  const line1 = `"${questionShort}"`;
  const line2 = `→ ${rec} (${prob}%)${oneLiner ? ' — ' + oneLiner.substring(0, 80) : ''}`;

  const insight = mainRisk
    ? `Key risk: ${mainRisk.substring(0, 50)}.`
    : nextAction
      ? `Next: ${nextAction.substring(0, 50)}.`
      : '';
  const line3 = `${agentCount} AI specialists debated.${insight ? ' ' + insight : ''}`;

  return `${line1}\n${line2}\n${line3}`;
}
