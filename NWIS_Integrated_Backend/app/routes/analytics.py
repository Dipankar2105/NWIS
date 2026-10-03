"""
NWIS - Analytics, Historical Correlation, What-If, and Drilling Recipe Routes
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Body

from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.schemas.analytics import (
    CorrelationRequest,
    CorrelationResponse,
    WhatIfRequest,
    WhatIfResponse,
    DrillingRecipeRequest,
    DrillingRecipeResponse
)
from app.services.correlation.correlation_service import correlation_service
from app.services.what_if.what_if_service import what_if_service
from app.services.recipes.recipe_service import drilling_recipe_service

router = APIRouter()


# ==============================================================================
# 1. HISTORICAL CORRELATION ANALYSIS
# ==============================================================================
@router.post("/correlation", response_model=CorrelationResponse)
async def analyze_correlation(
    request: CorrelationRequest,
    current_user: UserProfile = Depends(get_current_user)
) -> CorrelationResponse:
    """
    Analyzes historical correlation between drilling parameters and drilling events.
    Enforces scientific anti-causation constraints.
    """
    return await correlation_service.analyze_correlation(request)


# Formation correlation endpoint
@router.post("/correlation/formations")
async def correlate_formations(
    payload: Dict[str, Any] = Body(...),
    current_user: UserProfile = Depends(get_current_user)
) -> Dict[str, Any]:
    well_ids = payload.get("well_ids", [])
    return await correlation_service.correlate_formations(well_ids)


# ==============================================================================
# 2. HISTORICAL WHAT-IF ANALYSIS
# ==============================================================================
@router.post("/what-if", response_model=WhatIfResponse)
async def analyze_what_if_scenario(
    request: WhatIfRequest,
    current_user: UserProfile = Depends(get_current_user)
) -> WhatIfResponse:
    """
    Evaluates hypothetical drilling parameters strictly against historical NWIS observations.
    Never states outcomes will definitely occur.
    """
    return await what_if_service.analyze_scenario(request)


# ==============================================================================
# 3. EVIDENCE-BASED DRILLING RECIPES
# ==============================================================================
@router.post("/recipes", response_model=DrillingRecipeResponse)
async def generate_drilling_recipe(
    request: DrillingRecipeRequest,
    current_user: UserProfile = Depends(get_current_user)
) -> DrillingRecipeResponse:
    """
    Generates an evidence-based drilling recipe grounded in historical offset well performance.
    """
    return await drilling_recipe_service.generate_recipe(request)
