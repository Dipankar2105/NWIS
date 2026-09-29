"""
NWIS - Role-Based Access Control (RBAC) (Harmonized Architecture)
"""

from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status, Depends
from app.auth.dependencies import get_current_user


def check_area_access(user_profile: Dict[str, Any], well_area: str) -> bool:
    """Check if user has access to a specific operational area."""
    user_role = user_profile.get("role", "viewer")
    if user_role == "super_admin":
        return True
    user_areas = user_profile.get("operational_areas", [])
    if not user_areas:
        return False
    return well_area in user_areas


def filter_by_user_areas(query, user_profile: Dict[str, Any]):
    """Add area filter to Supabase query based on user's role and operational areas."""
    user_role = user_profile.get("role", "viewer")
    if user_role == "super_admin":
        return query
    user_areas = user_profile.get("operational_areas", [])
    if not user_areas:
        return query.eq("operational_area", "__none__")
    return query.in_("operational_area", user_areas)


def get_accessible_well_ids(user_profile: Dict[str, Any], supabase_client) -> List[str]:
    """Get list of well IDs that the user has access to."""
    user_role = user_profile.get("role", "viewer")
    if user_role == "super_admin":
        response = supabase_client.table("wells").select("id").execute()
        return [w["id"] for w in response.data] if response.data else []
    user_areas = user_profile.get("operational_areas", [])
    if not user_areas:
        return []
    response = supabase_client.table("wells").select("id").in_("operational_area", user_areas).execute()
    return [w["id"] for w in response.data] if response.data else []


def check_well_access(user_profile: Dict[str, Any], well_id: str, supabase_client) -> bool:
    """Check if user has access to a specific well."""
    accessible_ids = get_accessible_well_ids(user_profile, supabase_client)
    return well_id in accessible_ids


class RequireRole:
    """Callable dependency class for role checking."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Any = Depends(get_current_user)) -> Any:
        role = getattr(current_user, "role", None) or (current_user.get("role") if isinstance(current_user, dict) else "viewer")
        if role == "super_admin":
            return current_user
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {', '.join(self.allowed_roles)}"
            )
        return current_user
