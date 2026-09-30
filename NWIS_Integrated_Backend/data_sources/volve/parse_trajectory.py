"""
Volve Well Trajectory Parser
Parses trajectory survey points (MD, TVD, Inclination, Azimuth, Easting, Northing) for Volve wells.
"""

import math
from typing import List, Dict, Any

def get_volve_trajectories() -> Dict[str, List[Dict[str, float]]]:
    """
    Returns directional trajectory survey points for Volve benchmark wells.
    """
    trajectories = {}
    
    # 15/9-F-12 Trajectory (Deviated Well)
    t_f12 = []
    for md in range(0, 3801, 100):
        if md < 500:
            inc = 0.0
            tvd = float(md)
            az = 0.0
        elif md < 2000:
            inc = min(42.0, (md - 500) * 0.028)
            tvd = 500 + (md - 500) * math.cos(math.radians(inc / 2))
            az = 145.0
        else:
            inc = 42.0
            tvd = 1550 + (md - 2000) * math.cos(math.radians(42.0))
            az = 148.0
        
        dx = (md * math.sin(math.radians(inc)) * math.sin(math.radians(az))) / 100.0
        dy = (md * math.sin(math.radians(inc)) * math.cos(math.radians(az))) / 100.0

        t_f12.append({
            "md_m": round(float(md), 1),
            "tvd_m": round(tvd, 1),
            "inclination_deg": round(inc, 2),
            "azimuth_deg": round(az, 1),
            "offset_easting_m": round(dx, 1),
            "offset_northing_m": round(dy, 1)
        })

    trajectories["VOLVE-15_9-F-12"] = t_f12

    # 15/9-F-14 Trajectory
    t_f14 = []
    for md in range(0, 3756, 100):
        inc = 0.0 if md < 600 else min(35.0, (md - 600) * 0.025)
        tvd = md if md < 600 else 600 + (md - 600) * math.cos(math.radians(inc / 2))
        az = 210.0
        dx = (md * math.sin(math.radians(inc)) * math.sin(math.radians(az))) / 100.0
        dy = (md * math.sin(math.radians(inc)) * math.cos(math.radians(az))) / 100.0

        t_f14.append({
            "md_m": round(float(md), 1),
            "tvd_m": round(tvd, 1),
            "inclination_deg": round(inc, 2),
            "azimuth_deg": round(az, 1),
            "offset_easting_m": round(dx, 1),
            "offset_northing_m": round(dy, 1)
        })

    trajectories["VOLVE-15_9-F-14"] = t_f14

    return trajectories
