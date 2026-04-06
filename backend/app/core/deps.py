from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pymongo.database import Database

from app.core.config import settings
from app.core.types import RoleEnum
from app.db.mongo import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    db: Database = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise unauthorized

    user = db["users"].find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_active", False):
        raise unauthorized
    return user


def require_roles(*roles: RoleEnum):
    allowed = set(roles)

    def role_dependency(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in {role.value for role in allowed}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permissions",
            )
        return current_user

    return role_dependency


def role_to_route(role: RoleEnum) -> str:
    role_route_map: dict[RoleEnum, str] = {
        RoleEnum.admin: "/dashboard/admin",
        RoleEnum.analyst: "/dashboard/analyst",
        RoleEnum.viewer: "/dashboard/viewer",
    }
    return role_route_map[role]


def normalize_case_ids(case_ids: Iterable[str] | None) -> list[str]:
    if not case_ids:
        return []
    return [value.strip() for value in case_ids if value and value.strip()]
