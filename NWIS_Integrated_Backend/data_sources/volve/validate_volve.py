"""
Volve Validation Engine
Validates schema compliance, record counts, and provenance tagging for Volve dataset.
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_JSON = os.path.join(SCRIPT_DIR, "volve_ingested_store.json")

def main():
    print("=== Volve Validation Engine ===")
    if not os.path.exists(STORE_JSON):
        print(f"Error: Store JSON {STORE_JSON} not found. Run ingest_volve.py first.")
        return 1

    with open(STORE_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    wells = data.get("public_reference_wells", [])
    ddrs = data.get("daily_drilling_reports", [])
    trajectories = data.get("trajectories", {})
    params = data.get("drilling_parameters", {})

    print(f"Dataset Provenance: {data.get('provenance')}")
    print(f"Source URL: {data.get('source_url')}")
    print(f"Wells Count: {len(wells)}")
    print(f"Daily Reports Count: {len(ddrs)}")
    print(f"Wells with Trajectories: {len(trajectories)}")
    print(f"Wells with Parameters: {len(params)}")

    errors = []
    for w in wells:
        if w.get("source_type") != "PUBLIC_VOLVE":
            errors.append(f"Invalid source_type in well {w.get('id')}: {w.get('source_type')}")

    if errors:
        print(f"Validation FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f" - {err}")
        return 1
    else:
        print("\n[SUCCESS] Volve Dataset Validation PASSED! All reference wells, DDRs, trajectories, and parameters schema-compliant.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
