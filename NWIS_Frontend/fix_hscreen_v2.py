"""
Simple fix: Remove outer 'flex h-screen' wrapper div from all pages.
This version looks for the EXACT pattern seen in the pages.
"""
import os
import re

pages_dir = r'd:\NWIS\NWIS\NWIS_Frontend\src\pages'

SKIP = {'Dashboard.jsx', 'Login.jsx', 'WellDetails.jsx', 'Events.jsx'}

for fname in os.listdir(pages_dir):
    if not fname.endswith('.jsx'):
        continue
    if fname in SKIP:
        print(f'Skipping {fname}')
        continue
    
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Step 1: Remove the outer <div className="flex h-screen..."> opening line (and Sidebar comment)
    # Pattern: return (\n    <div className="flex h-screen...">\n      {/* Sidebar */}\n\n
    content = re.sub(
        r'(  return \(\n)    <div className="flex h-screen[^"]*">\r?\n'
        r'(?:      \{/\*[^\n]*\*/\}\r?\n\r?\n|      \r?\n)*',
        r'\1',
        content
    )
    
    # Step 2: The last </div> before ); } needs to be removed too (outer closing)
    # Pattern: \n    </div>\n  );\n}
    # But the inner divs close with 6 spaces, so outer (4 spaces) is different
    # Actually all use 4 spaces for the outer too...
    # Let's look for two consecutive closing divs at end:
    # </div>\n    </div>\n  );\n}
    content = re.sub(
        r'      </div>\r?\n    </div>\r?\n  \);\r?\n}$',
        '      </div>\n  );\n}',
        content
    )
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {fname}')
    else:
        print(f'No change in {fname}')
