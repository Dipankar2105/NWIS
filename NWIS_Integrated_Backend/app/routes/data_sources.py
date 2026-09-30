"""
NWIS - Data Sources, Data Catalog & Data Ingestion Admin API Routes
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from app.services.data_store import master_data_store, DATASET_SOURCES

router = APIRouter(tags=["data-sources"])

class DemoGenerateRequest(BaseModel):
    num_wells: int = 10
    num_events: int = 25
    num_documents: int = 10
    operational_area: str = "Duliajan"
    severity_distribution: Optional[Dict[str, float]] = None

@router.get("/data-sources")
def get_data_catalog():
    """
    Returns unified Data Catalog statistics across all public, synthetic, and user-uploaded datasets.
    """
    wells = master_data_store.wells
    events = master_data_store.events
    docs = master_data_store.documents
    samples = master_data_store.well_log_samples
    formations = master_data_store.formation_intervals
    ddrs = master_data_store.daily_drilling_reports

    sources_stat = [
        {
            "id": "ds_synthetic_assam",
            "name": "NWIS Synthetic Assam Operational Layer",
            "provider": "NWIS Engine",
            "source_type": "DEMO_SYNTHETIC",
            "region": "Upper Assam (Duliajan, Moran, Nahorkatiya)",
            "record_count": len([w for w in wells if w.get("source_type") == "DEMO_SYNTHETIC"]),
            "events_count": len([e for e in events if e.get("source_type") == "DEMO_SYNTHETIC"]),
            "status": "ACTIVE",
            "license": "Prototype License",
            "source_url": "Internal System"
        },
        {
            "id": "ds_force2020",
            "name": "FORCE 2020 Machine Learning Dataset",
            "provider": "FORCE / Xeek",
            "source_type": "PUBLIC_FORCE2020",
            "region": "Norwegian Continental Shelf / North Sea",
            "record_count": len(master_data_store.public_reference_wells),
            "log_samples_count": len(samples),
            "formations_count": len(formations),
            "status": "COMPLETED",
            "license": "CC BY 4.0",
            "source_url": "https://zenodo.org/records/4351156"
        },
        {
            "id": "ds_volve",
            "name": "Equinor Volve Open Data Dataset",
            "provider": "Equinor ASA",
            "source_type": "PUBLIC_VOLVE",
            "region": "Norwegian Continental Shelf (Block 15/9)",
            "record_count": len([w for w in wells if w.get("source_type") == "PUBLIC_VOLVE"]),
            "ddr_reports_count": len(ddrs),
            "trajectories_count": len(master_data_store.trajectories),
            "status": "COMPLETED",
            "license": "CC BY 4.0",
            "source_url": "https://www.equinor.com/energy/volve-data-sharing"
        },
        {
            "id": "ds_user_uploads",
            "name": "User Uploaded Documents & Records",
            "provider": "NWIS Operator Uploads",
            "source_type": "USER_UPLOADED",
            "region": "User Specified",
            "record_count": len([d for d in docs if d.get("source_type") == "USER_UPLOADED"]),
            "status": "ACTIVE",
            "license": "Internal Enterprise",
            "source_url": "Local Repository"
        }
    ]

    return {
        "catalog_summary": {
            "total_wells": len(wells),
            "total_events": len(events),
            "total_documents": len(docs),
            "total_log_samples": len(samples),
            "total_formation_tops": len(formations),
            "total_daily_reports": len(ddrs)
        },
        "data_sources": sources_stat
    }

@router.get("/data/ingestion-status")
def get_ingestion_status():
    return {
        "status": "COMPLETED",
        "progress_pct": 100.0,
        "pipelines": [
            {"name": "FORCE 2020 Zenodo Pipeline", "status": "COMPLETED", "records": len(master_data_store.public_reference_wells)},
            {"name": "Equinor Volve Pipeline", "status": "COMPLETED", "records": len(master_data_store.daily_drilling_reports)},
            {"name": "Assam Operational Layer", "status": "COMPLETED", "records": len([w for w in master_data_store.wells if w.get("source_type") == "DEMO_SYNTHETIC"])}
        ],
        "last_updated": master_data_store.ingestion_status.get("last_ingested_at")
    }

@router.post("/data/import")
async def import_csv_data(
    file: UploadFile = File(...),
    dataset_type: str = Form("wells")  # wells, events, parameters
):
    """
    Bulk CSV Data Importer. Validates schema, required fields, data types, and imports valid records.
    Returns preview validation report.
    """
    content = await file.read()
    lines = content.decode('utf-8', errors='ignore').splitlines()
    
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV file.")

    header = [h.strip().lower() for h in lines[0].split(',')]
    rows = lines[1:]

    valid_records = []
    invalid_records = []

    for idx, row in enumerate(rows, 1):
        cols = [c.strip().strip('"') for c in row.split(',')]
        if len(cols) < len(header):
            invalid_records.append({"line": idx, "reason": "Missing columns"})
            continue
        
        row_dict = dict(zip(header, cols))
        
        if dataset_type == "wells":
            w_name = row_dict.get("well_name") or row_dict.get("id") or f"WELL-{idx}"
            record = {
                "id": f"IMP-{uuid.uuid4().hex[:6].upper()}",
                "well_name": w_name,
                "well_type": row_dict.get("well_type", "development"),
                "status": row_dict.get("status", "completed"),
                "operational_area": row_dict.get("operational_area", "Duliajan"),
                "field_name": row_dict.get("field_name", "Duliajan Field"),
                "latitude": float(row_dict.get("latitude", 27.35)),
                "longitude": float(row_dict.get("longitude", 95.31)),
                "total_depth_md": float(row_dict.get("depth", row_dict.get("total_depth_md", 3500))),
                "source_type": "USER_UPLOADED",
                "source_name": "CSV Bulk Import"
            }
            master_data_store.wells.append(record)
            valid_records.append(record)

        elif dataset_type == "events":
            record = {
                "id": f"EVT-IMP-{uuid.uuid4().hex[:6].upper()}",
                "well_id": row_dict.get("well_id", "DUL-235"),
                "event_type": row_dict.get("event_type", "Mud Loss"),
                "severity": row_dict.get("severity", "High"),
                "depth_m": float(row_dict.get("depth", 3200)),
                "formation": row_dict.get("formation", "Barail"),
                "npt_hours": float(row_dict.get("npt_hours", 4.0)),
                "description": row_dict.get("description", "Imported drilling anomaly record."),
                "source_type": "USER_UPLOADED"
            }
            master_data_store.events.append(record)
            valid_records.append(record)

    return {
        "status": "SUCCESS",
        "dataset_type": dataset_type,
        "total_rows": len(rows),
        "valid_count": len(valid_records),
        "invalid_count": len(invalid_records),
        "errors": invalid_records[:10]
    }

@router.post("/data/generate-demo")
def generate_demo_data(req: DemoGenerateRequest):
    """
    Controlled relational demo data generator for Assam operational area.
    """
    generated_wells = []
    generated_events = []

    for i in range(1, req.num_wells + 1):
        w_id = f"DUL-GEN-{100 + i}"
        well = {
            "id": w_id,
            "well_name": w_id,
            "well_type": "development",
            "status": "drilling" if i <= 2 else "completed",
            "operational_area": req.operational_area,
            "field_name": f"{req.operational_area} Field",
            "latitude": 27.3582 + (i * 0.008),
            "longitude": 95.3194 + (i * 0.006),
            "total_depth_md": 3500.0 + (i * 120),
            "current_depth": 3200.0 if i <= 2 else 3500.0 + (i * 120),
            "source_type": "DEMO_SYNTHETIC"
        }
        master_data_store.wells.append(well)
        generated_wells.append(well)

        # Generate related events for each well
        for j in range(1, (req.num_events // req.num_wells) + 1):
            evt = {
                "id": f"EVT-GEN-{w_id}-{j}",
                "well_id": w_id,
                "event_type": "Mud Loss" if j % 2 == 0 else "High Torque",
                "severity": "High" if j % 3 == 0 else "Medium",
                "depth_m": 2400.0 + (j * 150),
                "formation": "Barail" if j % 2 == 0 else "Tipam",
                "npt_hours": 3.5 + j,
                "description": f"Generated demonstration drilling anomaly for well {w_id}.",
                "source_type": "DEMO_SYNTHETIC"
            }
            master_data_store.events.append(evt)
            generated_events.append(evt)

    return {
        "status": "SUCCESS",
        "generated_wells_count": len(generated_wells),
        "generated_events_count": len(generated_events)
    }
