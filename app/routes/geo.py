from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from loguru import logger

from app.auth.dependencies import require_any_user
from app.auth.rbac import filter_by_user_areas, get_accessible_well_ids
from app.database import get_db_admin
from app.models.well import NearbyWellResponse
from pydantic import BaseModel, Field


class HeatmapEventResponse(BaseModel):
    """Response model for event heatmap data."""
    well_id: str
    well_name: str
    latitude: float
    longitude: float
    event_type: str
    severity: str
    depth_md: Optional[float] = None
    formation: Optional[str] = None
    occurred_at: Optional[str] = None


class HeatmapGridCell(BaseModel):
    """Grid cell for heatmap visualization."""
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    event_count: int
    severity_breakdown: dict = {}


class HeatmapResponse(BaseModel):
    """Response model for event heatmap."""
    cells: List[HeatmapGridCell]
    total_events: int
    bounds: dict


router = APIRouter(tags=["geospatial"])


@router.get("/wells-in-radius", response_model=List[NearbyWellResponse])
async def get_wells_in_radius(
    lat: float = Query(..., ge=-90, le=90, description="Latitude of center point"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude of center point"),
    radius_km: float = Query(5.0, gt=0, le=100, description="Search radius in kilometers"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Find wells within a specified radius of a latitude/longitude point.
    Uses the Supabase RPC find_nearby_wells function.
    Respects the authenticated user's operational areas.
    """
    try:
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
                "lat": lat,
                "lon": lon,
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
        logger.error(f"Error finding wells in radius: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find wells in radius"
        )


@router.get("/event-heatmap", response_model=HeatmapResponse)
async def get_event_heatmap(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    formation: Optional[str] = Query(None, description="Filter by formation"),
    area: Optional[str] = Query(None, description="Filter by operational area"),
    grid_size: float = Query(0.01, gt=0, le=1, description="Grid cell size in degrees (~1km at equator)"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Get drilling event data for heatmap visualization.
    Returns grid cells with event counts for map rendering.
    Respects the authenticated user's operational areas.
    """
    try:
        # Get accessible well IDs for the user
        accessible_well_ids = get_accessible_well_ids(current_user, db)

        if not accessible_well_ids:
            return HeatmapResponse(
                cells=[],
                total_events=0,
                bounds={"lat_min": 0, "lat_max": 0, "lon_min": 0, "lon_max": 0}
            )

        # Build query for events in accessible wells
        query = db.table("drilling_events").select(
            "*, wells!inner(well_name, latitude, longitude, operational_area)"
        ).in_("well_id", accessible_well_ids)

        # Apply optional filters
        if event_type:
            query = query.eq("event_type", event_type)
        if severity:
            query = query.eq("severity", severity)
        if formation:
            query = query.eq("formation", formation)
        if area:
            query = query.eq("wells.operational_area", area)
        else:
            # Still filter by user's operational areas if not super_admin
            user_role = current_user.get("role", "viewer")
            if user_role != "super_admin":
                user_areas = current_user.get("operational_areas", [])
                if user_areas:
                    query = query.in_("wells.operational_area", user_areas)

        response = query.execute()

        if not response.data:
            return HeatmapResponse(
                cells=[],
                total_events=0,
                bounds={"lat_min": 0, "lat_max": 0, "lon_min": 0, "lon_max": 0}
            )

        # Process events into grid cells
        events = response.data
        grid_cells = {}

        # Track bounds
        all_lats = []
        all_lons = []

        for event in events:
            well_info = event.get("wells", {})
            lat = well_info.get("latitude")
            lon = well_info.get("longitude")

            if lat is None or lon is None:
                continue

            all_lats.append(lat)
            all_lons.append(lon)

            # Calculate grid cell coordinates
            lat_cell = int(lat / grid_size) * grid_size
            lon_cell = int(lon / grid_size) * grid_size
            cell_key = (lat_cell, lon_cell)

            if cell_key not in grid_cells:
                grid_cells[cell_key] = {
                    "lat_min": lat_cell,
                    "lat_max": lat_cell + grid_size,
                    "lon_min": lon_cell,
                    "lon_max": lon_cell + grid_size,
                    "event_count": 0,
                    "severity_breakdown": {}
                }

            grid_cells[cell_key]["event_count"] += 1

            # Track severity breakdown
            sev = event.get("severity", "unknown")
            grid_cells[cell_key]["severity_breakdown"][sev] = \
                grid_cells[cell_key]["severity_breakdown"].get(sev, 0) + 1

        # Convert to HeatmapGridCell objects
        cells = [
            HeatmapGridCell(
                lat_min=cell["lat_min"],
                lat_max=cell["lat_max"],
                lon_min=cell["lon_min"],
                lon_max=cell["lon_max"],
                event_count=cell["event_count"],
                severity_breakdown=cell["severity_breakdown"]
            )
            for cell in grid_cells.values()
        ]

        # Calculate bounds
        bounds = {
            "lat_min": min(all_lats) if all_lats else 0,
            "lat_max": max(all_lats) if all_lats else 0,
            "lon_min": min(all_lons) if all_lons else 0,
            "lon_max": max(all_lons) if all_lons else 0,
        }

        return HeatmapResponse(
            cells=cells,
            total_events=len(events),
            bounds=bounds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating event heatmap: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate event heatmap"
        )