/**
 * Utility helpers for the chat application.
 */

/**
 * Generate a unique ID using crypto.randomUUID with fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

/**
 * Get or create a session ID unique to this browser tab.
 * Uses sessionStorage so each tab gets its own session.
 */
export function getTabSessionId(): string {
  const key = 'ollama_chat_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

/**
 * Format a timestamp to a readable time string.
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format milliseconds to a human-readable duration.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLen: number = 30): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '…';
}

/**
 * Generate a title from the first user message.
 */
export function generateTitle(content: string): string {
  const clean = content.replace(/\n/g, ' ').trim();
  return truncate(clean, 40) || 'New Chat';
}
