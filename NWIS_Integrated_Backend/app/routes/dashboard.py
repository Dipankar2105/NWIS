"""
NWIS - Dashboard Routes
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.data_store import master_data_store, DATASET_SOURCES

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(
    dataset: Optional[str] = Query(None, description="Filter by dataset/provenance"),
    current_user: UserProfile = Depends(get_current_user)
) -> Dict[str, Any]:
    wells = master_data_store.wells
    events = master_data_store.events
    docs = master_data_store.documents
    alerts = master_data_store.alerts

    if dataset and dataset.upper() != "ALL":
        wells = [w for w in wells if w.get("source_type", "").upper() == dataset.upper()]
        events = [e for e in events if e.get("source_type", "").upper() == dataset.upper()]
        docs = [d for d in docs if d.get("source_type", "").upper() == dataset.upper()]

    total_wells = len(wells)
    active_wells = sum(1 for w in wells if w.get("status") in ["drilling", "ACTIVE_DRILLING", "active"])
    completed_wells = sum(1 for w in wells if w.get("status") in ["completed", "COMPLETED"])
    standby_wells = sum(1 for w in wells if w.get("status") in ["standby", "SUSPENDED", "abandoned"])

    total_events = len(events)
    critical_events = sum(1 for e in events if e.get("severity") == "CRITICAL")
    high_events = sum(1 for e in events if e.get("severity") == "HIGH")
    medium_events = sum(1 for e in events if e.get("severity") == "MEDIUM")
    low_events = sum(1 for e in events if e.get("severity") == "LOW")

    total_npt_hours = round(sum(e.get("npt_hours", 0.0) for e in events), 1)
    total_cost_impact = round(sum(e.get("cost_impact", 0.0) for e in events), 2)

    active_alerts = sum(1 for a in alerts if a.get("status") == "ACTIVE" or not a.get("is_acknowledged"))

    # Distribution by Operational Area
    area_counts = {}
    for w in wells:
        area = w.get("operational_area", "Other")
        area_counts[area] = area_counts.get(area, 0) + 1

    # Distribution by Event Type
    event_type_counts = {}
    for e in events:
        et = e.get("event_type", "Other")
        event_type_counts[et] = event_type_counts.get(et, 0) + 1

    # Distribution by Formation
    formation_counts = {}
    for e in events:
        fm = e.get("formation", "Other")
        formation_counts[fm] = formation_counts.get(fm, 0) + 1

    return {
        "active_wells_count": active_wells,
        "total_wells_indexed": total_wells,
        "completed_wells_count": completed_wells,
        "standby_wells_count": standby_wells,
        "total_events": total_events,
        "high_severity_events": critical_events + high_events,
        "critical_events_count": critical_events,
        "high_events_count": high_events,
        "medium_events_count": medium_events,
        "low_events_count": low_events,
        "total_documents_processed": len(docs),
        "active_alerts_count": active_alerts,
        "total_npt_hours": total_npt_hours,
        "total_cost_impact_usd": total_cost_impact,
        "operational_areas": list(area_counts.keys()),
        "wells_by_area": area_counts,
        "events_by_type": event_type_counts,
        "events_by_formation": formation_counts,
        "dataset_sources": DATASET_SOURCES
    }
