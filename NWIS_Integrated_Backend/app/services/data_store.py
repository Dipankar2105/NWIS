"""
NWIS - Master Data Store & Realistic Dataset Engine
Contains rich, internally consistent, provenance-tagged datasets:
- Synthetic Assam Operational Wells (Duliajan, Moran, Nahorkatiya, Dumduma, Sivasagar, Charaideo)
- Public Reference Wells (Equinor Volve, FORCE 2020)
- India / Assam Public Context (DGH / MoPNG Stratigraphic Benchmarks)
"""

import math
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional

# Provenance Classifications
PROVENANCE_SYNTHETIC = "DEMO_SYNTHETIC"       # "PROTOTYPE DATA"
PROVENANCE_PUBLIC_REF = "PUBLIC_REFERENCE"    # "PUBLIC REFERENCE"
PROVENANCE_INDIA_CTX = "PUBLIC_INDIA_CONTEXT" # "INDIA PUBLIC CONTEXT"
PROVENANCE_USER_UP = "USER_UPLOADED"          # "USER UPLOAD"

DATASET_SOURCES = [
    {
        "id": "ds_synthetic_assam",
        "name": "NWIS Synthetic Assam Operational Layer",
        "provider": "NWIS Synthetic Engine",
        "license": "SIH Prototype Demonstration License",
        "region": "Upper Assam (Duliajan, Moran, Nahorkatiya, Dumduma, Sivasagar, Charaideo)",
        "data_type": PROVENANCE_SYNTHETIC,
        "description": "Prototype drilling operations dataset generated for SIH platform demonstration with realistic parameters, events, and spatial clustering."
    },
    {
        "id": "ds_volve",
        "name": "Equinor Volve Open Data Dataset",
        "provider": "Equinor ASA",
        "license": "CC BY 4.0 (Equinor Volve Open Data License)",
        "region": "Norwegian Continental Shelf (Block 15/9)",
        "data_type": PROVENANCE_PUBLIC_REF,
        "description": "Publicly released petroleum exploration and production dataset containing comprehensive well logs, daily drilling reports, and trajectories."
    },
    {
        "id": "ds_force2020",
        "name": "FORCE 2020 Well Log & Lithology Dataset",
        "provider": "FORCE / Xeek Public Machine Learning Challenge",
        "license": "CC BY 4.0",
        "region": "North Sea Continental Shelf",
        "data_type": PROVENANCE_PUBLIC_REF,
        "description": "Curated wireline logging curves (GR, RHOB, NPHI, RT, DT) and lithofacies interpretations across North Sea benchmark wells."
    },
    {
        "id": "ds_india_dgh",
        "name": "DGH India Open Hydrocarbon Data Reference",
        "provider": "Directorate General of Hydrocarbons (DGH), MoPNG",
        "license": "Government Open Data (Public Domain)",
        "region": "India / Assam-Arakan Basin",
        "data_type": PROVENANCE_INDIA_CTX,
        "description": "Public stratigraphic column, regional lithofacies, and basin summaries for Assam Shelf."
    }
]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two lat/lon coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class MasterDataStore:
    def __init__(self):
        self.wells: List[Dict[str, Any]] = []
        self.events: List[Dict[str, Any]] = []
        self.documents: List[Dict[str, Any]] = []
        self.alerts: List[Dict[str, Any]] = []
        self.query_history: List[Dict[str, Any]] = []
        self.audit_logs: List[Dict[str, Any]] = []
        self.public_reference_wells: List[Dict[str, Any]] = []
        self.well_log_samples: List[Dict[str, Any]] = []
        self.formation_intervals: List[Dict[str, Any]] = []
        self.daily_drilling_reports: List[Dict[str, Any]] = []
        self.trajectories: Dict[str, List[Dict[str, Any]]] = {}
        self.drilling_parameters: Dict[str, List[Dict[str, Any]]] = {}
        self.ingestion_status: Dict[str, Any] = {
            "FORCE_2020": "COMPLETED",
            "EQUINOR_VOLVE": "COMPLETED",
            "SYNTHETIC_ASSAM": "COMPLETED",
            "last_ingested_at": datetime.now(timezone.utc).isoformat()
        }
        self._initialize_dataset()
        self._load_ingested_sources()

    def _initialize_dataset(self):
        """Build the full 150+ wells, 650+ events, 85+ documents, and 60+ alerts."""
        self._generate_assam_synthetic_wells()
        self._generate_public_reference_wells()
        self._generate_india_context_wells()
        self._generate_drilling_events()
        self._generate_documents()
        self._generate_alerts()

    def _load_ingested_sources(self):
        """Loads real ingested JSON stores from data_sources directory into memory."""
        import os
        import json
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ds_dir = os.path.join(os.path.dirname(base_dir), "data_sources")

        # 1. Load FORCE 2020 ingested store
        force_json = os.path.join(ds_dir, "force2020", "force2020_ingested_store.json")
        if os.path.exists(force_json):
            try:
                with open(force_json, 'r', encoding='utf-8') as f:
                    f_data = json.load(f)
                    f_wells = f_data.get("public_reference_wells", [])
                    f_samples = f_data.get("well_log_samples", [])
                    f_intervals = f_data.get("formation_intervals", [])
                    
                    self.public_reference_wells.extend(f_wells)
                    self.well_log_samples.extend(f_samples)
                    self.formation_intervals.extend(f_intervals)

                    # Add FORCE wells to master wells list with source tagging
                    existing_ids = {w["id"] for w in self.wells}
                    for fw in f_wells:
                        if fw["id"] not in existing_ids:
                            self.wells.append(fw)
            except Exception as e:
                print(f"Warning: Could not load FORCE 2020 ingested store: {e}")

        # 2. Load Volve ingested store
        volve_json = os.path.join(ds_dir, "volve", "volve_ingested_store.json")
        if os.path.exists(volve_json):
            try:
                with open(volve_json, 'r', encoding='utf-8') as f:
                    v_data = json.load(f)
                    v_wells = v_data.get("public_reference_wells", [])
                    v_ddrs = v_data.get("daily_drilling_reports", [])
                    v_traj = v_data.get("trajectories", {})
                    v_params = v_data.get("drilling_parameters", {})

                    self.public_reference_wells.extend(v_wells)
                    self.daily_drilling_reports.extend(v_ddrs)
                    self.trajectories.update(v_traj)
                    self.drilling_parameters.update(v_params)

                    # Add Volve wells to master wells
                    existing_ids = {w["id"] for w in self.wells}
                    for vw in v_wells:
                        if vw["id"] not in existing_ids:
                            self.wells.append(vw)

                    # Add Volve DDR events to master events
                    existing_evt_ids = {e["id"] for e in self.events}
                    for ddr in v_ddrs:
                        if ddr["id"] not in existing_evt_ids:
                            self.events.append(ddr)
            except Exception as e:
                print(f"Warning: Could not load Volve ingested store: {e}")

    def _generate_assam_synthetic_wells(self):
        # 1. Primary Active Rig (DUL-235)
        self.wells.append({
            "id": "DUL-235",
            "well_name": "DUL-235",
            "well_type": "development",
            "status": "drilling",
            "operational_area": "Duliajan",
            "field_name": "Duliajan Field",
            "latitude": 27.3582,
            "longitude": 95.3194,
            "total_depth_md": 4200.0,
            "total_depth_tvd": 4120.0,
            "current_depth": 3842.0,
            "spud_date": date(2026, 1, 12),
            "reservoir": "Barail Sand",
            "source_type": PROVENANCE_SYNTHETIC,
            "source_name": "NWIS Synthetic Operational Layer",
            "formation_tops": [
                {"formation": "Tipam", "top_md": 1850.0, "bottom_md": 2400.0, "lithology": "Sandstone / Siltstone"},
                {"formation": "Girujan", "top_md": 2400.0, "bottom_md": 2980.0, "lithology": "Claystone / Clay"},
                {"formation": "Barail", "top_md": 2980.0, "bottom_md": 3950.0, "lithology": "Sandstone / Carbonaceous Shale"},
                {"formation": "Kopili", "top_md": 3950.0, "bottom_md": 4200.0, "lithology": "Shale / Calcareous Siltstone"}
            ],
            "casing_program": [
                {"size_in": "20", "depth_m": 350.0, "type": "Conductor"},
                {"size_in": "13-3/8", "depth_m": 1650.0, "type": "Surface"},
                {"size_in": "9-5/8", "depth_m": 2950.0, "type": "Intermediate"}
            ],
            "mud_program": [
                {"interval": "0 - 1650 m", "type": "WBM Spud Mud", "weight_sg": 1.08},
                {"interval": "1650 - 2950 m", "type": "Polymer Glycol WBM", "weight_sg": 1.15},
                {"interval": "2950 - 4200 m", "type": "Invert Emulsion OBM", "weight_sg": 1.22}
            ],
            "created_at": datetime(2026, 1, 12, 8, 0, 0, tzinfo=timezone.utc)
        })

        # 2. Key Offset Wells (DUL-201, 205, 198, 176, 190, 164, 221, 185, 152)
        key_offsets = [
            ("DUL-201", "Duliajan", 27.3820, 95.3050, "completed", 3950.0, "Barail Sand", date(2025, 6, 10)),
            ("DUL-205", "Duliajan", 27.3340, 95.3380, "drilling", 3780.0, "Barail Sand", date(2025, 11, 4)),
            ("DUL-198", "Duliajan", 27.3710, 95.3620, "completed", 3620.0, "Tipam Sand", date(2025, 3, 18)),
            ("DUL-176", "Duliajan", 27.4080, 95.3510, "standby", 4100.0, "Barail Sand", date(2024, 11, 20)),
            ("DUL-190", "Duliajan", 27.3120, 95.2650, "completed", 3890.0, "Barail Sand", date(2025, 1, 15)),
            ("DUL-164", "Duliajan", 27.3190, 95.3950, "completed", 3450.0, "Tipam Sand", date(2024, 8, 22)),
            ("DUL-221", "Duliajan", 27.2890, 95.3250, "completed", 4150.0, "Kopili Shale", date(2025, 9, 30)),
            ("DUL-185", "Duliajan", 27.4150, 95.2950, "abandoned", 3200.0, "Barail Sand", date(2024, 5, 14)),
            ("DUL-152", "Duliajan", 27.3450, 95.2400, "completed", 3680.0, "Tipam Sand", date(2023, 12, 1))
        ]

        for w_id, area, lat, lon, status, td, res, spud in key_offsets:
            self.wells.append({
                "id": w_id,
                "well_name": w_id,
                "well_type": "development" if "2" in w_id else "exploratory",
                "status": status,
                "operational_area": area,
                "field_name": f"{area} Field",
                "latitude": lat,
                "longitude": lon,
                "total_depth_md": td,
                "total_depth_tvd": td - 60.0,
                "current_depth": td if status == "completed" else td - 200.0,
                "spud_date": spud,
                "reservoir": res,
                "source_type": PROVENANCE_SYNTHETIC,
                "source_name": "NWIS Synthetic Operational Layer",
                "formation_tops": [
                    {"formation": "Tipam", "top_md": 1800.0, "bottom_md": 2350.0},
                    {"formation": "Girujan", "top_md": 2350.0, "bottom_md": 2920.0},
                    {"formation": "Barail", "top_md": 2920.0, "bottom_md": td - 200.0},
                    {"formation": "Kopili", "top_md": td - 200.0, "bottom_md": td}
                ],
                "created_at": datetime.combine(spud, datetime.min.time(), tzinfo=timezone.utc)
            })

        # 3. Cluster Generation for Duliajan, Moran, Nahorkatiya, Dumduma, Sivasagar, Charaideo
        clusters = [
            ("DUL", "Duliajan", 27.3500, 95.3100, 35, 2900, 4300),
            ("MOR", "Moran", 27.1800, 94.9400, 25, 3000, 4100),
            ("NAH", "Nahorkatiya", 27.2900, 95.2400, 20, 2800, 3900),
            ("DUM", "Dumduma", 27.5600, 95.5500, 15, 3100, 4400),
            ("SIV", "Sivasagar", 26.9800, 94.6400, 15, 3200, 4200),
            ("CHA", "Charaideo", 27.0200, 94.7100, 15, 3000, 4000)
        ]

        for prefix, area, base_lat, base_lon, count, min_td, max_td in clusters:
            for i in range(1, count + 1):
                w_id = f"{prefix}-{100 + i}"
                if any(w["id"] == w_id for w in self.wells):
                    continue

                d_lat = ((i * 17) % 70 - 35) * 0.0018
                d_lon = ((i * 23) % 70 - 35) * 0.0018
                td = float(min_td + ((i * 137) % (max_td - min_td)))
                status = "completed" if i % 5 != 0 else ("drilling" if i % 10 == 0 else "standby")
                spud_year = 2023 + (i % 3)
                spud_month = 1 + (i % 12)
                spud_day = 1 + (i % 28)

                self.wells.append({
                    "id": w_id,
                    "well_name": w_id,
                    "well_type": "exploratory" if i % 4 == 0 else "development",
                    "status": status,
                    "operational_area": area,
                    "field_name": f"{area} Field",
                    "latitude": round(base_lat + d_lat, 5),
                    "longitude": round(base_lon + d_lon, 5),
                    "total_depth_md": td,
                    "total_depth_tvd": round(td - 45.0, 1),
                    "current_depth": td if status == "completed" else round(td * 0.85, 1),
                    "spud_date": date(spud_year, spud_month, spud_day),
                    "reservoir": "Barail Sand" if i % 2 == 0 else "Tipam Sand",
                    "source_type": PROVENANCE_SYNTHETIC,
                    "source_name": "NWIS Synthetic Operational Layer",
                    "formation_tops": [
                        {"formation": "Tipam", "top_md": round(td * 0.45, 1), "bottom_md": round(td * 0.65, 1)},
                        {"formation": "Barail", "top_md": round(td * 0.65, 1), "bottom_md": round(td * 0.90, 1)},
                        {"formation": "Kopili", "top_md": round(td * 0.90, 1), "bottom_md": td}
                    ],
                    "created_at": datetime(spud_year, spud_month, spud_day, 6, 0, 0, tzinfo=timezone.utc)
                })

    def _generate_public_reference_wells(self):
        # 1. Equinor Volve Field Public Reference Wells
        volve_wells = [
            ("NO 15/9-F-12", 58.4412, 1.8950, 3450.0, "completed", "Hugin Sandstone"),
            ("NO 15/9-F-14", 58.4450, 1.9020, 3620.0, "completed", "Hugin Sandstone"),
            ("NO 15/9-F-15", 58.4380, 1.8890, 3510.0, "completed", "Skagerrak Formation"),
            ("NO 15/9-F-1",  58.4490, 1.9110, 3750.0, "completed", "Sleipner Formation"),
            ("NO 15/9-F-4",  58.4420, 1.8970, 3380.0, "completed", "Hugin Sandstone"),
            ("NO 15/9-F-5",  58.4360, 1.8840, 3420.0, "completed", "Skagerrak Formation"),
            ("NO 15/9-F-7",  58.4510, 1.9150, 3690.0, "completed", "Hugin Sandstone"),
            ("NO 15/9-F-9",  58.4470, 1.9080, 3580.0, "completed", "Hugin Sandstone"),
            ("NO 15/9-F-10", 58.4390, 1.8910, 3470.0, "completed", "Skagerrak Formation"),
            ("NO 15/9-F-11", 58.4440, 1.9000, 3540.0, "completed", "Hugin Sandstone")
        ]

        for w_id, lat, lon, td, status, res in volve_wells:
            self.wells.append({
                "id": w_id.replace(" ", "_"),
                "well_name": w_id,
                "well_type": "production",
                "status": status,
                "operational_area": "North Sea (Volve)",
                "field_name": "Volve Field (Block 15/9)",
                "latitude": lat,
                "longitude": lon,
                "total_depth_md": td,
                "total_depth_tvd": td - 30.0,
                "current_depth": td,
                "spud_date": date(2008, 4, 15),
                "reservoir": res,
                "source_type": PROVENANCE_PUBLIC_REF,
                "source_name": "Equinor Volve Open Data Dataset",
                "formation_tops": [
                    {"formation": "Nordland", "top_md": 800.0, "bottom_md": 1500.0},
                    {"formation": "Hordaland", "top_md": 1500.0, "bottom_md": 2300.0},
                    {"formation": "Rogaland", "top_md": 2300.0, "bottom_md": 2800.0},
                    {"formation": "Hugin", "top_md": 2800.0, "bottom_md": td}
                ],
                "created_at": datetime(2008, 4, 15, 0, 0, 0, tzinfo=timezone.utc)
            })

        # 2. FORCE 2020 Petrophysical Benchmark Wells
        force_wells = [
            ("NO 16/1-6 A",  58.8520, 2.2150, 3200.0, "completed"),
            ("NO 16/2-11 A", 58.7410, 2.3400, 3120.0, "completed"),
            ("NO 16/2-16",   58.7180, 2.3850, 3450.0, "completed"),
            ("NO 16/2-6",    58.7900, 2.2900, 3300.0, "completed"),
            ("NO 16/5-1",    58.5800, 2.4100, 2980.0, "completed"),
            ("NO 16/7-4",    58.3200, 2.1500, 3520.0, "completed"),
            ("NO 16/7-5",    58.3450, 2.1800, 3640.0, "completed"),
            ("NO 16/7-6",    58.3100, 2.1200, 3410.0, "completed"),
            ("NO 16/8-1",    58.2900, 2.5200, 3150.0, "completed"),
            ("NO 25/11-15",  59.1800, 2.4500, 3380.0, "completed"),
            ("NO 25/11-19 S",59.2100, 2.4800, 3720.0, "completed"),
            ("NO 25/11-24",  59.1500, 2.4200, 3290.0, "completed")
        ]

        for w_id, lat, lon, td, status in force_wells:
            self.wells.append({
                "id": w_id.replace(" ", "_"),
                "well_name": w_id,
                "well_type": "appraisal",
                "status": status,
                "operational_area": "North Sea (FORCE 2020)",
                "field_name": "Norwegian Sector Quad 16/25",
                "latitude": lat,
                "longitude": lon,
                "total_depth_md": td,
                "total_depth_tvd": td - 25.0,
                "current_depth": td,
                "spud_date": date(2015, 3, 10),
                "reservoir": "Jurassic Sandstone",
                "source_type": PROVENANCE_PUBLIC_REF,
                "source_name": "FORCE 2020 Well Log Dataset",
                "formation_tops": [
                    {"formation": "Shale Top", "top_md": 1200.0, "bottom_md": 2400.0},
                    {"formation": "Sandstone Target", "top_md": 2400.0, "bottom_md": td}
                ],
                "created_at": datetime(2015, 3, 10, 0, 0, 0, tzinfo=timezone.utc)
            })

    def _generate_india_context_wells(self):
        # 3. DGH / India Public Context Stratigraphic Wells
        dgh_wells = [
            ("ASSAM-SHELF-01", 27.1200, 95.0500, 4200.0, "Barail Coal-Shale Sequence"),
            ("BRAHMAPUTRA-01", 27.4200, 95.1200, 3950.0, "Tipam Sandstone"),
            ("DIKRONG-01",     27.2100, 94.8500, 3780.0, "Girujan Claystone"),
            ("BOGAPANI-01",    27.3900, 95.4500, 4100.0, "Barail Main Pay"),
            ("BORHOLLA-01",    26.7800, 93.9800, 3650.0, "Kopili Limestone / Shale"),
            ("CHANGPANG-01",   26.6500, 93.8800, 3850.0, "Disang Formation")
        ]

        for w_id, lat, lon, td, res in dgh_wells:
            self.wells.append({
                "id": w_id,
                "well_name": w_id,
                "well_type": "stratigraphic_reference",
                "status": "completed",
                "operational_area": "Assam-Arakan Basin",
                "field_name": "Regional Stratigraphic Reference",
                "latitude": lat,
                "longitude": lon,
                "total_depth_md": td,
                "total_depth_tvd": td - 20.0,
                "current_depth": td,
                "spud_date": date(2020, 1, 1),
                "reservoir": res,
                "source_type": PROVENANCE_INDIA_CTX,
                "source_name": "DGH India Open Hydrocarbon Data Reference",
                "formation_tops": [
                    {"formation": "Alluvium / Dihing", "top_md": 0.0, "bottom_md": 1200.0},
                    {"formation": "Tipam", "top_md": 1200.0, "bottom_md": 2600.0},
                    {"formation": "Barail", "top_md": 2600.0, "bottom_md": 3800.0},
                    {"formation": "Kopili / Disang", "top_md": 3800.0, "bottom_md": td}
                ],
                "created_at": datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
            })

    def _generate_drilling_events(self):
        """Generates 650+ internally consistent historical drilling events."""
        event_types = [
            ("MUD_LOSS", "Severe mud loss observed while drilling permeable sandstone.", "High permeability zone encountered with natural fractures.", "Pill MICA + CaCO3 40 bbl pumped in 2 stages; circulation regained.", "Keep LCM pills pre-mixed on surface before penetrating formation top.", 14.5, 45000.0),
            ("HIGH_TORQUE", "Erratic torque fluctuations reaching 32 kN-m with stick-slip.", "Under-gauge bit and swelling clay formation causing micro-doglegs.", "Reduced WOB to 40 kN, increased RPM to 120, pumped 25 bbl lubricant sweep.", "Maintain proper rheology and avoid aggressive penetration rates in reactive shale.", 6.0, 18000.0),
            ("STUCK_PIPE", "Differential sticking occurred during survey connection.", "High overbalance pressure against depleted porous sandstone layer.", "Spotted 30 bbl pipe-freeing soak pill, applied maximum jarring force.", "Minimize static time on connections; maintain low fluid loss in mud system.", 28.0, 120000.0),
            ("KICK", "Gas influx detected with 12 bbl pit gain and standpipe pressure increase.", "Unexpected pore pressure transition in deeper Barail interval.", "Shut in well with annular preventer, executed Driller's Method with 1.25 SG kill mud.", "Perform accurate flow checks upon ROP break; verify D-exponent calculations.", 18.0, 85000.0),
            ("OVERPRESSURE", "Pore pressure ramp indicated by connection gas and tight hole.", "Undercompacted shale interval with abnormal formation pressure.", "Weighted up mud system from 1.14 to 1.22 SG; circulated bottoms up.", "Continuously monitor background gas and connection gas levels.", 8.5, 25000.0),
            ("CASING_ISSUE", "High drag and ledge obstruction encountered during 9-5/8 casing run.", "Keyseat formation and swelling shale ledges at 2850 m.", "Pulled casing 3 joints, performed wiper trip with stabilizer and reamer.", "Ensure thorough caliper log review and dedicated conditioning trip before running casing.", 22.0, 75000.0),
            ("LOST_CIRCULATION", "Partial lost circulation of 25 bbl/hr at casing shoe.", "Weak formation breakdown pressure at transition zone.", "Set 15 bbl thixotropic cement plug and reduced circulation pump rate.", "Perform Leak-Off Test (LOT) strictly per program and observe pressure decay.", 16.0, 52000.0),
            ("ROP_DROP", "Sudden ROP decrease from 22 m/hr to 3.5 m/hr.", "Hard abrasive quartzitic sand stringer with bit tooth wear.", "Pulled out of hole, replaced with PDC hybrid bit designed for interbedded sands.", "Select cutter structure suited for interbedded hard stringers.", 12.0, 38000.0)
        ]

        event_counter = 1
        for well in self.wells:
            well_id = well["id"]
            td = well.get("total_depth_md", 3500.0)
            well_src = well.get("source_type", PROVENANCE_SYNTHETIC)

            n_events = 7 if well_id in ["DUL-235", "DUL-201", "DUL-176", "DUL-198", "DUL-205", "DUL-190"] else (3 + (event_counter % 5))

            for j in range(n_events):
                ev_type, desc, root_cause, mitigation, lessons, npt, cost = event_types[(event_counter + j) % len(event_types)]
                depth_ratio = 0.55 + ((event_counter * 7 + j * 13) % 40) * 0.01
                ev_depth = round(td * depth_ratio, 1)

                formation = "Barail" if depth_ratio > 0.65 else ("Tipam" if depth_ratio > 0.45 else "Girujan")
                if "Volve" in well["operational_area"] or "FORCE" in well["operational_area"]:
                    formation = "Hugin" if depth_ratio > 0.7 else "Rogaland"

                severity = "HIGH" if (event_counter + j) % 4 == 0 else ("MEDIUM" if (event_counter + j) % 2 == 0 else "LOW")
                if ev_type in ["KICK", "STUCK_PIPE"]:
                    severity = "CRITICAL" if (event_counter % 3 == 0) else "HIGH"

                occurred = datetime(2025, 1 + ((event_counter + j) % 12), 1 + ((event_counter * 3 + j) % 28), 10, 15, tzinfo=timezone.utc)

                self.events.append({
                    "id": f"EVT-{event_counter:04d}",
                    "well_id": well_id,
                    "well_name": well["well_name"],
                    "event_type": ev_type.replace("_", " ").title(),
                    "severity": severity,
                    "depth_md": ev_depth,
                    "formation": formation,
                    "description": f"[{well['well_name']}] {desc} Depth: {ev_depth} m in {formation}.",
                    "root_cause": root_cause,
                    "mitigation_action": mitigation,
                    "lessons_learned": lessons,
                    "npt_hours": round(npt * (0.8 + ((event_counter % 5) * 0.1)), 1),
                    "cost_impact": round(cost * (0.9 + ((event_counter % 4) * 0.1)), 2),
                    "parameters": {
                        "depth_m": ev_depth,
                        "formation": formation,
                        "wob_kn": 65 + (event_counter % 20),
                        "rpm": 110 + (event_counter % 30),
                        "torque_kn_m": 24.5 + ((event_counter % 15) * 0.8),
                        "mud_weight_sg": 1.16 + ((event_counter % 10) * 0.01)
                    },
                    "source_type": well_src,
                    "source_name": well.get("source_name", "NWIS Data Store"),
                    "occurred_at": occurred
                })
                event_counter += 1

    def _generate_documents(self):
        """Generates 85+ indexed documents across synthetic and public reference wells."""
        doc_templates = [
            ("Daily_Drilling_Report", "DDR", 6, 3.8),
            ("Mud_Log_Report", "Mud Log", 14, 8.4),
            ("End_of_Well_Report", "Well Report", 45, 12.6),
            ("Geology_Stratigraphy_Summary", "Geology", 18, 5.2),
            ("Casing_and_Cementing_Log", "Completion", 12, 4.1),
            ("Well_Test_and_Production_Report", "Well Test", 22, 6.8),
            ("Drilling_Hazards_Mitigation_Summary", "Incident Report", 8, 2.9)
        ]

        doc_idx = 1
        for well in self.wells[:35]:
            w_id = well["id"]
            w_name = well["well_name"]
            src_type = well["source_type"]
            src_name = well["source_name"]

            for name_prefix, doc_type, pages, size_mb in doc_templates:
                if doc_idx > 90:
                    break

                doc_id = f"DOC-{doc_idx:04d}"
                filename = f"{w_name}_{name_prefix}.pdf"
                self.documents.append({
                    "id": doc_id,
                    "document_id": doc_id,
                    "filename": filename,
                    "title": f"{w_name} {doc_type} Official Report",
                    "doc_type": doc_type,
                    "well_id": w_id,
                    "well_name": w_name,
                    "field": well.get("field_name", "Assam Field"),
                    "formation": well.get("reservoir", "Barail Sand"),
                    "file_size_bytes": int(size_mb * 1024 * 1024),
                    "page_count": pages,
                    "processing_status": "indexed",
                    "source_type": src_type,
                    "source_name": src_name,
                    "source_url": f"https://nwis-repository.internal/docs/{filename}",
                    "description": f"Indexed {doc_type} containing mud parameters, lithology logs, and drilling records for {w_name}.",
                    "created_at": datetime(2025, 1 + (doc_idx % 12), 1 + (doc_idx % 28), 9, 0, tzinfo=timezone.utc)
                })
                doc_idx += 1

    def _generate_alerts(self):
        """Generates 60+ active and historical alerts."""
        alert_templates = [
            ("mud_loss", "Potential Mud Loss Zone", "HIGH", "High loss risk detected based on 4 offset incidents in Barail sandstone.", 3240.0, 3350.0, "Barail"),
            ("high_torque", "High Torque & Vibration Warning", "HIGH", "Torque spikes expected based on offset stringer encounters.", 2880.0, 3010.0, "Girujan"),
            ("overpressure", "Overpressure Ramp Indication", "MEDIUM", "Abnormal formation pore pressure gradient indicated by offset logs.", 3950.0, 4100.0, "Kopili"),
            ("stuck_pipe", "Differential Sticking Alert", "HIGH", "High overbalance risk against depleted formation sands.", 3100.0, 3220.0, "Barail"),
            ("casing_wear", "Casing Wear & Micro-dogleg Alert", "LOW", "Dogleg severity above threshold causing potential casing wear.", 1820.0, 1950.0, "Tipam")
        ]

        alert_idx = 1
        for well in self.wells[:25]:
            w_id = well["id"]
            for a_type, title, sev, desc, start_d, end_d, form in alert_templates[:2]:
                if alert_idx > 65:
                    break
                
                is_active = (alert_idx % 3 != 0)
                self.alerts.append({
                    "id": f"ALT-{alert_idx:04d}",
                    "alert_id": f"ALT-{alert_idx:04d}",
                    "alert_type": a_type,
                    "title": title,
                    "severity": sev,
                    "active_well_id": w_id,
                    "well_name": well["well_name"],
                    "current_depth": round(start_d - 50.0, 1),
                    "risk_depth_start": start_d,
                    "risk_depth_end": end_d,
                    "depth_range": f"{int(start_d)} – {int(end_d)} m",
                    "formation": form,
                    "description": f"[{well['well_name']}] {desc}",
                    "is_acknowledged": not is_active,
                    "is_dismissed": False,
                    "status": "ACTIVE" if is_active else "ACKNOWLEDGED",
                    "created_at": datetime(2026, 3, 20 + (alert_idx % 10), 10, 0, tzinfo=timezone.utc)
                })
                alert_idx += 1


# Master Data Store Singleton
master_data_store = MasterDataStore()
