from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from loguru import logger

from app.auth.dependencies import get_current_user, require_any_user
from app.auth.rbac import filter_by_user_areas
from app.database import get_db_admin
from app.models.well import WellResponse, WellListResponse, NearbyWellResponse

router = APIRouter(tags=["wells"])


@router.get("", response_model=WellListResponse)
async def list_wells(
    area: Optional[str] = Query(None, description="Filter by operational area"),
    status: Optional[str] = Query(None, description="Filter by well status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of wells per page"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    List wells with optional filters and pagination.
    Results are restricted to the authenticated user's operational areas.
    """
    try:
        # Build base query with area filtering based on RBAC
        query = db.table("wells").select("*", count="exact")
        query = filter_by_user_areas(query, current_user)

        # Apply additional filters if provided
        if area:
            query = query.eq("operational_area", area)
        if status:
            query = query.eq("status", status)

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        # Execute query
        response = query.execute()

        wells = [WellResponse(**well) for well in (response.data or [])]
        total = response.count or 0

        return WellListResponse(
            wells=wells,
            total=total,
            page=page,
            page_size=page_size,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing wells: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wells"
        )


@router.get("/{well_id}", response_model=WellResponse)
async def get_well(
    well_id: str,
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Get detailed information for a specific well.
    Validates that the user has access to the well's operational area.
    """
    try:
        # Validate UUID format
        try:
            UUID(well_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid well ID format"
            )

        # Get well with area filter applied
        query = db.table("wells").select("*").eq("id", well_id)
        query = filter_by_user_areas(query, current_user)

        response = query.execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Well not found or access denied"
            )

        return WellResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving well {well_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve well"
        )


@router.get("/{well_id}/nearby", response_model=List[NearbyWellResponse])
async def get_nearby_wells(
    well_id: str,
    radius_km: float = Query(5.0, gt=0, le=100, description="Search radius in kilometers"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Find nearby wells using the Supabase RPC find_nearby_wells.
    Respects the authenticated user's operational areas.
    """
    try:
        # Validate UUID format
        try:
            UUID(well_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid well ID format"
            )

        # First, get the reference well's location and verify access
        well_query = db.table("wells").select("latitude, longitude, operational_area").eq("id", well_id)
        well_query = filter_by_user_areas(well_query, current_user)

        well_response = well_query.single().execute()

        if not well_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Well not found or access denied"
            )

        well = well_response.data
        latitude = well.get("latitude")
        longitude = well.get("longitude")

        if latitude is None or longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference well does not have location coordinates"
            )

        # Get user's operational areas for filtering
        user_areas = current_user.get("operational_areas", [])
        user_role = current_user.get("role", "viewer")

        # Super admin can see all areas
        areas_filter = None if user_role == "super_admin" else user_areas

        if not areas_filter and user_role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no operational areas assigned"
            )

        # Call the find_nearby_wells RPC
        radius_meters = radius_km * 1000

        rpc_response = db.rpc(
            "find_nearby_wells",
            {
                "lat": latitude,
                "lon": longitude,
                "radius_meters": radius_meters,
                "areas": areas_filter,
                "well_status": None,
            }
        ).execute()

        nearby_wells = [NearbyWellResponse(**well) for well in (rpc_response.data or [])]

        return nearby_wells

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding nearby wells for {well_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find nearby wells"
        )