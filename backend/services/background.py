"""
Background task runner for VenuLoQ.
Phase 17: Move non-urgent work out of request path.

Fire-and-forget wrapper: logs errors instead of propagating them to the caller.
"""
import asyncio
import logging
import time
from typing import Callable, Any

logger = logging.getLogger("background")

_background_tasks: set = set()


def fire_and_forget(coro):
    """Schedule a coroutine to run in the background without blocking the caller.
    Errors are logged, not raised. Task reference is kept to prevent GC."""
    task = asyncio.create_task(_safe_run(coro))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task


async def _safe_run(coro):
    """Execute a coroutine, catching and logging any exception."""
    try:
        return await coro
    except Exception as e:
        logger.error(f"[BackgroundTask] {type(e).__name__}: {e}", exc_info=True)
        return None
