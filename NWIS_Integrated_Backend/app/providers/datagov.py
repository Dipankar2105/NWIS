"""
NWIS - Data.gov.in Provider Module
"""

from typing import Dict, Any, Optional
from loguru import logger
import httpx

from app.config import get_settings
from app.providers.base import BaseProvider, ProviderStatus


class DataGovProvider(BaseProvider):
    def __init__(self):
        super().__init__("DataGov")
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.is_datagov_configured

    async def check_health(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        return ProviderStatus.AVAILABLE

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Data.gov.in",
            "configured": self.is_configured(),
            "status": ProviderStatus.CONFIGURED.value if self.is_configured() else ProviderStatus.NOT_CONFIGURED.value,
            "provider_type": "Government Open Data API",
            "details": "API Key configured" if self.is_configured() else "DATA_GOV_API_KEY is not configured"
        }
