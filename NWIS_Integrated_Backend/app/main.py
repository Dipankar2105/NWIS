"""
NWIS - Nearby Wells Intelligence System
Main FastAPI Application Entrypoint (Harmonized Architecture)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.schemas.system import HealthResponse
from app.middleware.logging import RequestLoggingMiddleware
from app.routes import (
    auth,
    wells,
    events,
    geo,
    dashboard,
    documents,
    knowledge,
    predictions,
    alerts,
    analytics,
    query_history,
    system,
    voice,
    audit,
    reference_wells,
    data_sources
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' mode...")
    logger.info(f"API Prefix: {settings.API_PREFIX}")
    logger.info(f"Gemini configured: {settings.is_gemini_configured}")
    logger.info(f"HuggingFace configured: {settings.is_huggingface_configured}")
    logger.info(f"Bhashini configured: {settings.is_bhashini_configured}")
    logger.info(f"Data.gov configured: {settings.is_datagov_configured}")
    logger.info(f"API Setu configured: {settings.is_apisetu_configured}")
    logger.info(f"Supabase configured: {settings.is_supabase_configured}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title="NWIS — Nearby Wells Intelligence System",
    description="AI and Intelligence Backend for Drilling Analytics, Hazard Detection, and Multilingual RAG",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router registrations (matching friend's prefix convention)
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(wells.router, prefix=f"{settings.API_PREFIX}/wells", tags=["wells"])
app.include_router(events.router, prefix=f"{settings.API_PREFIX}/events", tags=["events"])
app.include_router(geo.router, prefix=f"{settings.API_PREFIX}/geo", tags=["geo"])
app.include_router(dashboard.router, prefix=f"{settings.API_PREFIX}/dashboard", tags=["dashboard"])
app.include_router(documents.router, prefix=f"{settings.API_PREFIX}/documents", tags=["documents"])
app.include_router(knowledge.router, prefix=f"{settings.API_PREFIX}/knowledge", tags=["knowledge"])
app.include_router(predictions.router, prefix=f"{settings.API_PREFIX}/predictions", tags=["predictions"])
app.include_router(alerts.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix=f"{settings.API_PREFIX}/analytics", tags=["analytics"])
app.include_router(query_history.router, prefix=f"{settings.API_PREFIX}/query-history", tags=["query-history"])
app.include_router(system.router, prefix=f"{settings.API_PREFIX}/system", tags=["system"])
app.include_router(voice.router, prefix=f"{settings.API_PREFIX}/voice", tags=["voice"])
app.include_router(audit.router, prefix=f"{settings.API_PREFIX}/audit", tags=["audit"])
app.include_router(reference_wells.router, prefix=f"{settings.API_PREFIX}", tags=["reference-wells"])
app.include_router(data_sources.router, prefix=f"{settings.API_PREFIX}", tags=["data-sources"])


@app.get("/", tags=["Root"])
def root():
    return {
        "service": settings.APP_NAME,
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "system_status": f"{settings.API_PREFIX}/system/providers",
        "multilingual_status": f"{settings.API_PREFIX}/system/multilingual"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        version="1.0.0",
        environment=settings.APP_ENV,
        database="connected" if settings.is_supabase_configured else "development_mock",
        multilingual_ready=True
    )
