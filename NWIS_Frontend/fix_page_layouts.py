"""
Fix page layouts: remove outer flex-row wrapper div from all pages.
Since ProtectedRoute now handles the layout (sidebar + content area), 
each page should just return its content without the outer wrapper.

This script looks for the pattern:
  return (
    <div className="...flex...flex-row...">
      {/* ... Sidebar comment ... */}
      <div className="flex-1 flex flex-col...">
        ...
      </div>
    </div>
  );

And replaces it with:
  return (
    <>
      <div className="flex-1 flex flex-col ... overflow-y-auto">
        ...
      </div>
    </>
  );
"""
import os
import re

pages_dir = r'd:\NWIS\NWIS\NWIS_Frontend\src\pages'

# Patterns to match the outer wrapper div opening
outer_div_patterns = [
    r'    <div className="min-h-screen[^"]*flex[^"]*flex-row[^"]*">\r?\n',
    r'    <div className="flex[^"]*min-h-screen[^"]*">\r?\n',
    r'    <div className="h-screen[^"]*flex[^"]*">\r?\n',
    r'    <div className="w-full[^"]*flex[^"]*">\r?\n',
]

# After removing outer div, find the inner content div and fix it
inner_div_patterns = [
    r'      <div className="flex-1 flex flex-col[^"]*">\r?\n',
]

for fname in os.listdir(pages_dir):
    if not fname.endswith('.jsx') or fname == 'Dashboard.jsx':
        continue
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip files that don't have Sidebar comment (already cleaned or no outer wrapper)
    if '<Sidebar />' in content:
        print(f'WARN: {fname} still has <Sidebar />')
        continue
    
    # Check if there's an outer wrapper to remove
    original = content
    
    # Try to find the structure:
    # return (
    #   <div ...flex...flex-row...>  <- remove this
    #     {/* optional sidebar comment */}
    #     {/* Main Workspace */}
    #     <div className="flex-1 flex flex-col...">  <- keep this (simplified)
    #        content
    #     </div>
    #   </div>  <- remove this (last closing div before ); )
    # );
    
    # Look for the return statement with outer wrapper
    # We'll do a simpler approach: replace 'flex flex-row' wrapper with <>
    modified = False
    
    # Pattern 1: <div className="...flex-row..."> at start of return
    m = re.search(r'  return \(\n    <div className="[^"]*flex[^"]*flex-row[^"]*">', content)
    if m:
        # Find matching closing div (the outer one)
        # Replace opening with <>
        content = content.replace(m.group(0), '  return (\n    <>', 1)
        
        # Now find the last </div> before ); and replace with </>
        # Find the last occurrence of </div>\n  );\n}
        content = re.sub(r'    </div>\n  \);\n}', '    </>\n  );\n}', content, count=1)
        modified = True
    
    if modified and content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed layout wrapper in {fname}')
    else:
        print(f'No outer flex-row wrapper found in {fname} (may already be correct)')
