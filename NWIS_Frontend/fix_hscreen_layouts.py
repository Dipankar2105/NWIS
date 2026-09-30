"""
Fix page layouts: remove outer 'flex h-screen' wrapper divs from all pages.
Since ProtectedRoute now handles the layout, each page should just return its
inner content without creating another full-viewport container.

These pages use:
  return (
    <div className="flex h-screen bg-[...] overflow-hidden ...">
      {/* old sidebar comment */}
      <div className="flex-1 flex flex-col ...">
        content
      </div>
    </div>
  );

They should become:
  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[...]">
      content
    </div>
  );
"""
import os
import re

pages_dir = r'd:\NWIS\NWIS\NWIS_Frontend\src\pages'

SKIP = {'Dashboard.jsx', 'Login.jsx', 'WellDetails.jsx', 'Events.jsx'}

for fname in os.listdir(pages_dir):
    if not fname.endswith('.jsx'):
        continue
    if fname in SKIP:
        print(f'Skipping {fname} (already fixed or not applicable)')
        continue
    
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern: the outer flex h-screen div
    # Match: <div className="flex h-screen ...(any bg/font/overflow/text)...">
    outer_pattern = re.compile(
        r'  return \(\n    <div className="flex h-screen[^"]*">\n(?:      \{/\*[^\n]*\*/\}\n)*(?:      \n)*',
        re.MULTILINE
    )
    
    m = outer_pattern.search(content)
    if not m:
        print(f'No h-screen wrapper found in {fname}')
        continue
    
    # Extract the background color class from the outer div
    bg_match = re.search(r'bg-\[#[A-Fa-f0-9]+\]', m.group(0))
    bg_class = bg_match.group(0) if bg_match else 'bg-[#F4F6F9]'
    
    # Find the next inner div (the flex-1 one) to extract its class
    after_outer = content[m.end():]
    inner_div_m = re.match(r'      <div className="([^"]*flex-1[^"]*)">(\r?\n)', after_outer)
    
    if inner_div_m:
        inner_class = inner_div_m.group(1)
        # Ensure overflow-y-auto is in the class
        if 'overflow' not in inner_class:
            inner_class = inner_class + ' overflow-y-auto'
        
        # Replace the outer wrapper opening + inner div opening with just inner
        content = content[:m.start()] + f'  return (\n    <div className="{inner_class}">\n'
        content += after_outer[inner_div_m.end():]
        
        # Now remove the second-to-last closing </div> (the outer one)
        # Find the last two </div>\n  );\n}
        # The structure at the end is:
        #       </div>  <- inner div  
        #     </div>    <- outer div  <- remove this
        #   );
        # }
        content = re.sub(r'\n    </div>\n  \);\n}$', '\n  );\n}', content)
        
        modified = content != original
        if modified:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed {fname}')
        else:
            print(f'No change made to {fname}')
    else:
        print(f'Could not find inner flex-1 div in {fname}')
        # Revert to original
        content = original
