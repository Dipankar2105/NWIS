from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client
from loguru import logger

from app.auth.dependencies import require_any_user
from app.auth.rbac import filter_by_user_areas, get_accessible_well_ids
from app.database import get_db_admin
from app.models.event import EventResponse, EventListResponse, EventByFormationResponse

router = APIRouter(tags=["events"])


@router.get("", response_model=EventListResponse)
async def list_events(
    well_id: Optional[str] = Query(None, description="Filter by well ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    formation: Optional[str] = Query(None, description="Filter by formation"),
    depth_min: Optional[float] = Query(None, ge=0, description="Minimum measured depth"),
    depth_max: Optional[float] = Query(None, ge=0, description="Maximum measured depth"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of events per page"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    List drilling events with optional filters and pagination.
    Results are restricted to wells in the authenticated user's operational areas.
    """
    try:
        # Validate well_id if provided
        if well_id:
            try:
                UUID(well_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid well ID format"
                )

        # Validate depth range
        if depth_min is not None and depth_max is not None and depth_min > depth_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="depth_min cannot be greater than depth_max"
            )

        # Get accessible well IDs for the user
        accessible_well_ids = get_accessible_well_ids(current_user, db)

        if not accessible_well_ids:
            return EventListResponse(
                events=[],
                total=0,
                page=page,
                page_size=page_size,
            )

        # Build base query with well_id filter from accessible wells
        query = db.table("drilling_events").select("*, wells!inner(well_name)", count="exact")
        query = query.in_("well_id", accessible_well_ids)

        # Apply additional filters
        if well_id:
            query = query.eq("well_id", well_id)
        if event_type:
            query = query.eq("event_type", event_type)
        if severity:
            query = query.eq("severity", severity)
        if formation:
            query = query.eq("formation", formation)
        if depth_min is not None:
            query = query.gte("depth_md", depth_min)
        if depth_max is not None:
            query = query.lte("depth_md", depth_max)

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        # Execute query
        response = query.execute()

        events = []
        for event in (response.data or []):
            # Extract well_name from the joined wells table
            well_name = event.get("wells", {}).get("well_name") if event.get("wells") else None
            event_data = {**event, "well_name": well_name}
            # Remove the nested wells object
            event_data.pop("wells", None)
            events.append(EventResponse(**event_data))

        total = response.count or 0

        return EventListResponse(
            events=events,
            total=total,
            page=page,
            page_size=page_size,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve events"
        )


@router.get("/by-formation", response_model=List[EventByFormationResponse])
async def get_events_by_formation(
    formation: str = Query(..., min_length=1, description="Formation name to filter by"),
    area: Optional[str] = Query(None, description="Optional operational area filter"),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Get events grouped by formation and event type.
    Returns aggregated event counts and average depths per formation.
    """
    try:
        # Get accessible well IDs for the user
        accessible_well_ids = get_accessible_well_ids(current_user, db)

        if not accessible_well_ids:
            return []

        # Build query for events in accessible wells
        query = db.table("drilling_events").select("event_type, severity, depth_md, formation, wells!inner(well_name, operational_area)")
        query = query.in_("well_id", accessible_well_ids)

        # Apply formation filter
        query = query.eq("formation", formation)

        # Apply area filter if provided
        if area:
            query = query.eq("wells.operational_area", area)
        else:
            # Still need to filter by user's operational areas
            user_areas = current_user.get("operational_areas", [])
            user_role = current_user.get("role", "viewer")
            if user_role != "super_admin" and user_areas:
                query = query.in_("wells.operational_area", user_areas)

        response = query.execute()

        # Group by formation and event_type
        from collections import defaultdict
        grouped = defaultdict(lambda: {
            "count": 0,
            "depths": [],
            "severities": [],
            "wells": set()
        })

        for event in (response.data or []):
            well_info = event.get("wells", {})
            well_name = well_info.get("well_name", "")
            event_type = event.get("event_type", "")
            severity = event.get("severity", "low")
            depth_md = event.get("depth_md")

            key = (formation, event_type)
            grouped[key]["count"] += 1
            if depth_md is not None:
                grouped[key]["depths"].append(depth_md)
            grouped[key]["severities"].append(severity)
            grouped[key]["wells"].add(well_name)

        # Build response
        severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}

        results = []
        for (form, ev_type), data in grouped.items():
            avg_depth = sum(data["depths"]) / len(data["depths"]) if data["depths"] else None
            max_severity = max(data["severities"], key=lambda s: severity_order.get(s, 0))

            results.append(EventByFormationResponse(
                formation=form,
                event_type=ev_type,
                count=data["count"],
                avg_depth_md=avg_depth,
                max_severity=max_severity,
                wells_affected=list(data["wells"])
            ))

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting events by formation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve events by formation"
        )