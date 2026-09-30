"""
NWIS - Audit Log Routes
Provides access to action audit trail for admin review and export.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.data_store import master_data_store
import uuid
from datetime import datetime

router = APIRouter()


@router.get("", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    user: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: UserProfile = Depends(get_current_user)
):
    """List audit log entries with optional filters."""
    logs = list(reversed(master_data_store.audit_logs))  # newest first

    if module:
        logs = [l for l in logs if module.lower() in l.get("module", "").lower()]
    if action:
        logs = [l for l in logs if action.upper() in l.get("action", "").upper()]
    if user:
        logs = [l for l in logs if user.lower() in l.get("user", "").lower()]

    total = len(logs)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    return logs[start_idx:end_idx]


@router.post("")
async def create_audit_entry(
    entry: Dict[str, Any],
    current_user: UserProfile = Depends(get_current_user)
):
    """Create a frontend-sourced audit entry (for client-side actions)."""
    log_entry = {
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": entry.get("action", "FRONTEND_ACTION"),
        "target": entry.get("target", ""),
        "module": entry.get("module", "Frontend"),
        "status": entry.get("status", "success"),
        "details": entry.get("details", ""),
        "source": "FRONTEND",
    }
    master_data_store.audit_logs.append(log_entry)
    return log_entry
