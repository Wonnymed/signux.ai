/**
 * Emergence Scaling — MiroFish + academic validation.
 *
 * Spawn N diverse "crowd advisors" beyond the 10 specialists.
 * Each advisor has a unique background → diverse perspectives.
 * Aggregate their positions → "crowd signal" for the Chair.
 *
 * Tiers:
 *   Free: 0 crowd (10 specialists only)
 *   Pro:  20 crowd advisors
 *   Max:  50 crowd advisors
 *
 * Ref: MiroFish (#10 — emergence), "More Agents Is All You Need"
 */

import { callClaude } from './claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type CrowdAdvisor = {
  id: string;
  persona: string;
  background: string;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
};

export type CrowdVote = {
  advisor_id: string;
  persona: string;
  position: 'proceed' | 'delay' | 'abandon';
  confidence: number;
  one_liner: string;
};

export type CrowdSignal = {
  total_advisors: number;
  proceed_count: number;
  delay_count: number;
  abandon_count: number;
  proceed_pct: number;
  avg_confidence: number;
  top_reasons_proceed: string[];
  top_reasons_delay: string[];
  top_reasons_abandon: string[];
  crowd_verdict: 'proceed' | 'delay' | 'abandon';
  consensus_strength: 'strong' | 'moderate' | 'weak' | 'split';
};

// ═══════════════════════════════════════════
// Advisor Persona Pool — Diverse backgrounds
// ═══════════════════════════════════════════

const PERSONA_TEMPLATES = [
  // Risk-averse
  { risk: 'conservative' as const, templates: [
    'Risk-averse Korean restaurant owner with 15 years experience. Lost money on two ventures.',
    'Former bank loan officer who reviewed 500+ small business applications in Seoul.',
    'Conservative family investor. Never risks more than 10% of portfolio.',
    'Retired F&B consultant who saw 80% of startups fail in year one.',
    'Korean insurance underwriter who models business failure probabilities.',
    'Mother of three who bootstrapped a bakery in Bundang. Extremely cautious.',
    'CPA who advises small businesses. Has seen every financial mistake.',
  ]},
  // Moderate
  { risk: 'moderate' as const, templates: [
    'Mid-career entrepreneur who has built and sold two small businesses in Gangnam.',
    'Venture capital analyst at a mid-tier Seoul VC. Data-driven, balanced.',
    'Food industry journalist who covers Gangnam restaurant scene.',
    'Business professor at Yonsei who studies Korean startup ecosystems.',
    'Commercial real estate broker in Gangnam. Knows the market inside out.',
    'Second-generation restaurant family. Balanced between tradition and innovation.',
    'Korean startup accelerator mentor. Seen 200+ pitches.',
  ]},
  // Aggressive
  { risk: 'aggressive' as const, templates: [
    'Serial entrepreneur, 24, just exited a delivery startup. Believes in speed.',
    'Angel investor who made 10x on early Korean F&B bets. Wants big swings.',
    'Growth hacker at a Korean unicorn. Thinks slow = dead.',
    'Fresh MBA from KAIST who believes in disruption over caution.',
    'TikTok food influencer with 500K followers. Sees market from demand side.',
    'Former Coupang product manager. Obsessed with scale and execution speed.',
    'Crypto entrepreneur pivoting to F&B. High risk tolerance, fast mover.',
  ]},
];

/**
 * Generate N diverse crowd advisors with varied personas.
 * Distribution: 40% conservative, 35% moderate, 25% aggressive.
 */
export function generateCrowdAdvisors(count: number): CrowdAdvisor[] {
  const advisors: CrowdAdvisor[] = [];
  const conservative = Math.round(count * 0.4);
  const moderate = Math.round(count * 0.35);
  const aggressive = count - conservative - moderate;

  const pick = (templates: string[], n: number) => {
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    // If we need more than templates available, cycle through
    const result: string[] = [];
    for (let i = 0; i < n; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result;
  };

  const addAdvisors = (risk: CrowdAdvisor['risk_tolerance'], personas: string[]) => {
    for (const persona of personas) {
      advisors.push({
        id: `crowd_${advisors.length}`,
        persona,
        background: persona,
        risk_tolerance: risk,
      });
    }
  };

  addAdvisors('conservative', pick(PERSONA_TEMPLATES[0].templates, conservative));
  addAdvisors('moderate', pick(PERSONA_TEMPLATES[1].templates, moderate));
  addAdvisors('aggressive', pick(PERSONA_TEMPLATES[2].templates, aggressive));

  return advisors;
}

/**
 * Run all crowd advisors in parallel. Each gets a quick-take prompt.
 * Cost: ~$0.005 per advisor (Haiku). 20 advisors = $0.10 total.
 */
export async function runCrowdRound(
  question: string,
  advisors: CrowdAdvisor[],
  coreContext: string,
  specialistSummary: string
): Promise<CrowdVote[]> {
  const BATCH_SIZE = 5;
  const votes: CrowdVote[] = [];

  for (let i = 0; i < advisors.length; i += BATCH_SIZE) {
    const batch = advisors.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(advisor => runSingleAdvisor(advisor, question, coreContext, specialistSummary))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        votes.push(result.value);
      }
    }
  }

  return votes;
}

async function runSingleAdvisor(
  advisor: CrowdAdvisor,
  question: string,
  coreContext: string,
  specialistSummary: string
): Promise<CrowdVote | null> {
  try {
    const response = await callClaude({
      systemPrompt: `You are a crowd advisor giving a QUICK opinion on a business decision.
Your background: ${advisor.persona}
Your risk tolerance: ${advisor.risk_tolerance}

Give your gut reaction in ONE JSON object. Don't overthink — this is a quick-take, not deep analysis.
Return ONLY: {"position":"proceed|delay|abandon","confidence":1-10,"one_liner":"one sentence why"}`,
      userMessage: `${coreContext ? coreContext + '\n\n' : ''}SPECIALIST SUMMARY: ${specialistSummary}

QUESTION: "${question}"

Your quick-take JSON:`,
      maxTokens: 100,
    });

    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
    return {
      advisor_id: advisor.id,
      persona: advisor.persona,
      position: parsed.position || 'delay',
      confidence: Math.min(10, Math.max(1, parsed.confidence || 5)),
      one_liner: parsed.one_liner || 'No comment.',
    };
  } catch {
    return null;
  }
}

/**
 * Synthesize crowd votes into a single "crowd signal" for the Chair.
 */
export function synthesizeCrowdSignal(votes: CrowdVote[]): CrowdSignal {
  if (votes.length === 0) {
    return {
      total_advisors: 0, proceed_count: 0, delay_count: 0, abandon_count: 0,
      proceed_pct: 0, avg_confidence: 0,
      top_reasons_proceed: [], top_reasons_delay: [], top_reasons_abandon: [],
      crowd_verdict: 'delay', consensus_strength: 'weak',
    };
  }

  const proceed = votes.filter(v => v.position === 'proceed');
  const delay = votes.filter(v => v.position === 'delay');
  const abandon = votes.filter(v => v.position === 'abandon');

  const proceedPct = Math.round(proceed.length / votes.length * 100);
  const avgConf = votes.reduce((s, v) => s + v.confidence, 0) / votes.length;

  let crowdVerdict: 'proceed' | 'delay' | 'abandon' = 'delay';
  if (proceed.length >= delay.length && proceed.length >= abandon.length) crowdVerdict = 'proceed';
  else if (abandon.length >= delay.length) crowdVerdict = 'abandon';

  const maxPct = Math.max(proceedPct, Math.round(delay.length / votes.length * 100), Math.round(abandon.length / votes.length * 100));
  let consensus: CrowdSignal['consensus_strength'] = 'split';
  if (maxPct >= 80) consensus = 'strong';
  else if (maxPct >= 60) consensus = 'moderate';
  else if (maxPct >= 45) consensus = 'weak';

  return {
    total_advisors: votes.length,
    proceed_count: proceed.length,
    delay_count: delay.length,
    abandon_count: abandon.length,
    proceed_pct: proceedPct,
    avg_confidence: Math.round(avgConf * 10) / 10,
    top_reasons_proceed: proceed.slice(0, 3).map(v => v.one_liner),
    top_reasons_delay: delay.slice(0, 3).map(v => v.one_liner),
    top_reasons_abandon: abandon.slice(0, 3).map(v => v.one_liner),
    crowd_verdict: crowdVerdict,
    consensus_strength: consensus,
  };
}

/**
 * Format crowd signal for injection into Chair's verdict prompt.
 */
export function formatCrowdSignal(signal: CrowdSignal): string {
  if (signal.total_advisors === 0) return '';

  return `
═══ CROWD SIGNAL (${signal.total_advisors} diverse advisors) ═══
Crowd verdict: ${signal.crowd_verdict.toUpperCase()} (consensus: ${signal.consensus_strength})
Proceed: ${signal.proceed_count} (${signal.proceed_pct}%) | Delay: ${signal.delay_count} | Abandon: ${signal.abandon_count}
Avg confidence: ${signal.avg_confidence}/10

${signal.top_reasons_proceed.length > 0 ? 'Pro-proceed voices:\n' + signal.top_reasons_proceed.map(r => `  • ${r}`).join('\n') : ''}
${signal.top_reasons_delay.length > 0 ? 'Pro-delay voices:\n' + signal.top_reasons_delay.map(r => `  • ${r}`).join('\n') : ''}
${signal.top_reasons_abandon.length > 0 ? 'Pro-abandon voices:\n' + signal.top_reasons_abandon.map(r => `  • ${r}`).join('\n') : ''}
═══════════════════════════════════════════════════════
Weight this signal alongside specialist analysis. Crowd wisdom often catches what experts miss.`;
}
