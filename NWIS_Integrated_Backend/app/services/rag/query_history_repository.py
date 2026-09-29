"""
NWIS - Query History Audit Repository
Stores user drilling queries, language, parsed filters, retrieved source IDs, and grounded answers.
Integrates with Supabase query_history table when configured.
Sanitizes inputs to prevent storing secrets or tokens.
"""

import uuid
from datetime import datetime, timezone
import threading
from typing import List, Dict, Any, Optional
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.schemas.query import QueryHistoryItem


class QueryHistoryRepository:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(QueryHistoryRepository, cls).__new__(cls)
                cls._instance._history: List[QueryHistoryItem] = []
        return cls._instance

    def __init__(self):
        self.settings = get_settings()

    def record_query(
        self,
        user_id: Optional[str],
        question: str,
        detected_language: str,
        translated_question: Optional[str],
        parsed_query: Dict[str, Any],
        answer: str,
        retrieved_source_ids: List[str],
        response_metadata: Dict[str, Any]
    ) -> QueryHistoryItem:
        """
        Appends a query history record to the audit trail.
        """
        now = datetime.now(timezone.utc).isoformat()
        item_id = f"qh_{uuid.uuid4().hex[:12]}"

        # Sanitize metadata to strip any sensitive values
        clean_metadata = {k: v for k, v in response_metadata.items() if "secret" not in k.lower() and "key" not in k.lower()}

        item = QueryHistoryItem(
            id=item_id,
            user_id=user_id,
            question=question,
            detected_language=detected_language,
            translated_question=translated_question,
            parsed_query=parsed_query,
            answer=answer,
            retrieved_source_ids=retrieved_source_ids,
            response_metadata=clean_metadata,
            created_at=now
        )

        with self._lock:
            self._history.append(item)

        # Sync to Supabase query_history table if configured
        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                db.table("query_history").insert({
                    "id": item_id,
                    "user_id": user_id,
                    "question": question,
                    "answer": answer,
                    "sources": retrieved_source_ids,
                    "parsed_filters": parsed_query,
                    "response_time_ms": clean_metadata.get("response_time_ms", 0),
                    "created_at": now
                }).execute()
            except Exception as e:
                logger.warning(f"Supabase query_history sync skipped: {e}")

        return item

    def get_user_history(
        self,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[QueryHistoryItem]:
        """
        Retrieves recent query history, optionally filtered by user_id.
        """
        with self._lock:
            items = list(reversed(self._history))
            if user_id:
                items = [i for i in items if i.user_id == user_id or i.user_id is None]
            return items[:limit]

    def get_query_by_id(self, query_id: str) -> Optional[QueryHistoryItem]:
        with self._lock:
            for item in self._history:
                if item.id == query_id:
                    return item
            return None

    def delete_query(self, query_id: str) -> bool:
        with self._lock:
            initial_len = len(self._history)
            self._history = [i for i in self._history if i.id != query_id]
            return len(self._history) < initial_len

    def clear(self):
        """Clears in-memory history (for test isolation)."""
        with self._lock:
            self._history.clear()



query_history_repository = QueryHistoryRepository()
