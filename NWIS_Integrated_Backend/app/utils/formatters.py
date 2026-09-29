"""
NWIS - Data Formatting Utilities (Harmonized Architecture)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime


def format_well_response(well_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format well data for API response."""
    return {
        "id": well_data.get("id"),
        "well_name": well_data.get("well_name"),
        "well_type": well_data.get("well_type"),
        "status": well_data.get("status"),
        "spud_date": well_data.get("spud_date"),
        "completion_date": well_data.get("completion_date"),
        "total_depth_md": well_data.get("total_depth_md"),
        "total_depth_tvd": well_data.get("total_depth_tvd"),
        "operational_area": well_data.get("operational_area"),
        "field_name": well_data.get("field_name"),
        "pad_name": well_data.get("pad_name"),
        "latitude": well_data.get("latitude"),
        "longitude": well_data.get("longitude"),
        "reservoir": well_data.get("reservoir"),
        "formation_tops": well_data.get("formation_tops", []),
        "casing_program": well_data.get("casing_program", []),
        "mud_program": well_data.get("mud_program", []),
        "metadata": well_data.get("metadata", {}),
        "created_at": well_data.get("created_at"),
        "updated_at": well_data.get("updated_at"),
    }


def format_event_response(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format drilling event data for API response."""
    return {
        "id": event_data.get("id"),
        "well_id": event_data.get("well_id"),
        "well_name": event_data.get("well_name"),
        "event_type": event_data.get("event_type"),
        "severity": event_data.get("severity"),
        "depth_md": event_data.get("depth_md"),
        "depth_tvd": event_data.get("depth_tvd"),
        "formation": event_data.get("formation"),
        "description": event_data.get("description"),
        "root_cause": event_data.get("root_cause"),
        "mitigation_action": event_data.get("mitigation_action"),
        "lessons_learned": event_data.get("lessons_learned"),
        "npt_hours": event_data.get("npt_hours", 0),
        "cost_impact": event_data.get("cost_impact", 0),
        "parameters": event_data.get("parameters", {}),
        "occurred_at": event_data.get("occurred_at"),
        "created_at": event_data.get("created_at"),
    }


def format_alert_response(alert_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format alert data for API response."""
    return {
        "id": alert_data.get("id"),
        "active_well_id": alert_data.get("active_well_id"),
        "reference_well_ids": alert_data.get("reference_well_ids", []),
        "alert_type": alert_data.get("alert_type"),
        "severity": alert_data.get("severity"),
        "current_depth": alert_data.get("current_depth"),
        "risk_depth_start": alert_data.get("risk_depth_start"),
        "risk_depth_end": alert_data.get("risk_depth_end"),
        "formation": alert_data.get("formation"),
        "message": alert_data.get("message"),
        "recommendation": alert_data.get("recommendation"),
        "confidence_score": alert_data.get("confidence_score", 0),
        "is_acknowledged": alert_data.get("is_acknowledged", False),
        "is_dismissed": alert_data.get("is_dismissed", False),
        "acknowledged_by": alert_data.get("acknowledged_by"),
        "dismissed_reason": alert_data.get("dismissed_reason"),
        "feedback": alert_data.get("feedback"),
        "created_at": alert_data.get("created_at"),
    }


def format_nearby_well_response(well_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format nearby well data for API response."""
    return {
        "id": well_data.get("id"),
        "well_name": well_data.get("well_name"),
        "latitude": well_data.get("latitude"),
        "longitude": well_data.get("longitude"),
        "distance_meters": well_data.get("distance_meters"),
        "status": well_data.get("status"),
        "total_depth_md": well_data.get("total_depth_md"),
        "operational_area": well_data.get("operational_area"),
        "formation_tops": well_data.get("formation_tops", []),
        "event_count": well_data.get("event_count", 0),
    }


def format_paginated_response(
    items: List[Dict[str, Any]], 
    total: int, 
    page: int, 
    page_size: int
) -> Dict[str, Any]:
    """Format paginated response."""
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


def format_risk_response(risk_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format risk assessment response."""
    return {
        "active_well": risk_data.get("active_well"),
        "current_depth": risk_data.get("current_depth"),
        "current_formation": risk_data.get("current_formation"),
        "nearby_wells_analyzed": risk_data.get("nearby_wells_analyzed"),
        "depth_window": risk_data.get("depth_window"),
        "risks": risk_data.get("risks", {}),
    }


def format_dashboard_overview(data: Dict[str, Any]) -> Dict[str, Any]:
    """Format dashboard overview response."""
    return {
        "active_wells_count": data.get("active_wells_count", 0),
        "total_wells_indexed": data.get("total_wells_indexed", 0),
        "total_events": data.get("total_events", 0),
        "total_documents_processed": data.get("total_documents_processed", 0),
        "active_alerts_count": data.get("active_alerts_count", 0),
        "events_this_month": data.get("events_this_month", 0),
        "npt_hours_this_month": data.get("npt_hours_this_month", 0),
    }


def format_knowledge_response(
    question: str,
    answer: str,
    nearby_wells: Optional[List[Dict[str, Any]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
    parsed_filters: Optional[Dict[str, Any]]] = None,
    map_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Format knowledge query response."""
    return {
        "question": question,
        "answer": answer,
        "nearby_wells_count": len(nearby_wells) if nearby_wells else 0,
        "events_found": len(events) if events else 0,
        "sources": sources or [],
        "parsed_filters": parsed_filters or {},
        "map_data": map_data,
    }
