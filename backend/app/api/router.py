from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user_id
from app.core.config import settings
from app.core.database import engine


router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "billing-api",
        "version": settings.app_version,
        "database_configured": bool(settings.database_url),
    }


@router.get("/health/database")
async def database_health_check():
    if engine is None:
        return {
            "status": "not_configured",
        }

    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        return {
            "status": "ok",
        }

    except Exception:
        return {
            "status": "error",
        }


@router.get("/auth/me")
async def get_me(
    user_id=Depends(get_current_user_id),
):
    return {
        "user_id": str(user_id),
    }