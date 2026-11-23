from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.connection import Base, engine
import app.database.models  # noqa: F401 - ensure ORM models are registered on Base.metadata
from app.monitoring.scheduler import start_scheduler, stop_scheduler
from app.routes import (
    dashboard_router,
    incidents_router,
    monitors_router,
    settings_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure database tables exist on startup
    Base.metadata.create_all(bind=engine)

    # 2. Start background AsyncIOScheduler probe loops
    start_scheduler()
    try:
        yield
    finally:
        # 3. Cleanly shut down scheduler on app exit
        stop_scheduler()


app = FastAPI(
    title="SentinelCloud API",
    description="Automated Website & API Uptime, Latency, and SSL Monitoring Engine",
    version="2.4.0",
    lifespan=lifespan,
)

# Merge parsed comma-separated CORS_ORIGINS with local development origins
allowed_origins = list(
    dict.fromkeys(
        [
            *settings.cors_origins_list,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all modular routers under /api
app.include_router(monitors_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "Welcome to SentinelCloud API",
        "version": "2.4.0",
        "status": "running",
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
