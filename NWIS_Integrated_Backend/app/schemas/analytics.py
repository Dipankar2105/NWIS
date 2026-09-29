"""
NWIS - Phase 6 Analytics Schemas
Schemas for:
  1. Historical Correlation Analysis
  2. Historical What-If Analysis
  3. Evidence-Based Drilling Recipes
"""

from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field


# ==============================================================================
# 1. CORRELATION SCHEMAS
# ==============================================================================

class CorrelationRequest(BaseModel):
    parameter: str = Field(
        ...,
        description="Target drilling parameter: depth, rop, wob, rpm, mud_weight, flow_rate, pump_pressure, standpipe_pressure"
    )
    event_type: Optional[str] = Field(
        None,
        description="Optional target drilling event: lost_circulation, kick, stuck_pipe, tight_hole, etc."
    )
    formation: Optional[str] = Field(None, description="Optional geological formation filter")
    well_ids: Optional[List[str]] = Field(None, description="Optional well name/ID filter")
    depth_range: Optional[Tuple[float, float]] = Field(None, description="Optional [min_depth, max_depth] filter")


class CorrelationItem(BaseModel):
    parameter: str
    event: str
    correlation_value: Optional[float] = Field(
        None,
        description="Point-biserial or Pearson correlation value (-1.0 to +1.0) where statistically appropriate; null if sample size is insufficient"
    )
    sample_size: int = Field(..., description="Number of historical interval observations evaluated")
    supporting_wells: List[str] = Field(default_factory=list, description="Wells providing data for this correlation")
    limitations: List[str] = Field(
        default_factory=list,
        description="Explicit methodological caveats, including mandatory anti-causation statement"
    )
    statistical_summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Descriptive statistics: mean_with_event, mean_without_event, std_dev, min, max"
    )


class CorrelationResponse(BaseModel):
    parameter: str
    correlations: List[CorrelationItem] = Field(default_factory=list)
    total_observations: int
    warning: str = Field(
        "Correlation does NOT prove causation. Do not describe a correlation as a causal relationship.",
        description="Mandatory scientific disclaimer"
    )


# ==============================================================================
# 2. WHAT-IF SCHEMAS
# ==============================================================================

class WhatIfRequest(BaseModel):
    scenario: Optional[str] = Field(
        None,
        description="Natural language scenario description (e.g. 'What happened historically when ROP was increased?')"
    )
    target_parameter: Optional[str] = Field(
        None,
        description="Parameter under evaluation: mud_weight, rop, wob, rpm, flow_rate, pump_pressure, standpipe_pressure"
    )
    target_value: Optional[float] = Field(None, description="Hypothetical parameter threshold")
    operator: Optional[str] = Field(
        "gt",
        description="Comparison operator: gt (>), gte (>=), lt (<), lte (<=), eq (==)"
    )
    input_parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Dictionary of user-provided drilling parameters"
    )
    formation: Optional[str] = Field(None, description="Target formation")
    reference_well: Optional[str] = Field(None, description="Reference well name")
    depth_range: Optional[Tuple[float, float]] = Field(None, description="Target depth interval [min, max]")
    preferred_language: str = Field("en", description="Target language code: en, hi, as, bn, etc.")


class WhatIfResponse(BaseModel):
    scenario: str
    input_parameters: Dict[str, Any]
    comparable_wells: List[str]
    sample_size: int
    historical_event_frequency: Dict[str, float] = Field(
        default_factory=dict,
        description="Historical event rates (0.0 to 1.0) among comparable intervals"
    )
    historical_event_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Raw count of historical event occurrences"
    )
    historical_observations: List[str] = Field(
        default_factory=list,
        description="Factual descriptions of what historical NWIS data shows (strictly non-causal)"
    )
    supporting_evidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Underlying interval records with well name, depth, parameters, and events"
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Explicit caveats regarding data sparsity, geological variance, and absence of causal certainty"
    )
    language: str = "en"
    multilingual_meta: Optional[Dict[str, Any]] = None


# ==============================================================================
# 3. DRILLING RECIPE SCHEMAS
# ==============================================================================

class DrillingRecipeRequest(BaseModel):
    formation: str = Field(..., description="Target geological horizon (e.g. Barail, Tipam)")
    depth_range: Optional[Tuple[float, float]] = Field(None, description="Target depth range [min_m, max_m]")
    context: Optional[str] = Field(None, description="Operational context or target basin")
    reference_well: Optional[str] = Field(None, description="Active reference well")
    target_objective: Optional[str] = Field(
        None,
        description="Specific drilling objective (e.g. avoid lost circulation, optimize ROP, manage ECD)"
    )
    preferred_language: str = Field("en", description="Language code for recipe presentation")


class ParameterEnvelope(BaseModel):
    min: float
    max: float
    unit: str
    basis: str


class DrillingRecipeResponse(BaseModel):
    recipe_id: str
    context: str
    formation: str
    depth_range: Tuple[float, float]
    historical_situation: str = Field(
        ...,
        description="Grounded summary of offset geology, hazards, and lithological challenges"
    )
    observed_parameters: Dict[str, ParameterEnvelope] = Field(
        default_factory=dict,
        description="Recommended operational envelopes derived from successful historical runs"
    )
    observed_outcome: str = Field(
        ...,
        description="Documented outcome achieved in offset wells under these parameters"
    )
    supporting_wells: List[str] = Field(default_factory=list)
    supporting_documents: List[str] = Field(default_factory=list)
    historical_operational_notes: List[str] = Field(
        default_factory=list,
        description="Actionable operational lessons extracted from offset daily drilling logs"
    )
    evidence_grounding: Dict[str, Any] = Field(
        default_factory=dict,
        description="Verification metadata confirming all claims are grounded in NWIS data"
    )
    language: str = "en"
    multilingual_meta: Optional[Dict[str, Any]] = None
