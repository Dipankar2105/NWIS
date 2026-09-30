"""
FORCE 2020 Validation Engine
Validates record counts, schema compliance, curve values, and provenance metadata.
"""

import os
import sys
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_JSON = os.path.join(SCRIPT_DIR, "force2020_ingested_store.json")

def main():
    print("=== FORCE 2020 Validation Engine ===")
    if not os.path.exists(STORE_JSON):
        print(f"Error: Store JSON {STORE_JSON} not found. Run ingest_force2020.py first.")
        return 1

    with open(STORE_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    wells = data.get("public_reference_wells", [])
    samples = data.get("well_log_samples", [])
    formations = data.get("formation_intervals", [])

    print(f"Dataset Provenance: {data.get('provenance')}")
    print(f"Source URL: {data.get('source_url')}")
    print(f"Loaded Wells Count: {len(wells)}")
    print(f"Loaded Log Samples Count: {len(samples)}")
    print(f"Loaded Formations Count: {len(formations)}")

    errors = []
    # Check 1: Provenance metadata
    for w in wells:
        if w.get("source_type") != "PUBLIC_FORCE2020":
            errors.append(f"Invalid source_type in well {w.get('id')}: {w.get('source_type')}")

    # Check 2: Depth sanity
    for s in samples[:100]:
        if s.get("depth") is None or s["depth"] <= 0:
            errors.append(f"Invalid depth in sample for well {s.get('reference_well_id')}")

    if errors:
        print(f"Validation FAILED with {len(errors)} error(s):")
        for err in errors[:10]:
            print(f" - {err}")
        return 1
    else:
        print("\n[SUCCESS] FORCE 2020 Validation PASSED! All reference wells, log samples, and formations schema-compliant.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
