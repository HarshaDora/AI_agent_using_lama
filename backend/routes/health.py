"""
Health check endpoint.
"""

from datetime import datetime
from fastapi import APIRouter
from models import HealthResponse
from ollama_client import check_health
from config import OLLAMA_MODEL

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Check Ollama availability and model status."""
    result = await check_health()
    return HealthResponse(
        status="ok" if result["available"] else "error",
        ollama_available=result["available"],
        model=OLLAMA_MODEL,
        timestamp=datetime.utcnow(),
    )
