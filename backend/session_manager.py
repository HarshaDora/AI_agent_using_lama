"""
In-memory session manager and request stats tracker.
Thread-safe using asyncio.Lock for concurrent access.
"""

import asyncio
import uuid
import logging
from datetime import datetime
from typing import Optional
from models import SessionInfo, RequestInfo, StatsResponse
from config import OLLAMA_MODEL

logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._sessions: dict[str, SessionInfo] = {}
        self._active_requests: dict[str, RequestInfo] = {}
        self._completed_requests: list[RequestInfo] = []
        self._total_requests: int = 0

    async def register_session(self, session_id: str) -> SessionInfo:
        """Register or update a session."""
        async with self._lock:
            now = datetime.utcnow()
            if session_id not in self._sessions:
                session = SessionInfo(
                    session_id=session_id,
                    created_at=now,
                    last_active=now,
                    message_count=0,
                    is_active=True,
                )
                self._sessions[session_id] = session
                logger.info(f"[SESSION] New session registered: {session_id}")
            else:
                self._sessions[session_id].last_active = now
            return self._sessions[session_id]

    async def start_request(self, session_id: str) -> RequestInfo:
        """Track the start of a new request."""
        async with self._lock:
            request_id = str(uuid.uuid4())[:8]
            now = datetime.utcnow()
            request_info = RequestInfo(
                request_id=request_id,
                session_id=session_id,
                start_time=now,
                status="processing",
            )
            self._active_requests[request_id] = request_info
            self._total_requests += 1

            if session_id in self._sessions:
                self._sessions[session_id].message_count += 1
                self._sessions[session_id].last_active = now

            logger.info(
                f"[REQUEST] Started request {request_id} for session {session_id} "
                f"| Active requests: {len(self._active_requests)}"
            )
            return request_info

    async def update_request_tokens(self, request_id: str, token_count: int):
        """Update the token count for an active request."""
        async with self._lock:
            if request_id in self._active_requests:
                self._active_requests[request_id].tokens_generated = token_count

    async def end_request(
        self,
        request_id: str,
        status: str = "completed",
        error_message: Optional[str] = None,
    ):
        """Mark a request as completed and move to history."""
        async with self._lock:
            if request_id in self._active_requests:
                request_info = self._active_requests.pop(request_id)
                now = datetime.utcnow()
                request_info.end_time = now
                request_info.duration_ms = (
                    now - request_info.start_time
                ).total_seconds() * 1000
                request_info.status = status
                request_info.error_message = error_message

                self._completed_requests.append(request_info)
                # Keep only last 100 completed requests
                if len(self._completed_requests) > 100:
                    self._completed_requests = self._completed_requests[-100:]

                logger.info(
                    f"[REQUEST] {status.upper()} request {request_id} "
                    f"| Duration: {request_info.duration_ms:.0f}ms "
                    f"| Tokens: {request_info.tokens_generated} "
                    f"| Active remaining: {len(self._active_requests)}"
                )

    async def get_stats(self) -> StatsResponse:
        """Get current statistics."""
        async with self._lock:
            completed = self._completed_requests
            avg_time = 0.0
            if completed:
                durations = [
                    r.duration_ms for r in completed if r.duration_ms is not None
                ]
                if durations:
                    avg_time = sum(durations) / len(durations)

            # Build request history (last 20)
            history = []
            for req in list(self._active_requests.values()) + completed[-20:]:
                tokens_per_sec = 0.0
                if req.duration_ms and req.duration_ms > 0 and req.tokens_generated > 0:
                    tokens_per_sec = req.tokens_generated / (req.duration_ms / 1000)

                history.append(
                    {
                        "request_id": req.request_id,
                        "session_id": req.session_id[:8],
                        "start_time": req.start_time.isoformat(),
                        "end_time": req.end_time.isoformat() if req.end_time else None,
                        "duration_ms": round(req.duration_ms, 1) if req.duration_ms else None,
                        "status": req.status,
                        "tokens": req.tokens_generated,
                        "tokens_per_sec": round(tokens_per_sec, 1),
                    }
                )

            return StatsResponse(
                active_requests=len(self._active_requests),
                completed_requests=len(completed),
                total_requests=self._total_requests,
                avg_response_time_ms=round(avg_time, 1),
                model=OLLAMA_MODEL,
                concurrent_users=len(
                    set(r.session_id for r in self._active_requests.values())
                ),
                active_sessions=len(
                    [s for s in self._sessions.values() if s.is_active]
                ),
                requests_history=sorted(
                    history, key=lambda x: x["start_time"], reverse=True
                ),
            )

    async def get_sessions(self) -> list[SessionInfo]:
        """Get all active sessions."""
        async with self._lock:
            return list(self._sessions.values())

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info(f"[SESSION] Deleted session: {session_id}")
                return True
            return False


# Global singleton instance
session_manager = SessionManager()
