/**
 * ChatArea — scrollable message display with empty state.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { useAutoScroll } from '../hooks/useAutoScroll';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import InputArea from './InputArea';

const ChatArea: React.FC = () => {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const lastMsg = messages[messages.length - 1];
  const scrollRef = useAutoScroll(lastMsg?.content ?? '');
  const isWaiting = isStreaming && lastMsg?.role === 'assistant' && lastMsg.content === '';

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-6 max-w-lg">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-700/20 border border-accent-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
              </div>
              <h2 className="text-xl font-semibold text-surface-200 mb-2">Ollama Concurrent Chat</h2>
              <p className="text-sm text-surface-500 mb-6 leading-relaxed">Chat with your local LLM. Open multiple tabs to test concurrent requests.</p>
              <div className="grid grid-cols-2 gap-2">
                {['Explain async programming', 'Write a Python web scraper', 'Compare SQL vs NoSQL', 'Explain JWT authentication'].map((p) => (
                  <button key={p} onClick={() => {
                    const el = document.getElementById('chat-input') as HTMLTextAreaElement;
                    if (el) { const s = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set; s?.call(el, p); el.dispatchEvent(new Event('input',{bubbles:true})); el.focus(); }
                  }} className="text-left text-xs text-surface-400 bg-surface-800/40 hover:bg-surface-800/70 rounded-xl px-3 py-2.5 border border-surface-700/30 hover:border-surface-600/50 transition-all">{p}</button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6">
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
            {isWaiting && <TypingIndicator />}
          </div>
        )}
      </div>
      <InputArea />
    </div>
  );
};

export default ChatArea;
