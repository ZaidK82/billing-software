from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from supabase import create_client

from app.core.config import settings


BUCKET_NAME = "business-assets"
MAX_FILE_SIZE = 2 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def get_supabase_client():
    if not settings.supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured."
        )

    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


async def upload_business_asset(
    *,
    business_id: UUID,
    asset_type: str,
    file: UploadFile,
) -> str:
    if asset_type not in {
        "logo",
        "signature",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid business asset type.",
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only PNG, JPEG, and WebP images "
                "are allowed."
            ),
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must not exceed 2 MB.",
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    extension = ALLOWED_CONTENT_TYPES[
        file.content_type
    ]

    storage_path = (
        f"{business_id}/{asset_type}{extension}"
    )

    client = get_supabase_client()

    try:
        client.storage.from_(BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {
                "content-type": file.content_type,
                "upsert": "true",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to upload business asset.",
        ) from exc

    return storage_path

def create_business_asset_signed_url(
    *,
    storage_path: str,
    expires_in: int = 3600,
) -> str:
    client = get_supabase_client()

    try:
        result = (
            client.storage
            .from_(BUCKET_NAME)
            .create_signed_url(
                storage_path,
                expires_in,
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create asset URL.",
        ) from exc

    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signedUrl")

        if signed_url:
            return signed_url

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to create asset URL.",
    )

def download_business_asset(
    *,
    storage_path: str,
) -> bytes:
    client = get_supabase_client()

    try:
        return bytes(
            client.storage
            .from_(BUCKET_NAME)
            .download(storage_path)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to download business asset.",
        ) from exc