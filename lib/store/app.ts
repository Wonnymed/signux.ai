import { create } from 'zustand';

export interface ConversationSummary {
  id: string;
  title: string;
  domain: string;
  has_simulation: boolean;
  latest_verdict: string | null;
  latest_verdict_probability: number | null;
  is_pinned: boolean;
  message_count: number;
  simulation_count: number;
  updated_at: string;
  created_at: string;
}

interface AppState {
  // Sidebar
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;

  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Conversations list (for sidebar)
  conversations: ConversationSummary[];
  setConversations: (convos: ConversationSummary[]) => void;
  updateConversation: (id: string, updates: Partial<ConversationSummary>) => void;
  removeConversation: (id: string) => void;
  addConversation: (convo: ConversationSummary) => void;

  // Loading
  conversationsLoading: boolean;
  setConversationsLoading: (loading: boolean) => void;

  // Fetch conversations from API
  fetchConversations: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Sidebar
  sidebarExpanded: false,
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),

  // Active conversation
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // Conversations
  conversations: [],
  setConversations: (convos) => set({ conversations: convos }),

  updateConversation: (id, updates) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId:
        s.activeConversationId === id ? null : s.activeConversationId,
    })),

  addConversation: (convo) =>
    set((s) => ({
      conversations: [convo, ...s.conversations],
    })),

  // Loading
  conversationsLoading: false,
  setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

  // Fetch
  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await fetch('/api/c');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      set({ conversations: data.conversations || [] });
    } catch {
      // Silent fail — sidebar shows empty
    } finally {
      set({ conversationsLoading: false });
    }
  },
}));
