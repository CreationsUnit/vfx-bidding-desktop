import { create } from 'zustand';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clear: () => set({ messages: [], isLoading: false }),
}));
