import sys
import os
from pathlib import Path

# Determine base paths
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent

candidate_paths = [
    root_dir / "NWIS_Integrated_Backend",
    current_dir / "NWIS_Integrated_Backend",
    Path("/var/task/NWIS_Integrated_Backend"),
    Path("/var/task"),
    root_dir,
    current_dir,
]

for p in candidate_paths:
    p_str = str(p)
    if p.exists() and p_str not in sys.path:
        sys.path.insert(0, p_str)

# Search specifically for directory containing 'app/main.py'
found_backend = False
for p in candidate_paths:
    if (p / "app" / "main.py").exists():
        p_str = str(p)
        if p_str in sys.path:
            sys.path.remove(p_str)
        sys.path.insert(0, p_str)
        found_backend = True
        break

if not found_backend:
    print(f"WARNING: Could not find app/main.py in candidate paths: {[str(c) for c in candidate_paths]}")
    print(f"Current working dir: {os.getcwd()}")
    if Path("/var/task").exists():
        print(f"Contents of /var/task: {os.listdir('/var/task')}")

from app.main import app

