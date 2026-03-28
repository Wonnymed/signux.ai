// ── Phase 2B-3: Decision Profiles — Auto-generated user summaries ──
// Every 3 simulations, Haiku generates a concise profile that gets
// injected into future simulations so agents know the user's context.

import { callClaude, parseJSON } from '../simulation/claude';
import { getUserFacts } from './facts';
import { getUserSimulations } from './persistence';
import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────

export type DecisionProfile = {
  user_id: string;
  profile_text: string;
  key_facts: {
    industry: string;
    location: string;
    stage: string;
    budget_range: string;
    risk_tolerance: string;
    decision_patterns: string;
  };
  simulation_count: number;
  updated_at: string;
};

// ── Generate ───────────────────────────────────────────────

export async function generateDecisionProfile(userId: string): Promise<DecisionProfile | null> {
  const facts = await getUserFacts(userId, 30);
  const simulations = await getUserSimulations(userId, 10);

  if (facts.length === 0 && simulations.length === 0) return null;

  const factsText = facts
    .map(f => `• ${f.content} (${f.category}, confidence: ${(f.confidence * 100).toFixed(0)}%)`)
    .join('\n');

  const simsText = simulations
    .map(s => {
      const verdict = s.verdict as Record<string, unknown>;
      return `• "${s.question}" → ${verdict?.recommendation || 'unknown'} (${verdict?.probability || '?'}%)`;
    })
    .join('\n');

  const response = await callClaude({
    systemPrompt: `You are the Profile Generator for Octux AI. You create a concise Decision Profile from a user's accumulated facts and simulation history.

The profile should read like a briefing document — imagine you're briefing 10 specialist consultants before they analyze this person's next question.

FORMAT:
1. profile_text: 3-5 sentences summarizing WHO this person is, WHAT they're working on, WHERE they operate, and HOW they make decisions. Be specific — use names, numbers, locations.
2. key_facts: structured fields extracted from the data

RULES:
- Be SPECIFIC: "Fernando, 22, Brazilian founder in Seoul exploring F&B opportunities in Gangnam with $50K budget" not "A user interested in business"
- Include geographic context always
- Note decision patterns: do they tend toward caution or action?
- If data is sparse, say what you DON'T know: "Budget and funding status unknown"
- Respond with valid JSON only`,
    userMessage: `Generate a Decision Profile from this data:

USER FACTS:
${factsText || 'No facts extracted yet.'}

RECENT SIMULATIONS:
${simsText || 'No simulations yet.'}

JSON:
{
  "profile_text": "3-5 sentence briefing about this user",
  "key_facts": {
    "industry": "their industry or 'unknown'",
    "location": "where they operate or 'unknown'",
    "stage": "pre-launch|early|growth|mature|unknown",
    "budget_range": "estimated budget or 'unknown'",
    "risk_tolerance": "conservative|moderate|aggressive|unknown",
    "decision_patterns": "what they tend to decide or 'insufficient data'"
  }
}`,
    maxTokens: 512,
  });

  try {
    const parsed = parseJSON<{ profile_text: string; key_facts: DecisionProfile['key_facts'] }>(response);

    const profile: DecisionProfile = {
      user_id: userId,
      profile_text: parsed.profile_text,
      key_facts: parsed.key_facts,
      simulation_count: simulations.length,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase
        .from('decision_profiles')
        .upsert({
          user_id: userId,
          profile_text: profile.profile_text,
          key_facts: profile.key_facts,
          simulation_count: profile.simulation_count,
          updated_at: profile.updated_at,
        });

      if (error) console.error('[profile] Failed to save:', error);
      else console.log(`[profile] Updated for user ${userId}`);
    }

    return profile;
  } catch {
    console.error('[profile] Failed to generate decision profile');
    return null;
  }
}

// ── Read ───────────────────────────────────────────────────

export async function getDecisionProfile(userId: string): Promise<DecisionProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('decision_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as DecisionProfile;
}

// ── Format for Context Injection ───────────────────────────

export function formatProfileForContext(profile: DecisionProfile): string {
  return `\nDECISION MAKER PROFILE:
${profile.profile_text}

Key context: ${profile.key_facts.industry} industry, based in ${profile.key_facts.location}, ${profile.key_facts.stage} stage, budget ${profile.key_facts.budget_range}, risk tolerance: ${profile.key_facts.risk_tolerance}.

Tailor your analysis to THIS person's specific situation. Reference their known context when relevant.`;
}

// ── Auto-regeneration Check ────────────────────────────────

export async function maybeRegenerateProfile(userId: string): Promise<void> {
  try {
    const simulations = await getUserSimulations(userId, 100);
    const simCount = simulations.length;

    const existingProfile = await getDecisionProfile(userId);
    const lastProfileSimCount = existingProfile?.simulation_count || 0;

    if (simCount - lastProfileSimCount >= 3) {
      console.log(`[profile] Regenerating for user ${userId} (${simCount} sims, last at ${lastProfileSimCount})`);
      await generateDecisionProfile(userId);
    }
  } catch (err) {
    console.error('[profile] Regeneration check failed:', err);
  }
}
