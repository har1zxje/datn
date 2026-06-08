from __future__ import annotations

import time

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

HTTP_REQUESTS_TOTAL = Counter(
    "freshfood_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "freshfood_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)
HTTP_IN_PROGRESS = Gauge(
    "freshfood_http_requests_in_progress",
    "HTTP requests currently in progress",
    ["method", "path"],
)
SCAN_EVENTS_TOTAL = Counter(
    "freshfood_scan_events_total",
    "Total scan events by processing outcome and assessment basis",
    ["outcome", "assessment_basis"],
)


def _get_route_path(request: Request) -> str:
    route = request.scope.get("route")
    if route and getattr(route, "path", None):
        return route.path
    return request.url.path


def record_scan_event(outcome: str, assessment_basis: str) -> None:
    SCAN_EVENTS_TOTAL.labels(outcome=outcome, assessment_basis=assessment_basis).inc()


def setup_observability(app: FastAPI) -> None:
    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        method = request.method
        path = _get_route_path(request)
        start = time.perf_counter()

        HTTP_IN_PROGRESS.labels(method=method, path=path).inc()
        try:
            response = await call_next(request)
        finally:
            duration = time.perf_counter() - start
            HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=path).observe(duration)
            HTTP_IN_PROGRESS.labels(method=method, path=path).dec()

        HTTP_REQUESTS_TOTAL.labels(
            method=method,
            path=path,
            status_code=str(response.status_code),
        ).inc()
        return response

    @app.get("/metrics", include_in_schema=False)
    def metrics():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
