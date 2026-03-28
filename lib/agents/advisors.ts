import { callClaude, parseJSON, MODELS } from '@/lib/simulation/claude';

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
  icon: string;               // Lucide icon name
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

// ── Field Teams ─────────────────────────────────────────────

export type FieldTeam = {
  id: string;
  name: string;
  icon: string;               // Lucide icon name
  description: string;
  stakeholder_types: string[];
  count_20: number;
  count_50: number;
  count_100: number;
};

export const FIELD_TEAMS: FieldTeam[] = [
  {
    id: 'customer_panel',
    name: 'Customer Panel',
    icon: 'ShoppingCart',
    description: 'What real customers think and would pay',
    stakeholder_types: ['customer'],
    count_20: 3,
    count_50: 8,
    count_100: 15,
  },
  {
    id: 'competitor_watch',
    name: 'Competitor Watch',
    icon: 'Store',
    description: 'What your competition sees and plans',
    stakeholder_types: ['competitor'],
    count_20: 3,
    count_50: 7,
    count_100: 14,
  },
  {
    id: 'expert_council',
    name: 'Expert Council',
    icon: 'GraduationCap',
    description: 'Deep domain and industry knowledge',
    stakeholder_types: ['expert'],
    count_20: 3,
    count_50: 7,
    count_100: 14,
  },
  {
    id: 'community_pulse',
    name: 'Community Pulse',
    icon: 'MapPin',
    description: 'Local ground truth and neighborhood reality',
    stakeholder_types: ['community'],
    count_20: 3,
    count_50: 7,
    count_100: 14,
  },
  {
    id: 'supply_network',
    name: 'Supply Network',
    icon: 'Link',
    description: 'Operational and supply chain reality check',
    stakeholder_types: ['supply_chain'],
    count_20: 3,
    count_50: 7,
    count_100: 14,
  },
  {
    id: 'stakeholder_ring',
    name: 'Stakeholder Ring',
    icon: 'Users',
    description: 'Everyone else affected by this decision',
    stakeholder_types: ['indirect'],
    count_20: 3,
    count_50: 7,
    count_100: 14,
  },
  {
    id: 'wild_cards',
    name: 'Wild Cards',
    icon: 'Shuffle',
    description: 'Perspectives nobody expected',
    stakeholder_types: ['wildcard'],
    count_20: 2,
    count_50: 7,
    count_100: 15,
  },
];

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
  team_breakdown?: {
    team_name: string;
    team_icon: string;
    count: number;
    support: number;
    concern: number;
    neutral: number;
  }[];
  audit_trail: {
    personas_generated_at: string;
    advisors_completed: number;
    advisors_failed: number;
    total_tokens: number;
    duration_ms: number;
  };
};

// ── Persona Generator (Semantic Kernel #19 plugin pattern) ───

export async function generateAdvisorPersonas(question: string, userGuidance?: string, count = 20): Promise<AdvisorPersona[]> {
  // Scale distribution and detail based on count
  let distribution: string;
  let maxTokens: number;

  if (count <= 20) {
    distribution = `Generate EXACTLY 20 personas. Distribute across 7 Field Teams:
   - Customer Panel (3): people who would actually buy/use the product/service
   - Competitor Watch (3): existing business owners in the same or adjacent space
   - Expert Council (3): people with deep technical or industry knowledge
   - Community Pulse (3): residents, neighbors, local government, community leaders
   - Supply Network (3): suppliers, distributors, delivery, logistics, service providers
   - Stakeholder Ring (3): investors, landlords, employees, family members affected
   - Wild Cards (2): unexpected perspectives that could reveal blind spots`;
    maxTokens = 3072;
  } else if (count <= 50) {
    distribution = `Generate EXACTLY 50 personas with DEEP stakeholder diversity. Distribute across 7 Field Teams:
   - Customer Panel (8): ultra-diverse: different ages, income levels, usage frequency, locals vs visitors, different needs and preferences
   - Competitor Watch (7): direct competitors at different scales, indirect competitors, adjacent businesses, franchise operators, online-only competitors
   - Expert Council (7): industry consultants, technologists, designers, marketing specialists, financial analysts, legal experts, academic researchers
   - Community Pulse (7): residents from different neighborhoods, local officials, community leaders, school administrators, religious leaders, elderly care, local media
   - Supply Network (7): suppliers at different tiers, equipment vendors, logistics, delivery, packaging, maintenance, technology vendors
   - Stakeholder Ring (7): investors, landlords, employees at different levels, family members, neighboring businesses, influencers, regulators
   - Wild Cards (7): unexpected perspectives: tourists, activists, former employees of failed similar businesses, teenagers, elderly longtime residents, foreign observers, people with accessibility needs`;
    maxTokens = 6144;
  } else {
    distribution = `Generate EXACTLY 100 personas — this should feel like polling an ENTIRE community. Distribute across 7 Field Teams:
   - Customer Panel (15): ultra-diverse: ages 15-75, income from student to executive, daily to monthly users, locals to tourists, different dietary needs, solo diners to family groups, date night couples, business lunch crowd, food delivery only users
   - Competitor Watch (14): direct competitors at different scales, indirect competitors, adjacent businesses, franchise operators, ghost kitchen operators, food truck owners, catering businesses, convenience store food sections, meal delivery services, vending operators, food court vendors
   - Expert Council (14): industry consultants, food scientists, restaurant designers, menu engineers, marketing specialists, social media managers, food photographers, health inspectors, commercial real estate agents, restaurant accountants, labor lawyers, supply chain specialists, food safety auditors, technology vendors
   - Community Pulse (14): residents of different neighborhoods, local government officials, community leaders, neighborhood associations, school administrators, religious leaders, elderly care facility managers, park workers, street vendors, security guards, parking attendants, building doormen, local reporters, social workers
   - Supply Network (14): food suppliers at different tiers, equipment vendors, cleaning supplies, waste management, delivery drivers, packaging suppliers, linen services, pest control, HVAC maintenance, POS vendors, payment processing, insurance agents, kitchen designers, refrigeration specialists
   - Stakeholder Ring (14): investors, landlords, employees at different levels, family members, neighboring business owners, building management, franchise partners, delivery platform reps, influencers, food bloggers, tourism board, university professors, bank loan officers, insurance underwriters
   - Wild Cards (15): a first-time tourist, someone who got food poisoning nearby, a delivery driver who knows order density, a grandmother who's eaten here 40 years, a broke teenager, a corporate event planner, a wedding caterer, a hospital dietitian, a 2am worker seeking late-night food, a parent with a picky child, a vegan in a meat-heavy area, a food waste activist, a Michelin scout, an owner of a restaurant that closed here, a real estate speculator`;
    maxTokens = 10240;
  }

  const response = await callClaude({
    systemPrompt: `You are the Crowd Wisdom Architect for Octux AI. You generate hyper-realistic local advisor personas for business decision validation.

CRITICAL RULES:
1. CONTEXTUAL GENERATION: Analyze the question to extract geographic context, industry, decision type, and cultural context. ALL personas must be relevant to THESE specifics.
2. CULTURAL ACCURACY: Names, titles, and backgrounds must match the cultural/geographic context. Korean names for Korea. Brazilian names for Brazil. American names for USA. No generic names.
3. CrewAI STRUCTURE: Each persona needs Role + Goal + Backstory + Constraints — not just a name and title. Make them REAL people with real motivations.
4. STAKEHOLDER DIVERSITY: ${distribution}
5. NO OVERLAP: Each persona must bring a genuinely different insight. If two personas would say the same thing, replace one.
6. REALISTIC CONSTRAINTS: Each persona has biases and limitations — acknowledge them. A landlord wants to rent; a competitor wants you to fail; a customer wants low prices. These biases ARE the value.
7. Return ONLY valid JSON array, nothing else.${count > 50 ? '\n8. IMPORTANT: For large counts, keep backstory to 1 sentence and constraints to a short phrase to fit within token limits.' : ''}`,
    userMessage: `Generate ${count} advisor personas for this decision: "${question}"
${userGuidance ? `\nUSER GUIDANCE FOR PERSONAS:\nThe user specifically wants these types of perspectives included:\n${userGuidance}\n\nYou MUST incorporate the user's requested personas. Fill remaining slots to reach ${count} with your own contextual picks. Prioritize the user's requests — they know their situation better than you do.\n` : ''}
Return JSON array where each object has:
{
  "id": "advisor_1",
  "name": "Full Name, Title",
  "role": "Specific role description",
  "goal": "What they want to find out or validate about this decision",
  "backstory": "${count > 50 ? '1 sentence' : '1-2 sentences'} of lived experience making them credible",
  "constraints": "What limits their perspective or creates bias",
  "perspective": "The unique insight only they can provide",
  "icon": "one of: ShoppingCart, Store, GraduationCap, MapPin, Link, Users, Shuffle, Briefcase, Building, Heart, Coffee, Truck, Phone, Globe, BookOpen, Wrench, Scale, TrendingUp, Shield, DollarSign",
  "stakeholder_type": "customer|competitor|expert|community|supply_chain|indirect|wildcard"
}`,
    maxTokens,
  });

  try {
    const personas = parseJSON<AdvisorPersona[]>(response);
    const types = new Set(personas.map((p) => p.stakeholder_type));
    if (types.size < 5) {
      console.warn('Crowd Wisdom: Low stakeholder diversity, only', types.size, 'types represented');
    }
    console.log(`[crowd_wisdom] Generated ${personas.length}/${count} personas across ${types.size} stakeholder types`);
    return personas;
  } catch (error) {
    console.error('Failed to parse advisor personas, attempting fallback:', error);

    // Fallback for large counts: simpler prompt with less detail per persona
    if (count > 20) {
      try {
        const fallbackResponse = await callClaude({
          systemPrompt: `Generate ${count} advisor personas as a JSON array. Each object: { "id": "advisor_N", "name": "Full Name, Title", "role": "role", "goal": "goal", "backstory": "1 sentence", "constraints": "bias", "perspective": "unique angle", "icon": "LucideIconName", "stakeholder_type": "customer|competitor|expert|community|supply_chain|indirect|wildcard" }. Return ONLY valid JSON array.`,
          userMessage: `Decision: "${question}"\n\nGenerate ${count} diverse personas. Keep each persona concise (1 sentence backstory). Cover all 7 stakeholder types proportionally.`,
          maxTokens,
        });
        const fallbackPersonas = parseJSON<AdvisorPersona[]>(fallbackResponse);
        console.log(`[crowd_wisdom] Fallback succeeded: ${fallbackPersonas.length} personas`);
        return fallbackPersonas;
      } catch (fallbackError) {
        console.error('Fallback persona generation also failed:', fallbackError);
        return [];
      }
    }

    return [];
  }
}

