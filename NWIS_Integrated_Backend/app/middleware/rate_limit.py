"""
NWIS - Rate Limiting Middleware (Harmonized Architecture)
"""

from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.config import settings
from loguru import logger

# Global limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    storage_uri="memory://",
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    logger.warning(f"Rate limit exceeded for {get_remote_address(request)}")
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please slow down your requests.",
            "retry_after": exc.retry_after,
        },
    )


def get_limiter() -> Limiter:
    """Get the global limiter instance."""
    return limiter
