"""
Stats endpoint for concurrency monitoring.
"""

from fastapi import APIRouter
from models import StatsResponse
from session_manager import session_manager

router = APIRouter(tags=["stats"])


@router.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """Return live concurrency and performance statistics."""
    return await session_manager.get_stats()
