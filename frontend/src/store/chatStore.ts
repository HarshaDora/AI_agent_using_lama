/**
 * Zustand store for chat state management.
 * Each tab maintains independent state via sessionStorage-based session IDs.
 */

import { create } from 'zustand';
import type { ChatSession, Message } from '../types';
import { generateId, getTabSessionId, generateTitle } from '../utils/helpers';

interface ChatState {
  // State
  sessions: ChatSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  abortController: AbortController | null;
  tabSessionId: string;

  // Actions
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, content: string, tokens?: number) => void;
  finalizeStreamingMessage: (sessionId: string, messageId: string) => void;
  setStreaming: (streaming: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  stopStreaming: () => void;
  getActiveSession: () => ChatSession | undefined;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isStreaming: false,
  abortController: null,
  tabSessionId: getTabSessionId(),

  createSession: () => {
    const id = generateId();
    const session: ChatSession = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));

    return id;
  },

  deleteSession: (id) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      const newActive =
        state.activeSessionId === id
          ? filtered[0]?.id || null
          : state.activeSessionId;
      return { sessions: filtered, activeSessionId: newActive };
    });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedMessages = [...s.messages, message];
        // Auto-generate title from first user message
        const title =
          s.title === 'New Chat' && message.role === 'user'
            ? generateTitle(message.content)
            : s.title;
        return {
          ...s,
          messages: updatedMessages,
          title,
          lastActive: Date.now(),
        };
      }),
    }));
  },

  updateStreamingMessage: (sessionId, messageId, content, tokens) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              content: m.content + content,
              tokensGenerated: tokens ?? m.tokensGenerated,
            };
          }),
          lastActive: Date.now(),
        };
      }),
    }));
  },

  finalizeStreamingMessage: (sessionId, messageId) => {
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, isStreaming: false } : m
          ),
        };
      }),
      isStreaming: false,
    }));
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setAbortController: (controller) => set({ abortController: controller }),

  stopStreaming: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isStreaming: false, abortController: null });
  },

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find((s) => s.id === activeSessionId);
  },
}));
