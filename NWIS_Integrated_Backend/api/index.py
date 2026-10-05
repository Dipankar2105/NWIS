import sys
import os
from pathlib import Path

# Ensure backend root and app directory are on sys.path for Vercel lambda environment
api_dir = Path(__file__).resolve().parent
backend_dir = api_dir.parent
root_dir = backend_dir.parent

for path_dir in [backend_dir, root_dir, api_dir]:
    p = str(path_dir)
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except ModuleNotFoundError:
    from NWIS_Integrated_Backend.app.main import app

