from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app import models  # noqa: F401 — register all models with Base.metadata
from app.routes import admin as admin_routes
from app.routes import auth as auth_routes
from app.routes import companies as companies_routes
from app.routes import health as health_routes
from app.routes import jobs as jobs_routes
from app.routes import matches as matches_routes
from app.routes import me as me_routes


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # For local dev only — production uses Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_routes.router, prefix="/api")
    app.include_router(auth_routes.router, prefix="/api")
    app.include_router(companies_routes.router, prefix="/api")
    app.include_router(jobs_routes.router, prefix="/api")
    app.include_router(me_routes.router, prefix="/api")
    app.include_router(matches_routes.me_router, prefix="/api")
    app.include_router(matches_routes.jobs_router, prefix="/api")
    app.include_router(admin_routes.router, prefix="/api")

    @app.get("/")
    def root():
        return {"name": settings.app_name, "docs": "/docs"}

    return app


app = create_app()
