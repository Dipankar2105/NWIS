"""
NWIS - Historical Correlation Analysis Service (Harmonized Architecture)
"""

from typing import Dict, Any, Optional
from app.services.correlation.correlation_service import (
    correlation_service as phase6_correlation_service,
    CorrelationService as Phase6CorrelationService
)
from app.schemas.analytics import CorrelationRequest, CorrelationResponse


class CorrelationService:
    """
    Exposes both friend's correlation interface and Phase 6 advanced historical parameter correlation.
    """
    def __init__(self):
        self._phase6_service = phase6_correlation_service

    async def correlate_formations(self, well_ids: list) -> Dict[str, Any]:
        """Legacy/friend formation correlation stub."""
        return {
            "wells": well_ids,
            "correlation_matrix": {
                "Barail Sand": {w: 2400 + i * 10 for i, w in enumerate(well_ids)},
                "Kopili Shale": {w: 2650 + i * 12 for i, w in enumerate(well_ids)}
            },
            "common_formations": ["Barail Sand", "Kopili Shale"]
        }

    async def analyze_correlation(self, request: CorrelationRequest) -> CorrelationResponse:
        """Phase 6 statistical parameter correlation analysis."""
        return await self._phase6_service.analyze_correlation(request)


# Singleton instances
correlation_service = CorrelationService()

__all__ = ["CorrelationService", "correlation_service", "phase6_correlation_service"]
