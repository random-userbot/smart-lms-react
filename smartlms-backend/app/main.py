"""
Smart LMS Backend - Main Application
FastAPI app with all routers, middleware, and startup events
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.config import settings
from app.database import create_tables
from app.services.debug_logger import debug_logger

# Import routers
from app.routers import auth, courses, lectures
from app.routers import engagement as engagement_router
from app.routers import quizzes as quizzes_router
from app.routers import feedback as feedback_router
from app.routers import notifications as notifications_router
from app.routers import analytics as analytics_router
from app.routers import admin as admin_router
from app.routers import users as users_router
from app.routers import gamification as gamification_router
from app.routers import assignments as assignments_router
from app.routers import activity as activity_router
from app.routers import tutor as tutor_router
from app.routers import messaging as messaging_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("\n" + "=" * 60)
    print("  Smart LMS Backend Starting...")
    print("=" * 60)

    # Create database tables
    await create_tables()
    print("[OK] Database tables created/verified")

    debug_logger.log("activity", "Server started",
                     data={"env": settings.APP_ENV, "debug": settings.DEBUG_MODE})

    yield

    # Shutdown
    debug_logger.log("activity", "Server shutting down")
    print("\n[INFO] Smart LMS Backend stopped.")


app = FastAPI(
    title="Smart LMS API",
    description="Smart Learning Management System with AI-powered engagement tracking",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    # Log to debug logger
    if settings.DEBUG_MODE and not request.url.path.startswith("/docs"):
        debug_logger.log_api(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

    return response


# Register routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(lectures.router)
app.include_router(engagement_router.router)
app.include_router(quizzes_router.router)
app.include_router(feedback_router.router)
app.include_router(notifications_router.router)
app.include_router(analytics_router.router)
app.include_router(admin_router.router)
app.include_router(users_router.router)
app.include_router(gamification_router.router)
app.include_router(assignments_router.router)
app.include_router(activity_router.router)
app.include_router(tutor_router.router)
app.include_router(messaging_router.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "env": settings.APP_ENV,
        "debug_mode": settings.DEBUG_MODE,
    }
