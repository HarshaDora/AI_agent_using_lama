"""
Chat streaming endpoint using Server-Sent Events.
"""

import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models import ChatRequest
from session_manager import session_manager
from ollama_client import stream_chat

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Send a chat prompt and stream the response via SSE.
    Each token is streamed as it arrives from Ollama.
    """
    # Register session and start tracking
    await session_manager.register_session(request.session_id)
    request_info = await session_manager.start_request(request.session_id)

    logger.info(
        f"[CHAT] Request received | Session: {request.session_id[:8]}... "
        f"| Request ID: {request_info.request_id} "
        f"| Messages: {len(request.messages)}"
    )

    # Convert messages to dict format for Ollama
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    async def event_generator():
        token_count = 0
        try:
            async for chunk in stream_chat(messages, request.model):
                # Parse the SSE data to track tokens
                if chunk.startswith("data: "):
                    try:
                        data = json.loads(chunk[6:].strip())
                        if "tokens" in data:
                            token_count = data["tokens"]
                            await session_manager.update_request_tokens(
                                request_info.request_id, token_count
                            )
                        if data.get("error"):
                            await session_manager.end_request(
                                request_info.request_id,
                                status="error",
                                error_message=data["error"],
                            )
                        elif data.get("done"):
                            await session_manager.end_request(
                                request_info.request_id, status="completed"
                            )
                    except json.JSONDecodeError:
                        pass

                yield chunk

        except Exception as e:
            error_msg = f"Stream error: {str(e)}"
            logger.error(f"[CHAT] {error_msg}")
            await session_manager.end_request(
                request_info.request_id, status="error", error_message=error_msg
            )
            yield f'data: {json.dumps({"error": error_msg})}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
