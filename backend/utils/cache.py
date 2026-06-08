"""
[M5] Redis caching utility.
Nếu Redis không có (dev local không chạy Redis), tất cả cache miss thầm lặng
và hệ thống vẫn hoạt động bình thường bằng cách đọc thẳng từ DB.
"""
import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_redis_client = None


def _get_client():
    """Lazy-init Redis client; trả về None nếu không kết nối được."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        import redis  # type: ignore

        client = redis.from_url(redis_url, socket_connect_timeout=1, socket_timeout=1)
        client.ping()
        _redis_client = client
        logger.info("Redis cache connected: %s", redis_url)
    except Exception as exc:
        logger.warning("Redis not available — caching disabled (%s)", exc)
        _redis_client = None

    return _redis_client


def cache_get(key: str) -> Optional[Any]:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception as exc:
        logger.debug("cache_get error for key=%s: %s", key, exc)
        return None


def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.debug("cache_set error for key=%s: %s", key, exc)


def cache_delete(key: str) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.delete(key)
    except Exception as exc:
        logger.debug("cache_delete error for key=%s: %s", key, exc)


def cache_delete_pattern(pattern: str) -> None:
    """Xóa tất cả keys khớp pattern (dùng SCAN để tránh block)."""
    client = _get_client()
    if client is None:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor, match=pattern, count=100)
            if keys:
                client.delete(*keys)
            if cursor == 0:
                break
    except Exception as exc:
        logger.debug("cache_delete_pattern error for pattern=%s: %s", pattern, exc)


# ─── Cache key constants ──────────────────────────────────────────────────────
CACHE_KEY_CATEGORIES = "freshfood:categories:all"
CACHE_KEY_ADMIN_STATS = "freshfood:admin:stats"
CACHE_KEY_PRODUCTS_PREFIX = "freshfood:products:"
CACHE_TTL_CATEGORIES = 300   # 5 min — categories change rarely
CACHE_TTL_ADMIN_STATS = 30   # 30 sec — near real-time stats
CACHE_TTL_PRODUCTS = 60      # 1 min — products change on mutation
