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
        
        # Fix export functionality for static hosting - replace server endpoint
        js_content = js_content.replace(
            "await fetch('/export/build-order',", 
            "// Static export - direct download\n            false && await fetch('/export/build-order',"
        )
        js_content = js_content.replace(
            "if (response.ok) {",
            "if (false) { // Static hosting - skip server response\n            } else {"
        )
        
        # Ensure proper module loading by wrapping in DOMContentLoaded if needed
        if 'DOMContentLoaded' not in js_content and 'window.addEventListener(\'load\'' in js_content:
            print("✓ JavaScript already has proper load event handling")
        
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
    
    # Use original Flask template and convert Flask syntax
    flask_template_path = Path('src/sc2_gantt/frontend/templates/index.html')
    if flask_template_path.exists():
        # Read the original Flask template
        with open(flask_template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Convert Flask url_for calls to static paths with proper absolute URLs
        html_content = html_content.replace(
            "{{ url_for('static', filename='css/gantt.css') }}", 
            f"{base_path}/css/gantt.css"
        )
        html_content = html_content.replace(
            "{{ url_for('static', filename='js/gantt.js') }}", 
            f"{base_path}/js/gantt.js"
        )
        
        # Ensure script tag has proper loading attributes for GitHub Pages
        html_content = html_content.replace(
            f'<script src="{base_path}/js/gantt.js"></script>',
            f'<script src="{base_path}/js/gantt.js" defer></script>'
        )
        
        with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"✓ Converted Flask template to static HTML")
    else:
        print(f"Warning: Flask template not found at {flask_template_path}")
    
    # Create simple 404 redirect
    with open(dist_dir / '404.html', 'w', encoding='utf-8') as f:
        f.write(f'<meta http-equiv="refresh" content="0; url={base_path}/">')
    
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