from typing import List, Dict, Any, Optional


def check_area_access(user_profile: Dict[str, Any], well_area: str) -> bool:
    """
    Check if user has access to a specific operational area.
    
    Args:
        user_profile: User profile dict with role and operational_areas
        well_area: Operational area of the well
        
    Returns:
        True if user has access, False otherwise
    """
    user_role = user_profile.get("role", "viewer")
    
    # Super admin has access to all areas
    if user_role == "super_admin":
        return True
    
    # Check if user's operational areas include the well's area
    user_areas = user_profile.get("operational_areas", [])
    
    if not user_areas:
        return False
    
    return well_area in user_areas


def filter_by_user_areas(query, user_profile: Dict[str, Any]):
    """
    Add area filter to Supabase query based on user's role and operational areas.
    
    Args:
        query: Supabase query builder object
        user_profile: User profile dict
        
    Returns:
        Modified query with area filter applied
    """
    user_role = user_profile.get("role", "viewer")
    
    # Super admin sees everything - no filter needed
    if user_role == "super_admin":
        return query
    
    user_areas = user_profile.get("operational_areas", [])
    
    if not user_areas:
        # User has no areas - return empty result by filtering on impossible condition
        return query.eq("operational_area", "__none__")
    
    # Filter by user's operational areas
    return query.in_("operational_area", user_areas)


def get_accessible_well_ids(user_profile: Dict[str, Any], supabase_client) -> List[str]:
    """
    Get list of well IDs that the user has access to.
    
    Args:
        user_profile: User profile dict
        supabase_client: Supabase admin client
        
    Returns:
        List of well IDs
    """
    user_role = user_profile.get("role", "viewer")
    
    if user_role == "super_admin":
        # Super admin gets all wells
        response = supabase_client.table("wells").select("id").execute()
        return [w["id"] for w in response.data] if response.data else []
    
    user_areas = user_profile.get("operational_areas", [])
    
    if not user_areas:
        return []
    
    response = supabase_client.table("wells").select("id").in_("operational_area", user_areas).execute()
    return [w["id"] for w in response.data] if response.data else []


def check_well_access(user_profile: Dict[str, Any], well_id: str, supabase_client) -> bool:
    """
    Check if user has access to a specific well.
    
    Args:
        user_profile: User profile dict
        well_id: Well UUID
        supabase_client: Supabase admin client
        
    Returns:
        True if user has access, False otherwise
    """
    accessible_ids = get_accessible_well_ids(user_profile, supabase_client)
    return well_id in accessible_ids