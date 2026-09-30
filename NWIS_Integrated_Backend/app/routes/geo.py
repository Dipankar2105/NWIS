"""
NWIS - Geospatial Routes
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.models.well import NearbyWellResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.data_store import master_data_store, haversine_distance

router = APIRouter()


@router.get("/wells-in-radius", response_model=List[NearbyWellResponse])
async def get_wells_in_radius(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(50.0, ge=0.5, le=500.0),
    current_user: UserProfile = Depends(get_current_user)
):
    """Find all wells within the specified radius in kilometers."""
    radius_meters = radius_km * 1000.0
    results = []

    for w in master_data_store.wells:
        dist = haversine_distance(lat, lon, w["latitude"], w["longitude"])
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
    return results


@router.get("/event-heatmap")
async def get_event_heatmap(
    area: Optional[str] = None,
    event_type: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Generates geospatial event clusters for heatmaps."""
    well_map = {w["id"]: w for w in master_data_store.wells}
    heatmap_points = []

    for ev in master_data_store.events:
        w = well_map.get(ev["well_id"])
        if not w:
            continue
        if area and area.lower() not in (w.get("operational_area", "") or "").lower():
            continue
        if event_type and event_type.lower() not in (ev.get("event_type", "") or "").lower():
            continue

        sev_weight = 4.0 if ev.get("severity") == "CRITICAL" else (3.0 if ev.get("severity") == "HIGH" else (2.0 if ev.get("severity") == "MEDIUM" else 1.0))
        heatmap_points.append({
            "lat": w["latitude"],
            "lon": w["longitude"],
            "well_name": w["well_name"],
            "event_type": ev.get("event_type"),
            "severity": ev.get("severity"),
            "weight": sev_weight,
            "depth_md": ev.get("depth_md"),
            "formation": ev.get("formation")
        })

    return heatmap_points
