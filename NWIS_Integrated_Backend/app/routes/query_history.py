"""
NWIS - Query History Audit Routes (Harmonized Architecture)
Phase 4: Retrieve audit log of past user drilling queries and grounded answers
"""

from typing import List, Optional, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.query import QueryHistoryItem
from app.auth.dependencies import get_current_user, require_role
from app.services.rag.query_history_repository import query_history_repository

router = APIRouter(tags=["query-history"])


@router.get("", response_model=List[QueryHistoryItem])
async def get_query_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: Any = Depends(get_current_user)
) -> List[QueryHistoryItem]:
    """
    Retrieves user's query history audit trail.
    Admins can see organization history; standard engineers see their own.
    """
    role = getattr(current_user, "role", None) or (current_user.get("role") if isinstance(current_user, dict) else "viewer")
    user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else "dev-user")
    filter_user_id = None if role in ["super_admin", "admin"] else user_id
    history = query_history_repository.get_user_history(user_id=filter_user_id, limit=limit)
    return history


@router.get("/{query_id}", response_model=QueryHistoryItem)
async def get_single_query_history(
    query_id: str,
    current_user: Any = Depends(get_current_user)
) -> QueryHistoryItem:
    """Retrieves a specific query audit record by ID."""
    item = query_history_repository.get_query_by_id(query_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query history record '{query_id}' not found."
        )
    return item


@router.delete("/clear")
async def clear_query_history(
    current_user: Any = Depends(require_role(["super_admin", "admin"]))
):
    """Admin endpoint to clear history in testing environments."""
    query_history_repository.clear()
    return {"message": "Query history cleared successfully."}


@router.delete("/{query_id}")
async def delete_query_history_item(
    query_id: str,
    current_user: Any = Depends(require_role(["super_admin", "admin"]))
):
    """Admin endpoint to delete a specific query audit record."""
    deleted = query_history_repository.delete_query(query_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query history record '{query_id}' not found."
        )
    return {"message": f"Query history record '{query_id}' deleted successfully."}
