import { callClaude, parseJSON } from '@/lib/simulation/claude';

// ── Types ────────────────────────────────────────────────────

// CrewAI #7 pattern: Role + Goal + Backstory + Constraints for each persona
export type AdvisorPersona = {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  constraints: string;
  perspective: string;
  emoji: string;
  stakeholder_type: 'customer' | 'competitor' | 'expert' | 'community' | 'supply_chain' | 'indirect' | 'wildcard';
};

// MetaGPT #10: Structured output, SOP-as-prompt
export type AdvisorReport = {
  advisor_id: string;
  advisor_name: string;
  position: 'support' | 'concern' | 'neutral';
  insight: string;
  confidence: number;
  reasoning: string;
  would_they_use_it: boolean;
};

// Palantir #4: Audit trail + DeepEval #12: Scoring
export type CrowdWisdomResult = {
  advisors: AdvisorReport[];
  sentiment: { support: number; concern: number; neutral: number };
  key_insight: string;
  consensus_shift: string;
  quality_score: number;
  stakeholder_coverage: {
    customers: number;
    competitors: number;
    experts: number;
    community: number;
    supply_chain: number;
    indirect: number;
    wildcards: number;
  };
  audit_trail: {
    personas_generated_at: string;
    advisors_completed: number;
    advisors_failed: number;
    total_tokens: number;
    duration_ms: number;
  };
};

// ── Persona Generator (Semantic Kernel #19 plugin pattern) ───

export async function generateAdvisorPersonas(question: string): Promise<AdvisorPersona[]> {
  const response = await callClaude({
    systemPrompt: `You are the Crowd Wisdom Architect for Octux AI. You generate hyper-realistic local advisor personas for business decision validation.

CRITICAL RULES:
1. CONTEXTUAL GENERATION: Analyze the question to extract geographic context, industry, decision type, and cultural context. ALL personas must be relevant to THESE specifics.
2. CULTURAL ACCURACY: Names, titles, and backgrounds must match the cultural/geographic context. Korean names for Korea. Brazilian names for Brazil. American names for USA. No generic names.
3. CrewAI STRUCTURE: Each persona needs Role + Goal + Backstory + Constraints — not just a name and title. Make them REAL people with real motivations.
4. STAKEHOLDER DIVERSITY: You MUST include personas from ALL 7 categories:
   - 3 CUSTOMERS (people who would actually buy/use the product/service)
   - 3 COMPETITORS (existing business owners in the same or adjacent space)
   - 3 DOMAIN EXPERTS (people with deep technical or industry knowledge)
   - 3 COMMUNITY members (residents, neighbors, local government, community leaders)
   - 3 SUPPLY CHAIN (suppliers, distributors, delivery, logistics, service providers)
   - 3 INDIRECT stakeholders (investors, landlords, employees, family members affected)
   - 2 WILDCARDS (unexpected perspectives that could reveal blind spots)
5. NO OVERLAP: Each persona must bring a genuinely different insight. If two personas would say the same thing, replace one.
6. REALISTIC CONSTRAINTS: Each persona has biases and limitations — acknowledge them. A landlord wants to rent; a competitor wants you to fail; a customer wants low prices. These biases ARE the value.
7. Return ONLY valid JSON array, nothing else.`,
    userMessage: `Generate 20 advisor personas for this decision: "${question}"

Return JSON array where each object has:
{
  "id": "advisor_1",
  "name": "Full Name, Title",
  "role": "Specific role description",
  "goal": "What they want to find out or validate about this decision",
  "backstory": "1-2 sentences of lived experience making them credible",
  "constraints": "What limits their perspective or creates bias",
  "perspective": "The unique insight only they can provide",
  "emoji": "relevant emoji",
  "stakeholder_type": "customer|competitor|expert|community|supply_chain|indirect|wildcard"
}`,
    maxTokens: 3072,
  });

  try {
    const personas = parseJSON<AdvisorPersona[]>(response);
    // Validate we got all 7 stakeholder types
    const types = new Set(personas.map((p) => p.stakeholder_type));
    if (types.size < 5) {
      console.warn('Crowd Wisdom: Low stakeholder diversity, only', types.size, 'types represented');
    }
    return personas;
  } catch (error) {
    console.error('Failed to parse advisor personas:', error);
    return [];
  }
}

// ── Crowd Wisdom Runner (AutoGen #9 + Perplexity #14 + DeepEval #12 + Palantir #4) ───

export async function runCrowdWisdom(
  question: string,
  personas: AdvisorPersona[],
  mainVerdictSummary: string,
): Promise<CrowdWisdomResult> {
  const startTime = Date.now();

  // AutoGen #9: Run all 20 in parallel with Promise.allSettled
  const advisorPromises = personas.map(async (persona): Promise<AdvisorReport | null> => {
    try {
      const response = await callClaude({
        systemPrompt: `You are ${persona.name}. ${persona.role}.

BACKSTORY: ${persona.backstory}
YOUR GOAL: ${persona.goal}
YOUR BIAS (be honest about it): ${persona.constraints}

You are being consulted about a business decision. Give your honest, personal perspective based on your lived experience and specific knowledge. Speak authentically as this person would — use their vocabulary, reference their daily reality, mention specific things only they would know.

CRITICAL: Your response must be SPECIFIC to the question. Reference real details from the question (location, industry, numbers). Do NOT give generic advice.

Respond with valid JSON only. No markdown, no explanation outside JSON.`,
        userMessage: `DECISION BEING EVALUATED: "${question}"

10 specialist analysts concluded: ${mainVerdictSummary}

As ${persona.name} (${persona.perspective}), what is your honest personal take on this decision?

JSON format:
{
  "advisor_id": "${persona.id}",
  "advisor_name": "${persona.name}",
  "position": "support" or "concern" or "neutral",
  "insight": "1-2 sentences from your specific lived experience — be concrete, not generic",
  "confidence": 1-10,
  "reasoning": "1 sentence explaining WHY you feel this way based on your background",
  "would_they_use_it": true or false
}`,
        maxTokens: 256,
        model: 'claude-haiku-4-5-20251001',
      });

      return parseJSON<AdvisorReport>(response);
    } catch (error) {
      console.error(`Advisor ${persona.id} (${persona.name}) failed:`, error);
      return null;
    }
  });

  // AutoGen #9: Termination — wait for all, tolerate failures
  const results = await Promise.allSettled(advisorPromises);
  const advisors = results
    .filter((r): r is PromiseFulfilledResult<AdvisorReport | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((r): r is AdvisorReport => r !== null);

  const failed =
    results.filter((r) => r.status === 'rejected').length +
    results.filter((r) => r.status === 'fulfilled' && r.value === null).length;

  // DeepEval #12: Calculate sentiment percentages
  const total = advisors.length || 1;
  const supportCount = advisors.filter((a) => a.position === 'support').length;
  const concernCount = advisors.filter((a) => a.position === 'concern').length;
  const support = Math.round((supportCount / total) * 100);
  const concern = Math.round((concernCount / total) * 100);
  const neutral = 100 - support - concern;

  // DeepEval #12: Find key insight — highest confidence dissenter
  const majority = support >= concern ? 'support' : 'concern';
  const dissenter = advisors
    .filter((a) => a.position !== majority)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const key_insight = dissenter
    ? `${dissenter.advisor_name}: "${dissenter.insight}"`
    : advisors.sort((a, b) => b.confidence - a.confidence)[0]?.insight || 'No clear signal from crowd.';

  // DeepEval #12: Generate consensus shift analysis
  let consensus_shift: string;
  if (support > 70) {
    consensus_shift =
      'Local voices strongly validate the specialist analysis. High confidence to proceed with the recommended action.';
  } else if (concern > 70) {
    consensus_shift =
      'Local voices raise significant ground-level concerns that specialists may have missed. Consider additional validation before committing.';
  } else if (Math.abs(support - concern) < 15) {
    consensus_shift =
      'Local voices are split — this suggests the decision has real trade-offs that depend on execution quality and timing.';
  } else {
    consensus_shift =
      'Mixed signals from local voices. The specialist verdict holds, but pay attention to the specific concerns raised.';
  }

  // DeepEval #12: Quality score based on diversity + specificity
  const stakeholderTypes = new Set(personas.map((p) => p.stakeholder_type));
  const diversityScore = (stakeholderTypes.size / 7) * 50;
  const completionScore = (advisors.length / personas.length) * 30;
  const confidenceVariance =
    advisors.length > 1
      ? Math.min(20, new Set(advisors.map((a) => a.confidence)).size * 4)
      : 0;
  const quality_score = Math.round(diversityScore + completionScore + confidenceVariance);

  // Palantir #4: Stakeholder coverage audit
  const stakeholder_coverage = {
    customers: personas.filter((p) => p.stakeholder_type === 'customer').length,
    competitors: personas.filter((p) => p.stakeholder_type === 'competitor').length,
    experts: personas.filter((p) => p.stakeholder_type === 'expert').length,
    community: personas.filter((p) => p.stakeholder_type === 'community').length,
    supply_chain: personas.filter((p) => p.stakeholder_type === 'supply_chain').length,
    indirect: personas.filter((p) => p.stakeholder_type === 'indirect').length,
    wildcards: personas.filter((p) => p.stakeholder_type === 'wildcard').length,
  };

  // Palantir #4: Full audit trail
  const audit_trail = {
    personas_generated_at: new Date().toISOString(),
    advisors_completed: advisors.length,
    advisors_failed: failed,
    total_tokens: 0,
    duration_ms: Date.now() - startTime,
  };

  return {
    advisors,
    sentiment: { support, concern, neutral },
    key_insight,
    consensus_shift,
    quality_score,
    stakeholder_coverage,
    audit_trail,
  };
}
