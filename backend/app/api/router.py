from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.core.config import settings
from app.core.database import engine, get_db
from app.models import Business, BusinessMembership


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
    user_id: UUID = Depends(get_current_user_id),
):
    return {
        "user_id": str(user_id),
    }


@router.post("/business")
async def create_business(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing_membership = db.scalar(
        select(BusinessMembership).where(
            BusinessMembership.user_id == user_id,
        )
    )

    if existing_membership:
        business = db.get(
            Business,
            existing_membership.business_id,
        )

        if business is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Business membership exists but business was not found.",
            )

        return {
            "business_id": str(business.id),
            "business_name": business.name,
            "role": existing_membership.role,
            "created": False,
        }

    business = Business(
        name="My Business",
    )

    db.add(business)
    db.flush()

    membership = BusinessMembership(
        business_id=business.id,
        user_id=user_id,
        role="owner",
    )

    db.add(membership)
    db.commit()

    return {
        "business_id": str(business.id),
        "business_name": business.name,
        "role": membership.role,
        "created": True,
    }