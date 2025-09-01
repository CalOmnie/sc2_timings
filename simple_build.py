#!/usr/bin/env python3
"""
Simplified build script for GitHub Pages that handles common deployment issues.
"""

import os
import sys
import json
import shutil
from pathlib import Path

def build_simple_static():
    """Build a simplified static site that works reliably on GitHub Pages."""
    
    # Create dist directory
    dist_dir = Path('dist')
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir()
    
    print("Building simplified static site...")
    
    # Copy static files first
    frontend_dir = Path('src/sc2_gantt/frontend')
    
    # Copy CSS
    css_src = frontend_dir / 'css'
    css_dst = dist_dir / 'css'
    if css_src.exists():
        shutil.copytree(css_src, css_dst)
        print(f"✓ Copied CSS files")
    
    # Copy and modify JS
    js_src = frontend_dir / 'js' / 'gantt.js'
    js_dst = dist_dir / 'js'
    js_dst.mkdir()
    
    if js_src.exists():
        with open(js_src, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Get the repository name from environment or default
        repo_name = os.environ.get('GITHUB_REPOSITORY', '').split('/')[-1] if os.environ.get('GITHUB_REPOSITORY') else ''
        base_path = f'/{repo_name}' if repo_name else ''
        
        print(f"Using base path: '{base_path}'")
        
        # Replace API calls with the correct GitHub Pages path
        js_content = js_content.replace(
            "fetch('/api/sc2-data')", 
            f"fetch('{base_path}/api/sc2-data.json')"
        )
        js_content = js_content.replace(
            "fetch('api/sc2-data.json')", 
            f"fetch('{base_path}/api/sc2-data.json')"
        )
        
        # Fix asset paths - use more specific patterns to avoid double replacement
        # Only replace the path in the getIconPath function return statement
        js_content = js_content.replace(
            'return `/assets/icons/${race}/${entityType}s/${name}.jpg`;',
            f'return `{base_path}/assets/icons/${{race}}/${{entityType}}s/${{name}}.jpg`;'
        )
        
        # Fix export functionality for static hosting
        export_old = '''// Send to export endpoint
            const response = await fetch('/export/build-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(buildOrder)
            });
            
            if (response.ok) {
                // Trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'build_order.json';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('Build order exported successfully');
            } else {
                throw new Error(`Export failed: ${response.statusText}`);
            }'''
        
        export_new = '''// Static hosting - export as client-side download
            const blob = new Blob([JSON.stringify(buildOrder, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'build_order.json';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('Build order exported successfully');'''
        
        js_content = js_content.replace(export_old, export_new)
        
        # Add initialization debugging
        js_content = js_content.replace(
            "window.addEventListener('load', () => {",
            """console.log('GitHub Pages SC2 Gantt Chart starting...');
console.log('Base path:', window.location.pathname);
console.log('Repository detected:', '""" + repo_name + """');

window.addEventListener('load', () => {
    console.log('Window loaded, initializing Gantt Chart...');"""
        )
        
        with open(js_dst / 'gantt.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✓ Modified and copied JavaScript")
    
    # Copy assets
    assets_src = Path('src/sc2_gantt/assets')
    assets_dst = dist_dir / 'assets'
    if assets_src.exists():
        shutil.copytree(assets_src, assets_dst)
        print(f"✓ Copied assets")
    
    # Create API directory and copy data
    api_dir = dist_dir / 'api'
    api_dir.mkdir()
    
    data_file = Path('src/sc2_gantt/assets/sc2_comprehensive_data.json')
    if data_file.exists():
        shutil.copy2(data_file, api_dir / 'sc2-data.json')
        print(f"✓ Copied SC2 data to API endpoint")
    else:
        print(f"✗ Warning: Could not find data file at {data_file}")
    
    # Use existing HTML template and modify paths
    static_template_path = Path('src/sc2_gantt/frontend/templates/static_index.html')
    if static_template_path.exists():
        # Read the existing static template
        with open(static_template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Update paths in the template
        html_content = html_content.replace('href="css/gantt.css"', f'href="{base_path}/css/gantt.css"')
        html_content = html_content.replace('src="js/gantt.js"', f'src="{base_path}/js/gantt.js"')
        
        # Add debugging script
        debug_script = f'''
    <script>
        // GitHub Pages debugging
        console.log('HTML loaded, base path: {base_path}');
        console.log('Current URL:', window.location.href);
        console.log('Repository: {repo_name}');
        
        // Test if files are accessible
        window.addEventListener('DOMContentLoaded', () => {{
            console.log('DOM loaded, testing file access...');
            
            // Test CSS
            const cssLink = document.querySelector('link[rel="stylesheet"]');
            if (cssLink) {{
                console.log('CSS link found:', cssLink.href);
            }}
            
            // Test JS will be loaded
            console.log('JavaScript will load from:', '{base_path}/js/gantt.js');
            
            // Test API endpoint
            console.log('API endpoint will be:', '{base_path}/api/sc2-data.json');
        }});
    </script>'''
        
        # Insert debug script before closing </head>
        html_content = html_content.replace('</head>', debug_script + '\n</head>')
        
        with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
    else:
        print(f"Warning: Static template not found at {static_template_path}")
        # Fallback - could use Flask to render the template
        with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
            f.write(f'<html><body><h1>Template not found</h1><p>Could not find {static_template_path}</p></body></html>')
    
    # Create 404.html
    with open(dist_dir / '404.html', 'w', encoding='utf-8') as f:
        f.write(f'''<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <meta http-equiv="refresh" content="0; url={base_path}/">
</head>
<body>
    <p>Redirecting to <a href="{base_path}/">SC2 Gantt Chart</a>...</p>
</body>
</html>''')
    
    print(f"\n✓ Static site built successfully in {dist_dir.absolute()}")
    print(f"✓ Base path configured as: '{base_path}'")
    
    # Verify key files
    key_files = ['index.html', 'css/gantt.css', 'js/gantt.js', 'api/sc2-data.json']
    for file in key_files:
        path = dist_dir / file
        if path.exists():
            print(f"  ✓ {file} ({path.stat().st_size} bytes)")
        else:
            print(f"  ✗ {file} missing!")

if __name__ == '__main__':
    build_simple_static()