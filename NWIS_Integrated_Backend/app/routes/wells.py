"""
NWIS - Wells Routes
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from loguru import logger
from app.models.well import WellResponse, NearbyWellResponse, WellListResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.data_store import master_data_store, haversine_distance
import uuid
from datetime import datetime

router = APIRouter()


@router.get("", response_model=WellListResponse)
async def list_wells(
    area: Optional[str] = None,
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    current_user: UserProfile = Depends(get_current_user)
):
    """List wells filtered by operational areas, status, provenance, and search query."""
    all_wells = [w for w in master_data_store.wells if not w.get("is_archived", False)]

    filtered = []
    for w in all_wells:
        if area and area.lower() not in (w.get("operational_area", "") or "").lower():
            continue
        if status and status.lower() != (w.get("status", "") or "").lower():
            continue
        if source_type and source_type.upper() != (w.get("source_type", "") or "").upper():
            continue
        if search:
            s = search.lower()
            w_name = (w.get("well_name", "") or "").lower()
            w_field = (w.get("field_name", "") or "").lower()
            w_area = (w.get("operational_area", "") or "").lower()
            w_res = (w.get("reservoir", "") or "").lower()
            w_id = (w.get("id", "") or "").lower()
            if s not in w_name and s not in w_field and s not in w_area and s not in w_res and s not in w_id:
                continue
        filtered.append(w)

    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = filtered[start_idx:end_idx]

    wells = [WellResponse(**item) for item in page_items]
    return WellListResponse(
        wells=wells,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=WellResponse, status_code=status.HTTP_201_CREATED)
async def create_well(
    well_data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Create a new well record. Validates required fields and prevents duplicate IDs."""
    # Check for duplicate well_name or explicit id
    well_name = well_data.get("well_name", "").strip()
    if not well_name:
        raise HTTPException(status_code=422, detail="well_name is required.")

    existing = next((w for w in master_data_store.wells if w["well_name"].lower() == well_name.lower()), None)
    if existing:
        raise HTTPException(status_code=409, detail=f"Well '{well_name}' already exists.")

    # Validate coordinates
    lat = well_data.get("latitude")
    lon = well_data.get("longitude")
    if lat is None or lon is None:
        raise HTTPException(status_code=422, detail="latitude and longitude are required.")
    if not (-90 <= float(lat) <= 90) or not (-180 <= float(lon) <= 180):
        raise HTTPException(status_code=422, detail="Invalid latitude/longitude values.")

    # Build new well record
    new_id = well_data.get("id") or f"USR-{well_name.upper().replace(' ', '-')[:10]}"
    # Ensure unique ID
    if any(w["id"] == new_id for w in master_data_store.wells):
        new_id = f"USR-{uuid.uuid4().hex[:8].upper()}"

    new_well = {
        "id": new_id,
        "well_name": well_name,
        "well_type": well_data.get("well_type", "Exploratory"),
        "status": well_data.get("status", "planned"),
        "operational_area": well_data.get("operational_area", "Duliajan"),
        "field_name": well_data.get("field_name", well_data.get("operational_area", "Duliajan")),
        "latitude": float(lat),
        "longitude": float(lon),
        "total_depth_md": well_data.get("total_depth_md"),
        "total_depth_tvd": well_data.get("total_depth_tvd"),
        "reservoir": well_data.get("reservoir"),
        "formation_tops": well_data.get("formation_tops", []),
        "casing_program": well_data.get("casing_program", []),
        "mud_program": well_data.get("mud_program", []),
        "spud_date": well_data.get("spud_date"),
        "source_type": well_data.get("source_type", "USER_UPLOADED"),
        "source_name": "NWIS User Created",
        "created_at": datetime.utcnow().isoformat(),
        "is_archived": False,
        "rig_status": well_data.get("rig_status"),
        "objective": well_data.get("objective"),
    }

    master_data_store.wells.append(new_well)
    logger.info(f"Well created: {new_id} by {current_user.email}")

    # Audit log
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "WELL_CREATED",
        "target": new_id,
        "module": "Wells",
        "status": "success",
        "details": f"Well '{well_name}' created"
    })

    return WellResponse(**new_well)


@router.put("/{well_id}", response_model=WellResponse)
async def update_well(
    well_id: str,
    update_data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Update an existing well's metadata. Preserves relational data."""
    well = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"].lower() == well_id.lower()), None)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found.")

    # Allowed editable fields
    allowed = {"status", "current_depth_m", "formation", "rig_status", "objective",
               "well_type", "reservoir", "total_depth_md", "total_depth_tvd", "field_name",
               "operational_area", "spud_date", "completion_date"}
    for field in allowed:
        if field in update_data and update_data[field] is not None:
            well[field] = update_data[field]

    well["updated_at"] = datetime.utcnow().isoformat()

    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "WELL_UPDATED",
        "target": well_id,
        "module": "Wells",
        "status": "success",
        "details": f"Well '{well.get('well_name')}' updated"
    })

    return WellResponse(**well)


@router.put("/{well_id}/archive")
async def archive_well(
    well_id: str,
    data: dict = {},
    current_user: UserProfile = Depends(get_current_user)
):
    """Soft-archive a well. Historical events and documents remain accessible."""
    well = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"].lower() == well_id.lower()), None)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found.")

    well["is_archived"] = True
    well["archived_at"] = datetime.utcnow().isoformat()
    well["archived_reason"] = data.get("reason", "Archived by user")
    well["archived_by"] = current_user.email

    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "WELL_ARCHIVED",
        "target": well_id,
        "module": "Wells",
        "status": "success",
        "details": f"Well '{well.get('well_name')}' archived: {data.get('reason', 'N/A')}"
    })

    return {"message": f"Well '{well_id}' archived successfully.", "well_id": well_id}


@router.get("/nearby", response_model=List[NearbyWellResponse])
async def get_nearby_wells(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    well_id: Optional[str] = None,
    radius_km: float = Query(50.0, ge=0.5, le=500.0),
    limit: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user)
):
    """Find nearby offset wells based on lat/lon or reference well_id."""
    origin_lat, origin_lon = lat, lon
    exclude_id = None

    if well_id:
        target = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"] == well_id), None)
        if target:
            origin_lat = target["latitude"]
            origin_lon = target["longitude"]
            exclude_id = target["id"]

    if origin_lat is None or origin_lon is None:
        # Default to Duliajan active rig DUL-235 coordinates
        origin_lat, origin_lon = 27.3582, 95.3194

    radius_meters = radius_km * 1000.0
    results = []

    for w in master_data_store.wells:
        if w.get("is_archived"):
            continue
        if exclude_id and w["id"] == exclude_id:
            continue

        dist = haversine_distance(origin_lat, origin_lon, w["latitude"], w["longitude"])
        if dist <= radius_meters:
            ev_count = sum(1 for e in master_data_store.events if e["well_id"] == w["id"])
            results.append(NearbyWellResponse(
                id=w["id"],
                well_name=w["well_name"],
                latitude=w["latitude"],
                longitude=w["longitude"],
                distance_meters=round(dist, 1),
                status=w.get("status", "completed"),
                total_depth_md=w.get("total_depth_md"),
                operational_area=w.get("operational_area", "Assam"),
                formation_tops=w.get("formation_tops", []),
                event_count=ev_count,
                source_type=w.get("source_type", "DEMO_SYNTHETIC"),
                source_name=w.get("source_name", "NWIS Synthetic Operational Layer")
            ))

    results.sort(key=lambda x: x.distance_meters)
    return results[:limit]


@router.get("/{well_id}", response_model=WellResponse)
async def get_well_details(well_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Returns details for a single well by ID or well name."""
    well = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"].lower() == well_id.lower()), None)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found.")
    return WellResponse(**well)


@router.get("/{well_id}/nearby", response_model=List[NearbyWellResponse])
async def get_well_nearby(
    well_id: str,
    radius_km: float = Query(10.0, ge=0.5, le=500.0),
    limit: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user)
):
    """Get wells nearby a specific well."""
    target = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"].lower() == well_id.lower()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found.")

    origin_lat = target["latitude"]
    origin_lon = target["longitude"]
    radius_meters = radius_km * 1000.0
    results = []

    for w in master_data_store.wells:
        if w.get("is_archived") or w["id"] == target["id"]:
            continue
        dist = haversine_distance(origin_lat, origin_lon, w["latitude"], w["longitude"])
        if dist <= radius_meters:
            ev_count = sum(1 for e in master_data_store.events if e["well_id"] == w["id"])
            results.append(NearbyWellResponse(
                id=w["id"],
                well_name=w["well_name"],
                latitude=w["latitude"],
                longitude=w["longitude"],
                distance_meters=round(dist, 1),
                status=w.get("status", "completed"),
                total_depth_md=w.get("total_depth_md"),
                operational_area=w.get("operational_area", "Assam"),
                formation_tops=w.get("formation_tops", []),
                event_count=ev_count,
                source_type=w.get("source_type", "DEMO_SYNTHETIC"),
                source_name=w.get("source_name", "NWIS Synthetic Operational Layer")
            ))

    results.sort(key=lambda x: x.distance_meters)
    return results[:limit]


