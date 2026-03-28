import { create } from 'zustand';

export interface DeepDiveChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  createdAt: number;
}

interface DeepDiveState {
  isOpen: boolean;
  selectedAgentId: string | null;
  messagesByAgent: Record<string, DeepDiveChatMessage[]>;
  open: (agentId: string) => void;
  close: () => void;
  appendMessages: (agentId: string, messages: DeepDiveChatMessage[]) => void;
}

export const useDeepDiveStore = create<DeepDiveState>((set) => ({
  isOpen: false,
  selectedAgentId: null,
  messagesByAgent: {},

  open: (agentId) =>
    set({
      isOpen: true,
      selectedAgentId: agentId,
    }),

  close: () =>
    set({
      isOpen: false,
      selectedAgentId: null,
    }),

  appendMessages: (agentId, messages) =>
    set((s) => ({
      messagesByAgent: {
        ...s.messagesByAgent,
        [agentId]: [...(s.messagesByAgent[agentId] || []), ...messages],
      },
    })),
}));
