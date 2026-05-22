/**
 * InputArea component — multi-line input with send button.
 * Enter to send, Shift+Enter for new line.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { streamChat } from '../services/streaming';
import { generateId } from '../utils/helpers';
import type { Message } from '../types';

const InputArea: React.FC = () => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeSessionId,
    isStreaming,
    tabSessionId,
    createSession,
    addMessage,
    updateStreamingMessage,
    finalizeStreamingMessage,
    setStreaming,
    setAbortController,
    stopStreaming,
    sessions,
  } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Ensure we have an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    addMessage(sessionId, userMessage);
    setInput('');

    // Create assistant placeholder for streaming
    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(sessionId, assistantMessage);
    setStreaming(true);

    // Get the full conversation for context
    const currentSession = useChatStore.getState().sessions.find((s) => s.id === sessionId);
    const messages = currentSession?.messages
      .filter((m) => !m.isStreaming || m.id === assistantId)
      .filter((m) => m.id !== assistantId)
      .map((m) => ({ role: m.role, content: m.content })) || [];

    // Stream the response
    const controller = streamChat(
      tabSessionId,
      messages,
      {
        onToken: (content, tokens) => {
          updateStreamingMessage(sessionId!, assistantId, content, tokens);
        },
        onComplete: (_tokens, _tokensPerSec) => {
          finalizeStreamingMessage(sessionId!, assistantId);
          setAbortController(null);
        },
        onError: (error) => {
          updateStreamingMessage(sessionId!, assistantId, `\n\n⚠️ Error: ${error}`);
          finalizeStreamingMessage(sessionId!, assistantId);
          setAbortController(null);
        },
      }
    );

    setAbortController(controller);
  }, [input, isStreaming, activeSessionId, tabSessionId, createSession, addMessage, updateStreamingMessage, finalizeStreamingMessage, setStreaming, setAbortController, sessions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-surface-800/50 bg-surface-950/80 backdrop-blur-xl px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-surface-800/50 rounded-2xl border border-surface-700/40 focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/20 transition-all">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 px-4 py-3.5 resize-none focus:outline-none disabled:opacity-50 max-h-[200px]"
          />

          <div className="flex items-center gap-1.5 pr-2 pb-2">
            {isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopStreaming}
                className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Stop generating"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-30 disabled:hover:bg-accent-500 transition-all shadow-lg shadow-accent-500/20 disabled:shadow-none"
                title="Send message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-surface-600 text-center mt-2">
          Press <kbd className="px-1 py-0.5 bg-surface-800 rounded text-surface-400 font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-surface-800 rounded text-surface-400 font-mono">Shift+Enter</kbd> for new line · Session: {tabSessionId.slice(0, 8)}
        </p>
      </div>
    </div>
  );
};

export default InputArea;
