from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.deps import get_current_user, require_roles
from app.core.types import RoleEnum
from app.db.mongo import get_db
from app.schemas.api import (
    ApiKeyCreate,
    ApiKeyRead,
    GenericMessage,
    NotificationsRead,
    NotificationsUpdate,
    UserPublic,
)

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.analyst))],
)


@router.get("/profile", response_model=UserPublic)
def profile(current_user: dict = Depends(get_current_user)) -> UserPublic:
    return UserPublic(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["full_name"],
        institution=current_user["institution"],
        role=current_user["role"],
        avatar=current_user["avatar"],
    )


@router.get("/notifications", response_model=NotificationsRead)
def get_notifications(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> NotificationsRead:
    settings = db["user_settings"].find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found")

    return NotificationsRead(
        critical_alerts=bool(settings.get("notify_critical", False)),
        high_risk_alerts=bool(settings.get("notify_high", False)),
        weekly_summary=bool(settings.get("notify_weekly", False)),
        model_updates=bool(settings.get("notify_model_updates", False)),
    )


@router.put("/notifications", response_model=NotificationsRead)
def update_notifications(
    payload: NotificationsUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> NotificationsRead:
    db["user_settings"].update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "notify_critical": payload.critical_alerts,
                "notify_high": payload.high_risk_alerts,
                "notify_weekly": payload.weekly_summary,
                "notify_model_updates": payload.model_updates,
            },
            "$setOnInsert": {
                "user_id": current_user["id"],
                "accent_name": "Gold",
            },
        },
        upsert=True,
    )

    settings = db["user_settings"].find_one({"user_id": current_user["id"]}, {"_id": 0})

    return NotificationsRead(
        critical_alerts=bool(settings.get("notify_critical", False)),
        high_risk_alerts=bool(settings.get("notify_high", False)),
        weekly_summary=bool(settings.get("notify_weekly", False)),
        model_updates=bool(settings.get("notify_model_updates", False)),
    )


@router.get("/api-keys", response_model=list[ApiKeyRead])
def list_api_keys(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ApiKeyRead]:
    rows = list(
        db["api_keys"]
        .find({"user_id": current_user["id"]}, {"_id": 0})
        .sort("created_at", -1)
    )
    return [ApiKeyRead.model_validate(row) for row in rows]


@router.post("/api-keys", response_model=ApiKeyRead)
def create_api_key(
    payload: ApiKeyCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ApiKeyRead:
    key_id = f"key_{uuid4().hex[:12]}"
    generated_secret = f"tc_live_{uuid4().hex}_{uuid4().hex[:8]}"
    masked = f"{generated_secret[:11]}************************{generated_secret[-4:]}"

    api_key = {
        "key_id": key_id,
        "user_id": current_user["id"],
        "name": payload.name,
        "key_masked": masked,
        "last_used": "Never",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    db["api_keys"].insert_one(api_key)
    return ApiKeyRead.model_validate(api_key)


@router.delete("/api-keys/{key_id}", response_model=GenericMessage)
def delete_api_key(
    key_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> GenericMessage:
    result = db["api_keys"].delete_one({"key_id": key_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return GenericMessage(message="API key deleted")
