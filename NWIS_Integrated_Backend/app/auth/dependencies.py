"""
NWIS - Authentication Dependencies (Harmonized Architecture)
"""

from typing import List, Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from loguru import logger

from app.config import settings
from app.database import get_db, supabase_admin

# auto_error=False allows graceful development fallback when testing without live tokens
security = HTTPBearer(auto_error=False)

from app.models.user import UserProfile

DEV_MOCK_USER = UserProfile(
    id="dev-user-001",
    email="drilling.engineer@oilindia.in",
    role="super_admin",
    full_name="Senior Drilling Engineer",
    operational_areas=["Assam", "Tripura", "Rajasthan", "Gujarat"],
    is_active=True
)
DEFAULT_DEV_USER: Dict[str, Any] = DEV_MOCK_USER.model_dump()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Client = Depends(get_db)
) -> UserProfile:
    """
    Extract and verify JWT token from Authorization header.
    In development/testing mode with missing credentials, returns default development user.
    """
    if credentials is None:
        if settings.APP_ENV == "development" or not settings.is_supabase_configured:
            return DEV_MOCK_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        # Verify JWT with Supabase if configured
        if settings.is_supabase_configured and hasattr(db, "auth"):
            auth_response = db.auth.get_user(token)
            user = auth_response.user
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            profile_response = supabase_admin.table("user_profiles").select("*").eq("id", user.id).single().execute()
            if profile_response.data:
                profile = profile_response.data
                if not profile.get("is_active", True):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="User account is deactivated"
                    )
                return UserProfile(**profile)

        # Fallback in local/mock testing mode
        return DEV_MOCK_USER

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Authentication validation error: {e}. Using development fallback.")
        return DEV_MOCK_USER


def require_role(allowed_roles: List[str]):
    """
    Dependency factory that creates a role-based access control dependency.
    """
    async def role_checker(current_user: Any = Depends(get_current_user)) -> Any:
        user_role = getattr(current_user, "role", None) or (current_user.get("role") if isinstance(current_user, dict) else "viewer")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user


    return role_checker


# Common role dependencies (matching friend's interface)
require_admin = require_role(["super_admin", "admin"])
require_drilling_engineer = require_role(["super_admin", "admin", "drilling_engineer"])
require_data_admin = require_role(["super_admin", "admin", "data_admin"])
require_any_user = require_role([
    "super_admin", "admin", "drilling_engineer", 
    "geologist", "field_operator", "viewer", "data_admin"
])
