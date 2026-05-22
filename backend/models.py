"""
Pydantic models for the Ollama Chat API.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    messages: list[ChatMessage] = Field(..., description="Conversation messages")
    model: Optional[str] = Field(None, description="Ollama model name override")


class SessionInfo(BaseModel):
    session_id: str
    created_at: datetime
    last_active: datetime
    message_count: int = 0
    is_active: bool = True


class RequestInfo(BaseModel):
    request_id: str
    session_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "processing"  # processing, completed, error
    tokens_generated: int = 0
    error_message: Optional[str] = None


class StatsResponse(BaseModel):
    active_requests: int
    completed_requests: int
    total_requests: int
    avg_response_time_ms: float
    model: str
    concurrent_users: int
    active_sessions: int
    requests_history: list[dict] = []


class HealthResponse(BaseModel):
    status: str
    ollama_available: bool
    model: str
    timestamp: datetime
