import os
import re

pages_dir = r'd:\NWIS\NWIS\NWIS_Frontend\src\pages'

for fname in os.listdir(pages_dir):
    if not fname.endswith('.jsx'):
        continue
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove sidebar import line
    sidebar_pattern = "import Sidebar from '../components/Sidebar';\n"
    new_content = content.replace(sidebar_pattern, '')
    
    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Removed Sidebar import from {fname}')
    else:
        print(f'No change needed for {fname}')
