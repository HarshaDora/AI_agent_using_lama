export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  tokensGenerated?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastActive: number;
}

export interface ServerStats {
  active_requests: number;
  completed_requests: number;
  total_requests: number;
  avg_response_time_ms: number;
  model: string;
  concurrent_users: number;
  active_sessions: number;
  requests_history: RequestHistoryItem[];
}

export interface RequestHistoryItem {
  request_id: string;
  session_id: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  status: string;
  tokens: number;
  tokens_per_sec: number;
}

export interface BenchmarkResult {
  userId: number;
  sessionId: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  tokenCount: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  response: string;
  errorMessage?: string;
}

export interface HealthStatus {
  status: string;
  ollama_available: boolean;
  model: string;
  timestamp: string;
}

export type ActiveView = 'chat' | 'benchmark';
