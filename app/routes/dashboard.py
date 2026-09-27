from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from loguru import logger

from app.auth.dependencies import require_any_user
from app.auth.rbac import get_accessible_well_ids
from app.database import get_db_admin
from app.models.query import DashboardOverview

router = APIRouter(tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Get aggregated dashboard metrics.
    All metrics respect the authenticated user's operational-area permissions.
    """
    try:
        # Get accessible well IDs for the user
        accessible_well_ids = get_accessible_well_ids(current_user, db)

        if not accessible_well_ids:
            return DashboardOverview()

        # 1. Total wells indexed (in accessible areas)
        wells_response = db.table("wells").select("id", count="exact").in_("id", accessible_well_ids).execute()
        total_wells = wells_response.count or 0

        # 2. Active/operational wells (status = 'drilling')
        active_wells_response = db.table("wells").select("id", count="exact").in_("id", accessible_well_ids).eq("status", "drilling").execute()
        active_wells = active_wells_response.count or 0

        # 3. Total drilling events (for accessible wells)
        events_response = db.table("drilling_events").select("id, npt_hours, cost_impact, occurred_at", count="exact").in_("well_id", accessible_well_ids).execute()
        total_events = events_response.count or 0

        # 4. Total documents processed (for accessible wells)
        docs_response = db.table("documents").select("id", count="exact").in_("well_id", accessible_well_ids).execute()
        total_documents = docs_response.count or 0

        # 5. Active alerts count (unacknowledged, undismissed)
        alerts_response = db.table("alerts").select("id", count="exact").in_("active_well_id", accessible_well_ids).eq("is_acknowledged", False).eq("is_dismissed", False).execute()
        active_alerts = alerts_response.count or 0

        # 6. Monthly statistics
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        # Events this month
        events_month_response = db.table("drilling_events").select("id, npt_hours", count="exact").in_("well_id", accessible_well_ids).gte("occurred_at", start_of_month.isoformat()).execute()
        events_this_month = events_month_response.count or 0

        # NPT hours this month
        npt_this_month = 0
        if events_month_response.data:
            npt_this_month = sum(float(e.get("npt_hours", 0) or 0) for e in events_month_response.data)

        # 7. Savings metric - estimate based on cost_impact from historical events
        # This is a derived metric: sum of cost_impact from all accessible events
        # Could be interpreted as "total cost impact tracked" or "potential savings from lessons learned"
        total_cost_impact = 0
        if events_response.data:
            total_cost_impact = sum(float(e.get("cost_impact", 0) or 0) for e in events_response.data)

        return DashboardOverview(
            active_wells_count=active_wells,
            total_wells_indexed=total_wells,
            total_events=total_events,
            total_documents_processed=total_documents,
            active_alerts_count=active_alerts,
            events_this_month=events_this_month,
            npt_hours_this_month=npt_this_month,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating dashboard overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate dashboard overview"
        )