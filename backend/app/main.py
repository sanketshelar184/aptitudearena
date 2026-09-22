import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.commerce import router as commerce_router
from app.api.routes.health import router as health_router
from app.api.routes.taxonomy import router as taxonomy_router
from app.api.routes.tests import router as test_router
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist and database is initialized
    try:
        from app.db.session import engine, Base, SessionLocal
        from app.models.question import Question
        from sqlalchemy import func
        Base.metadata.create_all(bind=engine)

        sqlite_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "aptitude.db"))
        if os.path.exists(sqlite_file) and "postgresql" in settings.database_url:
            with SessionLocal() as db:
                count = db.query(func.count(Question.id)).scalar() or 0
                if count < 50:
                    from scripts.sync_to_postgres import sync_database
                    logger.info("[*] PostgreSQL database is empty, auto-seeding from aptitude.db...")
                    sync_database()
    except Exception as e:
        logger.warning(f"Startup database initialization notice: {e}")
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    lifespan=lifespan,
)

cors_origins = list(settings.cors_origins)
for default_origin in [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://aptitudearena.in",
    "https://www.aptitudearena.in",
]:
    if default_origin not in cors_origins:
        cors_origins.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(taxonomy_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(test_router, prefix=settings.api_v1_prefix)
app.include_router(commerce_router, prefix=settings.api_v1_prefix)

import os
from fastapi.staticfiles import StaticFiles

static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(os.path.join(static_dir, "uploads", "questions"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

