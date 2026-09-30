"""
Volve Bulk Ingestion Engine
Ingests Equinor Volve reference wells, daily drilling reports (DDRs), trajectories, and drilling parameters.
Generates volve_ingested_store.json.
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from download_volve import VOLVE_WELLS_SUBSET
from parse_ddr import get_volve_ddr_records
from parse_trajectory import get_volve_trajectories
from parse_drilling_parameters import get_volve_drilling_parameters

STORE_JSON = os.path.join(SCRIPT_DIR, "volve_ingested_store.json")

def main():
    print("=== Volve Bulk Ingestion Engine ===")
    
    wells = VOLVE_WELLS_SUBSET
    ddrs = get_volve_ddr_records()
    trajectories = get_volve_trajectories()
    params = get_volve_drilling_parameters()

    print(f"Loaded Volve Reference Wells: {len(wells)}")
    print(f"Loaded Daily Drilling Reports (DDRs): {len(ddrs)}")
    print(f"Loaded Trajectory Curves: {len(trajectories)} wells")
    print(f"Loaded Drilling Parameter Curves: {len(params)} wells")

    payload = {
        "dataset_name": "Equinor Volve Open Data Subset",
        "source_url": "https://www.equinor.com/energy/volve-data-sharing",
        "provenance": "PUBLIC_VOLVE",
        "public_reference_wells": wells,
        "daily_drilling_reports": ddrs,
        "trajectories": trajectories,
        "drilling_parameters": params
    }

    with open(STORE_JSON, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)

    print(f"Volve ingestion payload written to {STORE_JSON} ({os.path.getsize(STORE_JSON) / 1024:.1f} KB)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
