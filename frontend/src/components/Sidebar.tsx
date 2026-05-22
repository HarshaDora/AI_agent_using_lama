/**
 * Sidebar — chat history, new chat, session management.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { truncate } from '../utils/helpers';
import type { ActiveView } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, activeView, onViewChange }) => {
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const tabSessionId = useChatStore((s) => s.tabSessionId);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`flex-shrink-0 h-full bg-surface-900/95 backdrop-blur-xl border-r border-surface-800/50 overflow-hidden flex flex-col z-40 ${
          isOpen ? 'fixed lg:relative inset-y-0 left-0' : ''
        }`}
      >
        <div className="flex flex-col h-full w-[280px]">
          {/* Header */}
          <div className="p-4 border-b border-surface-800/50">
            <button onClick={() => { createSession(); onViewChange('chat'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/30 hover:border-surface-600/50 text-sm text-surface-300 hover:text-surface-100 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Chat
            </button>
          </div>

          {/* View toggles */}
          <div className="px-3 pt-3 flex gap-1">
            <button onClick={() => onViewChange('chat')}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${activeView === 'chat' ? 'bg-accent-500/20 text-accent-400' : 'text-surface-500 hover:text-surface-300'}`}>
              💬 Chat
            </button>
            <button onClick={() => onViewChange('benchmark')}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${activeView === 'benchmark' ? 'bg-accent-500/20 text-accent-400' : 'text-surface-500 hover:text-surface-300'}`}>
              ⚡ Benchmark
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            <p className="text-[10px] text-surface-600 uppercase tracking-wider font-semibold px-2 mb-2">Recent Chats</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-surface-600 px-2 py-4 text-center">No conversations yet</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    activeSessionId === session.id ? 'bg-surface-800/80 border border-surface-700/40' : 'hover:bg-surface-800/40 border border-transparent'
                  }`}
                  onClick={() => { setActiveSession(session.id); onViewChange('chat'); }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-300 truncate">{truncate(session.title, 28)}</p>
                    <p className="text-[10px] text-surface-600">{session.messages.length} messages</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-surface-600 hover:text-red-400 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Session info */}
          <div className="p-3 border-t border-surface-800/50">
            <div className="px-2 py-2 rounded-lg bg-surface-800/30 text-[10px] text-surface-600">
              <span className="text-surface-500">Session:</span> {tabSessionId.slice(0, 12)}...
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
