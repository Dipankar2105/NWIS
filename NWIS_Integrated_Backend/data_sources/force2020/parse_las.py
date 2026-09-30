"""
FORCE 2020 LAS Parser
Parses LAS 2.0 / 3.0 files without requiring external C libraries.
Extracts well header parameters, curve names, depth intervals, and downsampled curve samples.
"""

import os
import re
from typing import Dict, List, Any, Optional

def extract_num(val_str, default=0.0):
    if not val_str:
        return default
    m = re.search(r'[-+]?\d*\.\d+|[-+]?\d+', str(val_str))
    if m:
        try:
            return float(m.group(0))
        except ValueError:
            pass
    return default

def parse_las_file(filepath: str, sample_step_m: float = 1.0) -> Optional[Dict[str, Any]]:
    """
    Parses a single .las file and returns structured well metadata, curves summary, and downsampled samples.
    """
    if not os.path.exists(filepath):
        return None

    header = {}
    curves = []
    data_lines = []
    current_section = None

    with open(filepath, 'r', encoding='latin-1', errors='replace') as f:
        for line in f:
            line_str = line.strip()
            if not line_str or line_str.startswith('#'):
                continue
            
            if line_str.startswith('~'):
                sec = line_str[1:].split()[0].upper()
                if sec.startswith('W'):
                    current_section = 'WELL'
                elif sec.startswith('C'):
                    current_section = 'CURVE'
                elif sec.startswith('A'):
                    current_section = 'ASCII'
                else:
                    current_section = sec
                continue

            if current_section == 'WELL':
                if '.' in line_str and ':' in line_str:
                    try:
                        name_part, rest = line_str.split('.', 1)
                        name = name_part.strip().upper()
                        val = rest.split(':', 1)[0].strip()
                        header[name] = val
                    except Exception:
                        pass
            elif current_section == 'CURVE':
                if '.' in line_str:
                    try:
                        c_name = line_str.split('.')[0].strip().upper()
                        if c_name and c_name not in curves:
                            curves.append(c_name)
                    except Exception:
                        pass
            elif current_section == 'ASCII':
                data_lines.append(line_str)

    # Clean up Well Name & Metadata
    well_name = header.get('WELL') or os.path.basename(filepath).replace('.las', '').replace('.LAS', '')
    null_val = extract_num(header.get('NULL'), -999.25)
    
    start_depth = extract_num(header.get('STRT'), 0.0)
    stop_depth = extract_num(header.get('STOP'), 0.0)
    lat_val = extract_num(header.get('LAT'), 61.2)
    lon_val = extract_num(header.get('LONG'), 2.1)

    # Process samples
    samples = []
    depth_idx = -1
    for idx, c in enumerate(curves):
        if c in ['DEPT', 'DEPTH', 'MD']:
            depth_idx = idx
            break
    if depth_idx == -1:
        depth_idx = 0

    last_depth = -99999.0
    for line in data_lines:
        parts = line.split()
        if len(parts) != len(curves):
            continue
        try:
            depth_v = float(parts[depth_idx])
            if depth_v == null_val or depth_v < 0:
                continue
            
            # Downsample to sample_step_m for performance
            if abs(depth_v - last_depth) >= sample_step_m:
                sample_dict = {"depth": round(depth_v, 2)}
                for i, c in enumerate(curves):
                    if i == depth_idx:
                        continue
                    try:
                        v = float(parts[i])
                        if v != null_val and -999 < v < 99999:
                            sample_dict[c.lower()] = round(v, 4)
                    except ValueError:
                        pass
                samples.append(sample_dict)
                last_depth = depth_v
        except (ValueError, IndexError):
            continue

    return {
        "well_name": well_name,
        "filename": os.path.basename(filepath),
        "field": header.get('FLD') or 'Norwegian Sea / North Sea',
        "operator": header.get('COMP') or 'FORCE 2020 Consortium',
        "country": "Norway",
        "region": "Norwegian Continental Shelf",
        "latitude": lat_val if lat_val != 0.0 else 61.2,
        "longitude": lon_val if lon_val != 0.0 else 2.1,
        "start_depth": start_depth,
        "stop_depth": stop_depth,
        "curves_available": curves,
        "sample_count": len(samples),
        "samples": samples
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = parse_las_file(sys.argv[1])
        if res:
            print(f"Parsed Well: {res['well_name']}, Curves: {res['curves_available']}, Samples: {res['sample_count']}")
