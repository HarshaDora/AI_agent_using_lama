/**
 * MessageBubble component — renders a single chat message.
 * Supports markdown, code blocks, and streaming state.
 */

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { formatTime } from '../utils/helpers';
import CodeBlock from './CodeBlock';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-start gap-3 px-4 py-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${
          isUser
            ? 'bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/20'
            : 'bg-gradient-to-br from-accent-500 to-accent-700 shadow-accent-500/20'
        }`}
      >
        {isUser ? (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        )}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-violet-600/90 to-purple-700/90 text-white rounded-tr-md'
            : 'bg-surface-800/60 backdrop-blur-sm text-surface-100 rounded-tl-md border border-surface-700/30'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none
            prose-p:leading-relaxed prose-p:my-1.5
            prose-headings:text-surface-100 prose-headings:font-semibold
            prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
            prose-strong:text-surface-100
            prose-code:text-accent-300 prose-code:bg-surface-900/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-a:text-accent-400 prose-a:no-underline hover:prose-a:underline
            prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-blockquote:border-accent-500/50 prose-blockquote:bg-surface-900/30 prose-blockquote:rounded-r-lg prose-blockquote:py-0.5
            prose-table:text-xs
            prose-th:text-surface-300 prose-th:bg-surface-800 prose-th:px-3 prose-th:py-1.5
            prose-td:px-3 prose-td:py-1.5 prose-td:border-surface-700
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (match) {
                    return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Timestamp + streaming indicator */}
        <div className={`flex items-center gap-2 mt-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] opacity-40">{formatTime(message.timestamp)}</span>
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent-400 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(MessageBubble);
