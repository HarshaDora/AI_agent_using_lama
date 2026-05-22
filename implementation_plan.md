# Ollama Concurrent Chat Application — Implementation Plan

Build a production-style ChatGPT-like web application for concurrency testing of a local Ollama LLM (`qwen2.5:3b`). Multiple browser tabs act as independent users with isolated sessions, streaming responses, and a dedicated concurrency testing dashboard.

## Project Structure

```
d:\creaing_chat_gpt_like_page_with_ollama\
├── backend/
│   ├── main.py                  # FastAPI app entry point, CORS, routes
│   ├── config.py                # Settings (Ollama URL, model, timeouts)
│   ├── models.py                # Pydantic models (ChatRequest, SessionInfo, Stats)
│   ├── ollama_client.py         # Async HTTPX client for Ollama streaming
│   ├── session_manager.py       # In-memory session store & stats tracker
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── chat.py              # POST /api/chat (SSE streaming)
│   │   ├── sessions.py          # GET /api/sessions, DELETE /api/session/{id}
│   │   ├── stats.py             # GET /api/stats
│   │   └── health.py            # GET /api/health
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css             # Tailwind + custom styles
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   ├── store/
│   │   │   ├── chatStore.ts      # Zustand chat state
│   │   │   └── statsStore.ts     # Zustand stats/monitoring state
│   │   ├── services/
│   │   │   ├── api.ts            # Axios instance + API calls
│   │   │   └── streaming.ts      # SSE/fetch streaming handler
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Chat history sidebar
│   │   │   ├── ChatArea.tsx      # Main chat message display
│   │   │   ├── MessageBubble.tsx # Individual message with markdown
│   │   │   ├── InputArea.tsx     # Multi-line input + send
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── CodeBlock.tsx     # Syntax-highlighted code blocks
│   │   │   ├── DevPanel.tsx      # Concurrency testing dashboard
│   │   │   └── BenchmarkPanel.tsx # Multi-user benchmark tool
│   │   ├── hooks/
│   │   │   └── useAutoScroll.ts
│   │   └── utils/
│   │       └── helpers.ts        # ID generation, formatting
│   └── README.md
└── README.md                     # Root README with full setup instructions
```

---

## Proposed Changes

### Backend — FastAPI + Async Architecture

#### [NEW] `backend/config.py`
Application configuration with environment variable support:
- `OLLAMA_BASE_URL` = `http://127.0.0.1:11434`
- `OLLAMA_MODEL` = `qwen2.5:3b`
- `REQUEST_TIMEOUT` = 300s
- `MAX_RETRIES` = 3

#### [NEW] `backend/models.py`
Pydantic models:
- `ChatMessage` (role, content)
- `ChatRequest` (session_id, messages, model)
- `SessionInfo` (session_id, created_at, message_count, last_active)
- `StatsResponse` (active_requests, completed_requests, avg_response_time, model, concurrent_users, requests_per_session)

#### [NEW] `backend/session_manager.py`
Thread-safe in-memory session manager using `asyncio.Lock`:
- `sessions: dict[str, SessionInfo]` — tracks all active sessions
- `active_requests: dict[str, RequestInfo]` — tracks in-flight requests with start time, status
- `completed_requests: list[RequestInfo]` — history for stats
- Methods: `register_session()`, `start_request()`, `end_request()`, `get_stats()`, `delete_session()`, `get_sessions()`
- Computes: active count, average duration, tokens/sec estimates

#### [NEW] `backend/ollama_client.py`
Async Ollama integration using `httpx.AsyncClient`:
- `stream_chat(messages, model)` → async generator yielding JSON chunks
- Uses `client.stream("POST", ...)` with `aiter_lines()`
- Retry logic (3 retries with exponential backoff)
- Timeout handling (300s for generation)
- Connection error handling with meaningful error messages
- Yields SSE-formatted `data: {...}\n\n` strings

#### [NEW] `backend/routes/chat.py`
`POST /api/chat` endpoint:
- Accepts `ChatRequest` body
- Registers session, starts request tracking
- Returns `StreamingResponse` with `media_type="text/event-stream"`
- Streams tokens from Ollama → SSE to client
- Sends `data: [DONE]\n\n` on completion
- Sends `data: {"error": "..."}\n\n` on failure
- Updates stats on completion (duration, token count)

#### [NEW] `backend/routes/health.py`
`GET /api/health`:
- Pings Ollama at `/api/tags` to verify availability
- Returns `{"status": "ok", "ollama": true/false, "model": "qwen2.5:3b"}`

#### [NEW] `backend/routes/stats.py`
`GET /api/stats`:
- Returns live concurrency metrics from `session_manager`
- Active requests, completed count, avg response time, model info, concurrent user count

#### [NEW] `backend/routes/sessions.py`
- `GET /api/sessions` → list all active sessions
- `DELETE /api/session/{session_id}` → remove a session

#### [NEW] `backend/main.py`
FastAPI app setup:
- CORS middleware (allow all origins for local dev)
- Include all route routers
- Startup/shutdown events for httpx client lifecycle
- Logging configuration with timestamps

#### [NEW] `backend/requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
httpx==0.27.0
pydantic==2.9.0
python-dotenv==1.0.1
```

---

### Frontend — React + Vite + TypeScript + Tailwind

#### [NEW] `frontend/` (Scaffolded with Vite)
Initialize with: `npx -y create-vite@latest ./ -- --template react-ts`

#### [NEW] `frontend/package.json` — Additional Dependencies
```
zustand, axios, react-markdown, remark-gfm, rehype-highlight,
framer-motion, react-syntax-highlighter,
@types/react-syntax-highlighter, tailwindcss, postcss, autoprefixer
```

#### [NEW] `frontend/src/types/index.ts`
TypeScript interfaces:
- `Message` (id, role, content, timestamp, isStreaming)
- `ChatSession` (id, title, messages, createdAt, lastActive)
- `ServerStats` (activeRequests, completedRequests, avgResponseTime, model, concurrentUsers)
- `BenchmarkResult` (userId, startTime, endTime, duration, tokenCount, status)

#### [NEW] `frontend/src/store/chatStore.ts`
Zustand store for chat state:
- `sessions: Map<string, ChatSession>`
- `activeSessionId: string`
- `isStreaming: boolean`
- Actions: `createSession()`, `deleteSession()`, `addMessage()`, `updateStreamingMessage()`, `setActiveSession()`
- Session ID generated per tab (stored in `sessionStorage` for tab isolation)

#### [NEW] `frontend/src/store/statsStore.ts`
Zustand store for monitoring:
- `stats: ServerStats`
- `benchmarkResults: BenchmarkResult[]`
- Actions: `fetchStats()`, `addBenchmarkResult()`, `clearBenchmarks()`
- Polling interval for live stats

#### [NEW] `frontend/src/services/api.ts`
Axios instance configured for `http://localhost:8000`:
- `getHealth()`, `getStats()`, `getSessions()`, `deleteSession()`

#### [NEW] `frontend/src/services/streaming.ts`
Streaming handler using `fetch()` API with `ReadableStream`:
- `streamChat(sessionId, messages, onToken, onComplete, onError)`
- Uses `fetch` POST (not EventSource, since EventSource only supports GET)
- Reads response body as stream, parses SSE lines
- Calls `onToken(text)` for each chunk → Zustand accumulation
- Handles `[DONE]` signal and errors

> [!IMPORTANT]
> We use `fetch()` with `ReadableStream` instead of `EventSource` because `EventSource` only supports GET requests. Our chat endpoint is POST. This is the standard pattern for LLM streaming UIs.

#### [NEW] `frontend/src/components/Sidebar.tsx`
- Chat history list with session titles
- "New Chat" button with + icon
- Delete chat (trash icon with confirmation)
- Session ID display (truncated)
- Collapsible on mobile (hamburger toggle)
- Active session highlight
- Framer Motion slide-in animation

#### [NEW] `frontend/src/components/ChatArea.tsx`
- Scrollable message list
- Auto-scroll to bottom on new messages
- Empty state with welcome message
- Loading state during streaming

#### [NEW] `frontend/src/components/MessageBubble.tsx`
- User messages (right-aligned, accent color)
- AI messages (left-aligned, dark surface)
- `react-markdown` with `remark-gfm` for GFM support
- Custom `CodeBlock` renderer for fenced code
- Timestamp display
- Smooth fade-in animation (Framer Motion)

#### [NEW] `frontend/src/components/CodeBlock.tsx`
- Syntax highlighting with `react-syntax-highlighter`
- Language label
- Copy-to-clipboard button
- Dark theme (e.g., One Dark)

#### [NEW] `frontend/src/components/InputArea.tsx`
- Auto-resizing textarea
- Send button (arrow icon)
- Enter to send, Shift+Enter for newline
- Disabled during streaming
- "Stop generating" button during active stream
- Character count (optional)

#### [NEW] `frontend/src/components/TypingIndicator.tsx`
- Animated dots indicator
- Shows while waiting for first token

#### [NEW] `frontend/src/components/DevPanel.tsx`
Concurrency testing dashboard (toggleable panel):
- **Live Metrics**: Active users, active requests, queue depth, avg response time, tokens/sec
- **Request Log**: Table showing recent requests with session ID, start time, end time, duration, status
- **Auto-refresh** via polling (every 2s)
- **Visual indicators**: Green/yellow/red status dots
- Framer Motion slide-in from right

#### [NEW] `frontend/src/components/BenchmarkPanel.tsx`
Performance testing page:
- Input: prompt text, number of simulated users (1–10)
- "Run Benchmark" button
- Fires N concurrent requests using the same prompt
- Displays results table: User #, Started, Completed, Duration, Tokens/sec, Status
- Shows whether requests ran concurrently vs sequentially (timeline visualization)
- Summary: total time, avg per-request time, concurrency ratio

#### [NEW] `frontend/src/App.tsx`
Main layout:
- Sidebar (left, collapsible)
- Chat area (center, flex-grow)
- DevPanel toggle button (top-right)
- BenchmarkPanel accessible via tab/button
- Dark theme by default
- Responsive breakpoints

#### [NEW] `frontend/src/index.css`
Tailwind imports + custom CSS:
- Dark mode color palette (slate/zinc based)
- Custom scrollbar styling
- Smooth transitions
- Glassmorphism effects for panels
- Typography (Inter font from Google Fonts)
- Message bubble styles
- Code block overrides

---

## Design Decisions

### Session Isolation Strategy
Each browser tab generates a unique `sessionId` stored in `sessionStorage` (not `localStorage`). This ensures:
- Opening a new tab = new session
- Refreshing preserves the same session
- No cross-tab contamination

### Streaming Architecture
```
Browser Tab → fetch POST /api/chat → FastAPI StreamingResponse
                                         ↓
                                   httpx.stream() → Ollama /api/chat
                                         ↓
                                   async generator yields SSE chunks
                                         ↓
                                   Browser reads ReadableStream
                                         ↓
                                   Zustand state accumulation
                                         ↓
                                   React re-render (message update)
```

### Concurrency Model
FastAPI runs on Uvicorn with async handlers. Each chat request is an independent async task:
- No global locks on the request path
- Session manager uses `asyncio.Lock` only for brief dict mutations
- Ollama handles its own internal queuing
- Backend tracks concurrent request count for dashboard visibility

---

## User Review Required

> [!IMPORTANT]
> **Tailwind CSS**: You specified Tailwind CSS in the tech stack. I'll use **Tailwind CSS v3** with PostCSS. Confirm if you prefer v4.

> [!IMPORTANT]
> **Port Configuration**: Backend will run on `localhost:8000`, frontend dev server on `localhost:5173`. Vite will proxy `/api` requests to the backend. Confirm these ports work for you.

> [!NOTE]
> **No Database**: All session data is stored in-memory. Restarting the backend clears all sessions and stats. This is appropriate for a concurrency testing tool.

## Open Questions

1. **Number of benchmark users**: The benchmark panel supports 1–10 simulated concurrent users. Should I increase this limit?
2. **Chat history persistence**: Currently in-memory only (backend) + sessionStorage (frontend). Want file-based persistence across restarts?
3. **Model switching**: Should the UI support switching between different Ollama models, or is `qwen2.5:3b` hardcoded?

---

## Verification Plan

### Automated Tests
1. **Backend health check**: `curl http://localhost:8000/api/health` → verify Ollama connectivity
2. **Single chat test**: Send a message via one tab, verify streaming response renders
3. **Concurrent test**: Open 3+ tabs, send messages simultaneously, verify:
   - All responses stream independently
   - Stats dashboard shows correct concurrent count
   - No session mixing
4. **Benchmark test**: Run the built-in benchmark with 3–5 simulated users, verify timing results

### Manual Verification
1. Start Ollama: `ollama run qwen2.5:3b`
2. Start backend: `cd backend && uvicorn main:app --reload --port 8000`
3. Start frontend: `cd frontend && npm run dev`
4. Open multiple browser tabs to `localhost:5173`
5. Chat simultaneously from all tabs
6. Check DevPanel for live metrics
7. Run benchmark from BenchmarkPanel
