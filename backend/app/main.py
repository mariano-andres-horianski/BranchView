from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from app.core.config import settings
from app.api.routers import auth, branches, alerts, employees, stock, finances, users
from app.db.session import engine, SessionLocal
from app.db.base import Base
import app.models  # Ensure all models are registered

# Create tables if not using migrations directly (or as backup)
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    # If database is not ready or alembic handles it, avoid crashing on import
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(branches.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(employees.router, prefix=settings.API_V1_STR)
app.include_router(stock.router, prefix=settings.API_V1_STR)
app.include_router(finances.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["General"], summary="Root status")
@app.get(f"{settings.API_V1_STR}", tags=["General"], include_in_schema=False)
def root():
    return {"message": "BranchView API is running"}

@app.get("/health", tags=["Health"], summary="Health check (API & Database)")
@app.get("/health/", tags=["Health"], include_in_schema=False)
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"], include_in_schema=False)
@app.get(f"{settings.API_V1_STR}/health/", tags=["Health"], include_in_schema=False)
def health_check(response: Response):
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "ok"
        }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "error",
            "database": "error",
            "detail": f"Database connection failed: {str(e)}"
        }

@app.get(f"{settings.API_V1_STR}/docs", include_in_schema=False)
def redirect_api_docs():
    return RedirectResponse(url="/docs")

@app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
def redirect_api_openapi():
    return RedirectResponse(url="/openapi.json")
