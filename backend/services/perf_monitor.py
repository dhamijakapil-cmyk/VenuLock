"""
Performance monitoring middleware for VenuLoQ.
Phase 17: Detect slow endpoints and high-error routes early.
"""
import time
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("perf_monitor")

# Sliding window stats
_endpoint_stats = defaultdict(lambda: {"count": 0, "slow": 0, "errors": 0, "total_ms": 0})
SLOW_THRESHOLD_MS = 2000  # 2s


class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        path = request.url.path
        method = request.method

        try:
            response = await call_next(request)
            elapsed_ms = (time.perf_counter() - start) * 1000
            status = response.status_code

            key = f"{method} {path}"
            _endpoint_stats[key]["count"] += 1
            _endpoint_stats[key]["total_ms"] += elapsed_ms

            if elapsed_ms > SLOW_THRESHOLD_MS:
                _endpoint_stats[key]["slow"] += 1
                logger.warning(f"[SLOW] {key} took {elapsed_ms:.0f}ms (status={status})")

            if status >= 500:
                _endpoint_stats[key]["errors"] += 1
                logger.error(f"[ERROR] {key} returned {status} in {elapsed_ms:.0f}ms")

            return response
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            key = f"{method} {path}"
            _endpoint_stats[key]["count"] += 1
            _endpoint_stats[key]["errors"] += 1
            logger.error(f"[EXCEPTION] {key} failed in {elapsed_ms:.0f}ms: {e}")
            raise


def get_performance_stats():
    """Return current performance stats for admin visibility."""
    stats = []
    for endpoint, data in sorted(_endpoint_stats.items(), key=lambda x: x[1]["slow"], reverse=True):
        avg_ms = data["total_ms"] / max(data["count"], 1)
        stats.append({
            "endpoint": endpoint,
            "requests": data["count"],
            "avg_ms": round(avg_ms, 1),
            "slow_count": data["slow"],
            "error_count": data["errors"],
            "error_rate": round(data["errors"] / max(data["count"], 1) * 100, 1),
        })
    return stats


def reset_performance_stats():
    """Reset stats (useful for periodic snapshots)."""
    _endpoint_stats.clear()
