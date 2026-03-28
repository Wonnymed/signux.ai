/**
 * Session Memory + Working Buffer for Octux.
 *
 * SessionMemory: Per-thread context that accumulates across follow-up sims.
 *   Follow-up: "What if budget was 2x?" inherits summary of the previous sim.
 *
 * WorkingBuffer: Per-round state saved DURING the sim. Survives crashes.
 *   If sim dies at round 7, rounds 1-6 are persisted and recoverable.
 *
 * accumulateThreadContext(): Loads all previous sim summaries in a thread,
 *   formatted for injection into the next sim's context.
 *
 * Refs: Agno (#11 — session-level memory, per-thread context)
 *       OpenClaw (#26 — Working Buffer, crash-resilient state)
 */

import { supabase } from './supabase';
import { callClaude } from '../simulation/claude';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type SessionThread = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
};

export type SessionSummary = {
  id: string;
  thread_id: string;
  simulation_id: string;
  question: string;
  summary: string;
  verdict_recommendation: string | null;
  verdict_probability: number | null;
  key_insights: string[];
  sim_order: number;
};

export type BufferEntry = {
  simulation_id: string;
  round_number: number;
  round_type: string;
  agent_id: string | null;
  summary: string;
  agent_positions: Record<string, string> | null;
  token_count: number | null;
};

// ═══════════════════════════════════════════
// SESSION MEMORY — Thread management
// ═══════════════════════════════════════════

/**
 * Get or create a thread for a simulation.
 * If threadId is provided, verify it exists and return it.
 * If not, create a new thread from the question.
 */
export async function getOrCreateThread(
  userId: string,
  threadId?: string | null,
  question?: string
): Promise<string> {
  if (!supabase) return `thread_${Date.now()}`;

  // If thread already exists, return it
  if (threadId) {
    const { data } = await supabase
      .from('session_threads')
      .select('id')
      .eq('id', threadId)
      .single();

    if (data) return data.id;
  }

  // Create new thread
  const title = question
    ? question.substring(0, 80) + (question.length > 80 ? '...' : '')
    : 'New thread';

  const { data, error } = await supabase
    .from('session_threads')
    .insert({
      user_id: userId,
      title,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('SESSION: Failed to create thread:', error);
    return `thread_${Date.now()}`;
  }

  return data.id;
}

/**
 * Get recent threads for a user (for sidebar/thread list).
 */
export async function getUserThreads(
  userId: string,
  limit: number = 20
): Promise<SessionThread[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('session_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ═══════════════════════════════════════════
// SESSION MEMORY — Sim summaries per thread
// ═══════════════════════════════════════════

/**
 * Generate and save a summary of a completed simulation.
 * Called AFTER sim completes, BEFORE the next sim in the thread.
 *
 * Uses Claude to compress the full sim into 2-4 sentences + key insights.
 */
export async function saveSessionSummary(
  threadId: string,
  simulationId: string,
  userId: string,
  question: string,
  verdict: unknown,
  agentReports: Map<string, unknown> | Record<string, unknown>
): Promise<void> {
  if (!supabase) return;

  try {
    // Count existing sims in this thread for ordering
    const { count } = await supabase
      .from('session_summaries')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', threadId);

    const simOrder = (count || 0) + 1;

    // Extract verdict details
    const v = verdict as Record<string, unknown> | null;
    const recommendation = (v?.recommendation || v?.position || 'unknown') as string;
    const probability = (v?.probability || v?.confidence_score || 0) as number;

    // Generate summary via Claude
    const reports = agentReports instanceof Map
      ? Array.from(agentReports.entries()).map(([id, r]) => {
          const rep = r as Record<string, unknown>;
          return `${rep.agent_name || id}: ${rep.key_argument || rep.position || 'no argument'}`;
        })
      : Object.entries(agentReports).map(([id, r]) => {
          const rep = r as Record<string, unknown>;
          return `${rep.agent_name || id}: ${rep.key_argument || rep.position || 'no argument'}`;
        });

    const summaryResponse = await callClaude({
      systemPrompt: `You compress a simulation into a 2-4 sentence summary and 3 key insights.
Return ONLY JSON: { "summary": "...", "key_insights": ["insight1", "insight2", "insight3"] }
Be specific — include numbers, names, recommendations. Not generic.`,
      userMessage: `Question: "${question}"
Verdict: ${recommendation.toUpperCase()} (${probability}%)
Agent positions: ${reports.join(' | ')}
${v?.one_liner ? 'One-liner: ' + v.one_liner : ''}
${v?.main_risk ? 'Main risk: ' + v.main_risk : ''}
${v?.next_action ? 'Next action: ' + v.next_action : ''}

JSON:`,
      maxTokens: 300,
    });

    let summary = `${recommendation.toUpperCase()} (${probability}%) for "${question.substring(0, 60)}..."`;
    let keyInsights: string[] = [];

    try {
      const parsed = JSON.parse(summaryResponse.replace(/```json|```/g, '').trim());
      if (parsed.summary) summary = parsed.summary;
      if (Array.isArray(parsed.key_insights)) keyInsights = parsed.key_insights.slice(0, 3);
    } catch {
      // Use default summary if parsing fails
    }

    // Save
    const { error } = await supabase
      .from('session_summaries')
      .insert({
        thread_id: threadId,
        simulation_id: simulationId,
        user_id: userId,
        question,
        summary,
        verdict_recommendation: recommendation,
        verdict_probability: probability,
        key_insights: keyInsights,
        sim_order: simOrder,
      });

    if (error) {
      console.error('SESSION: Failed to save summary:', error);
    } else {
      console.log(`SESSION: Summary saved for sim #${simOrder} in thread ${threadId}`);
    }

    // Update thread timestamp
    await supabase
      .from('session_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

  } catch (err) {
    console.error('SESSION: saveSessionSummary exception (non-blocking):', err);
  }
}

// ═══════════════════════════════════════════
// accumulateThreadContext() — Load thread history for injection
// ═══════════════════════════════════════════

/**
 * Load summaries of ALL previous sims in a thread, formatted for context injection.
 * The next sim in the thread gets this as "conversation history" so it knows what
 * was already discussed and decided.
 */
export async function accumulateThreadContext(
  threadId: string
): Promise<string> {
  if (!supabase) return '';

  const { data: summaries, error } = await supabase
    .from('session_summaries')
    .select('question, summary, verdict_recommendation, verdict_probability, key_insights, sim_order')
    .eq('thread_id', threadId)
    .order('sim_order', { ascending: true });

  if (error || !summaries || summaries.length === 0) return '';

  const lines: string[] = [
    '\n═══ THREAD HISTORY (previous simulations in this conversation) ═══',
  ];

  for (const s of summaries) {
    const rec = (s.verdict_recommendation || 'unknown').toUpperCase();
    const prob = s.verdict_probability || 0;
    lines.push(`  Sim #${s.sim_order}: "${(s.question || '').substring(0, 70)}..."`);
    lines.push(`    → ${rec} (${prob}%) — ${s.summary}`);
    if (s.key_insights && s.key_insights.length > 0) {
      for (const insight of s.key_insights) {
        lines.push(`    • ${insight}`);
      }
    }
  }

  lines.push(
    'Build on these previous analyses. Reference prior findings. Avoid repeating what was already established.',
    '═══════════════════════════════════════════════════════════════════\n'
  );

  return lines.join('\n');
}

// ═══════════════════════════════════════════
// WORKING BUFFER — Crash-resilient round state
// ═══════════════════════════════════════════

/**
 * Save a round's summary to the working buffer.
 * Called AFTER each round completes in runSimulation().
 *
 * If the sim crashes later, these entries survive in the database.
 *
 * Ref: OpenClaw (#26 — Working Buffer danger zone protocol)
 */
export async function saveToWorkingBuffer(
  simulationId: string,
  userId: string,
  roundNumber: number,
  roundType: string,
  summary: string,
  agentId?: string | null,
  agentPositions?: Record<string, string> | null,
  tokenCount?: number | null
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('working_buffer')
      .upsert({
        simulation_id: simulationId,
        user_id: userId,
        round_number: roundNumber,
        round_type: roundType,
        agent_id: agentId || null,
        summary,
        agent_positions: agentPositions || null,
        token_count: tokenCount || null,
      }, {
        onConflict: 'simulation_id,round_number',
      });
  } catch (err) {
    // Non-blocking — buffer save failure should NEVER kill the sim
    console.error('BUFFER: Save failed (non-blocking):', err);
  }
}

/**
 * Load the working buffer for a simulation.
 * Useful for: recovering partial results after a crash.
 */
export async function loadWorkingBuffer(
  simulationId: string
): Promise<BufferEntry[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('working_buffer')
    .select('simulation_id, round_number, round_type, agent_id, summary, agent_positions, token_count')
    .eq('simulation_id', simulationId)
    .order('round_number', { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Clear the working buffer for a completed simulation.
 * Called AFTER the sim successfully completes and is persisted.
 */
export async function clearWorkingBuffer(
  simulationId: string
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('working_buffer')
      .delete()
      .eq('simulation_id', simulationId);
  } catch (err) {
    console.error('BUFFER: Clear failed (non-blocking):', err);
  }
}

/**
 * Format working buffer as a partial result for the user.
 * If sim crashed, this shows what rounds completed before failure.
 */
export function formatBufferAsPartialResult(buffer: BufferEntry[]): string {
  if (buffer.length === 0) return 'No data was saved before the simulation failed.';

  const lines = [
    `Simulation completed ${buffer.length} round(s) before failure:`,
    '',
  ];

  for (const entry of buffer) {
    lines.push(`Round ${entry.round_number} (${entry.round_type})${entry.agent_id ? ' — ' + entry.agent_id : ''}:`);
    lines.push(`  ${entry.summary}`);
    if (entry.agent_positions) {
      const positions = Object.entries(entry.agent_positions)
        .map(([agent, pos]) => `${agent}: ${pos}`)
        .join(', ');
      lines.push(`  Positions: ${positions}`);
    }
  }

  return lines.join('\n');
}
