"""
NWIS - Geospatial Routes (Backward Compatibility Module)
"""

from app.routes.geo import (
    router,
    get_wells_in_radius,
    get_event_heatmap
)

__all__ = ["router", "get_wells_in_radius", "get_event_heatmap"]
