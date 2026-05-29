import os
import sys
from pathlib import Path

# Ensure the backend package root is importable when running `pytest` from anywhere.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

# Override settings BEFORE app imports.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_recrutify.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-prod")
os.environ.setdefault("APP_ENV", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database as db_module
from app.database import Base
from app.main import app


@pytest.fixture(scope="session")
def _engine():
    # StaticPool keeps one shared connection so the in-memory DB persists across sessions.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture()
def client(_engine):
    TestingSession = sessionmaker(bind=_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _get_db_override():
        s = TestingSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[db_module.get_db] = _get_db_override

    # Resume upload tests write under backend/uploads/. Wipe before AND after each test
    # so on-disk state doesn't leak between cases.
    import shutil

    from app.services.file_storage import UPLOADS_ROOT
    shutil.rmtree(UPLOADS_ROOT, ignore_errors=True)

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    shutil.rmtree(UPLOADS_ROOT, ignore_errors=True)
    # Wipe DB between tests so they remain isolated.
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
