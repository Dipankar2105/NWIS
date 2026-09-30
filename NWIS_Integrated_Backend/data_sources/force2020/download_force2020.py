"""
FORCE 2020 Dataset Downloader
Official Zenodo Source: https://zenodo.org/records/4351156
Downloads:
- LAS_files_Force_2020_all_wells_train_test_blind_hidden_final.zip
- NPD_Casing_depth_most_wells.xlsx
- NPD_Lithostratigraphy_groups_all_wells.xlsx
- NPD_Lithostratigraphy_member_formations_all_wells.xlsx
"""

import os
import sys
import time
import urllib.request
import json

ZENODO_RECORD_ID = "4351156"
TARGET_FILES = [
    "LAS_files_Force_2020_all_wells_train_test_blind_hidden_final.zip",
    "NPD_Casing_depth_most_wells.xlsx",
    "NPD_Lithostratigraphy_groups_all_wells.xlsx",
    "NPD_Lithostratigraphy_member_formations_all_wells.xlsx"
]

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def download_file(url: str, dest_path: str):
    print(f"Downloading: {url}")
    print(f"Destination: {dest_path}")
    
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"File already exists ({os.path.getsize(dest_path)} bytes). Skipping download.")
        return True

    def progress_callback(blocks_transferred, block_size, total_size):
        if total_size > 0:
            downloaded = blocks_transferred * block_size
            pct = (downloaded / total_size) * 100
            sys.stdout.write(f"\rProgress: {pct:.1f}% ({downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB)")
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(url, dest_path, reporthook=progress_callback)
        print(f"\nDownload completed: {dest_path}")
        return True
    except Exception as e:
        print(f"\nFailed to download {url}: {e}")
        return False

def main():
    print(f"=== FORCE 2020 Zenodo Downloader (Record ID: {ZENODO_RECORD_ID}) ===")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Fetch Zenodo metadata API to get exact URLs
    api_url = f"https://zenodo.org/api/records/{ZENODO_RECORD_ID}"
    print(f"Fetching Zenodo record metadata from {api_url}...")
    
    download_urls = {}
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "NWIS-Ingestion-Engine/1.0"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            files = data.get('files', [])
            for f in files:
                key = f.get('key') or f.get('filename')
                links = f.get('links', {})
                url = links.get('self') or links.get('download')
                if key and url:
                    download_urls[key] = url
    except Exception as err:
        print(f"Warning: Could not fetch Zenodo API metadata: {err}. Falling back to standard direct URLs.")
        for tf in TARGET_FILES:
            download_urls[tf] = f"https://zenodo.org/records/{ZENODO_RECORD_ID}/files/{tf}?download=1"

    success_count = 0
    for file_name in TARGET_FILES:
        dest = os.path.join(OUTPUT_DIR, file_name)
        url = download_urls.get(file_name) or f"https://zenodo.org/records/{ZENODO_RECORD_ID}/files/{file_name}?download=1"
        if download_file(url, dest):
            success_count += 1

    print(f"\nFORCE 2020 Download summary: {success_count}/{len(TARGET_FILES)} files ready in {OUTPUT_DIR}")
    return 0 if success_count == len(TARGET_FILES) else 1

if __name__ == "__main__":
    sys.exit(main())
