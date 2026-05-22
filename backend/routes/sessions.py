"""
Session management endpoints.
"""

from fastapi import APIRouter, HTTPException
from models import SessionInfo
from session_manager import session_manager

router = APIRouter(tags=["sessions"])


@router.get("/api/sessions", response_model=list[SessionInfo])
async def get_sessions():
    """Return all active sessions."""
    return await session_manager.get_sessions()


@router.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a specific session."""
    deleted = await session_manager.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}
