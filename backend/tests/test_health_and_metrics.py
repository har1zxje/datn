from pathlib import Path
import sys
import os

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "sqlite:///./freshfood_test.db")
os.environ.setdefault("ENABLE_METRICS", "True")
from main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "freshfood-backend"


def test_metrics_endpoint():
    # Trigger a couple of requests so counters are visible in /metrics.
    client.get("/")
    client.get("/health")

    response = client.get("/metrics")
    assert response.status_code == 200
    assert "freshfood_http_requests_total" in response.text
