"""
NWIS - API Setu Provider Module
"""

from typing import Dict, Any, Optional
from loguru import logger
import httpx

from app.config import get_settings
from app.providers.base import BaseProvider, ProviderStatus


class APISetuProvider(BaseProvider):
    def __init__(self):
        super().__init__("APISetu")
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.is_apisetu_configured

    async def check_health(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        return ProviderStatus.AVAILABLE

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "API Setu Gateway",
            "configured": self.is_configured(),
            "status": ProviderStatus.CONFIGURED.value if self.is_configured() else ProviderStatus.NOT_CONFIGURED.value,
            "provider_type": "National API Gateway",
            "details": "Client credentials configured" if self.is_configured() else "APISETU_CLIENT_ID and APISETU_CLIENT_SECRET are not configured"
        }
