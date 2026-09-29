"""
NWIS - Models Package (Harmonized Architecture)
"""

from app.models.user import (
    LoginRequest,
    LoginResponse,
    UserProfile,
    TokenPayload,
)
from app.models.well import (
    WellBase,
    WellCreate,
    WellResponse,
    NearbyWellResponse,
    WellListResponse,
)
from app.models.event import (
    EventResponse,
    EventListResponse,
    EventByFormationResponse,
)
from app.models.document import (
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentChunk,
    DocumentExtractionResult,
    DrillingEvent,
    WellHeader,
)
from app.models.alert import (
    AlertResponse,
    AlertAcknowledgeRequest,
    AlertSimulateRequest,
)
from app.models.query import (
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    ParsedQueryFilters,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    WhatIfRequest,
    WhatIfResponse,
    DrillingRecipeResponse,
    CorrelationRequest,
    CorrelationResponse,
    DashboardOverview,
    SourceReference,
    GroundingInfo,
    QueryHistoryItem,
)

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "UserProfile",
    "TokenPayload",
    "WellBase",
    "WellCreate",
    "WellResponse",
    "NearbyWellResponse",
    "WellListResponse",
    "EventResponse",
    "EventListResponse",
    "EventByFormationResponse",
    "DocumentUploadResponse",
    "DocumentStatusResponse",
    "DocumentChunk",
    "DocumentExtractionResult",
    "DrillingEvent",
    "WellHeader",
    "AlertResponse",
    "AlertAcknowledgeRequest",
    "AlertSimulateRequest",
    "KnowledgeQueryRequest",
    "KnowledgeQueryResponse",
    "ParsedQueryFilters",
    "RiskAssessmentRequest",
    "RiskAssessmentResponse",
    "WhatIfRequest",
    "WhatIfResponse",
    "DrillingRecipeResponse",
    "CorrelationRequest",
    "CorrelationResponse",
    "DashboardOverview",
    "SourceReference",
    "GroundingInfo",
    "QueryHistoryItem",
]
