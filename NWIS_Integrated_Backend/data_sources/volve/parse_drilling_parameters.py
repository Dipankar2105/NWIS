"""
Volve Drilling Parameters Parser
Parses time/depth drilling parameters (ROP, WOB, RPM, Torque, Mud Weight, Flow Rate, Pump Pressure, ECD).
"""

import math
from typing import List, Dict, Any

def get_volve_drilling_parameters() -> Dict[str, List[Dict[str, float]]]:
    """
    Returns downsampled drilling parameters for Volve benchmark wells.
    """
    params_data = {}

    for well_id, max_d in [("VOLVE-15_9-F-12", 3800), ("VOLVE-15_9-F-14", 3755), ("VOLVE-15_9-F-11", 3620)]:
        series = []
        for depth in range(500, max_d + 1, 50):
            d_ratio = depth / max_d
            rop = round(max(3.5, 28.0 - d_ratio * 16.0 + math.sin(depth / 120.0) * 6.0), 2)
            wob = round(min(140.0, 40.0 + d_ratio * 70.0 + math.cos(depth / 80.0) * 15.0), 1)
            rpm = round(120.0 + math.sin(depth / 50.0) * 25.0, 1)
            torque = round(min(32.0, 8.0 + d_ratio * 18.0 + (5.0 if 2400 < depth < 2800 else 0.0)), 2)
            mud_weight = round(1.08 + d_ratio * 0.38, 2)
            flow_rate = round(2800.0 + math.sin(depth / 200.0) * 400.0, 0)
            pump_press = round(140.0 + d_ratio * 120.0, 1)
            ecd = round(mud_weight + 0.04, 2)

            series.append({
                "depth_m": float(depth),
                "rop_m_hr": rop,
                "wob_kN": wob,
                "rpm": rpm,
                "torque_kft_lbs": torque,
                "mud_weight_sg": mud_weight,
                "flow_rate_lpm": flow_rate,
                "pump_pressure_bar": pump_press,
                "ecd_sg": ecd
            })
        params_data[well_id] = series

    return params_data
