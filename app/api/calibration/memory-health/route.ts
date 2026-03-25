import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';
import { supabase } from '@/lib/memory/supabase';

export async function GET(req: NextRequest) {
  const { userId } = await getUserIdFromRequest(req);

  if (!supabase) {
    return NextResponse.json({
      facts: { current: 0, invalidated: 0 },
      opinions: { active: 0, invalidated: 0 },
      observations: { active: 0, invalidated: 0 },
      lessons: { active: 0, inactive: 0 },
      rules: { active: 0, inactive: 0 },
      entities: 0,
      relations: 0,
    });
  }

  const [facts, opinions, observations, lessons, rules, entities, relations] = await Promise.allSettled([
    Promise.all([
      supabase.from('user_facts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_current', true),
      supabase.from('user_facts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_current', false),
    ]),
    Promise.all([
      supabase.from('decision_opinions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('decision_opinions').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'active'),
    ]),
    Promise.all([
      supabase.from('decision_observations').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('decision_observations').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'active'),
    ]),
    Promise.all([
      supabase.from('agent_lessons').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
      supabase.from('agent_lessons').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', false),
    ]),
    Promise.all([
      supabase.from('procedural_rules').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
      supabase.from('procedural_rules').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', false),
    ]),
    supabase.from('knowledge_entities').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_relations').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),
  ]);

  type CountResult = { count: number | null };
  const extract = (result: PromiseSettledResult<CountResult[]>, idx: number): number => {
    if (result.status !== 'fulfilled') return 0;
    return result.value[idx]?.count || 0;
  };
  const extractSingle = (result: PromiseSettledResult<CountResult>): number => {
    if (result.status !== 'fulfilled') return 0;
    return result.value?.count || 0;
  };

  return NextResponse.json({
    facts: { current: extract(facts, 0), invalidated: extract(facts, 1) },
    opinions: { active: extract(opinions, 0), invalidated: extract(opinions, 1) },
    observations: { active: extract(observations, 0), invalidated: extract(observations, 1) },
    lessons: { active: extract(lessons, 0), inactive: extract(lessons, 1) },
    rules: { active: extract(rules, 0), inactive: extract(rules, 1) },
    entities: extractSingle(entities as PromiseSettledResult<CountResult>),
    relations: extractSingle(relations as PromiseSettledResult<CountResult>),
  });
}
