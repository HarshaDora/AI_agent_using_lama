"""
Async Ollama client using HTTPX for streaming chat completions.
"""

import json
import asyncio
import logging
from typing import AsyncGenerator
import httpx
from config import (
    OLLAMA_CHAT_ENDPOINT,
    OLLAMA_TAGS_ENDPOINT,
    OLLAMA_MODEL,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_DELAY,
)

logger = logging.getLogger(__name__)

# Global async client (managed by FastAPI lifespan)
_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Get the global async HTTP client."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=REQUEST_TIMEOUT,
                write=10.0,
                pool=10.0,
            ),
            limits=httpx.Limits(
                max_connections=50,
                max_keepalive_connections=20,
            ),
        )
    return _client


async def close_client():
    """Close the global async HTTP client."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("[OLLAMA] HTTP client closed")


async def check_health() -> dict:
    """Check if Ollama is available and the model is loaded."""
    try:
        client = get_client()
        response = await client.get(OLLAMA_TAGS_ENDPOINT, timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            model_available = any(OLLAMA_MODEL in m for m in models)
            return {
                "available": True,
                "model_loaded": model_available,
                "models": models,
            }
        return {"available": False, "model_loaded": False, "models": []}
    except Exception as e:
        logger.error(f"[OLLAMA] Health check failed: {e}")
        return {"available": False, "model_loaded": False, "models": [], "error": str(e)}


async def stream_chat(
    messages: list[dict], model: str | None = None
) -> AsyncGenerator[str, None]:
    """
    Stream chat completion from Ollama.
    Yields SSE-formatted strings: 'data: {...}\\n\\n'
    """
    use_model = model or OLLAMA_MODEL
    payload = {
        "model": use_model,
        "messages": messages,
        "stream": True,
    }

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(
                f"[OLLAMA] Streaming request attempt {attempt}/{MAX_RETRIES} "
                f"| Model: {use_model} | Messages: {len(messages)}"
            )

            client = get_client()
            async with client.stream(
                "POST", OLLAMA_CHAT_ENDPOINT, json=payload
            ) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    error_msg = f"Ollama returned status {response.status_code}: {error_body.decode()}"
                    logger.error(f"[OLLAMA] {error_msg}")
                    yield f'data: {json.dumps({"error": error_msg})}\n\n'
                    return

                logger.info("[OLLAMA] Streaming started")
                token_count = 0

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue

                    try:
                        chunk = json.loads(line)
                        message = chunk.get("message", {})
                        content = message.get("content", "")
                        done = chunk.get("done", False)

                        if content:
                            token_count += 1
                            yield f'data: {json.dumps({"content": content, "done": False, "tokens": token_count})}\n\n'

                        if done:
                            # Include final stats from Ollama
                            eval_count = chunk.get("eval_count", token_count)
                            eval_duration = chunk.get("eval_duration", 0)
                            tokens_per_sec = 0
                            if eval_duration > 0:
                                tokens_per_sec = round(
                                    eval_count / (eval_duration / 1e9), 1
                                )

                            yield f'data: {json.dumps({"content": "", "done": True, "tokens": eval_count, "tokens_per_sec": tokens_per_sec})}\n\n'
                            logger.info(
                                f"[OLLAMA] Streaming completed | Tokens: {eval_count} | Speed: {tokens_per_sec} tok/s"
                            )
                            return

                    except json.JSONDecodeError as e:
                        logger.warning(f"[OLLAMA] Failed to parse chunk: {line} | Error: {e}")
                        continue

                return  # Stream finished normally

        except httpx.ConnectError as e:
            last_error = f"Cannot connect to Ollama at {OLLAMA_CHAT_ENDPOINT}: {e}"
            logger.error(f"[OLLAMA] Connection error (attempt {attempt}): {last_error}")
        except httpx.ReadTimeout as e:
            last_error = f"Request timed out after {REQUEST_TIMEOUT}s: {e}"
            logger.error(f"[OLLAMA] Timeout (attempt {attempt}): {last_error}")
        except httpx.HTTPError as e:
            last_error = f"HTTP error: {e}"
            logger.error(f"[OLLAMA] HTTP error (attempt {attempt}): {last_error}")
        except Exception as e:
            last_error = f"Unexpected error: {e}"
            logger.error(f"[OLLAMA] Unexpected error (attempt {attempt}): {last_error}")

        if attempt < MAX_RETRIES:
            wait = RETRY_DELAY * attempt
            logger.info(f"[OLLAMA] Retrying in {wait}s...")
            await asyncio.sleep(wait)

    # All retries exhausted
    yield f'data: {json.dumps({"error": last_error or "Failed after all retries"})}\n\n'
