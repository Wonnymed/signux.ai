/**
 * Dynamic Agent Library — loads agents from DB instead of hardcoded file.
 * Falls back to hardcoded AGENTS from prompts.ts when DB is unavailable.
 */

import { supabase } from '../memory/supabase';
import type { AgentConfig } from './types';

export type LibraryAgent = {
  id: string;
  category_id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  constraints: string[];
  sop: string;
  icon: string;
  color: string;
  tags: string[];
  origin: string;
  difficulty: string;
};

export type AgentCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  agent_count: number;
};

// ═══ LOAD AGENTS ═══

export async function getAgentsByCategory(categoryId: string): Promise<LibraryAgent[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('agent_library')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('popularity', { ascending: false });
  return data || [];
}

export async function getAgentsByIds(agentIds: string[]): Promise<LibraryAgent[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('agent_library')
    .select('*')
    .in('id', agentIds)
    .eq('is_active', true);
  return data || [];
}

export async function getCategories(): Promise<AgentCategory[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('agent_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data || [];
}

export async function searchAgents(query: string, limit: number = 20): Promise<LibraryAgent[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('agent_library')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,role.ilike.%${query}%,tags.cs.{${query}}`)
    .order('popularity', { ascending: false })
    .limit(limit);
  return data || [];
}

// ═══ AUTO-SUGGEST — Domain → recommended agents ═══

/** Per simulation: 10 agents total — mix follows AGENT-CATALOG-60 selection examples */
const DOMAIN_AGENT_MAP: Record<string, { category: string; count: number }[]> = {
  investment:    [{ category: 'investment', count: 10 }],
  career:        [{ category: 'career', count: 5 }, { category: 'business', count: 5 }],
  business:      [{ category: 'business', count: 4 }, { category: 'life', count: 3 }, { category: 'career', count: 3 }],
  health:        [{ category: 'health', count: 7 }, { category: 'life', count: 3 }],
  relationships: [{ category: 'relationships', count: 10 }],
  legal:         [{ category: 'business', count: 5 }, { category: 'life', count: 3 }, { category: 'career', count: 2 }],
  technology:    [{ category: 'business', count: 5 }, { category: 'investment', count: 3 }, { category: 'career', count: 2 }],
  education:     [{ category: 'career', count: 6 }, { category: 'life', count: 4 }],
  real_estate:   [{ category: 'investment', count: 6 }, { category: 'business', count: 4 }],
  /** personal / cross-domain life questions — IVF vs savings style mix */
  personal:      [{ category: 'investment', count: 4 }, { category: 'health', count: 3 }, { category: 'relationships', count: 3 }],
  general:       [{ category: 'life', count: 4 }, { category: 'business', count: 2 }, { category: 'investment', count: 2 }, { category: 'career', count: 2 }],
};

export async function suggestAgentsForDomain(domain: string): Promise<LibraryAgent[]> {
  const mapping = DOMAIN_AGENT_MAP[domain] || DOMAIN_AGENT_MAP.general;
  const agents: LibraryAgent[] = [];

  for (const { category, count } of mapping) {
    const categoryAgents = await getAgentsByCategory(category);
    agents.push(...categoryAgents.slice(0, count));
  }

  return agents.slice(0, 10);
}

// ═══ CUSTOM AGENTS ═══

export async function getUserCustomAgents(userId: string): Promise<LibraryAgent[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('user_custom_agents')
    .select('*')
    .eq('user_id', userId)
    .order('use_count', { ascending: false });

  return (data || []).map(a => ({
    id: a.agent_id,
    category_id: 'custom',
    name: a.name,
    role: a.role,
    goal: a.goal,
    backstory: a.backstory,
    constraints: a.constraints || [],
    sop: '',
    icon: a.icon || '\u{1F3AD}',
    color: a.color || '#C75B2A',
    tags: ['custom'],
    origin: 'user',
    difficulty: 'standard',
  }));
}

export async function createCustomAgent(
  userId: string,
  agent: {
    name: string;
    role: string;
    goal: string;
    backstory: string;
    constraints?: string[];
    icon?: string;
    isSelfAgent?: boolean;
  }
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const agentId = `custom_${userId.substring(0, 8)}_${Date.now()}`;

  await supabase.from('user_custom_agents').insert({
    user_id: userId,
    agent_id: agentId,
    name: agent.name,
    role: agent.role,
    goal: agent.goal,
    backstory: agent.backstory,
    constraints: agent.constraints || [],
    icon: agent.icon || '\u{1F3AD}',
    is_self_agent: agent.isSelfAgent || false,
  });

  return agentId;
}

// ═══ SELF-AGENT — User's own persona as an agent ═══

export async function buildSelfAgent(
  userId: string,
  coreMemory: any,
  behavioralProfile: any
): Promise<LibraryAgent> {
  const risk = behavioralProfile?.risk_tolerance || 0.5;
  const speed = behavioralProfile?.speed_preference || 0.5;
  const optimism = behavioralProfile?.optimism_bias || 0.5;

  const riskLabel = risk < 0.3 ? 'cautious and risk-averse' : risk > 0.7 ? 'bold and risk-tolerant' : 'balanced in risk assessment';
  const speedLabel = speed < 0.3 ? 'methodical and deliberate' : speed > 0.7 ? 'action-oriented and decisive' : 'balanced between research and action';
  const optimismLabel = optimism < 0.3 ? 'realistic, sometimes pessimistic' : optimism > 0.7 ? 'optimistic and opportunity-focused' : 'balanced between optimism and caution';

  const backstory = `You ARE the decision-maker. This is YOUR decision, YOUR money, YOUR life.
You are ${riskLabel}. You tend to be ${speedLabel}. Your outlook is ${optimismLabel}.
${coreMemory?.business ? `Your situation: ${coreMemory.business}` : ''}
${coreMemory?.history ? `Your recent decisions: ${coreMemory.history}` : ''}

Your role in this debate is to represent what YOU actually want and feel — your gut instinct, your hopes, your fears. The specialists provide analysis. You provide the HUMAN element — "but I WANT to do this" or "this SCARES me."

Be honest about your emotions and biases. The specialists will challenge you with data. That tension between what you WANT and what the DATA says is exactly what produces the best decisions.`;

  const agentId = `self_${userId.substring(0, 12)}`;

  if (supabase) {
    const { data: existing } = await supabase
      .from('user_custom_agents')
      .select('agent_id')
      .eq('user_id', userId)
      .eq('is_self_agent', true)
      .single();

    const finalId = existing?.agent_id || agentId;

    await supabase.from('user_custom_agents').upsert({
      user_id: userId,
      agent_id: finalId,
      name: 'You (Self)',
      role: 'The actual decision-maker — represents your gut, emotions, and personal context.',
      goal: 'Bring the human element to the debate. Express what you WANT, what you FEAR, what you VALUE.',
      backstory,
      constraints: [
        'Express genuine emotions and desires, not just analysis',
        'Challenge specialists when their advice conflicts with your values',
        'Be honest about your biases — the specialists will balance you',
      ],
      icon: '\u{1FA9E}',
      color: '#C75B2A',
      is_self_agent: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,agent_id' });
  }

  return {
    id: agentId,
    category_id: 'self',
    name: 'You (Self)',
    role: 'The actual decision-maker — represents your gut, emotions, and personal context.',
    goal: 'Bring the human element to the debate.',
    backstory,
    constraints: ['Express genuine emotions', 'Challenge specialists', 'Be honest about biases'],
    sop: '',
    icon: '\u{1FA9E}',
    color: '#C75B2A',
    tags: ['self', 'personal', 'user'],
    origin: 'self',
    difficulty: 'standard',
  };
}

// ═══ SAVED PANELS ═══

export async function savePanel(
  userId: string,
  name: string,
  agentIds: string[],
  categoryId?: string
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data } = await supabase.from('saved_panels').insert({
    user_id: userId,
    name,
    agent_ids: agentIds,
    category_id: categoryId,
  }).select('id').single();

  return data?.id || '';
}

export async function getUserPanels(userId: string): Promise<any[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('saved_panels')
    .select('*')
    .eq('user_id', userId)
    .order('use_count', { ascending: false });
  return data || [];
}

export async function getPublicPanels(limit: number = 20): Promise<any[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('saved_panels')
    .select('*')
    .eq('is_public', true)
    .order('use_count', { ascending: false })
    .limit(limit);
  return data || [];
}

// ═══ CONVERT LibraryAgent → AgentConfig (for engine compatibility) ═══

export function libraryAgentToConfig(agent: LibraryAgent): AgentConfig {
  const isChair = agent.id === 'decision_chair';

  const outputFormat = isChair
    ? `OUTPUT FORMAT (respond with valid JSON only, no markdown):
Varies by phase — follow the specific format requested in each user message.`
    : `OUTPUT FORMAT (respond with valid JSON only, no markdown):
{
  "position": "proceed" | "delay" | "abandon",
  "confidence": 1-10,
  "key_argument": "2-3 sentences with specific data points",
  "evidence": ["specific evidence 1", "specific evidence 2"],
  "risks_identified": ["specific risk with concrete consequence"],
  "recommendation": "one sentence, specific, actionable this week"
}`;

  const constraintsText = agent.constraints.length > 0
    ? agent.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : 'None specified.';

  const sopText = agent.sop || 'Analyze the situation systematically and provide your assessment.';

  const systemPrompt = `You are the ${agent.name} at Octux AI — a multi-agent adversarial decision system.

ROLE: ${agent.role}
GOAL: ${agent.goal}

BACKSTORY: ${agent.backstory}

CONSTRAINTS & KNOWN BIASES (acknowledge these in your analysis):
${constraintsText}

STANDARD OPERATING PROCEDURE — follow these steps IN ORDER:
${sopText}

${outputFormat}

RULES:
- Follow the SOP steps in order — do not skip steps
- Cite specific numbers, percentages, timelines, and dollar amounts when possible
- Acknowledge your own biases when they are relevant to your analysis
- Say "I lack data on X and would need Y to give a better answer" rather than fabricate
- Maximum 200 words total
- Respond with ONLY valid JSON — no explanation outside the JSON object`;

  return {
    id: agent.id as any,
    name: agent.name,
    role: agent.role,
    icon: agent.icon,
    color: agent.color,
    goal: agent.goal,
    backstory: agent.backstory,
    constraints: agent.constraints,
    sop: agent.sop ? agent.sop.split('. ').filter(Boolean) : ['Analyze systematically'],
    systemPrompt,
  };
}
