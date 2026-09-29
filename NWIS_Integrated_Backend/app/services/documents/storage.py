"""
NWIS - Document Secure Storage Module
Handles file persistence locally or via Supabase Storage.
Never exposes internal storage credentials or secrets.
"""

import os
import re
from typing import Optional, Tuple
from loguru import logger
from app.config import get_settings
from app.database import get_db


class DocumentStorage:
    def __init__(self):
        self.settings = get_settings()
        self.upload_dir = self.settings.UPLOAD_DIR
        self._ensure_upload_dir()

    def _ensure_upload_dir(self):
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir, exist_ok=True)

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitizes filename to avoid path traversal vulnerabilities."""
        base = os.path.basename(filename)
        clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base)
        return clean or "document.pdf"

    def store_file(self, document_id: str, filename: str, content: bytes) -> str:
        """
        Stores the document file safely.
        Returns a sanitized relative storage path.
        """
        clean_name = self.sanitize_filename(filename)
        relative_path = f"uploads/{document_id}_{clean_name}"
        full_path = os.path.join(self.upload_dir, f"{document_id}_{clean_name}")

        try:
            with open(full_path, "wb") as f:
                f.write(content)
            logger.info(f"Stored document file: {relative_path} ({len(content)} bytes)")
        except Exception as e:
            logger.error(f"Failed to store document file: {e}")
            raise IOError("Storage write failure. Could not persist document.")

        # If Supabase storage is configured, attempt backup upload
        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                db.storage.from_("documents").upload(
                    path=f"{document_id}/{clean_name}",
                    file=content,
                    file_options={"content-type": "application/pdf"}
                )
            except Exception as e:
                logger.warning(f"Supabase storage upload failed: {e}. Local copy retained.")

        return relative_path

    def get_file(self, storage_path: str) -> Optional[bytes]:
        """Reads file content safely from relative storage path."""
        # Sanitize path to prevent traversal
        base_name = os.path.basename(storage_path)
        full_path = os.path.join(self.upload_dir, base_name)
        if os.path.exists(full_path):
            with open(full_path, "rb") as f:
                return f.read()
        return None
