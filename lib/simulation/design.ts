import { getModel } from '@/lib/config/model-tiers';
import { buildChiefOrchestratorPrompt } from '@/lib/prompts/chief-orchestrator';
import { callAgentWithSearch } from '@/lib/simulation/agent-call';
import type { OperatorProfile } from '@/lib/operator/types';
import type {
  ChiefSimulationMode,
  ChiefTier,
  CrowdSegment,
  OperatorAgentPlan,
  SimulationDesign,
  SpecialistChiefDesign,
  SpecialistPlan,
  SwarmChiefDesign,
} from '@/lib/simulation/types';

function formatProfileForChief(profile: OperatorProfile | null): string {
  if (!profile) return 'No profile available. Design for a general business user.';
  const lines = [
    `Name: ${profile.name || 'Unknown'}`,
    `Location: ${profile.location || '—'}`,
    `Type: ${profile.operatorType || '—'}`,
    `Industry: ${profile.industry || '—'}`,
    `Business stage: ${profile.businessStage || '—'}`,
    `Focus: ${profile.currentFocus || '—'}`,
    `Idea: ${profile.businessIdea || '—'}`,
    `Stage (aspiring): ${profile.stage || '—'}`,
    `Capital: ${profile.availableCapital || '—'}`,
    `Investor type: ${profile.investorType || '—'}`,
    `Check size: ${profile.checkSize || '—'}`,
    `Role: ${profile.currentRole || '—'}`,
    `Decision context: ${profile.decisionContext || '—'}`,
    `Goal: ${profile.goal || '—'}`,
    `Risk tolerance (0–1): ${profile.riskTolerance}`,
    `Decision speed (0–1): ${profile.decisionSpeed}`,
  ];
  return lines.filter((l) => !l.endsWith(': —') && !l.endsWith(': ')).join('\n');
}

function sumSegmentCounts(segs: CrowdSegment[]): number {
  return segs.reduce((a, s) => a + (Number(s.count) || 0), 0);
}

function normalizeSpecialistPayload(
  raw: Record<string, unknown>,
  mode: ChiefSimulationMode,
): SpecialistChiefDesign {
  const specs = Array.isArray(raw.specialists) ? raw.specialists : [];
  const specialists: SpecialistPlan[] = specs.map((s, i) => {
    const o = s as Record<string, unknown>;
    return {
      id: String(o.id || `expert_${i + 1}`),
      name: String(o.name || `Specialist ${i + 1}`),
      role: String(o.role || 'Advisor'),
      expertise: String(o.expertise || ''),
      bias: String(o.bias || ''),
      personality: String(o.personality || ''),
      speaking_style: String(o.speaking_style || o.speakingStyle || ''),
      task: String(o.task || ''),
      team: o.team === 'A' || o.team === 'B' ? o.team : undefined,
    };
  });

  let operator: OperatorAgentPlan | null = null;
  const op = raw.operator;
  if (op && typeof op === 'object' && op !== null && mode !== 'compare') {
    const o = op as Record<string, unknown>;
    operator = {
      id: 'operator',
      name: String(o.name || 'You'),
      role: String(o.role || 'Decision-maker'),
      perspective: String(o.perspective || ''),
      constraints: String(o.constraints || ''),
      speaking_style: String(o.speaking_style || o.speakingStyle || ''),
      task: o.task != null ? String(o.task) : undefined,
    };
  }

  return { kind: 'specialist', specialists, operator: mode === 'compare' ? null : operator };
}

function normalizeSwarmPayload(
  raw: Record<string, unknown>,
  mode: ChiefSimulationMode,
): SwarmChiefDesign {
  if (mode === 'compare') {
    const a = Array.isArray(raw.segments_a) ? (raw.segments_a as unknown[]) : [];
    const b = Array.isArray(raw.segments_b) ? (raw.segments_b as unknown[]) : [];
    const segments_a = a.map(normalizeOneSegment);
    const segments_b = b.map(normalizeOneSegment);
    return { kind: 'swarm', segments: [...segments_a, ...segments_b], segments_a, segments_b };
  }
  const segs = Array.isArray(raw.segments) ? (raw.segments as unknown[]) : [];
  return { kind: 'swarm', segments: segs.map(normalizeOneSegment) };
}

function normalizeOneSegment(s: unknown, i: number): CrowdSegment {
  const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
  const segment = String(o.segment ?? o.name ?? `Segment ${i + 1}`);
  return {
    segment,
    count: Math.max(1, Math.floor(Number(o.count) || 1)),
    behavior: String(o.behavior || ''),
    income_level: o.income_level != null ? String(o.income_level) : undefined,
    context: String(o.context || ''),
    sample_voice: String(o.sample_voice || o.sampleVoice || ''),
  };
}

export function buildFallbackChiefDesign(
  question: string,
  profile: OperatorProfile | null,
  mode: ChiefSimulationMode,
  tier: ChiefTier,
): SimulationDesign {
  const q = question.slice(0, 80);
  if (tier === 'swarm') {
    if (mode === 'compare') {
      const segments_a: CrowdSegment[] = [
        {
          segment: 'Pragmatic buyers (A)',
          count: 250,
          behavior: 'Price-sensitive, risk-aware',
          context: q,
          sample_voice: 'I might go with A if the total cost stays predictable.',
        },
        {
          segment: 'Optimists (A)',
          count: 250,
          behavior: 'Early adopters',
          context: q,
          sample_voice: 'Option A feels faster to ship; I’d try it.',
        },
      ];
      const segments_b: CrowdSegment[] = [
        {
          segment: 'Quality-first (B)',
          count: 250,
          behavior: 'Prefer control and customization',
          context: q,
          sample_voice: 'B is more work but I sleep better at night.',
        },
        {
          segment: 'Skeptics (B)',
          count: 250,
          behavior: 'Doubt both; need proof',
          context: q,
          sample_voice: 'Show me churn and support costs before I pick B.',
        },
      ];
      return { kind: 'swarm', segments: [...segments_a, ...segments_b], segments_a, segments_b };
    }
    return {
      kind: 'swarm',
      segments: [
        {
          segment: 'Local commuters',
          count: 400,
          behavior: 'Practical daily decisions',
          context: q,
          sample_voice: 'If it saves time and money, I’m in.',
        },
        {
          segment: 'Young professionals',
          count: 350,
          behavior: 'Trend-sensitive',
          context: q,
          sample_voice: 'I’d try it if friends recommend it.',
        },
        {
          segment: 'Small business owners',
          count: 250,
          behavior: 'Cash-flow focused',
          context: q,
          sample_voice: 'What’s the payback period?',
        },
      ],
    };
  }

  const baseSpecs: SpecialistPlan[] = [
    {
      id: 'market_local',
      name: 'Local market realist',
      role: 'Street-level demand',
      expertise: 'Foot traffic, local competition, neighborhood economics',
      bias: 'Skeptical of projections without local proof',
      personality: 'Direct, numbers-anchored',
      speaking_style: 'I’ve seen three shops like this fail on this block — here’s why.',
      task: 'Stress-test demand and location fit',
    },
    {
      id: 'unit_econ',
      name: 'Unit economics auditor',
      role: 'Margins and breakeven',
      expertise: 'COGS, rent, labor, pricing power',
      bias: 'Defaults to downside cases',
      personality: 'Cold but fair',
      speaking_style: 'Your margin story doesn’t close unless rent is locked for 24 months.',
      task: 'Model breakeven and cash runway sensitivity',
    },
    {
      id: 'ops',
      name: 'Operator',
      role: 'Execution',
      expertise: 'Hiring, vendors, daily operations',
      bias: 'Hates theoretical strategy',
      personality: 'Pragmatic',
      speaking_style: 'Who actually runs this day one — you or a phantom COO?',
      task: 'Expose operational choke points',
    },
    {
      id: 'risk',
      name: 'Risk cartographer',
      role: 'Failure modes',
      expertise: 'Regulatory, supply, macro shocks',
      bias: 'Looks for tail risks',
      personality: 'Calm, forensic',
      speaking_style: 'The failure isn’t demand — it’s what happens when your supplier slips.',
      task: 'Map top failure vectors',
    },
  ];

  if (mode === 'compare') {
    const fill = (team: 'A' | 'B'): SpecialistPlan[] => {
      const out: SpecialistPlan[] = [];
      for (let j = 0; j < 5; j++) {
        out.push({
          id: `${team.toLowerCase()}_${j + 1}`,
          name: `Team ${team} specialist ${j + 1}`,
          role: team === 'A' ? 'Advocate for Option A' : 'Advocate for Option B',
          expertise: 'Structured comparison',
          bias: team === 'A' ? 'Favors Option A' : 'Favors Option B',
          personality: 'Assertive',
          speaking_style: `From Team ${team}: here's why my side wins on this dimension.`,
          task: `Defend Option ${team} with evidence`,
          team,
        });
      }
      return out;
    };
    return {
      kind: 'specialist',
      specialists: [...fill('A'), ...fill('B')],
      operator: null,
    };
  }

  const specialists = [
    ...baseSpecs,
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `ex_${i}`,
      name: `Domain expert ${i + 1}`,
      role: 'Sector specialist',
      expertise: `Specific to: ${q}`,
      bias: 'Varies by sub-topic',
      personality: 'Experienced',
      speaking_style: 'I’ve advised founders in this exact situation — watch this constraint.',
      task: 'Add nuance the others missed',
    })),
  ].slice(0, 8);

  const operator: OperatorAgentPlan = {
    id: 'operator',
    name: profile?.name?.trim() || 'You',
    role:
      profile?.operatorType === 'investor'
        ? 'Investor'
        : profile?.operatorType === 'career'
          ? 'Professional'
          : profile?.operatorType === 'aspiring'
            ? 'Founder (early)'
            : 'Business owner',
    perspective: profile?.goal || profile?.businessIdea || profile?.currentFocus || 'Making this decision with incomplete information',
    constraints: profile?.availableCapital
      ? `Capital: ${profile.availableCapital}; Location: ${profile.location || 'unspecified'}`
      : `Location: ${profile?.location || 'unspecified'}`,
    speaking_style: 'I’m the one signing the checks — talk to me like a real person, not a slide deck.',
    task: 'Ground the experts in what you can actually do',
  };

  return { kind: 'specialist', specialists, operator };
}

export async function designSimulation(
  question: string,
  mode: ChiefSimulationMode,
  tier: ChiefTier,
  operatorProfile: OperatorProfile | null,
): Promise<SimulationDesign> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackChiefDesign(question, operatorProfile, mode, tier);
  }

  const operatorContext = formatProfileForChief(operatorProfile);
  const system = buildChiefOrchestratorPrompt(mode, tier);
  const userContent = `SIMULATION MODE: ${mode}
TIER: ${tier}
USER QUESTION: ${question}

USER PROFILE:
${operatorContext}

Search the web for current market data relevant to this question BEFORE designing the simulation. Use findings in your JSON design (see market_context in instructions).

Design the optimal simulation. Return ONLY JSON.`;

  try {
    const { text } = await callAgentWithSearch({
      model: getModel('chief'),
      systemPrompt: system,
      userMessage: userContent,
      agentId: 'chief_orchestrator',
      maxTokens: 4000,
      maxSearchUses: 5,
      searchContext:
        'Current market conditions, recent industry news, pricing and regulations for the user’s geography and sector.',
    });
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const raw = JSON.parse(cleaned) as Record<string, unknown>;

    if (tier === 'swarm') {
      const d = normalizeSwarmPayload(raw, mode);
      if (mode === 'compare') {
        const ca = sumSegmentCounts(d.segments_a || []);
        const cb = sumSegmentCounts(d.segments_b || []);
        if (ca < 400 || cb < 400) {
          return buildFallbackChiefDesign(question, operatorProfile, mode, tier);
        }
      } else if (sumSegmentCounts(d.segments) < 800) {
        return buildFallbackChiefDesign(question, operatorProfile, mode, tier);
      }
      return d;
    }

    const d = normalizeSpecialistPayload(raw, mode);
    const minSpecs = mode === 'compare' ? 8 : 5;
    if (d.specialists.length < minSpecs) {
      return buildFallbackChiefDesign(question, operatorProfile, mode, tier);
    }
    if (mode !== 'compare' && !d.operator) {
      d.operator = (buildFallbackChiefDesign(question, operatorProfile, mode, tier) as SpecialistChiefDesign).operator;
    }
    return d;
  } catch (e) {
    console.error('[designSimulation] Opus chief failed, using fallback:', e);
    return buildFallbackChiefDesign(question, operatorProfile, mode, tier);
  }
}
