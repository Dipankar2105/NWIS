"""
NWIS - Base Provider Abstraction
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, Optional


class ProviderStatus(str, Enum):
    CONFIGURED = "configured"
    NOT_CONFIGURED = "not_configured"
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"


class BaseProvider(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if all required credentials for the provider are present."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderStatus:
        """Checks whether the provider is configured and reachable."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Returns safe metadata about the provider without exposing secrets."""
        pass
