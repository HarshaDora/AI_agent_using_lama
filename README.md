# Ollama Concurrent Chat

A production-style ChatGPT-like web application for testing concurrent local LLM requests via Ollama. Multiple browser tabs act as independent users with isolated sessions, streaming responses, and real-time performance monitoring.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS 3 |
| **State** | Zustand 5 |
| **Animations** | Framer Motion 11 |
| **Markdown** | react-markdown + remark-gfm + react-syntax-highlighter |
| **Backend** | FastAPI + Uvicorn (async) |
| **HTTP Client** | HTTPX (async streaming) |
| **AI Layer** | Ollama → `qwen2.5:3b` |

## Prerequisites

- **Python 3.11+** installed
- **Node.js 18+** installed
- **Ollama** installed and running with the `qwen2.5:3b` model

### Install Ollama & Model

```bash
# Install Ollama: https://ollama.com/download
# Pull the model:
ollama pull qwen2.5:3b

# Verify it's running:
curl http://127.0.0.1:11434/api/tags
```

## Setup & Installation

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Running the Application

### Terminal 1: Start Ollama (if not already running)

```bash
ollama serve
```

### Terminal 2: Start Backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 3: Start Frontend

```bash
cd frontend
npm run dev
```

### Open in Browser

Navigate to: **http://localhost:5173**

## Concurrency Testing

1. Open **3+ browser tabs** to `http://localhost:5173`
2. Each tab gets an independent session ID (visible in bottom-left)
3. Send messages from multiple tabs simultaneously
4. Click **Monitor** (top-right) to see live concurrency metrics
5. Switch to **⚡ Benchmark** view in sidebar to run automated concurrent tests

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Stream chat response (SSE) |
| GET | `/api/health` | Check Ollama availability |
| GET | `/api/stats` | Live concurrency statistics |
| GET | `/api/sessions` | List active sessions |
| DELETE | `/api/session/{id}` | Delete a session |

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py             # Configuration
│   ├── models.py             # Pydantic models
│   ├── ollama_client.py      # Async Ollama client
│   ├── session_manager.py    # Session & stats tracking
│   ├── routes/
│   │   ├── chat.py           # SSE streaming endpoint
│   │   ├── health.py         # Health check
│   │   ├── sessions.py       # Session management
│   │   └── stats.py          # Concurrency stats
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main layout
│   │   ├── components/       # UI components
│   │   ├── store/            # Zustand stores
│   │   ├── services/         # API & streaming
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Helpers
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```
