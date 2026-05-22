"""
Ollama Concurrent Chat — FastAPI Backend
Main application entry point.
"""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS, LOG_LEVEL, OLLAMA_MODEL, OLLAMA_BASE_URL
from ollama_client import close_client

# ── Logging Setup ──────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  Ollama Concurrent Chat Backend Starting")
    logger.info(f"  Model: {OLLAMA_MODEL}")
    logger.info(f"  Ollama URL: {OLLAMA_BASE_URL}")
    logger.info("=" * 60)
    yield
    await close_client()
    logger.info("Backend shutdown complete.")


# ── FastAPI App ────────────────────────────────────────────────
app = FastAPI(
    title="Ollama Concurrent Chat API",
    description="Backend for testing concurrent LLM requests with Ollama",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────
from routes.health import router as health_router
from routes.chat import router as chat_router
from routes.stats import router as stats_router
from routes.sessions import router as sessions_router

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(stats_router)
app.include_router(sessions_router)


@app.get("/")
async def root():
    return {
        "name": "Ollama Concurrent Chat API",
        "version": "1.0.0",
        "model": OLLAMA_MODEL,
        "docs": "/docs",
    }
