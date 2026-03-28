/**
 * Conversation Manager — CRUD for the unified conversation model.
 *
 * Every interaction is a conversation. Chat and simulation live together.
 * Sidebar shows conversations. Each conversation has messages of various types.
 */

import { supabase } from '../memory/supabase';

export type Conversation = {
  id: string;
  user_id?: string;
  title: string;
  domain: string;
  has_simulation: boolean;
  latest_verdict: string | null;
  latest_verdict_probability: number | null;
  is_pinned: boolean;
  /** Billing charge type of the last completed simulation (swarm, specialist, compare, …). */
  last_sim_mode?: string | null;
  message_count: number;
  simulation_count: number;
  updated_at: string;
  created_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  message_type: string;
  role: string;
  content: string | null;
  structured_data: any;
  model_tier: string;
  simulation_id: string | null;
  created_at: string;
};

// ═══ CREATE ═══

export async function createConversation(userId: string, firstMessage?: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const title = firstMessage
    ? firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '')
    : 'New conversation';

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title,
      message_count: 0,
      simulation_count: 0,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Failed to create conversation');
  return data.id;
}

// ═══ READ ═══

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  return data;
}

export async function getUserConversations(
  userId: string,
  limit: number = 30
): Promise<Conversation[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getConversationMessages(
  conversationId: string,
  limit: number = 100
): Promise<ConversationMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return data || [];
}

// ═══ WRITE MESSAGES ═══

export async function addMessage(
  conversationId: string,
  userId: string,
  message: {
    message_type: string;
    role: string;
    content?: string;
    structured_data?: any;
    model_tier?: string;
    simulation_id?: string;
  }
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      message_type: message.message_type,
      role: message.role,
      content: message.content || null,
      structured_data: message.structured_data || null,
      model_tier: message.model_tier || 'default',
      simulation_id: message.simulation_id || null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Failed to add message');

  // Update conversation metadata
  await supabase.from('conversations').update({
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  return data.id;
}

// ═══ UPDATE CONVERSATION ═══

export async function updateConversationAfterSim(
  conversationId: string,
  verdict: any,
  domain: string,
  lastSimMode?: string | null,
): Promise<void> {
  if (!supabase) return;
  const rec = (verdict?.recommendation || '').toLowerCase();
  const prob = verdict?.probability || 0;

  await supabase.from('conversations').update({
    has_simulation: true,
    latest_verdict: rec || null,
    latest_verdict_probability: prob || null,
    domain,
    last_sim_mode: lastSimMode ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId);
}

export async function togglePin(conversationId: string, pinned: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from('conversations').update({ is_pinned: pinned }).eq('id', conversationId);
}

export async function updateTitle(conversationId: string, title: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('conversations').delete().eq('id', conversationId);
}
