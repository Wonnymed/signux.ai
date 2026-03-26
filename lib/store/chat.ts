import { create } from 'zustand';
import type { ModelTier } from '@/lib/chat/tiers';

export interface ChatMessage {
  id: string;
  message_type: string;
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  structured_data: any;
  model_tier: string;
  simulation_id: string | null;
  created_at: string;
  // Client-only fields
  _optimistic?: boolean;
  _error?: boolean;
}

interface ChatState {
  // Messages for current conversation
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  replaceOptimistic: (tempId: string, realMsg: ChatMessage) => void;
  markError: (tempId: string) => void;

  // Loading
  sending: boolean;
  setSending: (sending: boolean) => void;

  // Selected tier
  selectedTier: ModelTier;
  setSelectedTier: (tier: ModelTier) => void;

  // Entity state (derived from chat/sim activity)
  entityState: 'dormant' | 'active' | 'thinking' | 'diving' | 'resting';
  setEntityState: (state: ChatState['entityState']) => void;

  // Load conversation messages from API
  loadConversation: (conversationId: string) => Promise<void>;

  // Send a chat message
  sendMessage: (conversationId: string, message: string) => Promise<void>;

  // Clear (when navigating away)
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  replaceOptimistic: (tempId, realMsg) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === tempId ? realMsg : m)),
    })),

  markError: (tempId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === tempId ? { ...m, _error: true } : m
      ),
    })),

  sending: false,
  setSending: (sending) => set({ sending }),

  selectedTier: 'ink',
  setSelectedTier: (tier) => set({ selectedTier: tier }),

  entityState: 'dormant',
  setEntityState: (state) => set({ entityState: state }),

  loadConversation: async (conversationId) => {
    try {
      const res = await fetch(`/api/c/${conversationId}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const msgs: ChatMessage[] = data.messages || [];
      set({ messages: msgs });

      // Determine entity state from messages
      const hasVerdict = msgs.some((m) => m.message_type === 'simulation_verdict');
      const hasSimStart = msgs.some((m) => m.message_type === 'simulation_start');
      if (hasVerdict) set({ entityState: 'resting' });
      else if (hasSimStart) set({ entityState: 'diving' });
      else if (msgs.length > 0) set({ entityState: 'active' });
      else set({ entityState: 'dormant' });
    } catch {
      set({ messages: [] });
    }
  },

  sendMessage: async (conversationId, message) => {
    const { selectedTier, addMessage, setSending, setEntityState, replaceOptimistic, markError } = get();
    if (!message.trim() || get().sending) return;

    setSending(true);
    setEntityState('active');

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempId,
      message_type: 'text',
      role: 'user',
      content: message,
      structured_data: null,
      model_tier: selectedTier,
      simulation_id: null,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    addMessage(userMsg);

    try {
      const res = await fetch(`/api/c/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tier: selectedTier }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));

        // Token gate - upgrade prompt
        if (res.status === 403 && errData.error === 'insufficient_tokens') {
          addMessage({
            id: `upgrade-${Date.now()}`,
            message_type: 'system',
            role: 'system',
            content: null,
            structured_data: {
              type: 'upgrade_prompt',
              reason: errData.message,
              suggestedTier: errData.suggestedTier,
              tokensUsed: errData.tokensUsed,
              tokensTotal: errData.tokensTotal,
            },
            model_tier: selectedTier,
            simulation_id: null,
            created_at: new Date().toISOString(),
          });
          setSending(false);
          return;
        }

        throw new Error('API error');
      }

      const data = await res.json();

      // Replace optimistic message with confirmed
      replaceOptimistic(tempId, { ...userMsg, _optimistic: false, id: `user-${Date.now()}` });

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `resp-${Date.now()}`,
        message_type: data.suggestSimulation ? 'decision_card' : 'text',
        role: 'assistant',
        content: data.response,
        structured_data: data.suggestSimulation
          ? {
              suggest_simulation: true,
              simulation_prompt: data.simulationPrompt,
              related_simulations: data.relatedSimulations,
              disclaimer: data.disclaimer,
            }
          : data.disclaimer
          ? { disclaimer: data.disclaimer }
          : null,
        model_tier: data.tier,
        simulation_id: null,
        created_at: new Date().toISOString(),
      };
      addMessage(assistantMsg);
    } catch {
      markError(tempId);
      addMessage({
        id: `err-${Date.now()}`,
        message_type: 'text',
        role: 'assistant',
        content: 'Something went wrong. Try again.',
        structured_data: null,
        model_tier: 'ink',
        simulation_id: null,
        created_at: new Date().toISOString(),
        _error: true,
      });
    } finally {
      setSending(false);
    }
  },

  clear: () => set({ messages: [], entityState: 'dormant', sending: false }),
}));
