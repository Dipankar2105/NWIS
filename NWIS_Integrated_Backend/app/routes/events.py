"""
NWIS - Events Routes
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.event import EventResponse, EventListResponse, EventByFormationResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.data_store import master_data_store
from loguru import logger
import uuid
from datetime import datetime

router = APIRouter()

def _check_event_access(event_well_id: str, current_user: UserProfile) -> bool:
    if current_user.role in ["super_admin", "admin", "drilling_engineer"]:
        return True
    user_areas = current_user.operational_areas or []
    well = next((w for w in master_data_store.wells if w["id"] == event_well_id), None)
    return well and (well.get("operational_area") in user_areas or any(ua in (well.get("operational_area") or "") for ua in user_areas))

@router.get("", response_model=EventListResponse)
async def list_events(
    well_id: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    formation: Optional[str] = None,
    search: Optional[str] = None,
    source_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    current_user: UserProfile = Depends(get_current_user)
):
    """List drilling events with multi-criteria filtering."""
    filtered = []
    for ev in master_data_store.events:
        if ev.get("well_id") and not _check_event_access(ev["well_id"], current_user):
            continue
        if well_id and ev.get("well_id", "").lower() != well_id.lower():
            continue
        if event_type and event_type.lower().replace(" ", "_") not in ev.get("event_type", "").lower().replace(" ", "_"):
            continue
        if severity and severity.lower() != ev.get("severity", "").lower():
            continue
        if formation and formation.lower() not in (ev.get("formation", "") or "").lower():
            continue
        if source_type and source_type.upper() != (ev.get("source_type", "") or "").upper():
            continue
        if search:
            s = search.lower()
            desc = (ev.get("description", "") or "").lower()
            w_name = (ev.get("well_name", "") or "").lower()
            ev_t = (ev.get("event_type", "") or "").lower()
            if s not in desc and s not in w_name and s not in ev_t:
                continue
        filtered.append(ev)

    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = filtered[start_idx:end_idx]

    events = [EventResponse(**item) for item in page_items]
    return EventListResponse(events=events, total=total, page=page, page_size=page_size)


@router.get("/by-formation", response_model=List[EventByFormationResponse])
async def get_events_by_formation(
    formation: Optional[str] = None,
    area: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """Group events by formation and event type."""
    groups = {}
    for ev in master_data_store.events:
        f = ev.get("formation", "Unknown")
        if formation and formation.lower() not in f.lower():
            continue
        et = ev.get("event_type", "General")
        key = (f, et)
        if key not in groups:
            groups[key] = {
                "depths": [],
                "severities": [],
                "wells": set()
            }
        groups[key]["depths"].append(ev.get("depth_md", 0.0))
        groups[key]["severities"].append(ev.get("severity", "LOW"))
        groups[key]["wells"].add(ev.get("well_name") or ev.get("well_id"))

    results = []
    for (f_name, ev_type), data in groups.items():
        avg_d = sum(data["depths"]) / len(data["depths"]) if data["depths"] else 0.0
        max_sev = "CRITICAL" if "CRITICAL" in data["severities"] else ("HIGH" if "HIGH" in data["severities"] else ("MEDIUM" if "MEDIUM" in data["severities"] else "LOW"))
        results.append(EventByFormationResponse(
            formation=f_name,
            event_type=ev_type,
            count=len(data["depths"]),
            avg_depth_md=round(avg_d, 1),
            max_severity=max_sev,
            wells_affected=list(data["wells"])[:10]
        ))

    results.sort(key=lambda x: x.count, reverse=True)
    return results


@router.get("/{event_id}", response_model=EventResponse)
async def get_event_detail(
    event_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Get single event detail by ID."""
    ev = next((e for e in master_data_store.events if e["id"] == event_id), None)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
        
    if ev.get("well_id") and not _check_event_access(ev["well_id"], current_user):
        raise HTTPException(status_code=403, detail="Access denied to event outside assigned operational areas.")
        
    return EventResponse(**ev)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Record a new drilling event. Validates well existence and required fields."""
    well_id = event_data.get("well_id", "").strip()
    event_type = event_data.get("event_type", "").strip()

    if not well_id:
        raise HTTPException(status_code=422, detail="well_id is required.")
    if not event_type:
        raise HTTPException(status_code=422, detail="event_type is required.")

    # Validate well exists
    well = next((w for w in master_data_store.wells if w["id"] == well_id or w["well_name"] == well_id), None)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found.")
        
    if not _check_event_access(well["id"], current_user):
        raise HTTPException(status_code=403, detail="Cannot create event for a well outside assigned operational areas.")

    new_id = f"EVT-{uuid.uuid4().hex[:6].upper()}"
    severity = (event_data.get("severity") or "LOW").upper()

    new_event = {
        "id": new_id,
        "well_id": well["id"],
        "well_name": well["well_name"],
        "event_type": event_type,
        "severity": severity,
        "depth_md": event_data.get("depth_md") or event_data.get("depth"),
        "formation": event_data.get("formation"),
        "description": event_data.get("description") or f"User-reported {event_type} event at {well['well_name']}",
        "root_cause": event_data.get("root_cause"),
        "mitigation_action": event_data.get("mitigation_action"),
        "lessons_learned": event_data.get("lessons_learned"),
        "npt_hours": event_data.get("npt_hours", 0.0),
        "cost_impact": event_data.get("cost_impact", 0.0),
        "parameters": event_data.get("parameters", {}),
        "source_type": "USER_UPLOADED",
        "source_name": "User Reported - NWIS",
        "occurred_at": event_data.get("occurred_at") or datetime.utcnow().isoformat(),
    }

    master_data_store.events.append(new_event)
    logger.info(f"Event created: {new_id} for well {well_id} by {current_user.email}")

    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "EVENT_CREATED",
        "target": new_id,
        "module": "Events",
        "status": "success",
        "details": f"Event '{event_type}' created for well {well_id}"
    })

    return EventResponse(**new_event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    update_data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Update an existing drilling event record."""
    ev = next((e for e in master_data_store.events if e["id"] == event_id), None)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")

    allowed = {
        "severity", "description", "root_cause", "mitigation_action", "lessons_learned",
        "npt_hours", "cost_impact", "formation", "depth_md", "event_type", "parameters"
    }
    for field in allowed:
        if field in update_data and update_data[field] is not None:
            ev[field] = update_data[field]

    ev["updated_at"] = datetime.utcnow().isoformat()

    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "EVENT_UPDATED",
        "target": event_id,
        "module": "Events",
        "status": "success",
        "details": f"Event '{event_id}' updated"
    })

    return EventResponse(**ev)


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """Delete a user-created drilling event. Cannot delete DEMO_SYNTHETIC records."""
    ev = next((e for e in master_data_store.events if e["id"] == event_id), None)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")

    if ev.get("source_type") == "DEMO_SYNTHETIC":
        raise HTTPException(
            status_code=403,
            detail="Cannot delete prototype dataset records. Only user-created events can be deleted."
        )

    master_data_store.events.remove(ev)

    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "EVENT_DELETED",
        "target": event_id,
        "module": "Events",
        "status": "success",
        "details": f"Event '{event_id}' deleted"
    })

    return {"message": f"Event '{event_id}' deleted successfully.", "event_id": event_id}
