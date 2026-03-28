"use client";

const KEY = "signux-conversations";

export interface LocalConversation {
  id: string;
  title: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface LocalMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

function readAll(): { conversations: LocalConversation[]; messages: LocalMessage[] } {
  if (typeof window === "undefined") return { conversations: [], messages: [] };
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"conversations":[],"messages":[]}');
  } catch {
    return { conversations: [], messages: [] };
  }
}

function writeAll(data: { conversations: LocalConversation[]; messages: LocalMessage[] }) {
  // Keep max 100 conversations
  data.conversations = data.conversations.slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function localGetConversations(): LocalConversation[] {
  return readAll().conversations.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function localCreateConversation(mode: string): LocalConversation {
  const data = readAll();
  const conv: LocalConversation = {
    id: crypto.randomUUID(),
    title: null,
    mode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.conversations.unshift(conv);
  writeAll(data);
  return conv;
}

export function localUpdateConversationTitle(id: string, title: string): void {
  const data = readAll();
  const conv = data.conversations.find(c => c.id === id);
  if (conv) {
    conv.title = title;
    conv.updated_at = new Date().toISOString();
    writeAll(data);
  }
}

export function localTouchConversation(id: string): void {
  const data = readAll();
  const conv = data.conversations.find(c => c.id === id);
  if (conv) {
    conv.updated_at = new Date().toISOString();
    writeAll(data);
  }
}

export function localDeleteConversation(id: string): void {
  const data = readAll();
  data.conversations = data.conversations.filter(c => c.id !== id);
  data.messages = data.messages.filter(m => m.conversation_id !== id);
  writeAll(data);
}

export function localGetMessages(conversationId: string): LocalMessage[] {
  return readAll().messages
    .filter(m => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function localSaveMessage(conversationId: string, role: string, content: string): LocalMessage {
  const data = readAll();
  const msg: LocalMessage = {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    created_at: new Date().toISOString(),
  };
  data.messages.push(msg);
  writeAll(data);
  return msg;
}
