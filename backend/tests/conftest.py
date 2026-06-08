"""
Shared pytest fixtures for integration tests.
Uses one SQLite test database file so every imported module shares the same schema.
"""
import os

import pytest
from fastapi.testclient import TestClient

# Point the whole test process at one SQLite file before importing the app.
os.environ["DATABASE_URL"] = "sqlite:///./pytest_freshfood.db"
os.environ["SECRET_KEY"] = "test-secret-key-only-for-unit-tests"
os.environ["TESTING"] = "1"
os.environ["ENABLE_METRICS"] = "True"

from database import Base, SessionLocal, engine, get_db  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
