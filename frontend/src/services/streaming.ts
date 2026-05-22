/**
 * SSE Streaming service using fetch + ReadableStream.
 * We use fetch instead of EventSource because EventSource only supports GET.
 */

export interface StreamCallbacks {
  onToken: (content: string, tokens: number) => void;
  onComplete: (tokens: number, tokensPerSec: number) => void;
  onError: (error: string) => void;
}

/**
 * Stream a chat request to the backend via SSE.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamChat(
  sessionId: string,
  messages: { role: string; content: string }[],
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              callbacks.onError(data.error);
              return;
            }

            if (data.done) {
              callbacks.onComplete(data.tokens || 0, data.tokens_per_sec || 0);
              return;
            }

            if (data.content) {
              callbacks.onToken(data.content, data.tokens || 0);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — not an error
        return;
      }
      callbacks.onError(err instanceof Error ? err.message : 'Unknown streaming error');
    }
  })();

  return controller;
}
