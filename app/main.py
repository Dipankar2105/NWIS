from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import supabase_admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NWIS started")
    # Verify database connection on startup
    try:
        if supabase_admin:
            result = supabase_admin.table("user_profiles").select("id").limit(1).execute()
            logger.info("Database connection verified")
        else:
            logger.warning("Supabase admin client not initialized")
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
    yield
    logger.info("NWIS stopped")


app = FastAPI(
    title="NWIS",
    version="1.0.0",
    description="Nearby Wells Intelligence System - AI-powered offset well knowledge and decision support platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.routes import wells, events, documents, geo, dashboard
app.include_router(wells.router, prefix=settings.API_PREFIX + "/wells", tags=["wells"])
app.include_router(events.router, prefix=settings.API_PREFIX + "/events", tags=["events"])
app.include_router(documents.router, prefix=settings.API_PREFIX + "/documents", tags=["documents"])
app.include_router(geo.router, prefix=settings.API_PREFIX + "/geo", tags=["geospatial"])
app.include_router(dashboard.router, prefix=settings.API_PREFIX + "/dashboard", tags=["dashboard"])
# Future routers:
# from app.routes import auth, knowledge, alerts, predictions
# app.include_router(auth.router, prefix=settings.API_PREFIX + "/auth", tags=["auth"])
# app.include_router(knowledge.router, prefix=settings.API_PREFIX + "/knowledge", tags=["knowledge"])
# app.include_router(alerts.router, prefix=settings.API_PREFIX + "/alerts", tags=["alerts"])
# app.include_router(predictions.router, prefix=settings.API_PREFIX + "/predictions", tags=["predictions"])


@app.get("/")
def root():
    return {"service": "NWIS", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "database": "connected"}