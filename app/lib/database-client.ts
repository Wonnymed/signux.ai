"use client";
import { createSupabaseBrowser } from "./supabase-browser";
import { signuxFetch } from "../lib/api-client";
import type { Conversation, DBMessage } from "./database";

export type { Conversation, DBMessage };

function supabase() {
  return createSupabaseBrowser();
}

/* ═══ Conversations ═══ */

export async function getConversations(userId: string, limit = 50): Promise<Conversation[]> {
  const { data, error } = await supabase()
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Conversation[];
}

export async function createConversation(userId: string): Promise<Conversation | null> {
  const { data, error } = await supabase()
    .from("conversations")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) return null;
  return data as Conversation;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await supabase()
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function touchConversation(id: string): Promise<void> {
  await supabase()
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteConversation(id: string): Promise<void> {
  await supabase().from("messages").delete().eq("conversation_id", id);
  await supabase().from("conversations").delete().eq("id", id);
}

/* ═══ Messages ═══ */

export async function getMessages(conversationId: string): Promise<DBMessage[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as DBMessage[];
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string,
  attachments?: any[],
): Promise<DBMessage | null> {
  const { data, error } = await supabase()
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      ...(attachments ? { attachments } : {}),
    })
    .select()
    .single();
  if (error) return null;
  return data as DBMessage;
}

/* ═══ Title Generation ═══ */

export async function generateTitle(firstMessage: string): Promise<string> {
  const clean = firstMessage.replace(/\s+/g, " ").trim();
  if (clean.length <= 40) return clean;
  return clean.slice(0, 40).trim() + "…";
}

export async function generateSmartTitle(firstMessage: string, firstResponse: string): Promise<string> {
  try {
    const res = await signuxFetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: firstMessage, response: firstResponse?.slice(0, 200) }),
    });
    if (res.ok) {
      const { title } = await res.json();
      return title || firstMessage.slice(0, 50);
    }
  } catch {}
  return firstMessage.replace(/\n/g, " ").trim().slice(0, 50) + (firstMessage.length > 50 ? "…" : "");
}
