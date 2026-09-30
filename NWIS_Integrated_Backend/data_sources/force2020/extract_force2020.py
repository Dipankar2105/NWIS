"""
FORCE 2020 Extractor
Extracts LAS_files_Force_2020_all_wells_train_test_blind_hidden_final.zip into extracted_las/
"""

import os
import sys
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_FILE = os.path.join(SCRIPT_DIR, "LAS_files_Force_2020_all_wells_train_test_blind_hidden_final.zip")
EXTRACT_DIR = os.path.join(SCRIPT_DIR, "extracted_las")

def main():
    print(f"=== FORCE 2020 ZIP Extractor ===")
    if not os.path.exists(ZIP_FILE):
        print(f"Error: Zip file {ZIP_FILE} not found. Please run download_force2020.py first.")
        return 1

    os.makedirs(EXTRACT_DIR, exist_ok=True)
    print(f"Extracting {ZIP_FILE} to {EXTRACT_DIR}...")
    
    with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
        namelist = zip_ref.namelist()
        print(f"Found {len(namelist)} entries in ZIP archive.")
        zip_ref.extractall(EXTRACT_DIR)

    las_files = [f for f in os.listdir(EXTRACT_DIR) if f.lower().endswith('.las')]
    print(f"Extraction complete! Total .las files extracted: {len(las_files)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
