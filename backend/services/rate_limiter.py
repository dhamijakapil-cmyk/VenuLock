"""
Rate limiting for VenuLoQ critical endpoints.
Phase 17: Protect against burst traffic and abuse.

Uses in-memory sliding window per IP. Resets on restart (acceptable for single-instance).
For multi-instance, swap to Redis-backed.
"""
import time
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("rate_limit")

# Per-IP sliding windows: {ip: [(timestamp, path), ...]}
_request_log = defaultdict(list)

# Rate limit rules: path_prefix -> (max_requests, window_seconds)
RATE_LIMITS = {
    "/api/leads": (20, 60),              # 20 lead creates per minute per IP
    "/api/booking-requests": (20, 60),    # 20 booking requests per minute per IP
    "/api/auth/send-otp": (5, 60),        # 5 OTP sends per minute per IP
    "/api/auth/verify-otp": (10, 60),     # 10 OTP verifies per minute per IP
    "/api/auth/register": (10, 60),       # 10 registrations per minute per IP
    "/api/case_payments": (15, 60),       # 15 payment actions per minute per IP
    "/api/rms/available": (30, 60),       # 30 availability checks per minute per IP
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        path = request.url.path
        ip = request.client.host if request.client else "unknown"
        now = time.time()

        for prefix, (max_req, window) in RATE_LIMITS.items():
            if path.startswith(prefix):
                key = f"{ip}:{prefix}"
                # Clean old entries
                _request_log[key] = [t for t in _request_log[key] if now - t < window]

                if len(_request_log[key]) >= max_req:
                    logger.warning(f"[RATE_LIMIT] {ip} exceeded {max_req}/{window}s on {prefix}")
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Too many requests. Please wait a moment."}
                    )

                _request_log[key].append(now)
                break

        return await call_next(request)
